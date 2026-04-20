// BUSINESS RULE [CDC-2.4 / Vague D2] : DSN mensuelle auto-generee
// Genere la DSN du mois M-1 le 5 du mois M pour tous les tenants ayant
// au moins un employe. Conforme aux dates limites DSN (5 ou 15 du mois M+1).

import type { JobDefinition } from './registry.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const dsnMonthlyJob: JobDefinition = {
  name: 'dsn-monthly',
  description: 'Genere la DSN mensuelle du mois precedent pour tous les tenants ayant des employes',
  minIntervalMs: 23 * 60 * 60 * 1000, // 1x/jour pour eligibility check
  allowedHoursUtc: [3, 4],             // tot le matin UTC
  async run() {
    try {
      const now = new Date();
      const dayOfMonth = now.getUTCDate();
      // Ne pas generer avant le 2 ou apres le 14 du mois (reglementation : avant le 5
      // pour 5000+ salaries, avant le 15 pour moins).
      if (dayOfMonth < 2 || dayOfMonth > 14) {
        return { ok: true, affected: 0 };
      }

      const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const year = prevMonth.getUTCFullYear();
      const month = prevMonth.getUTCMonth() + 1;

      const { prisma } = await import('@zenadmin/db');
      const { generateMonthlyDsn } = await import('../modules/hr/payroll/dsn.service.js');

      // Liste des tenants avec au moins 1 employe actif
      const tenantsWithHr = await (prisma as unknown as { hrEmployee?: { findMany?: Function } })
        .hrEmployee?.findMany?.({
          where: { deleted_at: null },
          select: { tenant_id: true },
          distinct: ['tenant_id'],
        }) ?? [];

      let generated = 0;
      const p = prisma as unknown as Record<string, { findFirst?: Function; create?: Function }>;

      for (const { tenant_id } of tenantsWithHr as Array<{ tenant_id: string }>) {
        // Idempotence : si une DSN monthly existe deja pour cette periode, skip
        const existing = await p['hrDsnFiling']?.findFirst?.({
          where: { tenant_id, period_year: year, period_month: month, filing_type: 'monthly' },
        });
        if (existing) continue;

        const r = await generateMonthlyDsn(tenant_id, year, month);
        if (r.ok) {
          generated++;
          // Notification in-app (nouvelle DSN generee, attend transmission manuelle)
          try {
            await p['notification']?.create?.({
              data: {
                tenant_id,
                level: 'info',
                category: 'billing',
                title: `DSN ${String(month).padStart(2, '0')}/${year} generee automatiquement`,
                body: 'La DSN du mois precedent est prete. Verifiez les montants URSSAF puis transmettez via net-entreprises.',
                link: '/hr/paie',
              },
            });
          } catch { /* noop */ }
        }
      }

      return { ok: true, affected: generated };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};

// Marque-place : nombre de jours depuis la fin du mois M-1
export function daysSincePeriodEnd(year: number, month: number): number {
  const periodEnd = new Date(Date.UTC(year, month, 0));
  return Math.floor((Date.now() - periodEnd.getTime()) / MS_PER_DAY);
}
