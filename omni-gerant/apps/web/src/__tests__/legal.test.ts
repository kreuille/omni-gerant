import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from '../lib/api-client';

// BUSINESS RULE [CDC-2.4]: Tests legal connecte API

describe('RGPD API integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn(), removeItem: vi.fn() });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('fetches RGPD registry from GET /api/legal/rgpd', async () => {
    const mockRegistry = { id: '1', company_name: 'Test', siret: '123', treatments: [] };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve(mockRegistry),
    });
    const result = await apiRequest('/api/legal/rgpd');
    expect(result.ok).toBe(true);
  });

  it('creates RGPD registry via POST /api/legal/rgpd', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 201, json: () => Promise.resolve({ id: '1' }),
    });
    const result = await apiRequest('/api/legal/rgpd', { method: 'POST', body: { company_name: 'Test' } });
    expect(result.ok).toBe(true);
  });

  it('adds treatment via POST /api/legal/rgpd/treatments', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 201, json: () => Promise.resolve({ id: 't1', name: 'Test' }),
    });
    const result = await apiRequest('/api/legal/rgpd/treatments', { method: 'POST', body: { name: 'Test' } });
    expect(result.ok).toBe(true);
  });
});

describe('Insurance API integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn(), removeItem: vi.fn() });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('fetches insurances from GET /api/legal/insurance', async () => {
    const mock = { items: [{ id: '1', type: 'rc_pro', premium_cents: 120000 }] };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve(mock),
    });
    const result = await apiRequest('/api/legal/insurance');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.value as typeof mock;
      expect(data.items).toHaveLength(1);
      expect(Number.isInteger(data.items[0]!.premium_cents)).toBe(true);
    }
  });

  it('creates insurance via POST /api/legal/insurance', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 201, json: () => Promise.resolve({ id: '1' }),
    });
    const result = await apiRequest('/api/legal/insurance', {
      method: 'POST',
      body: { type: 'rc_pro', insurer: 'AXA', premium_cents: 120000 },
    });
    expect(result.ok).toBe(true);
  });

  it('handles error on insurance API', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network failure'));
    const result = await apiRequest('/api/legal/insurance');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
  });
});
