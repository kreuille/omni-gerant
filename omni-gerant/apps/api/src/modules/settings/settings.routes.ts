import type { FastifyInstance } from 'fastify';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// BUSINESS RULE [CDC-3.2]: Settings endpoints pour accounting, payments, PPF, connectors
// Plan 3 : persistence dans tenant.settings (JSON) via Prisma

type SettingsSection = 'accounting' | 'payments' | 'ppf' | 'connectors';

const settingsMemoryStore = new Map<string, Record<string, unknown>>(); // fallback si pas de DB

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
  connectors: {
    bridge_banking_enabled: false,
    gocardless_enabled: false,
    pappers_enabled: true,
    sirene_enabled: true,
    insee_enabled: true,
    resend_enabled: false,
  },
};

async function getSettings(tenantId: string, section: SettingsSection): Promise<Record<string, unknown>> {
  if (process.env['DATABASE_URL']) {
    try {
      const { prisma } = await import('@zenadmin/db');
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      const all = (tenant?.settings ?? {}) as Record<string, Record<string, unknown> | undefined>;
      return { ...DEFAULTS[section], ...(all[section] ?? {}) };
    } catch {
      // fallback memoire
    }
  }
  const key = `${tenantId}:${section}`;
  return settingsMemoryStore.get(key) ?? { ...DEFAULTS[section] };
}

async function putSettings(tenantId: string, section: SettingsSection, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const current = await getSettings(tenantId, section);
  const updated = { ...current, ...data };

  if (process.env['DATABASE_URL']) {
    try {
      const { prisma } = await import('@zenadmin/db');
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      const all = (tenant?.settings ?? {}) as Record<string, Record<string, unknown>>;
      all[section] = updated;
      // Prisma JSON column : cast explicite
      await prisma.tenant.update({ where: { id: tenantId }, data: { settings: all as unknown as Parameters<typeof prisma.tenant.update>[0]['data']['settings'] } });
      return updated;
    } catch {
      // fallback memoire
    }
  }
  settingsMemoryStore.set(`${tenantId}:${section}`, updated);
  return updated;
}

export async function settingsRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // GET /api/settings — recap global
  app.get(
    '/api/settings',
    { preHandler: [...preHandlers, requirePermission('settings', 'read')] },
    async (request) => {
      const tenantId = request.auth.tenant_id;
      const [accounting, payments, ppf, connectors] = await Promise.all([
        getSettings(tenantId, 'accounting'),
        getSettings(tenantId, 'payments'),
        getSettings(tenantId, 'ppf'),
        getSettings(tenantId, 'connectors'),
      ]);
      return { accounting, payments, ppf, connectors };
    },
  );

  // Helpers : generateur de GET/PUT par section
  function registerSection(section: SettingsSection) {
    app.get(
      `/api/settings/${section}`,
      { preHandler: [...preHandlers, requirePermission('settings', 'read')] },
      async (request) => getSettings(request.auth.tenant_id, section),
    );
    app.put(
      `/api/settings/${section}`,
      { preHandler: [...preHandlers, requirePermission('settings', 'update')] },
      async (request) => {
        const body = (request.body ?? {}) as Record<string, unknown>;
        return putSettings(request.auth.tenant_id, section, body);
      },
    );
  }

  registerSection('accounting');
  registerSection('payments');
  registerSection('ppf');
  registerSection('connectors');
}
