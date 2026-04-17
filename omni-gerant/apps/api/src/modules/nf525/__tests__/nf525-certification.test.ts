import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ok, err, appError } from '@zenadmin/shared';
import { createNf525CertificationService } from '../nf525-certification.service.js';
import type {
  CertificationRepository,
  CertificationRecord,
  InvoiceLookup,
  Nf525CertificationService,
} from '../nf525-certification.service.js';
import type { KiwizClient, KiwizInvoiceSaveResponse } from '../kiwiz-client.js';
import type { InvoiceForKiwiz, ClientForKiwiz, CompanyForKiwiz } from '../kiwiz-mapper.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const INVOICE_ID = 'inv-001';
const CREDIT_MEMO_ID = 'cm-001';

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
      tva_rate: 2000,
    },
  ],
};

const CREDIT_MEMO_FIXTURE: InvoiceForKiwiz = {
  number: 'AVO-2026-001',
  created_at: new Date('2026-04-17T11:00:00.000Z'),
  total_ht_cents: -5000,
  total_ttc_cents: -6000,
  total_tva_cents: -1000,
  payment_method: 'card',
  lines: [
    {
      id: 'line-cm-1',
      label: 'Avoir partiel',
      quantity: 1,
      unit_price_cents: -5000,
      total_ht_cents: -5000,
      tva_rate: 2000,
    },
  ],
};

const CLIENT_FIXTURE: ClientForKiwiz = {
  name: 'Client SARL',
  email: 'client@example.com',
  address: { line1: '12 rue de la Paix', zip_code: '75002', city: 'Paris', country: 'FR' },
};

const COMPANY_FIXTURE: CompanyForKiwiz = { name: 'Ma Boite SAS' };

const KIWIZ_SUCCESS_RESPONSE: KiwizInvoiceSaveResponse = {
  block_hash: 'block-abc-123',
  document_hash: 'doc-hash-xyz',
  message: 'OK',
};

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockKiwizClient(overrides?: Partial<KiwizClient>): KiwizClient {
  return {
    authenticate: vi.fn().mockResolvedValue(ok('token-123')),
    saveInvoice: vi.fn().mockResolvedValue(ok(KIWIZ_SUCCESS_RESPONSE)),
    saveCreditMemo: vi.fn().mockResolvedValue(ok(KIWIZ_SUCCESS_RESPONSE)),
    getInvoice: vi.fn().mockResolvedValue(ok(Buffer.from('pdf'))),
    getCreditMemo: vi.fn().mockResolvedValue(ok(Buffer.from('pdf'))),
    getQuota: vi.fn().mockResolvedValue(ok({ used: 1, limit: 100, remaining: 99 })),
    ...overrides,
  };
}

function createMockCertificationRepo(): CertificationRepository & { records: Map<string, CertificationRecord> } {
  const records = new Map<string, CertificationRecord>();
  return {
    records,
    findByInvoiceId: vi.fn(async (invoiceId: string, _tenantId: string) => {
      return records.get(invoiceId) ?? null;
    }),
    save: vi.fn(async (record: CertificationRecord) => {
      records.set(record.invoice_id, record);
    }),
  };
}

