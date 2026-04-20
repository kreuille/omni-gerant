// Vague P2 : alerte contrats a renouveler (ends_on <= now + renewal_notice_days).

import type { JobDefinition } from './registry.js';

const MS_PER_DAY = 86_400_000;

export const contractRenewalJob: JobDefinition = {
  name: 'contract-renewal',
  description: 'Alerte les contrats arrivant a echeance sous renewal_notice_days',
  minIntervalMs: 23 * 60 * 60 * 1000,
  allowedHoursUtc: [7, 8, 9],
  async run() {
    try {
      const { prisma } = await import('@zenadmin/db');
      const p = prisma as unknown as {
        contract?: { findMany?: Function; update?: Function };
        notification?: { create?: Function };
      };
      const now = new Date();
      const in60d = new Date(now.getTime() + 60 * MS_PER_DAY);
      const contracts = await p.contract?.findMany?.({
        where: {
          deleted_at: null,
          status: 'signed',
          ends_on: { gte: now, lte: in60d },
        },
      }) ?? [];
      let alerts = 0;
      for (const c of contracts as Array<{ id: string; tenant_id: string; title: string; ends_on: Date; renewal_notice_days: number; auto_renew: boolean }>) {
        const daysLeft = Math.ceil((c.ends_on.getTime() - now.getTime()) / MS_PER_DAY);
        if (daysLeft > c.renewal_notice_days) continue;
        try {
          await p.notification?.create?.({
            data: {
              tenant_id: c.tenant_id,
              level: daysLeft <= 15 ? 'danger' : 'warning',
              category: 'billing',
              title: c.auto_renew
                ? `Contrat "${c.title}" renouvellement automatique dans ${daysLeft}j`
                : `Contrat "${c.title}" arrive a echeance dans ${daysLeft}j`,
              body: c.auto_renew
                ? 'Resiliez avant la date limite si vous ne souhaitez pas renouveler.'
                : 'Preparez le renouvellement ou la resiliation.',
              link: `/contracts/${c.id}`,
            },
          });
          alerts++;
        } catch { /* noop */ }
      }
      return { ok: true, affected: alerts };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};
