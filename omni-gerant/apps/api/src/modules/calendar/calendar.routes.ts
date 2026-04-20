import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague H3 : CRUD evenements + rappels + export iCal

const eventBaseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  starts_at: z.coerce.date(),
  ends_at: z.coerce.date(),
  all_day: z.boolean().default(false),
  location: z.string().max(200).optional().nullable(),
  kind: z.enum(['appointment', 'reminder', 'deadline', 'personal']).default('appointment'),
  color: z.string().max(16).optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  quote_id: z.string().uuid().optional().nullable(),
  invoice_id: z.string().uuid().optional().nullable(),
  reminder_minutes: z.number().int().min(0).max(60 * 24 * 7).optional().nullable(),
});
const eventSchema = eventBaseSchema.refine((d) => d.ends_at >= d.starts_at, { message: 'ends_at doit etre apres starts_at' });

function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function toIcsDate(d: Date, allDay: boolean): string {
  if (allDay) {
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  return d.toISOString().replace(/[-:.]/g, '').split('.')[0] + 'Z';
}

export async function calendarRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // GET /api/calendar/events — range [from, to] optionnel
  app.get(
    '/api/calendar/events',
    { preHandler: preHandlers },
    async (request, reply) => {
      const { from, to, kind } = request.query as { from?: string; to?: string; kind?: string };
      if (!process.env['DATABASE_URL']) return { items: [] };
      try {
        const { prisma } = await import('@zenadmin/db');
        const where: Record<string, unknown> = {
          tenant_id: request.auth.tenant_id,
          deleted_at: null,
        };
        if (from || to) {
          where['starts_at'] = {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          };
        }
        if (kind) where['kind'] = kind;
        const items = await (prisma as unknown as { calendarEvent?: { findMany?: Function } })
          .calendarEvent?.findMany?.({
            where,
            orderBy: { starts_at: 'asc' },
            take: 500,
          }) ?? [];
        return { items };
      } catch (e) {
        return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: e instanceof Error ? e.message : 'unknown' } });
      }
    },
  );

  // POST /api/calendar/events
  app.post(
    '/api/calendar/events',
    { preHandler: preHandlers },
    async (request, reply) => {
      const parsed = eventSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } },
        });
      }
      const { prisma } = await import('@zenadmin/db');
      const created = await (prisma as unknown as { calendarEvent?: { create?: Function } })
        .calendarEvent?.create?.({
          data: {
            ...parsed.data,
            tenant_id: request.auth.tenant_id,
            user_id: request.auth.user_id,
          },
        });
      return reply.status(201).send(created);
    },
  );

  // PATCH /api/calendar/events/:id
  app.patch(
    '/api/calendar/events/:id',
    { preHandler: preHandlers },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = eventBaseSchema.partial().safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } },
        });
      }
      const { prisma } = await import('@zenadmin/db');
      const p = prisma as unknown as { calendarEvent?: { updateMany?: Function; findFirst?: Function } };
      await p.calendarEvent?.updateMany?.({
        where: { id, tenant_id: request.auth.tenant_id },
        data: parsed.data as Record<string, unknown>,
      });
      const updated = await p.calendarEvent?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id } });
      return updated;
    },
  );

  // DELETE /api/calendar/events/:id
  app.delete(
    '/api/calendar/events/:id',
    { preHandler: preHandlers },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { prisma } = await import('@zenadmin/db');
      await (prisma as unknown as { calendarEvent?: { updateMany?: Function } })
        .calendarEvent?.updateMany?.({
          where: { id, tenant_id: request.auth.tenant_id },
          data: { deleted_at: new Date() },
        });
      return reply.status(204).send();
    },
  );

  // GET /api/calendar/export.ics — export iCal complet
  app.get(
    '/api/calendar/export.ics',
    { preHandler: preHandlers },
    async (request, reply) => {
      if (!process.env['DATABASE_URL']) return reply.status(503).send({ error: { code: 'SERVICE_UNAVAILABLE', message: 'DB indisponible' } });
      const { prisma } = await import('@zenadmin/db');
      const events = await (prisma as unknown as { calendarEvent?: { findMany?: Function } })
        .calendarEvent?.findMany?.({
          where: { tenant_id: request.auth.tenant_id, deleted_at: null },
          orderBy: { starts_at: 'asc' },
          take: 1000,
        }) ?? [];

      const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//zenAdmin//Calendar 1.0//FR',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
      ];
      for (const ev of events as Array<{ id: string; title: string; description?: string | null; starts_at: Date; ends_at: Date; all_day: boolean; location?: string | null }>) {
        const dtStart = toIcsDate(ev.starts_at, ev.all_day);
        const dtEnd = toIcsDate(ev.ends_at, ev.all_day);
        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${ev.id}@zenadmin`);
        lines.push(`DTSTAMP:${toIcsDate(new Date(), false)}`);
        if (ev.all_day) {
          lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
          lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
        } else {
          lines.push(`DTSTART:${dtStart}`);
          lines.push(`DTEND:${dtEnd}`);
        }
        lines.push(`SUMMARY:${escapeIcsText(ev.title)}`);
        if (ev.description) lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
        if (ev.location) lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
        lines.push('END:VEVENT');
      }
      lines.push('END:VCALENDAR');

      return reply
        .type('text/calendar; charset=utf-8')
        .header('content-disposition', `attachment; filename="zenadmin-${new Date().toISOString().slice(0, 10)}.ics"`)
        .send(lines.join('\r\n'));
    },
  );

  // GET /api/calendar/upcoming — 7 prochains evts
  app.get(
    '/api/calendar/upcoming',
    { preHandler: preHandlers },
    async (request) => {
      if (!process.env['DATABASE_URL']) return { items: [] };
      const { prisma } = await import('@zenadmin/db');
      const items = await (prisma as unknown as { calendarEvent?: { findMany?: Function } })
        .calendarEvent?.findMany?.({
          where: {
            tenant_id: request.auth.tenant_id,
            deleted_at: null,
            starts_at: { gte: new Date() },
          },
          orderBy: { starts_at: 'asc' },
          take: 7,
        }) ?? [];
      return { items };
    },
  );
}
