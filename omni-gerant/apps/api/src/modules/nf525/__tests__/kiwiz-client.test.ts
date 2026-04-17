import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { centsToKiwizFloat, formatKiwizAmount, createKiwizClient } from '../kiwiz-client.js';
import { mapInvoiceToKiwiz, mapCreditMemoToKiwiz } from '../kiwiz-mapper.js';
import { loadKiwizConfig, loadKiwizConfigSafe } from '../kiwiz-config.js';
import type { InvoiceForKiwiz, ClientForKiwiz, CompanyForKiwiz } from '../kiwiz-mapper.js';
import type { KiwizConfig } from '../kiwiz-config.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TEST_CONFIG: KiwizConfig = {
  apiUrl: 'https://api.kiwiz.io',
  username: 'test-user',
  password: 'test-pass',
  subscriptionId: 'sub-123',
};

const INVOICE_FIXTURE: InvoiceForKiwiz = {
  number: 'FAC-2026-001',
  created_at: new Date('2026-04-17T10:00:00.000Z'),
  total_ht_cents: 10000,
  total_ttc_cents: 12000,
  total_tva_cents: 2000,
  payment_method: 'card',
  lines: [
    {
      id: 'line-1',
      label: 'Prestation de service',
      quantity: 2,
      unit_price_cents: 5000,
      total_ht_cents: 10000,
      tva_rate: 2000, // 20%
    },
  ],
};

const CLIENT_FIXTURE: ClientForKiwiz = {
  name: 'Client SARL',
  email: 'client@example.com',
  address: {
    line1: '12 rue de la Paix',
    zip_code: '75002',
    city: 'Paris',
    country: 'FR',
  },
};

const COMPANY_FIXTURE: CompanyForKiwiz = {
  name: 'Ma Boite SAS',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 401 ? 'Unauthorized' : 'Internal Server Error',
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: () => mockFetchResponse(body, status),
    body: null,
    bodyUsed: false,
    formData: () => Promise.resolve(new FormData()),
    blob: () => Promise.resolve(new Blob()),
  } as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('centsToKiwizFloat', () => {
  it('should convert 1500 cents to 15', () => {
    expect(centsToKiwizFloat(1500)).toBe(15);
  });

  it('should convert 0 cents to 0', () => {
    expect(centsToKiwizFloat(0)).toBe(0);
  });

  it('should convert 199 cents to 1.99', () => {
    expect(centsToKiwizFloat(199)).toBe(1.99);
  });

  it('should convert 1 cent to 0.01', () => {
    expect(centsToKiwizFloat(1)).toBe(0.01);
  });
});

describe('formatKiwizAmount', () => {
  it('should format 1500 cents as "15.0000"', () => {
    expect(formatKiwizAmount(1500)).toBe('15.0000');
  });

  it('should format 0 cents as "0.0000"', () => {
    expect(formatKiwizAmount(0)).toBe('0.0000');
  });

  it('should format 199 cents as "1.9900"', () => {
    expect(formatKiwizAmount(199)).toBe('1.9900');
  });

  it('should format 1 cent as "0.0100"', () => {
    expect(formatKiwizAmount(1)).toBe('0.0100');
  });

  it('should format large amounts correctly', () => {
    expect(formatKiwizAmount(1234567)).toBe('12345.6700');
  });

  it('should format negative amounts', () => {
    expect(formatKiwizAmount(-500)).toBe('-5.0000');
  });
});

describe('mapInvoiceToKiwiz', () => {
  it('should map a full invoice to Kiwiz format', () => {
    const result = mapInvoiceToKiwiz(INVOICE_FIXTURE, CLIENT_FIXTURE, COMPANY_FIXTURE);

    expect(result.number).toBe('FAC-2026-001');
    expect(result.date).toBe('2026-04-17');
    expect(result.total_ht).toBe('100.0000');
    expect(result.total_ttc).toBe('120.0000');
    expect(result.total_tax).toBe('20.0000');
    expect(result.currency).toBe('EUR');
    expect(result.payment_method).toBe('card');
    expect(result.seller_name).toBe('Ma Boite SAS');
    expect(result.buyer_name).toBe('Client SARL');
    expect(result.buyer_email).toBe('client@example.com');
    expect(result.buyer_address).toEqual({
      street: '12 rue de la Paix',
      zip_code: '75002',
      city: 'Paris',
      country: 'FR',
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      id: 'line-1',
      label: 'Prestation de service',
      quantity: '2.0000',
      unit_price: '50.0000',
      total_ht: '100.0000',
      tax_rate: '20.00',
    });
    expect(result.taxes).toHaveLength(1);
    expect(result.taxes[0]).toEqual({
      rate: '20.00',
      base: '100.0000',
      amount: '20.0000',
    });
  });
});

describe('mapCreditMemoToKiwiz', () => {
  it('should map a credit memo using the same structure as invoices', () => {
    const result = mapCreditMemoToKiwiz(INVOICE_FIXTURE, CLIENT_FIXTURE, COMPANY_FIXTURE);

    expect(result.number).toBe('FAC-2026-001');
    expect(result.total_ht).toBe('100.0000');
    expect(result.seller_name).toBe('Ma Boite SAS');
    expect(result.buyer_name).toBe('Client SARL');
    expect(result.items).toHaveLength(1);
    expect(result.taxes).toHaveLength(1);
  });
});

