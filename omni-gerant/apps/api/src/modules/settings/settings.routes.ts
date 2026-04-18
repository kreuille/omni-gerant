import type { FastifyInstance } from 'fastify';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// BUSINESS RULE [CDC-3.2]: Settings endpoints for accounting, payments, PPF

type SettingsSection = 'accounting' | 'payments' | 'ppf';

const settingsStore = new Map<string, Record<string, unknown>>();

const DEFAULTS: Record<SettingsSection, Record<string, unknown>> = {
  accounting: {
    plan_comptable: 'PCG',
    journal_ventes: 'VE',
    journal_achats: 'HA',
    exercise_start: '01-01',
    exercise_end: '12-31',
  },
  payments: {
    stripe_enabled: false,
    gocardless_enabled: false,
    sepa_enabled: false,
  },
  ppf: {
    enabled: false,
    platform: 'chorus-pro',
    pdp_id: null,
  },
};

function getSettings(tenantId: string, section: SettingsSection): Record<string, unknown> {
  const key = `${tenantId}:${section}`;
  return settingsStore.get(key) ?? { ...DEFAULTS[section] };
}

function putSettings(tenantId: string, section: SettingsSection, data: Record<string, unknown>): Record<string, unknown> {
  const key = `${tenantId}:${section}`;
  const current = getSettings(tenantId, section);
  const updated = { ...current, ...data };
  settingsStore.set(key, updated);
  return updated;
}

export async function settingsRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // GET /api/settings/accounting
  app.get(
    '/api/settings/accounting',
    { preHandler: [...preHandlers, requirePermission('settings', 'read')] },
    async (request) => {
      return getSettings(request.auth.tenant_id, 'accounting');
    },
  );

  // PUT /api/settings/accounting
  app.put(
    '/api/settings/accounting',
    { preHandler: [...preHandlers, requirePermission('settings', 'update')] },
    async (request) => {
      const body = request.body as Record<string, unknown>;
      return putSettings(request.auth.tenant_id, 'accounting', body);
    },
  );

  // GET /api/settings/payments
  app.get(
    '/api/settings/payments',
    { preHandler: [...preHandlers, requirePermission('settings', 'read')] },
    async (request) => {
      return getSettings(request.auth.tenant_id, 'payments');
    },
  );

  // PUT /api/settings/payments
  app.put(
    '/api/settings/payments',
    { preHandler: [...preHandlers, requirePermission('settings', 'update')] },
    async (request) => {
      const body = request.body as Record<string, unknown>;
      return putSettings(request.auth.tenant_id, 'payments', body);
    },
  );

  // GET /api/settings/ppf
  app.get(
    '/api/settings/ppf',
    { preHandler: [...preHandlers, requirePermission('settings', 'read')] },
    async (request) => {
      return getSettings(request.auth.tenant_id, 'ppf');
    },
  );

  // PUT /api/settings/ppf
  app.put(
    '/api/settings/ppf',
    { preHandler: [...preHandlers, requirePermission('settings', 'update')] },
    async (request) => {
      const body = request.body as Record<string, unknown>;
      return putSettings(request.auth.tenant_id, 'ppf', body);
    },
  );
}
