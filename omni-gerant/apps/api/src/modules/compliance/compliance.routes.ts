import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague X : conformite sectorielle
// X1 : HACCP (restauration) — temperatures, DLC, fiches sanitaires
// X2 : Decennale BTP — check auto assurance decennale par chantier
// X3 : Registre unique du personnel — deja expose via /api/hr/registry (vague O1)

const haccpSchema = z.object({
  kind: z.enum(['temperature', 'cleaning', 'delivery', 'expiration', 'oil_change', 'other']),
  area: z.string().max(100).optional().nullable(),
  equipment: z.string().max(100).optional().nullable(),
  temperature_c: z.number().min(-50).max(250).optional().nullable(),
  threshold_min_c: z.number().min(-50).max(250).optional().nullable(),
  threshold_max_c: z.number().min(-50).max(250).optional().nullable(),
  product_name: z.string().max(200).optional().nullable(),
  batch_number: z.string().max(100).optional().nullable(),
  expiry_date: z.coerce.date().optional().nullable(),
  supplier_name: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  corrective_action: z.string().max(1000).optional().nullable(),
  attachment_url: z.string().url().optional().nullable(),
  recorded_at: z.coerce.date().optional().nullable(),
});

const chantierSchema = z.object({
  name: z.string().min(1).max(200),
  client_id: z.string().uuid().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  work_type: z.enum(['gros_oeuvre', 'second_oeuvre', 'renovation', 'neuf', 'autre']).optional().nullable(),
  start_date: z.coerce.date(),
  estimated_end_date: z.coerce.date().optional().nullable(),
  end_date: z.coerce.date().optional().nullable(),
  budget_ht_cents: z.number().int().min(0).default(0),
  decennale_required: z.boolean().default(true),
  notes: z.string().max(2000).optional().nullable(),
});

async function nextChantierNumber(tenantId: string): Promise<string> {
  const { prisma } = await import('@zenadmin/db');
  const year = new Date().getFullYear();
  const last = await (prisma as unknown as { btpChantier?: { findFirst?: Function } })
    .btpChantier?.findFirst?.({
      where: { tenant_id: tenantId, number: { startsWith: `CHT-${year}-` } },
      orderBy: { number: 'desc' },
      select: { number: true },
    }) as { number: string } | null;
  const next = last ? parseInt(last.number.split('-')[2] ?? '0', 10) + 1 : 1;
  return `CHT-${year}-${String(next).padStart(3, '0')}`;
}

async function checkDecennale(tenantId: string, chantierStart: Date, chantierEnd?: Date | null): Promise<{ ok: boolean; policy_id: string | null; reason: string | null }> {
  const { prisma } = await import('@zenadmin/db');
  const policies = await prisma.insurancePolicy.findMany({
    where: {
      tenant_id: tenantId,
      type: 'decennale',
      status: 'active',
      deleted_at: null,
    },
    orderBy: { end_date: 'desc' },
  });
  if (policies.length === 0) {
    return { ok: false, policy_id: null, reason: 'Aucune police decennale active.' };
  }
  const end = chantierEnd ?? new Date(chantierStart.getTime() + 365 * 86_400_000);
  const covered = policies.find((p: { id: string; start_date: Date; end_date: Date }) => p.start_date <= chantierStart && p.end_date >= end);
  if (covered) return { ok: true, policy_id: covered.id, reason: null };
  return { ok: false, policy_id: null, reason: 'Aucune police decennale ne couvre la periode du chantier.' };
}

