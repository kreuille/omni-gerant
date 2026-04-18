import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from '../lib/api-client';

// BUSINESS RULE [CDC-2.3]: Tests banque connectee API

describe('Bank API integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('fetches bank accounts from GET /api/bank/accounts', async () => {
    const mockAccounts = { items: [{ id: '1', bank_name: 'CA', balance_cents: 150000 }] };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve(mockAccounts),
    });

    const result = await apiRequest('/api/bank/accounts');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.value as typeof mockAccounts;
      expect(data.items).toHaveLength(1);
      expect(Number.isInteger(data.items[0]!.balance_cents)).toBe(true);
    }
  });

  it('fetches transactions from GET /api/bank/transactions', async () => {
    const mockTx = { items: [{ id: 't1', amount_cents: -5000, label: 'Test', matched: false }] };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve(mockTx),
    });

    const result = await apiRequest('/api/bank/transactions');
    expect(result.ok).toBe(true);
  });

  it('fetches forecast from GET /api/bank/forecast', async () => {
    const mockForecast = {
      entries: [], alerts: [],
      current_balance_cents: 100000,
      total_incoming_cents: 50000,
      total_outgoing_cents: 30000,
      projected_balance_cents: 120000,
    };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve(mockForecast),
    });

    const result = await apiRequest('/api/bank/forecast?days=90');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.value as typeof mockForecast;
      expect(data.current_balance_cents).toBe(100000);
    }
  });

  it('fetches reconciliation suggestions', async () => {
    const mockRecon = { suggestions: [], unmatched: [] };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve(mockRecon),
    });

    const result = await apiRequest('/api/bank/reconciliation/suggestions');
    expect(result.ok).toBe(true);
  });

  it('handles network error for bank endpoints', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network failure'));

    const result = await apiRequest('/api/bank/accounts');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
  });
});
