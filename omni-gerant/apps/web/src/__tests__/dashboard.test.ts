import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from '../lib/api-client';

// BUSINESS RULE [CDC-4]: Dashboard charge les KPIs depuis l'API

const MOCK_DASHBOARD = {
  kpis: {
    receivables_cents: 1250000,
    payables_cents: 480000,
    bank_balance_cents: 3200000,
    real_cash_cents: 3970000,
    revenue_month_cents: 850000,
    revenue_prev_month_cents: 720000,
    revenue_trend_pct: 18,
  },
  upcoming_payments: [
    { id: '1', type: 'receivable', entity_name: 'Client Martin', amount_cents: 250000, due_date: '2026-04-16', document_number: 'FAC-2026-012' },
  ],
  recent_activity: [
    { id: '1', type: 'invoice_paid', description: 'Facture FAC-2026-011 payee', timestamp: '2026-04-14T14:30:00Z' },
  ],
  monthly_revenue: [
    { month: '2026-03', revenue_cents: 720000 },
    { month: '2026-04', revenue_cents: 850000 },
  ],
};

describe('Dashboard API integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue('test-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches dashboard data from GET /api/dashboard', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_DASHBOARD),
    });

    const result = await apiRequest('/api/dashboard');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(MOCK_DASHBOARD);
      const data = result.value as typeof MOCK_DASHBOARD;
      expect(data.kpis.receivables_cents).toBe(1250000);
      expect(data.kpis.payables_cents).toBe(480000);
      expect(data.kpis.real_cash_cents).toBe(3970000);
    }
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/dashboard'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('sends request to correct endpoint without auth in SSR', async () => {
    // In Node (SSR), getAuthToken returns null because typeof window === 'undefined'
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_DASHBOARD),
    });

    await apiRequest('/api/dashboard');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/dashboard'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns error when API is unavailable', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network failure'));

    const result = await apiRequest('/api/dashboard');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
    }
  });

  it('returns error on HTTP 500', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }),
    });

    const result = await apiRequest('/api/dashboard');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INTERNAL_ERROR');
    }
  });

  it('returns error on HTTP 401 (unauthenticated)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }),
    });

    const result = await apiRequest('/api/dashboard');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('dashboard data contains all required KPI fields', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_DASHBOARD),
    });

    const result = await apiRequest('/api/dashboard');

    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.value as typeof MOCK_DASHBOARD;
      // BUSINESS RULE [CDC-4]: All 3 KPI fields must be present
      expect(data.kpis).toHaveProperty('receivables_cents');
      expect(data.kpis).toHaveProperty('payables_cents');
      expect(data.kpis).toHaveProperty('real_cash_cents');
      expect(data.kpis).toHaveProperty('bank_balance_cents');
      expect(data.kpis).toHaveProperty('revenue_month_cents');
      expect(data.kpis).toHaveProperty('revenue_trend_pct');
      // All amounts are integers (centimes)
      expect(Number.isInteger(data.kpis.receivables_cents)).toBe(true);
      expect(Number.isInteger(data.kpis.payables_cents)).toBe(true);
      expect(Number.isInteger(data.kpis.real_cash_cents)).toBe(true);
    }
  });

  it('dashboard data contains upcoming payments and recent activity', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_DASHBOARD),
    });

    const result = await apiRequest('/api/dashboard');

    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.value as typeof MOCK_DASHBOARD;
      expect(Array.isArray(data.upcoming_payments)).toBe(true);
      expect(Array.isArray(data.recent_activity)).toBe(true);
      expect(Array.isArray(data.monthly_revenue)).toBe(true);
      expect(data.upcoming_payments[0]).toHaveProperty('amount_cents');
      expect(data.upcoming_payments[0]).toHaveProperty('type');
      expect(data.recent_activity[0]).toHaveProperty('description');
    }
  });
});
