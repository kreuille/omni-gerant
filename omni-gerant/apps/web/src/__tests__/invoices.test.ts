import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from '../lib/api-client';

// BUSINESS RULE [CDC-2.1]: Tests factures connectees API

const MOCK_INVOICE = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  number: 'FAC-2026-001',
  type: 'standard',
  status: 'draft',
  client_id: '550e8400-e29b-41d4-a716-446655440002',
  client_name: 'Client Test',
  issue_date: '2026-04-16',
  due_date: '2026-05-16',
  payment_terms: 30,
  notes: null,
  total_ht_cents: 100000,
  total_tva_cents: 20000,
  total_ttc_cents: 120000,
  paid_cents: 0,
  remaining_cents: 120000,
  lines: [
    {
      id: 'line-1',
      position: 0,
      label: 'Prestation de service',
      description: null,
      quantity: 1,
      unit: 'forfait',
      unit_price_cents: 100000,
      tva_rate: 2000,
    },
  ],
};

const MOCK_INVOICE_LIST = {
  items: [MOCK_INVOICE],
  next_cursor: null,
  has_more: false,
};

describe('Invoices API integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches invoice list from GET /api/invoices', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_INVOICE_LIST),
    });

    const result = await apiRequest('/api/invoices');

    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.value as typeof MOCK_INVOICE_LIST;
      expect(data.items).toHaveLength(1);
      expect(data.items[0]!.number).toBe('FAC-2026-001');
      // BUSINESS RULE [R02]: Amounts in centimes
      expect(Number.isInteger(data.items[0]!.total_ttc_cents)).toBe(true);
    }
  });

  it('fetches invoice list with status filter', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [], next_cursor: null, has_more: false }),
    });

    await apiRequest('/api/invoices?status=overdue');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/invoices?status=overdue'),
      expect.anything(),
    );
  });

  it('creates invoice via POST /api/invoices', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve(MOCK_INVOICE),
    });

    const body = {
      client_id: '550e8400-e29b-41d4-a716-446655440002',
      type: 'standard',
      payment_terms: 30,
      lines: [{
        position: 0,
        label: 'Prestation de service',
        quantity: 1,
        unit: 'forfait',
        // BUSINESS RULE [R02]: Input in centimes
        unit_price_cents: 100000,
        tva_rate: 2000,
      }],
    };

    const result = await apiRequest('/api/invoices', { method: 'POST', body });

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/invoices'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );
  });

  it('fetches single invoice by id from GET /api/invoices/:id', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_INVOICE),
    });

    const result = await apiRequest(`/api/invoices/${MOCK_INVOICE.id}`);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.value as typeof MOCK_INVOICE;
      expect(data.id).toBe(MOCK_INVOICE.id);
      expect(data.lines).toHaveLength(1);
      expect(data.total_ht_cents).toBe(100000);
      expect(data.total_tva_cents).toBe(20000);
      expect(data.total_ttc_cents).toBe(120000);
    }
  });

  it('handles 404 for non-existent invoice', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ error: { code: 'NOT_FOUND', message: 'Invoice not found' } }),
    });

    const result = await apiRequest('/api/invoices/nonexistent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('handles validation error on invalid invoice data', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: () => Promise.resolve({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid invoice data', details: {} },
      }),
    });

    const result = await apiRequest('/api/invoices', { method: 'POST', body: {} });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('handles network error gracefully', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network failure'));

    const result = await apiRequest('/api/invoices');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
    }
  });
});