export async function complianceRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // ==== X1 : HACCP ====

  app.get('/api/compliance/haccp', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const q = request.query as { kind?: string; from?: string; to?: string; non_compliant?: string };
    const { prisma } = await import('@zenadmin/db');
    const where: Record<string, unknown> = {
      tenant_id: request.auth.tenant_id,
      ...(q.kind ? { kind: q.kind } : {}),
      ...(q.non_compliant === 'true' ? { is_compliant: false } : {}),
    };
    if (q.from || q.to) {
      where['recorded_at'] = {
        ...(q.from ? { gte: new Date(q.from) } : {}),
        ...(q.to ? { lte: new Date(q.to) } : {}),
      };
    }
    const items = await (prisma as unknown as { haccpRecord?: { findMany?: Function } })
      .haccpRecord?.findMany?.({
        where,
        orderBy: { recorded_at: 'desc' },
        take: 500,
      }) ?? [];
    return { items };
  });

  app.post('/api/compliance/haccp', { preHandler: preHandlers }, async (request, reply) => {
    const parsed = haccpSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    // Determiner conformite automatiquement pour temperatures
    let isCompliant = true;
    if (parsed.data.kind === 'temperature' && parsed.data.temperature_c != null) {
      if (parsed.data.threshold_min_c != null && parsed.data.temperature_c < parsed.data.threshold_min_c) isCompliant = false;
      if (parsed.data.threshold_max_c != null && parsed.data.temperature_c > parsed.data.threshold_max_c) isCompliant = false;
    }
    if (parsed.data.kind === 'expiration' && parsed.data.expiry_date && parsed.data.expiry_date < new Date()) {
      isCompliant = false;
    }

    const { prisma } = await import('@zenadmin/db');
    const created = await (prisma as unknown as { haccpRecord?: { create?: Function } })
      .haccpRecord?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          recorded_by: request.auth.user_id,
          is_compliant: isCompliant,
          ...parsed.data,
          recorded_at: parsed.data.recorded_at ?? new Date(),
        },
      });
    return reply.status(201).send(created);
  });

  // Alertes HACCP : produits proches DLC + non conformites recentes
  app.get('/api/compliance/haccp/alerts', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { expiring: [], non_compliant: [] };
    const { prisma } = await import('@zenadmin/db');
    const in7days = new Date();
    in7days.setDate(in7days.getDate() + 7);
    const now = new Date();
    const last7 = new Date(now.getTime() - 7 * 86_400_000);

    const expiring = await (prisma as unknown as { haccpRecord?: { findMany?: Function } })
      .haccpRecord?.findMany?.({
        where: {
          tenant_id: request.auth.tenant_id,
          kind: 'expiration',
          expiry_date: { gte: now, lte: in7days },
        },
        orderBy: { expiry_date: 'asc' },
      }) ?? [];
    const nonCompliant = await (prisma as unknown as { haccpRecord?: { findMany?: Function } })
      .haccpRecord?.findMany?.({
        where: {
          tenant_id: request.auth.tenant_id,
          is_compliant: false,
          recorded_at: { gte: last7 },
        },
        orderBy: { recorded_at: 'desc' },
      }) ?? [];
    return { expiring, non_compliant: nonCompliant };
  });

  // ==== X2 : Chantiers BTP + decennale ====

  app.get('/api/compliance/chantiers', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const q = request.query as { status?: string };
    const items = await (prisma as unknown as { btpChantier?: { findMany?: Function } })
      .btpChantier?.findMany?.({
        where: {
          tenant_id: request.auth.tenant_id,
          deleted_at: null,
          ...(q.status ? { status: q.status } : {}),
        },
        orderBy: { start_date: 'desc' },
      }) ?? [];
    return { items };
  });

  app.post('/api/compliance/chantiers', { preHandler: preHandlers }, async (request, reply) => {
    const parsed = chantierSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const number = await nextChantierNumber(request.auth.tenant_id);
    // Check decennale auto
    const check = parsed.data.decennale_required
      ? await checkDecennale(request.auth.tenant_id, parsed.data.start_date, parsed.data.estimated_end_date ?? parsed.data.end_date)
      : { ok: true, policy_id: null, reason: null };

    const { prisma } = await import('@zenadmin/db');
    const created = await (prisma as unknown as { btpChantier?: { create?: Function } })
      .btpChantier?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          number,
          ...parsed.data,
          decennale_ok: check.ok,
          decennale_checked_at: new Date(),
          decennale_policy_id: check.policy_id,
        },
      });

    return reply.status(201).send({
      chantier: created,
      decennale_check: {
        ok: check.ok,
        reason: check.reason,
        policy_id: check.policy_id,
      },
    });
  });

  app.post('/api/compliance/chantiers/:id/check-decennale', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const chantier = await (prisma as unknown as { btpChantier?: { findFirst?: Function } })
      .btpChantier?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id, deleted_at: null } }) as
      { id: string; start_date: Date; estimated_end_date: Date | null; end_date: Date | null; decennale_required: boolean } | null;
    if (!chantier) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Chantier introuvable.' } });
    if (!chantier.decennale_required) {
      return { ok: true, skipped: true, reason: 'Decennale non requise pour ce chantier.' };
    }
    const check = await checkDecennale(request.auth.tenant_id, chantier.start_date, chantier.estimated_end_date ?? chantier.end_date);
    await (prisma as unknown as { btpChantier?: { update?: Function } })
      .btpChantier?.update?.({
        where: { id },
        data: {
          decennale_ok: check.ok,
          decennale_checked_at: new Date(),
          decennale_policy_id: check.policy_id,
        },
      });
    return { ok: check.ok, policy_id: check.policy_id, reason: check.reason };
  });

  // X2 : alertes — chantiers sans decennale active
  app.get('/api/compliance/chantiers/alerts', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const items = await (prisma as unknown as { btpChantier?: { findMany?: Function } })
      .btpChantier?.findMany?.({
        where: {
          tenant_id: request.auth.tenant_id,
          deleted_at: null,
          decennale_required: true,
          decennale_ok: false,
          status: { in: ['planned', 'in_progress'] },
        },
        orderBy: { start_date: 'asc' },
      }) ?? [];
    return { items };
  });
}
