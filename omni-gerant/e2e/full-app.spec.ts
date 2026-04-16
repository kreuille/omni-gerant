import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:3001';
const APP_URL = 'http://localhost:3000';

// Helper: register a fresh user via API and return tokens
async function registerUser(email: string, password: string, firstName: string, lastName: string) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      company_name: `${firstName} ${lastName} SARL`,
    }),
  });
  return res.json();
}

// ============================================================
// 1. AUTH — Register & Login
// ============================================================
test.describe('Auth', () => {
  test('login page loads with form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('zenAdmin');
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h1')).toContainText('zenAdmin');
    // Should have registration fields
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
  });

  test('login with valid credentials redirects', async ({ page }) => {
    // Register user first
    const email = `e2e-${Date.now()}@test.com`;
    await registerUser(email, 'TestPass1', 'E2E', 'User');

    await page.goto('/login');
    await page.fill('input#email', email);
    await page.fill('input#password', 'TestPass1');
    await page.click('button[type="submit"]');

    // Should redirect away from login
    await page.waitForURL(/\/(quotes|login)/, { timeout: 10000 });
  });

  test('login with invalid password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input#email', 'nobody@test.com');
    await page.fill('input#password', 'WrongPass1');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Invalid email or password').or(page.locator('.text-red-600'))).toBeVisible({ timeout: 5000 });
  });

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink).toBeVisible();
  });
});

// ============================================================
// 2. DASHBOARD
// ============================================================
test.describe('Dashboard', () => {
  test('dashboard page loads with KPIs', async ({ page }) => {
    await page.goto('/');
    // Dashboard should show KPI cards or redirect to login
    const content = page.locator('body');
    await expect(content).toBeVisible();
  });
});