describe('KiwizClient', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('authenticate', () => {
    it('should return token on success', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ token: 'jwt-token-123' }),
      );

      const client = createKiwizClient(TEST_CONFIG);
      const result = await client.authenticate();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('jwt-token-123');
      }
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.kiwiz.io/token/generate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            username: 'test-user',
            password: 'test-pass',
          }),
        }),
      );
    });

    it('should return error on 401', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({}, 401));

      const client = createKiwizClient(TEST_CONFIG);
      const result = await client.authenticate();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('saveInvoice', () => {
    it('should save invoice on success', async () => {
      const saveResponse = {
        block_hash: 'hash-abc',
        document_hash: 'doc-hash-xyz',
      };

      // First call: authenticate, second call: save
      fetchSpy
        .mockResolvedValueOnce(mockFetchResponse({ token: 'jwt-token' }))
        .mockResolvedValueOnce(mockFetchResponse(saveResponse));

      const client = createKiwizClient(TEST_CONFIG);
      const pdfBuffer = Buffer.from('fake-pdf');
      const invoiceData = mapInvoiceToKiwiz(INVOICE_FIXTURE, CLIENT_FIXTURE, COMPANY_FIXTURE);

      const result = await client.saveInvoice(pdfBuffer, invoiceData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.block_hash).toBe('hash-abc');
        expect(result.value.document_hash).toBe('doc-hash-xyz');
      }
    });

    it('should return error on server failure (500)', async () => {
      fetchSpy
        .mockResolvedValueOnce(mockFetchResponse({ token: 'jwt-token' }))
        .mockResolvedValueOnce(mockFetchResponse({ error: 'server error' }, 500));

      const client = createKiwizClient(TEST_CONFIG);
      const pdfBuffer = Buffer.from('fake-pdf');
      const invoiceData = mapInvoiceToKiwiz(INVOICE_FIXTURE, CLIENT_FIXTURE, COMPANY_FIXTURE);

      const result = await client.saveInvoice(pdfBuffer, invoiceData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
        expect(result.error.details?.status).toBe(500);
      }
    });
  });

  describe('getInvoice', () => {
    it('should return buffer on success', async () => {
      fetchSpy
        .mockResolvedValueOnce(mockFetchResponse({ token: 'jwt-token' }))
        .mockResolvedValueOnce(mockFetchResponse(null));

      const client = createKiwizClient(TEST_CONFIG);
      const result = await client.getInvoice('block-hash-123');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Buffer.isBuffer(result.value)).toBe(true);
      }
    });
  });

  describe('getQuota', () => {
    it('should return quota info on success', async () => {
      const quotaResponse = { used: 42, limit: 1000, remaining: 958 };

      fetchSpy
        .mockResolvedValueOnce(mockFetchResponse({ token: 'jwt-token' }))
        .mockResolvedValueOnce(mockFetchResponse(quotaResponse));

      const client = createKiwizClient(TEST_CONFIG);
      const result = await client.getQuota();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.used).toBe(42);
        expect(result.value.limit).toBe(1000);
        expect(result.value.remaining).toBe(958);
      }
    });
  });

  describe('auto-retry on 401', () => {
    it('should re-authenticate and retry once on 401', async () => {
      const quotaResponse = { used: 10, limit: 500, remaining: 490 };

      // 1. Initial auth
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ token: 'old-token' }));
      // 2. First getQuota attempt -> 401
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({}, 401));
      // 3. Re-auth
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ token: 'new-token' }));
      // 4. Retry getQuota -> success
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(quotaResponse));

      const client = createKiwizClient(TEST_CONFIG);
      const result = await client.getQuota();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.used).toBe(10);
      }
      // 4 fetch calls: auth + 401 attempt + re-auth + success retry
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });
  });
});

describe('loadKiwizConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load config when env vars are set', () => {
    process.env.KIWIZ_API_URL = 'https://custom.kiwiz.io';
    process.env.KIWIZ_USERNAME = 'user';
    process.env.KIWIZ_PASSWORD = 'pass';
    process.env.KIWIZ_SUBSCRIPTION_ID = 'sub-456';

    const config = loadKiwizConfig();

    expect(config.apiUrl).toBe('https://custom.kiwiz.io');
    expect(config.username).toBe('user');
    expect(config.password).toBe('pass');
    expect(config.subscriptionId).toBe('sub-456');
  });

  it('should use default API URL when not set', () => {
    process.env.KIWIZ_USERNAME = 'user';
    process.env.KIWIZ_PASSWORD = 'pass';

    const config = loadKiwizConfig();

    expect(config.apiUrl).toBe('https://api.kiwiz.io');
  });

  it('should throw when username is missing', () => {
    process.env.KIWIZ_PASSWORD = 'pass';
    delete process.env.KIWIZ_USERNAME;

    expect(() => loadKiwizConfig()).toThrow('KIWIZ_USERNAME and KIWIZ_PASSWORD are required');
  });

  it('should throw when password is missing', () => {
    process.env.KIWIZ_USERNAME = 'user';
    delete process.env.KIWIZ_PASSWORD;

    expect(() => loadKiwizConfig()).toThrow('KIWIZ_USERNAME and KIWIZ_PASSWORD are required');
  });
});

describe('loadKiwizConfigSafe', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return null when credentials are missing', () => {
    delete process.env.KIWIZ_USERNAME;
    delete process.env.KIWIZ_PASSWORD;

    const config = loadKiwizConfigSafe();

    expect(config).toBeNull();
  });

  it('should return config when credentials are set', () => {
    process.env.KIWIZ_USERNAME = 'user';
    process.env.KIWIZ_PASSWORD = 'pass';

    const config = loadKiwizConfigSafe();

    expect(config).not.toBeNull();
    expect(config?.username).toBe('user');
  });
});
