import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague Q : ticketing support client.

// SLA par priorite : first response + resolution (en heures)
const SLA_HOURS: Record<string, { first_response: number; resolution: number }> = {
  low:    { first_response: 48, resolution: 240 },
  normal: { first_response: 12, resolution: 72 },
  high:   { first_response: 4,  resolution: 24 },
  urgent: { first_response: 1,  resolution: 8 },
};

const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  channel: z.enum(['portal', 'email', 'phone', 'chat']).default('portal'),
  requester_email: z.string().email(),
  requester_name: z.string().max(200).optional(),
  client_id: z.string().uuid().optional(),
  tags: z.array(z.string().max(30)).default([]),
});

const updateTicketSchema = z.object({
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  status: z.enum(['open', 'pending', 'resolved', 'closed']).optional(),
  assignee_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().max(30)).optional(),
});

const messageSchema = z.object({
  body: z.string().min(1).max(10_000),
  is_internal: z.boolean().default(false),
});

export async function supportRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  app.get('/api/support/tickets', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const q = request.query as { status?: string; priority?: string; assignee_id?: string };
    const items = await (prisma as unknown as { supportTicket?: { findMany?: Function } })
      .supportTicket?.findMany?.({
        where: {
          tenant_id: request.auth.tenant_id,
          ...(q.status ? { status: q.status } : {}),
          ...(q.priority ? { priority: q.priority } : {}),
          ...(q.assignee_id ? { assignee_id: q.assignee_id } : {}),
        },
        orderBy: [{ priority: 'desc' }, { created_at: 'desc' }],
        take: 100,
      }) ?? [];
    return { items };
  });

  app.post('/api/support/tickets', { preHandler: preHandlers }, async (request, reply) => {
    const parsed = createTicketSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const { prisma } = await import('@zenadmin/db');
    const count = await (prisma as unknown as { supportTicket?: { count?: Function } })
      .supportTicket?.count?.({ where: { tenant_id: request.auth.tenant_id } }) ?? 0;
    const ticketNumber = `TCK-${String(count + 1).padStart(6, '0')}`;
    const sla = SLA_HOURS[parsed.data.priority]!;
    const now = Date.now();
    const created = await (prisma as unknown as { supportTicket?: { create?: Function } })
      .supportTicket?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          ticket_number: ticketNumber,
          ...parsed.data,
          status: 'open',
          first_response_due_at: new Date(now + sla.first_response * 3600_000),
          resolution_due_at: new Date(now + sla.resolution * 3600_000),
        },
      });
    return reply.status(201).send(created);
  });

  app.get('/api/support/tickets/:id', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const p = prisma as unknown as {
      supportTicket?: { findFirst?: Function };
      supportMessage?: { findMany?: Function };
    };
    const ticket = await p.supportTicket?.findFirst?.({
      where: { id, tenant_id: request.auth.tenant_id },
    });
    if (!ticket) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Ticket introuvable' } });
    const messages = await p.supportMessage?.findMany?.({
      where: { ticket_id: id, tenant_id: request.auth.tenant_id },
      orderBy: { created_at: 'asc' },
    }) ?? [];
    return { ticket, messages };
  });

  app.patch('/api/support/tickets/:id', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateTicketSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.' } });
    }
    const { prisma } = await import('@zenadmin/db');
    const data = parsed.data as Record<string, unknown>;
    if (data.status === 'resolved' && !data.resolved_at) data.resolved_at = new Date();
    if (data.status === 'closed' && !data.closed_at) data.closed_at = new Date();
    // SLA resetter en cas de repriorisation
    if (data.priority && typeof data.priority === 'string') {
      const sla = SLA_HOURS[data.priority];
      if (sla) {
        data.first_response_due_at = new Date(Date.now() + sla.first_response * 3600_000);
        data.resolution_due_at = new Date(Date.now() + sla.resolution * 3600_000);
      }
    }
    await (prisma as unknown as { supportTicket?: { updateMany?: Function } })
      .supportTicket?.updateMany?.({
        where: { id, tenant_id: request.auth.tenant_id },
        data,
      });
    return { ok: true };
  });

  app.post('/api/support/tickets/:id/messages', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = messageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.' } });
    }
    const { prisma } = await import('@zenadmin/db');
    const p = prisma as unknown as {
      supportMessage?: { create?: Function };
      supportTicket?: { updateMany?: Function; findFirst?: Function };
    };
    const ticket = await p.supportTicket?.findFirst?.({
      where: { id, tenant_id: request.auth.tenant_id },
    }) as { first_responded_at: Date | null } | null;
    await p.supportMessage?.create?.({
      data: {
        tenant_id: request.auth.tenant_id,
        ticket_id: id,
        author_kind: 'agent',
        author_id: request.auth.user_id,
        body: parsed.data.body,
        is_internal: parsed.data.is_internal,
      },
    });
    // Mark first_responded_at si c'est la premiere reponse non-internal
    if (ticket && !ticket.first_responded_at && !parsed.data.is_internal) {
      await p.supportTicket?.updateMany?.({
        where: { id, tenant_id: request.auth.tenant_id },
        data: { first_responded_at: new Date() },
      });
    }
    return { ok: true };
  });

  // Macros
  app.get('/api/support/macros', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const items = await (prisma as unknown as { supportMacro?: { findMany?: Function } })
      .supportMacro?.findMany?.({
        where: { tenant_id: request.auth.tenant_id },
        orderBy: { usage_count: 'desc' },
      }) ?? [];
    return { items };
  });

  app.post('/api/support/macros', { preHandler: preHandlers }, async (request, reply) => {
    const body = (request.body ?? {}) as { name?: string; body?: string; shortcut?: string };
    if (!body.name || !body.body) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'name + body requis.' } });
    }
    const { prisma } = await import('@zenadmin/db');
    const created = await (prisma as unknown as { supportMacro?: { create?: Function } })
      .supportMacro?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          name: body.name,
          body: body.body,
          shortcut: body.shortcut ?? null,
        },
      });
    return reply.status(201).send(created);
  });

  // SLA stats
  app.get('/api/support/sla/summary', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { open: 0, overdue: 0, avg_first_response_min: null };
    const { prisma } = await import('@zenadmin/db');
    const now = new Date();
    const tickets = await (prisma as unknown as { supportTicket?: { findMany?: Function } })
      .supportTicket?.findMany?.({
        where: { tenant_id: request.auth.tenant_id, status: { in: ['open', 'pending'] } },
      }) ?? [];
    const overdue = (tickets as Array<{ first_response_due_at: Date | null; first_responded_at: Date | null; resolution_due_at: Date | null }>)
      .filter((t) => (
        (t.first_response_due_at && !t.first_responded_at && t.first_response_due_at < now) ||
        (t.resolution_due_at && t.resolution_due_at < now)
      )).length;

    const withResponse = (tickets as Array<{ created_at: Date; first_responded_at: Date | null }>)
      .filter((t) => t.first_responded_at);
    const avg = withResponse.length > 0
      ? Math.round(
          withResponse.reduce((s, t) => s + ((t.first_responded_at!.getTime() - t.created_at.getTime()) / 60_000), 0) / withResponse.length,
        )
      : null;

    return { open: tickets.length, overdue, avg_first_response_min: avg };
  });
}
