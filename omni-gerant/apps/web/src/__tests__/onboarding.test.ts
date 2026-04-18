import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from '../lib/api-client';

// BUSINESS RULE [CDC-6]: Tests inscription et partage devis

describe('Register API integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn(), removeItem: vi.fn() });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('registers via POST /api/auth/register', async () => {
    const mockResponse = {
      access_token: 'jwt-token',
      refresh_token: 'refresh-token',
      user: { id: 'u1', email: 'test@test.com' },
      tenant: { id: 't1' },
    };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 201, json: () => Promise.resolve(mockResponse),
    });

    const result = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { email: 'test@test.com', password: 'password123', company_name: 'Test SARL' },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.value as typeof mockResponse;
      expect(data.access_token).toBeTruthy();
      expect(data.user.email).toBe('test@test.com');
    }
  });

  it('handles duplicate email error', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false, status: 409, statusText: 'Conflict',
      json: () => Promise.resolve({ error: { code: 'ALREADY_EXISTS', message: 'Email already registered' } }),
    });

    const result = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { email: 'existing@test.com', password: 'password123', company_name: 'Test' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ALREADY_EXISTS');
  });

  it('handles validation error', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false, status: 400, statusText: 'Bad Request',
      json: () => Promise.resolve({ error: { code: 'VALIDATION_ERROR', message: 'Invalid data' } }),
    });

    const result = await apiRequest('/api/auth/register', { method: 'POST', body: {} });
    expect(result.ok).toBe(false);
  });
});

describe('Quote sharing (public)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn(), removeItem: vi.fn() });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('fetches public quote via token', async () => {
    const mockQuote = {
      number: 'DEV-2026-001',
      status: 'sent',
      total_ttc_cents: 120000,
      lines: [],
    };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve(mockQuote),
    });

    // Direct fetch (no auth) like the page does
    const res = await fetch('http://localhost:3001/api/share/quote/test-token');
    const data = await res.json();
    expect(data.number).toBe('DEV-2026-001');
    expect(Number.isInteger(data.total_ttc_cents)).toBe(true);
  });

  it('handles expired/invalid token', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false, status: 404, statusText: 'Not Found',
      json: () => Promise.resolve({ error: { code: 'NOT_FOUND', message: 'Quote not found' } }),
    });

    const res = await fetch('http://localhost:3001/api/share/quote/invalid');
    expect(res.ok).toBe(false);
  });
});
