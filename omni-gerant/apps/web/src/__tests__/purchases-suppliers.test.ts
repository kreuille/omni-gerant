import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from '../lib/api-client';

// BUSINESS RULE [CDC-2.2]: Tests achats et fournisseurs connectes API

const MOCK_PURCHASE = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  number: 'ACH-001',
  status: 'pending',
  supplier_id: '550e8400-e29b-41d4-a716-446655440011',
  supplier_name: 'Fournisseur Test',
  issue_date: '2026-04-10',
  due_date: '2026-05-10',
  total_ht_cents: 50000,
  total_tva_cents: 10000,
  total_ttc_cents: 60000,
  paid_cents: 0,
  notes: null,
  lines: [{ id: 'l1', position: 1, label: 'Materiel', quantity: 1, unit_price_cents: 50000, tva_rate: 2000, total_ht_cents: 50000 }],
};

const MOCK_SUPPLIER = {
  id: '550e8400-e29b-41d4-a716-446655440011',
  name: 'Fournisseur Test',
  siret: '12345678901234',
  email: 'contact@fournisseur.fr',
  phone: '0612345678',
  address: '1 rue Test',
  category: 'Materiel',
  iban: 'FR7612345678901234567890100',
  bic: 'BNPAFRPP',
  payment_terms: 30,
};

describe('Purchases API integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('fetches purchase list from GET /api/purchases', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ items: [MOCK_PURCHASE], next_cursor: null, has_more: false }),
    });

    const result = await apiRequest('/api/purchases');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.value as { items: typeof MOCK_PURCHASE[] };
      expect(data.items).toHaveLength(1);
      expect(Number.isInteger(data.items[0]!.total_ttc_cents)).toBe(true);
    }
  });

  it('fetches single purchase by id', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve(MOCK_PURCHASE),
    });

    const result = await apiRequest(`/api/purchases/${MOCK_PURCHASE.id}`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.value as typeof MOCK_PURCHASE;
      expect(data.lines).toHaveLength(1);
    }
  });

  it('creates purchase via POST /api/purchases', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 201,
      json: () => Promise.resolve(MOCK_PURCHASE),
    });

    const result = await apiRequest('/api/purchases', { method: 'POST', body: { supplier_id: MOCK_SUPPLIER.id } });
    expect(result.ok).toBe(true);
  });

  it('handles purchase not found', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false, status: 404, statusText: 'Not Found',
      json: () => Promise.resolve({ error: { code: 'NOT_FOUND', message: 'Purchase not found' } }),
    });

    const result = await apiRequest('/api/purchases/nonexistent');
    expect(result.ok).toBe(false);
  });
});

describe('Suppliers API integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('fetches supplier list from GET /api/suppliers', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ items: [MOCK_SUPPLIER], next_cursor: null, has_more: false }),
    });

    const result = await apiRequest('/api/suppliers');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.value as { items: typeof MOCK_SUPPLIER[] };
      expect(data.items).toHaveLength(1);
      expect(data.items[0]!.name).toBe('Fournisseur Test');
    }
  });

  it('fetches single supplier by id', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve(MOCK_SUPPLIER),
    });

    const result = await apiRequest(`/api/suppliers/${MOCK_SUPPLIER.id}`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.value as typeof MOCK_SUPPLIER;
      expect(data.siret).toBe('12345678901234');
      expect(data.payment_terms).toBe(30);
    }
  });

  it('handles network error gracefully', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network failure'));

    const result = await apiRequest('/api/suppliers');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
  });
});
