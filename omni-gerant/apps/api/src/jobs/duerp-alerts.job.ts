// BUSINESS RULE [CDC-2.4 / Vague A2] : alertes DUERP
// - DUERP > 11 mois -> alerte mise a jour annuelle obligatoire
// - Formation employe expirant dans <= 90 jours -> alerte

import type { JobDefinition } from './registry.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DUERP_ALERT_THRESHOLD_DAYS = 11 * 30; // 11 mois
const TRAINING_EXPIRING_DAYS = 90;

export const duerpAlertsJob: JobDefinition = {
  name: 'duerp-alerts',
  description: 'Alertes mise a jour annuelle DUERP + formations expirant sous 90j',
  minIntervalMs: 23 * 60 * 60 * 1000, // 1x/jour
  allowedHoursUtc: [6, 7, 8],
  async run() {
    try {
      const { prisma } = await import('@zenadmin/db');
      // Cast `any` car Notification/HrTraining peuvent ne pas etre dans le client
      // genere selon l'etat des migrations.
      const p = prisma as unknown as Record<string, { findMany?: Function; create?: Function; count?: Function }>;
      const now = Date.now();
      let alerts = 0;

      // DUERP outdated
      const duerps = (await p['duerpDocument']?.findMany?.({
        where: { deleted_at: null },
        select: { id: true, tenant_id: true, updated_at: true, evaluation_date: true },
      }).catch(() => [])) ?? [] as Array<{ id: string; tenant_id: string; updated_at: Date; evaluation_date: Date }>;

      for (const d of duerps as Array<{ id: string; tenant_id: string; updated_at: Date; evaluation_date: Date }>) {
        const lastUpdate = d.updated_at ?? d.evaluation_date;
        const daysSince = Math.floor((now - lastUpdate.getTime()) / MS_PER_DAY);
        if (daysSince >= DUERP_ALERT_THRESHOLD_DAYS) {
          try {
            await p['notification']?.create?.({
              data: {
                tenant_id: d.tenant_id,
                level: 'warning',
                category: 'duerp',
                title: 'Mise à jour annuelle du DUERP requise',
                body: `Votre DUERP n'a pas été actualisé depuis ${daysSince} jours. La mise à jour annuelle est obligatoire (art. L4121-3 du Code du travail).`,
                link: `/legal/duerp/${d.id}`,
              },
            });
            alerts++;
          } catch { /* noop */ }
        }
      }

      // Formations expirant dans <= 90j
      try {
        const trainings = (await p['hrTraining']?.findMany?.({
          where: {
            deleted_at: null,
            expires_at: {
              gte: new Date(),
              lte: new Date(now + TRAINING_EXPIRING_DAYS * MS_PER_DAY),
            },
          },
          select: { id: true, tenant_id: true, employee_id: true, training_name: true, expires_at: true },
        })) ?? [];
        for (const t of trainings as Array<{ id: string; tenant_id: string; employee_id: string; training_name: string; expires_at: Date | null }>) {
          const daysLeft = Math.ceil(((t.expires_at?.getTime() ?? now) - now) / MS_PER_DAY);
          try {
            await p['notification']?.create?.({
              data: {
                tenant_id: t.tenant_id,
                level: daysLeft <= 30 ? 'danger' : 'warning',
                category: 'training',
                title: `Formation "${t.training_name}" expire dans ${daysLeft} jours`,
                body: 'Planifiez le renouvellement avant expiration pour rester en conformité.',
                link: `/hr/employees/${t.employee_id}`,
              },
            });
            alerts++;
          } catch { /* noop */ }
        }
      } catch { /* noop */ }

      return { ok: true, affected: alerts };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};
