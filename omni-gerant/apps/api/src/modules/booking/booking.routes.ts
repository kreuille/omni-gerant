import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { authenticate } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague J1 : Booking RDV en ligne (style Calendly simplifie).
// Calcule les creneaux disponibles a partir de BookingSlotConfig.availability
// et des bookings deja confirmes.

interface DailyWindow { from: string; to: string }
type Availability = Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', DailyWindow[]>;

const DAYS: Array<keyof Availability> = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const configSchema = z.object({
  duration_min: z.number().int().min(5).max(480),
  buffer_min: z.number().int().min(0).max(120),
  availability: z.record(z.string(), z.array(z.object({ from: z.string().regex(/^\d{2}:\d{2}$/), to: z.string().regex(/^\d{2}:\d{2}$/) }))),
  timezone: z.string().default('Europe/Paris'),
  is_active: z.boolean().default(true),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  slug: z.string().regex(/^[a-z0-9-]{3,40}$/).optional().nullable(),
});

const bookSchema = z.object({
  starts_at: z.coerce.date(),
  guest_name: z.string().min(1).max(200),
  guest_email: z.string().email(),
  guest_phone: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
});

function minutesSinceMidnight(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export async function bookingRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // --- Cote tenant ---

  app.get('/api/booking/config', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return null;
    const { prisma } = await import('@zenadmin/db');
    return await (prisma as unknown as { bookingSlotConfig?: { findUnique?: Function } })
      .bookingSlotConfig?.findUnique?.({ where: { tenant_id: request.auth.tenant_id } });
  });

  app.put('/api/booking/config', { preHandler: preHandlers }, async (request, reply) => {
    const parsed = configSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const { prisma } = await import('@zenadmin/db');
    const up = prisma as unknown as { bookingSlotConfig?: { upsert?: Function } };
    const updated = await up.bookingSlotConfig?.upsert?.({
      where: { tenant_id: request.auth.tenant_id },
      update: parsed.data as Record<string, unknown>,
      create: { tenant_id: request.auth.tenant_id, ...parsed.data } as Record<string, unknown>,
    });
    return updated;
  });

  app.get('/api/booking/list', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const items = await (prisma as unknown as { booking?: { findMany?: Function } })
      .booking?.findMany?.({
        where: { tenant_id: request.auth.tenant_id },
        orderBy: { starts_at: 'asc' },
        take: 200,
      }) ?? [];
    return { items };
  });

  // --- Cote public (slug) ---

  // GET /api/public/booking/:slug — config + slots dispo sur 14j
  app.get('/api/public/booking/:slug', async (request, reply) => {
    if (!process.env['DATABASE_URL']) return reply.status(503).send({ error: { code: 'SERVICE_UNAVAILABLE', message: 'DB indisponible' } });
    const { slug } = request.params as { slug: string };
    const { prisma } = await import('@zenadmin/db');
    const config = await (prisma as unknown as { bookingSlotConfig?: { findUnique?: Function } })
      .bookingSlotConfig?.findUnique?.({ where: { slug } }) as
      | { tenant_id: string; duration_min: number; buffer_min: number; availability: Availability; is_active: boolean; title: string; description: string | null }
      | null;
    if (!config || !config.is_active) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Lien de réservation introuvable.' } });
    }

    const bookings = await (prisma as unknown as { booking?: { findMany?: Function } })
      .booking?.findMany?.({
        where: {
          tenant_id: config.tenant_id,
          status: 'confirmed',
          starts_at: { gte: new Date() },
        },
      }) ?? [];

    const slots: string[] = [];
    const stepMin = config.duration_min + config.buffer_min;
    const tenant = await prisma.tenant.findUnique({ where: { id: config.tenant_id }, select: { name: true } });

    for (let d = 0; d < 14; d++) {
      const day = new Date();
      day.setUTCDate(day.getUTCDate() + d);
      day.setUTCHours(0, 0, 0, 0);
      const dayKey = DAYS[day.getUTCDay()]!;
      const windows = config.availability[dayKey] ?? [];
      for (const w of windows) {
        const fromMin = minutesSinceMidnight(w.from);
        const toMin = minutesSinceMidnight(w.to);
        for (let m = fromMin; m + config.duration_min <= toMin; m += stepMin) {
          const start = new Date(day.getTime() + m * 60_000);
          if (start < new Date()) continue;
          const end = new Date(start.getTime() + config.duration_min * 60_000);
          const conflict = (bookings as Array<{ starts_at: Date; ends_at: Date }>).some((b) => !(end <= b.starts_at || start >= b.ends_at));
          if (!conflict) slots.push(start.toISOString());
        }
      }
    }

    return {
      title: config.title,
      description: config.description,
      company_name: tenant?.name,
      duration_min: config.duration_min,
      slots,
    };
  });

  app.post('/api/public/booking/:slug/book', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const parsed = bookSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }

    const { prisma } = await import('@zenadmin/db');
    const config = await (prisma as unknown as { bookingSlotConfig?: { findUnique?: Function } })
      .bookingSlotConfig?.findUnique?.({ where: { slug } }) as
      | { tenant_id: string; duration_min: number; is_active: boolean }
      | null;
    if (!config || !config.is_active) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Lien introuvable.' } });
    }

    const startsAt = parsed.data.starts_at;
    const endsAt = new Date(startsAt.getTime() + config.duration_min * 60_000);

    // Double-book check
    const conflict = await (prisma as unknown as { booking?: { findFirst?: Function } })
      .booking?.findFirst?.({
        where: {
          tenant_id: config.tenant_id,
          status: 'confirmed',
          AND: [
            { starts_at: { lt: endsAt } },
            { ends_at: { gt: startsAt } },
          ],
        },
      });
    if (conflict) {
      return reply.status(409).send({ error: { code: 'CONFLICT', message: 'Ce créneau n\'est plus disponible.' } });
    }

    const cancelToken = randomBytes(16).toString('hex');
    const booking = await (prisma as unknown as { booking?: { create?: Function } })
      .booking?.create?.({
        data: {
          tenant_id: config.tenant_id,
          guest_name: parsed.data.guest_name,
          guest_email: parsed.data.guest_email,
          guest_phone: parsed.data.guest_phone ?? null,
          starts_at: startsAt,
          ends_at: endsAt,
          notes: parsed.data.notes ?? null,
          cancel_token: cancelToken,
        },
      });

    // Create linked calendar event (best-effort)
    try {
      await (prisma as unknown as { calendarEvent?: { create?: Function } })
        .calendarEvent?.create?.({
          data: {
            tenant_id: config.tenant_id,
            user_id: config.tenant_id, // fallback : owner
            title: `RDV : ${parsed.data.guest_name}`,
            description: parsed.data.notes ?? null,
            starts_at: startsAt,
            ends_at: endsAt,
            kind: 'appointment',
            reminder_minutes: 15,
          },
        });
    } catch { /* noop */ }

    const appUrl = process.env['APP_URL'] ?? 'https://omni-gerant.vercel.app';
    return reply.status(201).send({
      booking_id: (booking as { id: string }).id,
      cancel_url: `${appUrl}/booking/cancel/${cancelToken}`,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    });
  });

  app.post('/api/public/booking/cancel/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const { prisma } = await import('@zenadmin/db');
    const updated = await (prisma as unknown as { booking?: { updateMany?: Function } })
      .booking?.updateMany?.({
        where: { cancel_token: token, status: 'confirmed' },
        data: { status: 'cancelled', cancelled_at: new Date() },
      });
    if (!updated || (updated as { count: number }).count === 0) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Réservation introuvable ou déjà annulée.' } });
    }
    return { cancelled: true };
  });
}
