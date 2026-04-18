import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from '../lib/api-client';

// BUSINESS RULE [CDC-3.2]: Tests settings connectes API

describe('Settings API integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn(), removeItem: vi.fn() });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('fetches payment settings from GET /api/settings/payments', async () => {
    const mock = { stripe_enabled: false, gocardless_enabled: false };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve(mock),
    });
    const result = await apiRequest('/api/settings/payments');
    expect(result.ok).toBe(true);
  });

  it('saves payment settings via PUT /api/settings/payments', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve({}),
    });
    const result = await apiRequest('/api/settings/payments', {
      method: 'PUT',
      body: { stripe_enabled: true },
    });
    expect(result.ok).toBe(true);
  });

  it('fetches PPF settings from GET /api/settings/ppf', async () => {
    const mock = { enabled: false, status: 'disconnected' };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve(mock),
    });
    const result = await apiRequest('/api/settings/ppf');
    expect(result.ok).toBe(true);
  });

  it('fetches FEC export from GET /api/accounting/fec', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve('FEC content'),
    });
    const result = await apiRequest('/api/accounting/fec?from=2026-01-01&to=2026-12-31');
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/accounting/fec'),
      expect.anything(),
    );
  });

  it('handles network error', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network failure'));
    const result = await apiRequest('/api/settings/payments');
    expect(result.ok).toBe(false);
  });
});