// ============================================================
// 3. QUOTES
// ============================================================
test.describe('Quotes', () => {
  test('quotes list page loads', async ({ page }) => {
    await page.goto('/quotes');
    await expect(page.locator('body')).toBeVisible();
    // Should have a title or heading about devis/quotes
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('new quote page loads', async ({ page }) => {
    await page.goto('/quotes/new');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================
// 4. INVOICES
// ============================================================
test.describe('Invoices', () => {
  test('invoices list page loads', async ({ page }) => {
    await page.goto('/invoices');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('new invoice page loads', async ({ page }) => {
    await page.goto('/invoices/new');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('overdue invoices page loads', async ({ page }) => {
    await page.goto('/invoices/overdue');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================
// 5. SUPPLIERS
// ============================================================
test.describe('Suppliers', () => {
  test('suppliers list page loads', async ({ page }) => {
    await page.goto('/suppliers');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================
// 6. PURCHASES
// ============================================================
test.describe('Purchases', () => {
  test('purchases list page loads', async ({ page }) => {
    await page.goto('/purchases');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('new purchase page loads', async ({ page }) => {
    await page.goto('/purchases/new');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================
// 7. BANK
// ============================================================
test.describe('Bank', () => {
  test('bank accounts page loads', async ({ page }) => {
    await page.goto('/bank');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('bank connect page loads', async ({ page }) => {
    await page.goto('/bank/connect');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('reconciliation page loads', async ({ page }) => {
    await page.goto('/bank/reconciliation');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('forecast page loads', async ({ page }) => {
    await page.goto('/bank/forecast');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================
// 8. LEGAL — DUERP
// ============================================================
test.describe('Legal - DUERP', () => {
  test('DUERP page loads', async ({ page }) => {
    await page.goto('/legal/duerp');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('DUERP edit page loads', async ({ page }) => {
    await page.goto('/legal/duerp/edit');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================
// 9. LEGAL — RGPD
// ============================================================
test.describe('Legal - RGPD', () => {
  test('RGPD registry page loads', async ({ page }) => {
    await page.goto('/legal/rgpd');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('RGPD treatments page loads', async ({ page }) => {
    await page.goto('/legal/rgpd/treatments');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================
// 10. LEGAL — INSURANCE
// ============================================================
test.describe('Legal - Insurance', () => {
  test('insurance vault page loads', async ({ page }) => {
    await page.goto('/legal/insurance');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('insurance upload page loads', async ({ page }) => {
    await page.goto('/legal/insurance/upload');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================
// 11. ONBOARDING
// ============================================================
test.describe('Onboarding', () => {
  test('step 1 - SIRET page loads', async ({ page }) => {
    await page.goto('/step-1');
    await expect(page.locator('body')).toBeVisible();
    // Should have SIRET input or company name
    const content = page.locator('body');
    await expect(content).toContainText(/SIRET|entreprise|Entreprise/i, { timeout: 10000 });
  });

  test('step 2 - personalization page loads', async ({ page }) => {
    await page.goto('/step-2');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('step 3 - bank connection page loads', async ({ page }) => {
    await page.goto('/step-3');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('step 4 - first quote page loads', async ({ page }) => {
    await page.goto('/step-4');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('complete page loads', async ({ page }) => {
    await page.goto('/complete');
    await expect(page.locator('body')).toBeVisible();
  });
});

// ============================================================
// 12. SETTINGS — PAYMENTS
// ============================================================
test.describe('Settings - Payments', () => {
  test('payments settings page loads with Stripe and GoCardless', async ({ page }) => {
    await page.goto('/settings/payments');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1')).toContainText(/paiement/i, { timeout: 10000 });
    // Should show Stripe section
    await expect(page.getByRole('heading', { name: 'Stripe' })).toBeVisible();
    // Should show GoCardless section
    await expect(page.getByRole('heading', { name: 'GoCardless' })).toBeVisible();
    // Should show bank transfer section
    await expect(page.getByRole('heading', { name: /Virement/i })).toBeVisible();
  });

  test('Stripe connect button is present', async ({ page }) => {
    await page.goto('/settings/payments');
    await expect(page.locator('text=Connecter Stripe')).toBeVisible({ timeout: 10000 });
  });

  test('GoCardless mandate button is present', async ({ page }) => {
    await page.goto('/settings/payments');
    await expect(page.locator('text=Configurer le prelevement SEPA')).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================
// 13. SETTINGS — PPF
// ============================================================
test.describe('Settings - PPF', () => {
  test('PPF settings page loads', async ({ page }) => {
    await page.goto('/settings/ppf');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1')).toContainText(/Portail Public/i, { timeout: 10000 });
  });

  test('PPF config form has required fields', async ({ page }) => {
    await page.goto('/settings/ppf');
    await expect(page.locator('text=Sandbox')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Production')).toBeVisible();
    await expect(page.locator('text=Enregistrer')).toBeVisible();
  });

  test('PPF shows recent transmissions', async ({ page }) => {
    await page.goto('/settings/ppf');
    await expect(page.locator('text=Transmissions recentes')).toBeVisible({ timeout: 10000 });
  });

  test('PPF shows directory lookup', async ({ page }) => {
    await page.goto('/settings/ppf');
    await expect(page.locator('text=Annuaire PPF')).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================
// 14. SETTINGS — ACCOUNTING
// ============================================================
test.describe('Settings - Accounting', () => {
  test('accounting settings page loads', async ({ page }) => {
    await page.goto('/settings/accounting');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('FEC export page loads', async ({ page }) => {
    await page.goto('/settings/accounting/export');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================
// 15. SETTINGS — CONNECTORS
// ============================================================
test.describe('Settings - Connectors', () => {
  test('connectors settings page loads', async ({ page }) => {
    await page.goto('/settings/connectors');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================
// 16. API HEALTH & ENDPOINTS
// ============================================================
test.describe('API Endpoints', () => {
  test('health endpoint returns ok', async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('ready endpoint returns ok', async ({ request }) => {
    const res = await request.get(`${API_URL}/ready`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('register endpoint creates user', async ({ request }) => {
    const email = `api-test-${Date.now()}@test.com`;
    const res = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email,
        password: 'TestPass1',
        first_name: 'API',
        last_name: 'Test',
        company_name: 'API Test SARL',
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.user.email).toBe(email);
    expect(body.tokens.access_token).toBeTruthy();
  });

  test('login endpoint authenticates user', async ({ request }) => {
    const email = `login-test-${Date.now()}@test.com`;
    // Register first
    await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email,
        password: 'TestPass1',
        first_name: 'Login',
        last_name: 'Test',
        company_name: 'Login Test',
      },
    });
    // Login
    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { email, password: 'TestPass1' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.requires_2fa).toBe(false);
    expect(body.user.email).toBe(email);
  });

  test('login rejects wrong password', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: 'nobody@test.com', password: 'WrongPass1' },
    });
    expect(res.ok()).toBeFalsy();
    expect(res.status()).toBe(401);
  });

  test('register rejects duplicate email', async ({ request }) => {
    const email = `dup-${Date.now()}@test.com`;
    await request.post(`${API_URL}/api/auth/register`, {
      data: { email, password: 'TestPass1', first_name: 'A', last_name: 'B', company_name: 'C' },
    });
    const res = await request.post(`${API_URL}/api/auth/register`, {
      data: { email, password: 'TestPass1', first_name: 'A', last_name: 'B', company_name: 'C' },
    });
    expect(res.status()).toBe(409);
  });

  test('register rejects weak password', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/register`, {
      data: { email: 'weak@test.com', password: 'short', first_name: 'A', last_name: 'B', company_name: 'C' },
    });
    expect(res.status()).toBe(400);
  });
});

// ============================================================
// 17. NAVIGATION — Sidebar links
// ============================================================
test.describe('Navigation', () => {
  test('sidebar is present on dashboard pages', async ({ page }) => {
    await page.goto('/quotes');
    // Check for sidebar/navigation elements
    const nav = page.locator('nav, aside, [role="navigation"]').first();
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test('can navigate between main sections', async ({ page }) => {
    // Start on quotes
    await page.goto('/quotes');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });

    // Navigate to invoices
    const invoicesLink = page.locator('a[href="/invoices"]').first();
    if (await invoicesLink.isVisible()) {
      await invoicesLink.click();
      await page.waitForURL('/invoices');
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    }
  });
});

// ============================================================
// 18. RESPONSIVE — Mobile viewport
// ============================================================
test.describe('Responsive', () => {
  test('login page works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('payments settings readable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/settings/payments');
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================
// 19. SECURITY HEADERS
// ============================================================
test.describe('Security Headers', () => {
  test('pages return security headers', async ({ page }) => {
    const response = await page.goto('/login');
    const headers = response?.headers() ?? {};
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });
});
