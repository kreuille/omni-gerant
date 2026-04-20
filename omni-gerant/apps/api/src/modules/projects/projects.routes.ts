import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague S2 : projets + KPIs temps/budget
// Vague S3 : facturation au temps (endpoint /invoice)

const phaseSchema = z.object({
  name: z.string().min(1).max(100),
  status: z.enum(['pending', 'in_progress', 'done']).default('pending'),
  budget_cents: z.number().int().min(0).default(0),
  start: z.string().optional().nullable(),
  end: z.string().optional().nullable(),
});

const projectSchema = z.object({
  client_id: z.string().uuid().optional().nullable(),
  manager_user_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(['active', 'on_hold', 'completed', 'cancelled']).default('active'),
  start_date: z.coerce.date().optional().nullable(),
  end_date: z.coerce.date().optional().nullable(),
  budget_cents: z.number().int().min(0).default(0),
  billable: z.boolean().default(true),
  default_hourly_rate_cents: z.number().int().min(0).default(0),
  phases: z.array(phaseSchema).default([]),
});

const billSchema = z.object({
  due_days: z.number().int().min(0).max(365).default(30),
  group_by: z.enum(['project', 'phase', 'user', 'day']).default('project'),
  tva_rate: z.number().int().refine((v) => [0, 210, 550, 1000, 2000].includes(v)).default(2000),
  notes: z.string().max(1000).optional().nullable(),
});

async function nextProjectCode(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const { prisma } = await import('@zenadmin/db');
  const last = await (prisma as unknown as { project?: { findFirst?: Function } })
    .project?.findFirst?.({
      where: { tenant_id: tenantId, code: { startsWith: `PRJ-${year}-` } },
      orderBy: { code: 'desc' },
      select: { code: true },
    }) as { code: string } | null;
  const next = last ? parseInt(last.code.split('-')[2] ?? '0', 10) + 1 : 1;
  return `PRJ-${year}-${String(next).padStart(3, '0')}`;
}

