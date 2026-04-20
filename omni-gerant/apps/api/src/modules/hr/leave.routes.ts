import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague O1 : conges (CP/RTT/maladie/etc)

const createLeaveSchema = z.object({
  employee_id: z.string().uuid(),
  kind: z.enum(['paid', 'rtt', 'sick', 'unpaid', 'maternity', 'paternity', 'family']),
  starts_at: z.coerce.date(),
  ends_at: z.coerce.date(),
  reason: z.string().max(500).optional().nullable(),
}).refine((d) => d.ends_at >= d.starts_at, { message: 'ends_at doit etre apres starts_at' });

function countWorkingDays(from: Date, to: Date): number {
  let count = 0;
  const cur = new Date(from);
  while (cur <= to) {
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

export async function leaveRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  app.get('/api/hr/leaves', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const q = request.query as { employee_id?: string; status?: string };
    const items = await (prisma as unknown as { leaveRequest?: { findMany?: Function } })
      .leaveRequest?.findMany?.({
        where: {
          tenant_id: request.auth.tenant_id,
          ...(q.employee_id ? { employee_id: q.employee_id } : {}),
          ...(q.status ? { status: q.status } : {}),
        },
        orderBy: { starts_at: 'desc' },
        take: 200,
      }) ?? [];
    return { items };
  });

  app.post('/api/hr/leaves', { preHandler: preHandlers }, async (request, reply) => {
    const parsed = createLeaveSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const days = countWorkingDays(parsed.data.starts_at, parsed.data.ends_at);
    const { prisma } = await import('@zenadmin/db');
    const created = await (prisma as unknown as { leaveRequest?: { create?: Function } })
      .leaveRequest?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          employee_id: parsed.data.employee_id,
          kind: parsed.data.kind,
          starts_at: parsed.data.starts_at,
          ends_at: parsed.data.ends_at,
          days_count: days,
          reason: parsed.data.reason ?? null,
          status: 'pending',
        },
      });
    return reply.status(201).send(created);
  });

  app.post('/api/hr/leaves/:id/approve', { preHandler: [...preHandlers, requirePermission('legal', 'update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const p = prisma as unknown as { leaveRequest?: { updateMany?: Function; findFirst?: Function }; leaveBalance?: { upsert?: Function } };
    await p.leaveRequest?.updateMany?.({
      where: { id, tenant_id: request.auth.tenant_id, status: 'pending' },
      data: { status: 'approved', approver_id: request.auth.user_id, approved_at: new Date() },
    });
    const lr = await p.leaveRequest?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id } }) as
      { kind: string; days_count: number; employee_id: string; starts_at: Date } | null;
    if (lr && lr.kind === 'paid') {
      const year = new Date(lr.starts_at).getFullYear();
      await p.leaveBalance?.upsert?.({
        where: { tenant_id_employee_id_year: { tenant_id: request.auth.tenant_id, employee_id: lr.employee_id, year } },
        update: { paid_taken: { increment: lr.days_count } },
        create: { tenant_id: request.auth.tenant_id, employee_id: lr.employee_id, year, paid_acquired: 0, paid_taken: lr.days_count, rtt_acquired: 0, rtt_taken: 0 },
      });
    }
    return { approved: true };
  });

  app.post('/api/hr/leaves/:id/refuse', { preHandler: [...preHandlers, requirePermission('legal', 'update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    await (prisma as unknown as { leaveRequest?: { updateMany?: Function } })
      .leaveRequest?.updateMany?.({
        where: { id, tenant_id: request.auth.tenant_id, status: 'pending' },
        data: { status: 'refused', approver_id: request.auth.user_id, approved_at: new Date() },
      });
    return { refused: true };
  });

  app.get('/api/hr/leaves/balances', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const year = Number((request.query as { year?: string }).year ?? new Date().getFullYear());
    const items = await (prisma as unknown as { leaveBalance?: { findMany?: Function } })
      .leaveBalance?.findMany?.({
        where: { tenant_id: request.auth.tenant_id, year },
      }) ?? [];
    return { items };
  });
}