function createMockInvoiceLookup(overrides?: Partial<InvoiceLookup>): InvoiceLookup {
  return {
    findById: vi.fn().mockResolvedValue(INVOICE_FIXTURE),
    findClientForInvoice: vi.fn().mockResolvedValue(CLIENT_FIXTURE),
    findCompanyForTenant: vi.fn().mockResolvedValue(COMPANY_FIXTURE),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// K1 - Invoice Certification Tests
// ---------------------------------------------------------------------------

describe('NF525 Certification Service — K1 (Invoices)', () => {
  let kiwizClient: KiwizClient;
  let certRepo: ReturnType<typeof createMockCertificationRepo>;
  let invoiceLookup: InvoiceLookup;
  let service: Nf525CertificationService;

  beforeEach(() => {
    kiwizClient = createMockKiwizClient();
    certRepo = createMockCertificationRepo();
    invoiceLookup = createMockInvoiceLookup();
    service = createNf525CertificationService({
      kiwizClient,
      certificationRepo: certRepo,
      invoiceLookup,
      testMode: false,
    });
  });

  // Test 1: certifyInvoice success
  it('certifyInvoice returns file_hash and block_hash on success', async () => {
    const result = await service.certifyInvoice(INVOICE_ID, TENANT_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.file_hash).toBe('doc-hash-xyz');
    expect(result.value.block_hash).toBe('block-abc-123');
    expect(result.value.certified_at).toBeInstanceOf(Date);
    expect(kiwizClient.saveInvoice).toHaveBeenCalledOnce();
  });

  // Test 2: certifyInvoice with Kiwiz failure
  it('certifyInvoice returns error Result when Kiwiz fails', async () => {
    const failClient = createMockKiwizClient({
      saveInvoice: vi.fn().mockResolvedValue(
        err(appError('SERVICE_UNAVAILABLE', 'Kiwiz saveInvoice failed: 500')),
      ),
    });
    const svc = createNf525CertificationService({
      kiwizClient: failClient,
      certificationRepo: certRepo,
      invoiceLookup,
      testMode: false,
    });

    const result = await svc.certifyInvoice(INVOICE_ID, TENANT_ID);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  // Test 3: certifyInvoice already certified
  it('certifyInvoice returns CONFLICT error if already certified', async () => {
    // First certification
    await service.certifyInvoice(INVOICE_ID, TENANT_ID);
    // Second attempt
    const result = await service.certifyInvoice(INVOICE_ID, TENANT_ID);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CONFLICT');
    expect(result.error.message).toContain('already certified');
  });

  // Test 4: certifyInvoice non-existent invoice
  it('certifyInvoice returns NOT_FOUND for missing invoice', async () => {
    const lookup = createMockInvoiceLookup({ findById: vi.fn().mockResolvedValue(null) });
    const svc = createNf525CertificationService({
      kiwizClient,
      certificationRepo: certRepo,
      invoiceLookup: lookup,
      testMode: false,
    });

    const result = await svc.certifyInvoice('nonexistent', TENANT_ID);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
  });

  // Test 5: getStatus for certified invoice
  it('getStatus returns certified: true with hashes after certification', async () => {
    await service.certifyInvoice(INVOICE_ID, TENANT_ID);

    const result = await service.getStatus(INVOICE_ID, TENANT_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.certified).toBe(true);
    expect(result.value.file_hash).toBe('doc-hash-xyz');
    expect(result.value.block_hash).toBe('block-abc-123');
    expect(result.value.certified_at).toBeInstanceOf(Date);
    expect(result.value.invoice_number).toBe('FAC-2026-001');
  });

  // Test 6: getStatus for uncertified invoice
  it('getStatus returns certified: false for uncertified invoice', async () => {
    const result = await service.getStatus(INVOICE_ID, TENANT_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.certified).toBe(false);
    expect(result.value.file_hash).toBeNull();
    expect(result.value.block_hash).toBeNull();
    expect(result.value.certified_at).toBeNull();
  });

  // Test 7: Non-blocking certification (Kiwiz failure does not throw)
  it('non-blocking: Kiwiz failure returns error Result without throwing', async () => {
    const failClient = createMockKiwizClient({
      saveInvoice: vi.fn().mockResolvedValue(
        err(appError('SERVICE_UNAVAILABLE', 'Kiwiz down')),
      ),
    });
    const svc = createNf525CertificationService({
      kiwizClient: failClient,
      certificationRepo: certRepo,
      invoiceLookup,
      testMode: false,
    });

    // Should NOT throw, should return err Result
    const result = await svc.certifyInvoice(INVOICE_ID, TENANT_ID);
    expect(result.ok).toBe(false);

    // Invoice lookup was still called (validation happened before Kiwiz call)
    expect(invoiceLookup.findById).toHaveBeenCalledWith(INVOICE_ID, TENANT_ID);
    expect(failClient.saveInvoice).toHaveBeenCalledOnce();

    // No certification record stored on failure
    expect(certRepo.records.size).toBe(0);
  });

  // Test 8: Retry certification on previously failed invoice
  it('retry certification succeeds on a previously uncertified invoice', async () => {
    // First attempt fails
    const failClient = createMockKiwizClient({
      saveInvoice: vi.fn().mockResolvedValue(
        err(appError('SERVICE_UNAVAILABLE', 'Kiwiz down')),
      ),
    });
    const svc1 = createNf525CertificationService({
      kiwizClient: failClient,
      certificationRepo: certRepo,
      invoiceLookup,
      testMode: false,
    });
    const fail = await svc1.certifyInvoice(INVOICE_ID, TENANT_ID);
    expect(fail.ok).toBe(false);

    // Retry with working client succeeds
    const svc2 = createNf525CertificationService({
      kiwizClient: createMockKiwizClient(),
      certificationRepo: certRepo,
      invoiceLookup,
      testMode: false,
    });
    const retry = await svc2.certifyInvoice(INVOICE_ID, TENANT_ID);
    expect(retry.ok).toBe(true);
  });

  // Test 9: Certification stores test_mode from config
  it('certification stores test_mode from config', async () => {
    const svc = createNf525CertificationService({
      kiwizClient,
      certificationRepo: certRepo,
      invoiceLookup,
      testMode: true,
    });

    const result = await svc.certifyInvoice(INVOICE_ID, TENANT_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.test_mode).toBe(true);

    // Also check stored record
    const stored = certRepo.records.get(INVOICE_ID);
    expect(stored?.test_mode).toBe(true);
  });

  // Test 10: Certification stores correct timestamp
  it('certification stores a timestamp close to now', async () => {
    const before = new Date();
    const result = await service.certifyInvoice(INVOICE_ID, TENANT_ID);
    const after = new Date();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.certified_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.value.certified_at.getTime()).toBeLessThanOrEqual(after.getTime());

    const stored = certRepo.records.get(INVOICE_ID);
    expect(stored?.certified_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});

// ---------------------------------------------------------------------------
// K2 - Credit Memo Certification Tests
// ---------------------------------------------------------------------------

describe('NF525 Certification Service — K2 (Credit Memos)', () => {
  let kiwizClient: KiwizClient;
  let certRepo: ReturnType<typeof createMockCertificationRepo>;
  let invoiceLookup: InvoiceLookup;
  let service: Nf525CertificationService;

  beforeEach(() => {
    kiwizClient = createMockKiwizClient();
    certRepo = createMockCertificationRepo();
    invoiceLookup = createMockInvoiceLookup({
      findById: vi.fn().mockResolvedValue(CREDIT_MEMO_FIXTURE),
    });
    service = createNf525CertificationService({
      kiwizClient,
      certificationRepo: certRepo,
      invoiceLookup,
      testMode: false,
    });
  });

  // Test 11: certifyCreditMemo success
  it('certifyCreditMemo returns hashes on success', async () => {
    const result = await service.certifyCreditMemo(CREDIT_MEMO_ID, TENANT_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.file_hash).toBe('doc-hash-xyz');
    expect(result.value.block_hash).toBe('block-abc-123');
    expect(kiwizClient.saveCreditMemo).toHaveBeenCalledOnce();
    // Should NOT have called saveInvoice
    expect(kiwizClient.saveInvoice).not.toHaveBeenCalled();
  });

  // Test 12: certifyCreditMemo with Kiwiz failure
  it('certifyCreditMemo returns error when Kiwiz fails', async () => {
    const failClient = createMockKiwizClient({
      saveCreditMemo: vi.fn().mockResolvedValue(
        err(appError('SERVICE_UNAVAILABLE', 'Kiwiz saveCreditMemo failed')),
      ),
    });
    const svc = createNf525CertificationService({
      kiwizClient: failClient,
      certificationRepo: certRepo,
      invoiceLookup,
      testMode: false,
    });

    const result = await svc.certifyCreditMemo(CREDIT_MEMO_ID, TENANT_ID);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  // Test 13: certifyCreditMemo already certified
  it('certifyCreditMemo returns CONFLICT if already certified', async () => {
    await service.certifyCreditMemo(CREDIT_MEMO_ID, TENANT_ID);
    const result = await service.certifyCreditMemo(CREDIT_MEMO_ID, TENANT_ID);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CONFLICT');
    expect(result.error.message).toContain('already certified');
  });

  // Test 14: certifyCreditMemo maps correctly to credit memo format
  it('certifyCreditMemo calls saveCreditMemo (not saveInvoice) on the Kiwiz client', async () => {
    await service.certifyCreditMemo(CREDIT_MEMO_ID, TENANT_ID);

    expect(kiwizClient.saveCreditMemo).toHaveBeenCalledOnce();
    expect(kiwizClient.saveInvoice).not.toHaveBeenCalled();

    // Verify the mapped data was passed
    const callArgs = (kiwizClient.saveCreditMemo as ReturnType<typeof vi.fn>).mock.calls[0];
    const pdfBuffer = callArgs[0] as Buffer;
    const kiwizData = callArgs[1] as { number: string; seller_name: string; buyer_name: string };

    expect(pdfBuffer.toString()).toBe('mock-pdf');
    expect(kiwizData.number).toBe('AVO-2026-001');
    expect(kiwizData.seller_name).toBe('Ma Boite SAS');
    expect(kiwizData.buyer_name).toBe('Client SARL');
  });

  // Test 15: certifyCreditMemo stores hashes in repository
  it('certifyCreditMemo stores hashes in certification repository', async () => {
    await service.certifyCreditMemo(CREDIT_MEMO_ID, TENANT_ID);

    const stored = certRepo.records.get(CREDIT_MEMO_ID);
    expect(stored).toBeDefined();
    expect(stored!.file_hash).toBe('doc-hash-xyz');
    expect(stored!.block_hash).toBe('block-abc-123');
    expect(stored!.type).toBe('credit_memo');
    expect(stored!.tenant_id).toBe(TENANT_ID);
  });

  // Test 16: certifyCreditMemo is non-blocking (failure returns Result, no throw)
  it('certifyCreditMemo is non-blocking: Kiwiz failure returns err Result', async () => {
    const failClient = createMockKiwizClient({
      saveCreditMemo: vi.fn().mockResolvedValue(
        err(appError('SERVICE_UNAVAILABLE', 'Kiwiz timeout')),
      ),
    });
    const svc = createNf525CertificationService({
      kiwizClient: failClient,
      certificationRepo: certRepo,
      invoiceLookup,
      testMode: false,
    });

    // Must not throw
    const result = await svc.certifyCreditMemo(CREDIT_MEMO_ID, TENANT_ID);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SERVICE_UNAVAILABLE');

    // No record stored on failure
    expect(certRepo.records.size).toBe(0);
  });
});