export async function projectsRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  app.get('/api/projects', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const q = request.query as { status?: string; client_id?: string };
    const where: Record<string, unknown> = {
      tenant_id: request.auth.tenant_id,
      deleted_at: null,
      ...(q.status ? { status: q.status } : {}),
      ...(q.client_id ? { client_id: q.client_id } : {}),
    };
    const items = await (prisma as unknown as { project?: { findMany?: Function } })
      .project?.findMany?.({ where, orderBy: { created_at: 'desc' } }) ?? [];
    return { items };
  });

  app.get('/api/projects/:id', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const project = await (prisma as unknown as { project?: { findFirst?: Function } })
      .project?.findFirst?.({
        where: { id, tenant_id: request.auth.tenant_id, deleted_at: null },
      });
    if (!project) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Projet introuvable.' } });
    return project;
  });

  app.post('/api/projects', { preHandler: preHandlers }, async (request, reply) => {
    const parsed = projectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const code = await nextProjectCode(request.auth.tenant_id);
    const { prisma } = await import('@zenadmin/db');
    const created = await (prisma as unknown as { project?: { create?: Function } })
      .project?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          code,
          ...parsed.data,
          phases: parsed.data.phases as unknown as Record<string, unknown>,
        },
      });
    return reply.status(201).send(created);
  });

  app.patch('/api/projects/:id', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = projectSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const { prisma } = await import('@zenadmin/db');
    const existing = await (prisma as unknown as { project?: { findFirst?: Function } })
      .project?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id, deleted_at: null } });
    if (!existing) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Projet introuvable.' } });
    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.phases) data.phases = parsed.data.phases as unknown as Record<string, unknown>;
    const updated = await (prisma as unknown as { project?: { update?: Function } })
      .project?.update?.({ where: { id }, data });
    return updated;
  });

  app.delete('/api/projects/:id', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const existing = await (prisma as unknown as { project?: { findFirst?: Function } })
      .project?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id, deleted_at: null } });
    if (!existing) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Projet introuvable.' } });
    await (prisma as unknown as { project?: { update?: Function } })
      .project?.update?.({ where: { id }, data: { deleted_at: new Date() } });
    return reply.status(204).send();
  });

  // KPIs temps/budget pour un projet
  app.get('/api/projects/:id/kpis', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const project = await (prisma as unknown as { project?: { findFirst?: Function } })
      .project?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id, deleted_at: null } }) as
      { id: string; budget_cents: number; logged_minutes: number; invoiced_minutes: number; spent_cents: number; default_hourly_rate_cents: number } | null;
    if (!project) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Projet introuvable.' } });

    const entries = await (prisma as unknown as { timeEntry?: { findMany?: Function } })
      .timeEntry?.findMany?.({
        where: { tenant_id: request.auth.tenant_id, project_id: id, deleted_at: null },
        select: { minutes: true, hourly_rate_cents: true, status: true, billable: true },
      }) as Array<{ minutes: number; hourly_rate_cents: number; status: string; billable: boolean }> ?? [];

    const total = entries.reduce((acc, e) => {
      const value = Math.round((e.minutes / 60) * e.hourly_rate_cents);
      acc.loggedMinutes += e.minutes;
      acc.valueCents += e.billable ? value : 0;
      if (e.status === 'approved' && e.billable) acc.toInvoiceCents += value;
      if (e.status === 'invoiced' && e.billable) acc.invoicedCents += value;
      return acc;
    }, { loggedMinutes: 0, valueCents: 0, toInvoiceCents: 0, invoicedCents: 0 });

    const budget = project.budget_cents;
    return {
      project_id: id,
      budget_cents: budget,
      logged_minutes: total.loggedMinutes,
      total_value_cents: total.valueCents,
      to_invoice_cents: total.toInvoiceCents,
      invoiced_cents: total.invoicedCents,
      remaining_budget_cents: Math.max(0, budget - total.valueCents),
      budget_consumption_percent: budget > 0 ? Math.round((total.valueCents / budget) * 100) : 0,
    };
  });

  // S3 : facturation au temps — cree une facture avec les time entries approuves non factures
  app.post('/api/projects/:id/invoice', { preHandler: [...preHandlers, requirePermission('invoice', 'create')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = billSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const { prisma } = await import('@zenadmin/db');
    const project = await (prisma as unknown as { project?: { findFirst?: Function } })
      .project?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id, deleted_at: null } }) as
      { id: string; name: string; code: string; client_id: string | null; billable: boolean } | null;
    if (!project) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Projet introuvable.' } });
    if (!project.client_id) {
      return reply.status(400).send({ error: { code: 'NO_CLIENT', message: 'Projet interne sans client associe — impossible de facturer.' } });
    }
    if (!project.billable) {
      return reply.status(400).send({ error: { code: 'NOT_BILLABLE', message: 'Projet marque comme non facturable.' } });
    }

    const entries = await (prisma as unknown as { timeEntry?: { findMany?: Function } })
      .timeEntry?.findMany?.({
        where: {
          tenant_id: request.auth.tenant_id,
          project_id: id,
          status: 'approved',
          billable: true,
          invoice_id: null,
          deleted_at: null,
        },
        orderBy: { entry_date: 'asc' },
      }) as Array<{ id: string; minutes: number; hourly_rate_cents: number; entry_date: Date; user_id: string; phase: string | null; description: string | null }> ?? [];

    if (entries.length === 0) {
      return reply.status(400).send({ error: { code: 'NO_ENTRIES', message: 'Aucune ligne de temps approuvee a facturer.' } });
    }

    // Regrouper selon group_by
    const groups = new Map<string, { label: string; minutes: number; value_cents: number; ids: string[] }>();
    for (const e of entries) {
      let key = project.name;
      let label = `Prestations projet ${project.code} — ${project.name}`;
      if (parsed.data.group_by === 'phase') {
        key = e.phase ?? '(aucune phase)';
        label = `${project.code} — ${key}`;
      } else if (parsed.data.group_by === 'user') {
        key = e.user_id;
        label = `${project.code} — prestations (${e.user_id.slice(0, 8)})`;
      } else if (parsed.data.group_by === 'day') {
        key = e.entry_date.toISOString().slice(0, 10);
        label = `${project.code} — ${key}`;
      }
      const g = groups.get(key) ?? { label, minutes: 0, value_cents: 0, ids: [] };
      g.minutes += e.minutes;
      g.value_cents += Math.round((e.minutes / 60) * e.hourly_rate_cents);
      g.ids.push(e.id);
      groups.set(key, g);
    }

    // Numerotation facture
    const year = new Date().getFullYear();
    const lastInv = await prisma.invoice.findFirst({
      where: { tenant_id: request.auth.tenant_id, number: { startsWith: `FAC-${year}-` } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const invNext = lastInv ? parseInt(lastInv.number.split('-')[2] ?? '0', 10) + 1 : 1;
    const number = `FAC-${year}-${String(invNext).padStart(5, '0')}`;

    const tvaRate = parsed.data.tva_rate;
    const lines = [...groups.values()];
    const totalHtCents = lines.reduce((acc, l) => acc + l.value_cents, 0);
    const totalTvaCents = Math.round((totalHtCents * tvaRate) / 10_000);
    const totalTtcCents = totalHtCents + totalTvaCents;

    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + parsed.data.due_days);

    const invoice = await prisma.invoice.create({
      data: {
        tenant_id: request.auth.tenant_id,
        client_id: project.client_id,
        number,
        type: 'standard',
        status: 'draft',
        issue_date: issueDate,
        due_date: dueDate,
        payment_terms: parsed.data.due_days,
        notes: parsed.data.notes ?? `Prestations projet ${project.code} — ${project.name}`,
        total_ht_cents: totalHtCents,
        total_tva_cents: totalTvaCents,
        total_ttc_cents: totalTtcCents,
        remaining_cents: totalTtcCents,
        lines: {
          create: lines.map((l, idx) => ({
            position: idx + 1,
            label: l.label,
            description: `${(l.minutes / 60).toFixed(2)} h`,
            quantity: Number((l.minutes / 60).toFixed(3)),
            unit: 'hour',
            unit_price_cents: l.minutes > 0 ? Math.round(l.value_cents / (l.minutes / 60)) : 0,
            tva_rate: tvaRate,
            total_ht_cents: l.value_cents,
          })),
        },
      },
      include: { lines: true },
    });

    // Marquer les time entries comme facturees
    const allEntryIds = lines.flatMap((l) => l.ids);
    await (prisma as unknown as { timeEntry?: { updateMany?: Function } })
      .timeEntry?.updateMany?.({
        where: { id: { in: allEntryIds }, tenant_id: request.auth.tenant_id },
        data: { status: 'invoiced', invoice_id: invoice.id },
      });

    // Mettre a jour les stats projet
    const totalMinutes = lines.reduce((acc, l) => acc + l.minutes, 0);
    await (prisma as unknown as { project?: { update?: Function } })
      .project?.update?.({
        where: { id },
        data: {
          invoiced_minutes: { increment: totalMinutes },
          spent_cents: { increment: totalHtCents },
        },
      });

    return reply.status(201).send({
      invoice_id: invoice.id,
      invoice_number: invoice.number,
      entries_count: entries.length,
      total_minutes: totalMinutes,
      total_ht_cents: totalHtCents,
      total_ttc_cents: totalTtcCents,
    });
  });
}
