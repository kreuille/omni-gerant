// Vague H3 : envoi des rappels pour les events ayant reminder_minutes.

import type { JobDefinition } from './registry.js';

export const calendarRemindersJob: JobDefinition = {
  name: 'calendar-reminders',
  description: 'Envoie les rappels d\'evenements (notification in-app) selon reminder_minutes',
  minIntervalMs: 10 * 60 * 1000, // 6x/h
  async run() {
    try {
      const { prisma } = await import('@zenadmin/db');
      const p = prisma as unknown as {
        calendarEvent?: { findMany?: Function; update?: Function };
        notification?: { create?: Function };
      };

      const now = new Date();
      const nextHour = new Date(now.getTime() + 60 * 60 * 1000);

      const events = await p.calendarEvent?.findMany?.({
        where: {
          deleted_at: null,
          reminder_sent_at: null,
          reminder_minutes: { gt: 0 },
          starts_at: { gte: now, lte: nextHour },
        },
        take: 200,
      }) ?? [];

      let sent = 0;
      for (const ev of events as Array<{ id: string; tenant_id: string; user_id: string; title: string; starts_at: Date; location?: string | null; reminder_minutes: number }>) {
        const triggerAt = new Date(ev.starts_at.getTime() - ev.reminder_minutes * 60_000);
        if (triggerAt > now) continue;

        try {
          await p.notification?.create?.({
            data: {
              tenant_id: ev.tenant_id,
              user_id: ev.user_id,
              level: 'info',
              category: 'system',
              title: `Rappel : ${ev.title}`,
              body: `Prévu à ${ev.starts_at.toLocaleString('fr-FR')}${ev.location ? ` — ${ev.location}` : ''}`,
              link: '/calendar',
            },
          });
          await p.calendarEvent?.update?.({
            where: { id: ev.id },
            data: { reminder_sent_at: new Date() },
          });
          sent++;
        } catch { /* noop */ }
      }

      return { ok: true, affected: sent };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};
