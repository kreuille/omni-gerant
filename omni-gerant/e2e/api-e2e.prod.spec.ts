import { test, expect } from '@playwright/test';

const API_URL = process.env['E2E_API_URL'] || 'https://omni-gerant-api.onrender.com';
const UNIQUE = Date.now();

// Helper: register a fresh user and return tokens
async function registerAndLogin(suffix: string) {
  const email = `e2e-${UNIQUE}-${suffix}@test.com`;
  const password = 'E2eTestPass1!';

  const regRes = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      first_name: 'E2E',
      last_name: `User${suffix}`,
      company_name: `E2E Company ${suffix}`,
    }),
  });

  if (!regRes.ok) {
    // User may already exist, try login
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return loginRes.json();
  }

  return regRes.json();
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// ============================================================
// API Route Non-Regression
// ============================================================
test.describe('API Non-Regression', () => {
  test('health endpoints respond correctly', async () => {
    const [health, ready, live] = await Promise.all([
      fetch(`${API_URL}/health`),
      fetch(`${API_URL}/health/ready`),
      fetch(`${API_URL}/health/live`),
    ]);

    expect(health.status).toBe(200);
    const healthBody = await health.json();
    expect(healthBody.status).toBe('ok');

    expect(ready.status).toBe(200);
    const readyBody = await ready.json();
    expect(readyBody.checks.database).toBe('ok');

    expect(live.status).toBe(200);
    const liveBody = await live.json();
    expect(liveBody.alive).toBe(true);
  });

  test('unauthenticated routes return 401', async () => {
    const routes = [
      '/api/dashboard',
      '/api/quotes',
      '/api/invoices',
      '/api/suppliers',
      '/api/purchases',
    ];

    for (const route of routes) {
      const res = await fetch(`${API_URL}${route}`);
      expect(res.status).toBe(401);
    }
  });

  test('login without body returns 400', async () => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

// ============================================================
// Parcours 1 — Inscription + Premier devis
// ============================================================
test.describe('Parcours 1: Register + First Quote', () => {
  let token: string;

  test('register and get token', async () => {
    const data = await registerAndLogin('p1');
    expect(data.access_token || data.token).toBeTruthy();
    token = data.access_token || data.token;
  });

  test('create a client', async () => {
    const res = await fetch(`${API_URL}/api/clients`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        name: 'Client E2E P1',
        email: 'client-p1@test.com',
        payment_terms: 30,
      }),
    });
    // Accept 200 or 201
    expect([200, 201]).toContain(res.status);
  });

  test('create a quote', async () => {
    const res = await fetch(`${API_URL}/api/quotes`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        client_name: 'Client E2E P1',
        subject: 'E2E Test Quote',
        lines: [
          {
            description: 'Test service',
            quantity: 1,
            unit_price_cents: 10000,
            tva_rate: 2000,
          },
        ],
      }),
    });
    expect([200, 201]).toContain(res.status);
  });
});

// ============================================================
// Parcours 2 — Facturation complete
// ============================================================
test.describe('Parcours 2: Full Invoicing', () => {
  let token: string;

  test('register and get token', async () => {
    const data = await registerAndLogin('p2');
    token = data.access_token || data.token;
    expect(token).toBeTruthy();
  });

  test('create invoice', async () => {
    const res = await fetch(`${API_URL}/api/invoices`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        client_name: 'Client Invoice E2E',
        subject: 'E2E Invoice Test',
        lines: [
          {
            description: 'Consulting',
            quantity: 2,
            unit_price_cents: 50000,
            tva_rate: 2000,
          },
        ],
      }),
    });
    expect([200, 201]).toContain(res.status);
  });

  test('list invoices', async () => {
    const res = await fetch(`${API_URL}/api/invoices`, {
      headers: authHeaders(token),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items || body)).toBe(true);
  });
});

// ============================================================
// Parcours 3 — DUERP
// ============================================================
test.describe('Parcours 3: DUERP', () => {
  let token: string;

  test('register and get token', async () => {
    const data = await registerAndLogin('p3');
    token = data.access_token || data.token;
    expect(token).toBeTruthy();
  });

  test('get NAF risks', async () => {
    const res = await fetch(`${API_URL}/api/legal/duerp/risks/43`, {
      headers: authHeaders(token),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.risks || body)).toBe(true);
  });

  test('create DUERP', async () => {
    const res = await fetch(`${API_URL}/api/legal/duerp`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        naf_code: '43',
        company_name: 'E2E BTP SARL',
        evaluation_date: new Date().toISOString(),
        work_units: [
          { name: 'Chantier principal', description: 'Construction' },
        ],
      }),
    });
    expect([200, 201]).toContain(res.status);
  });
});

// ============================================================
// Parcours 4 — Banque + Rapprochement
// ============================================================
test.describe('Parcours 4: Bank', () => {
  let token: string;

  test('register and get token', async () => {
    const data = await registerAndLogin('p4');
    token = data.access_token || data.token;
    expect(token).toBeTruthy();
  });

  test('create bank account', async () => {
    const res = await fetch(`${API_URL}/api/bank/accounts`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        name: 'E2E Bank Account',
        bank_name: 'Test Bank',
        iban: 'FR7630006000011234567890189',
        bic: 'BNPAFRPP',
        balance_cents: 500000,
      }),
    });
    expect([200, 201]).toContain(res.status);
  });

  test('get forecast', async () => {
    const res = await fetch(`${API_URL}/api/bank/forecast`, {
      headers: authHeaders(token),
    });
    expect(res.status).toBe(200);
  });
});
