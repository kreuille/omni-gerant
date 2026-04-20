// BUSINESS RULE [CDC-2.3 / Vague B2] : Rapprochement bancaire automatique
// Matche les transactions non-reconciliees avec les factures / achats ouverts,
// marque automatiquement payees celles qui matchent avec score >= 100,
// emet une notification "paiement recu" a l'utilisateur.

import type { JobDefinition } from './registry.js';

export const reconciliationJob: JobDefinition = {
  name: 'reconciliation',
  description: 'Rapprochement automatique banque <-> factures/achats + notifications paiement recu',
  minIntervalMs: 6 * 60 * 60 * 1000, // 4x/jour
  allowedHoursUtc: [6, 11, 16, 21],
  async run() {
    try {
      const { prisma } = await import('@zenadmin/db');
      const { runMatching } = await import('../modules/bank/matching/matcher.js');
      const { createPrismaCandidateProvider, createPrismaTransactionMatcher } = await import('../modules/bank/matching/matching.provider.js');

      const candidateProvider = createPrismaCandidateProvider();
      const matcher = createPrismaTransactionMatcher();

      // Liste des tenants avec transactions non matchees
      const tenantsWithUnmatched = await prisma.bankTransaction.findMany({
        where: { matched: false },
        select: { tenant_id: true },
        distinct: ['tenant_id'],
        take: 500,
      });

      let matched = 0;
      const p = prisma as unknown as Record<string, { create?: Function }>;

      for (const { tenant_id } of tenantsWithUnmatched) {
        const unmatched = await prisma.bankTransaction.findMany({
          where: { tenant_id, matched: false },
          take: 200,
          orderBy: { date: 'desc' },
        });
        if (unmatched.length === 0) continue;

        const r = await runMatching(tenant_id, unmatched as Parameters<typeof runMatching>[1], candidateProvider, matcher, 100);
        if (!r.ok) continue;

        matched += r.value.auto_matched.length;

        // Notification pour chaque match
        for (const m of r.value.auto_matched) {
          try {
            await p['notification']?.create?.({
              data: {
                tenant_id,
                level: 'success',
                category: 'invoice',
                title: m.candidate_type === 'invoice' ? 'Paiement client reçu' : 'Paiement fournisseur enregistré',
                body: `Transaction bancaire rapprochée automatiquement (score ${m.score}).`,
                link: m.candidate_type === 'invoice' ? `/invoices/${m.candidate_id}` : `/purchases/${m.candidate_id}`,
              },
            });
          } catch { /* noop */ }
        }
      }

      return { ok: true, affected: matched };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};
