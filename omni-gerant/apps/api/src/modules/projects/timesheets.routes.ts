import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague S1 : timesheets — employes pointent leur temps par projet, tarification au taux horaire.

const timeEntrySchema = z.object({
  project_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  phase: z.string().max(100).optional().nullable(),
  entry_date: z.coerce.date(),
  minutes: z.number().int().min(1).max(1440),
  hourly_rate_cents: z.number().int().min(0).optional(),
  billable: z.boolean().default(true),
  description: z.string().max(1000).optional().nullable(),
});

async function resolveHourlyRate(
  tenantId: string,
  projectId: string,
  userRate?: number,
): Promise<number> {
  if (typeof userRate === 'number' && userRate >= 0) return userRate;
  const { prisma } = await import('@zenadmin/db');
  const project = await (prisma as unknown as { project?: { findFirst?: Function } })
    .project?.findFirst?.({
      where: { id: projectId, tenant_id: tenantId, deleted_at: null },
      select: { default_hourly_rate_cents: true },
    }) as { default_hourly_rate_cents: number } | null;
  return project?.default_hourly_rate_cents ?? 0;
}

export async function timesheetsRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  app.get('/api/timesheets', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const q = request.query as {
      project_id?: string;
      user_id?: string;
      status?: string;
      from?: string;
      to?: string;
    };
    const where: Record<string, unknown> = {
      tenant_id: request.auth.tenant_id,
      deleted_at: null,
      ...(q.project_id ? { project_id: q.project_id } : {}),
      ...(q.user_id ? { user_id: q.user_id } : {}),
      ...(q.status ? { status: q.status } : {}),
    };
    if (q.from || q.to) {
      where['entry_date'] = {
        ...(q.from ? { gte: new Date(q.from) } : {}),
        ...(q.to ? { lte: new Date(q.to) } : {}),
      };
    }
    const items = await (prisma as unknown as { timeEntry?: { findMany?: Function } })
      .timeEntry?.findMany?.({
        where,
        orderBy: [{ entry_date: 'desc' }, { created_at: 'desc' }],
        take: 500,
      }) ?? [];
    return { items };
  });

  app.post('/api/timesheets', { preHandler: preHandlers }, async (request, reply) => {
    const parsed = timeEntrySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const { prisma } = await import('@zenadmin/db');
    const project = await (prisma as unknown as { project?: { findFirst?: Function } })
      .project?.findFirst?.({
        where: { id: parsed.data.project_id, tenant_id: request.auth.tenant_id, deleted_at: null },
        select: { id: true, status: true },
      }) as { id: string; status: string } | null;
    if (!project) {
      return reply.status(404).send({ error: { code: 'PROJECT_NOT_FOUND', message: 'Projet introuvable.' } });
    }
    if (project.status === 'cancelled') {
      return reply.status(409).send({ error: { code: 'PROJECT_CANCELLED', message: 'Projet annule — saisie interdite.' } });
    }

    const hourlyRate = await resolveHourlyRate(request.auth.tenant_id, parsed.data.project_id, parsed.data.hourly_rate_cents);

    const created = await (prisma as unknown as { timeEntry?: { create?: Function } })
      .timeEntry?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          user_id: parsed.data.user_id ?? request.auth.user_id,
          project_id: parsed.data.project_id,
          phase: parsed.data.phase ?? null,
          entry_date: parsed.data.entry_date,
          minutes: parsed.data.minutes,
          hourly_rate_cents: hourlyRate,
          billable: parsed.data.billable,
          description: parsed.data.description ?? null,
          status: 'draft',
        },
      });

    // Mettre a jour les minutes loggees du projet
    await (prisma as unknown as { project?: { update?: Function } })
      .project?.update?.({
        where: { id: parsed.data.project_id },
        data: { logged_minutes: { increment: parsed.data.minutes } },
      });

    return reply.status(201).send(created);
  });

  app.patch('/api/timesheets/:id', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = timeEntrySchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const { prisma } = await import('@zenadmin/db');
    const existing = await (prisma as unknown as { timeEntry?: { findFirst?: Function } })
      .timeEntry?.findFirst?.({
        where: { id, tenant_id: request.auth.tenant_id, deleted_at: null },
      }) as { id: string; status: string; minutes: number; project_id: string } | null;
    if (!existing) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Pointage introuvable.' } });
    }
    if (existing.status === 'invoiced') {
      return reply.status(409).send({ error: { code: 'ALREADY_INVOICED', message: 'Pointage deja facture — modification impossible.' } });
    }
    if (existing.status === 'approved' && (parsed.data.minutes || parsed.data.hourly_rate_cents)) {
      return reply.status(409).send({ error: { code: 'APPROVED_LOCKED', message: 'Pointage approuve — rejetez-le avant modification.' } });
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.minutes !== undefined && parsed.data.minutes !== existing.minutes) {
      const delta = parsed.data.minutes - existing.minutes;
      await (prisma as unknown as { project?: { update?: Function } })
        .project?.update?.({
          where: { id: existing.project_id },
          data: { logged_minutes: { increment: delta } },
        });
    }
    const updated = await (prisma as unknown as { timeEntry?: { update?: Function } })
      .timeEntry?.update?.({ where: { id }, data });
    return updated;
  });

  app.delete('/api/timesheets/:id', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const existing = await (prisma as unknown as { timeEntry?: { findFirst?: Function } })
      .timeEntry?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id, deleted_at: null } }) as
      { id: string; status: string; minutes: number; project_id: string } | null;
    if (!existing) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Pointage introuvable.' } });
    if (existing.status === 'invoiced') {
      return reply.status(409).send({ error: { code: 'ALREADY_INVOICED', message: 'Pointage deja facture.' } });
    }
    await (prisma as unknown as { timeEntry?: { update?: Function } })
      .timeEntry?.update?.({ where: { id }, data: { deleted_at: new Date() } });
    await (prisma as unknown as { project?: { update?: Function } })
      .project?.update?.({
        where: { id: existing.project_id },
        data: { logged_minutes: { decrement: existing.minutes } },
      });
    return reply.status(204).send();
  });

  // Workflow : submit / approve / reject
  app.post('/api/timesheets/:id/submit', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const existing = await (prisma as unknown as { timeEntry?: { findFirst?: Function } })
      .timeEntry?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id, deleted_at: null } }) as
      { id: string; status: string } | null;
    if (!existing) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Pointage introuvable.' } });
    if (existing.status !== 'draft' && existing.status !== 'rejected') {
      return reply.status(409).send({ error: { code: 'INVALID_STATE', message: `Impossible de soumettre depuis ${existing.status}.` } });
    }
    const updated = await (prisma as unknown as { timeEntry?: { update?: Function } })
      .timeEntry?.update?.({ where: { id }, data: { status: 'submitted' } });
    return updated;
  });

  app.post('/api/timesheets/:id/approve', { preHandler: [...preHandlers, requirePermission('client', 'update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const existing = await (prisma as unknown as { timeEntry?: { findFirst?: Function } })
      .timeEntry?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id, deleted_at: null } }) as
      { id: string; status: string } | null;
    if (!existing) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Pointage introuvable.' } });
    if (existing.status !== 'submitted') {
      return reply.status(409).send({ error: { code: 'INVALID_STATE', message: 'Seuls les pointages soumis peuvent etre approuves.' } });
    }
    const updated = await (prisma as unknown as { timeEntry?: { update?: Function } })
      .timeEntry?.update?.({
        where: { id },
        data: { status: 'approved', approved_by: request.auth.user_id, approved_at: new Date() },
      });
    return updated;
  });

  app.post('/api/timesheets/:id/reject', { preHandler: [...preHandlers, requirePermission('client', 'update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const existing = await (prisma as unknown as { timeEntry?: { findFirst?: Function } })
      .timeEntry?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id, deleted_at: null } }) as
      { id: string; status: string } | null;
    if (!existing) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Pointage introuvable.' } });
    if (existing.status === 'invoiced') {
      return reply.status(409).send({ error: { code: 'ALREADY_INVOICED', message: 'Pointage deja facture.' } });
    }
    const updated = await (prisma as unknown as { timeEntry?: { update?: Function } })
      .timeEntry?.update?.({
        where: { id },
        data: { status: 'rejected', approved_by: null, approved_at: null },
      });
    return updated;
  });

  // Recapitulatif par utilisateur / par semaine
  app.get('/api/timesheets/summary', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { by_user: [], by_project: [], by_status: [] };
    const { prisma } = await import('@zenadmin/db');
    const q = request.query as { from?: string; to?: string };
    const where: Record<string, unknown> = {
      tenant_id: request.auth.tenant_id,
      deleted_at: null,
    };
    if (q.from || q.to) {
      where['entry_date'] = {
        ...(q.from ? { gte: new Date(q.from) } : {}),
        ...(q.to ? { lte: new Date(q.to) } : {}),
      };
    }
    const entries = await (prisma as unknown as { timeEntry?: { findMany?: Function } })
      .timeEntry?.findMany?.({
        where,
        select: {
          user_id: true, project_id: true, minutes: true, status: true,
          hourly_rate_cents: true, billable: true,
        },
      }) as Array<{ user_id: string; project_id: string; minutes: number; status: string; hourly_rate_cents: number; billable: boolean }> ?? [];

    const aggregate = <K extends string>(key: K) => {
      const map = new Map<string, { key: string; minutes: number; value_cents: number; count: number }>();
      for (const e of entries) {
        const k = (e as unknown as Record<string, string | number>)[key] as string;
        const v = map.get(k) ?? { key: k, minutes: 0, value_cents: 0, count: 0 };
        v.minutes += e.minutes;
        v.count += 1;
        if (e.billable) v.value_cents += Math.round((e.minutes / 60) * e.hourly_rate_cents);
        map.set(k, v);
      }
      return [...map.values()];
    };

    return {
      by_user: aggregate('user_id'),
      by_project: aggregate('project_id'),
      by_status: aggregate('status'),
    };
  });
}
