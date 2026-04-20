// Vague M1 : Insights IA — detecte anomalies + predictions simples.
//
// Pas de dep ML. Utilise des heuristiques statistiques sur les donnees
// tenant : z-score sur CA mensuel, prediction lineaire court terme,
// detection de clients a risque (paiements en retard repetes).

export interface Insight {
  id: string;
  severity: 'info' | 'warning' | 'opportunity' | 'risk';
  category: 'revenue' | 'cash' | 'client' | 'supplier' | 'tax' | 'trend';
  title: string;
  description: string;
  metric?: { label: string; value: number; unit?: string };
  cta?: { label: string; href: string };
}

export async function computeInsights(tenantId: string): Promise<Insight[]> {
  if (!process.env['DATABASE_URL']) return [];
  const { prisma } = await import('@zenadmin/db');
  const insights: Insight[] = [];

  const now = new Date();
  const yearAgo = new Date(now.getTime() - 365 * 86400_000);
  const [invoices, clients] = await Promise.all([
    prisma.invoice.findMany({
      where: { tenant_id: tenantId, deleted_at: null, issue_date: { gte: yearAgo } },
      include: { client: true },
      orderBy: { issue_date: 'asc' },
    }),
    prisma.client.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
    }),
  ]);

  // === 1. Clients a risque (3+ factures en retard) ===
  const lateByClient = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.remaining_cents > 0 && inv.due_date && inv.due_date < now) {
      const k = inv.client_id;
      lateByClient.set(k, (lateByClient.get(k) ?? 0) + 1);
    }
  }
  for (const [clientId, count] of lateByClient) {
    if (count >= 3) {
      const client = clients.find((c) => c.id === clientId);
      insights.push({
        id: `risk-client-${clientId}`,
        severity: 'risk',
        category: 'client',
        title: `Client à risque : ${client?.company_name ?? 'Client'}`,
        description: `${count} factures en retard de paiement. Envisager relance commerciale ou blocage des nouveaux devis.`,
        metric: { label: 'Factures en retard', value: count },
        cta: { label: 'Voir le client', href: `/clients/${clientId}` },
      });
    }
  }

  // === 2. CA mensuel : anomalies (z-score < -1.5 ou > 1.5) ===
  const byMonth = new Map<string, number>();
  for (const inv of invoices) {
    const key = `${inv.issue_date.getUTCFullYear()}-${String(inv.issue_date.getUTCMonth() + 1).padStart(2, '0')}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + inv.total_ht_cents);
  }
  const monthlyValues = [...byMonth.values()];
  if (monthlyValues.length >= 4) {
    const mean = monthlyValues.reduce((s, v) => s + v, 0) / monthlyValues.length;
    const variance = monthlyValues.reduce((s, v) => s + (v - mean) ** 2, 0) / monthlyValues.length;
    const std = Math.sqrt(variance);
    const lastMonth = monthlyValues[monthlyValues.length - 1]!;
    const z = std > 0 ? (lastMonth - mean) / std : 0;
    if (z <= -1.5) {
      insights.push({
        id: 'revenue-drop',
        severity: 'warning',
        category: 'revenue',
        title: 'Chute de CA inhabituelle',
        description: `Le CA du mois est significativement plus bas que la moyenne (z-score ${z.toFixed(1)}).`,
        metric: { label: 'Écart', value: Math.round((lastMonth - mean) / 100), unit: 'EUR' },
        cta: { label: 'Analytics', href: '/dashboard/analytics' },
      });
    } else if (z >= 1.5) {
      insights.push({
        id: 'revenue-spike',
        severity: 'opportunity',
        category: 'revenue',
        title: 'Pic de CA !',
        description: `Le CA du mois est significativement plus élevé que la moyenne (z-score +${z.toFixed(1)}). Bon momentum.`,
        metric: { label: 'Écart', value: Math.round((lastMonth - mean) / 100), unit: 'EUR' },
      });
    }
  }

  // === 3. Prediction CA mois suivant (moyenne mobile 3 mois) ===
  if (monthlyValues.length >= 3) {
    const last3 = monthlyValues.slice(-3);
    const predicted = Math.round(last3.reduce((s, v) => s + v, 0) / 3);
    insights.push({
      id: 'revenue-forecast',
      severity: 'info',
      category: 'trend',
      title: 'Prédiction CA mois prochain',
      description: 'Basée sur la moyenne mobile 3 mois.',
      metric: { label: 'CA HT prédit', value: Math.round(predicted / 100), unit: 'EUR' },
    });
  }

  // === 4. Concentration client (>30 % du CA sur 1 client = risque) ===
  const yearCents = invoices.reduce((s, i) => s + i.total_ht_cents, 0);
  if (yearCents > 0) {
    const byClient = new Map<string, { total: number; name: string }>();
    for (const inv of invoices) {
      const name = inv.client?.company_name ?? ([inv.client?.first_name, inv.client?.last_name].filter(Boolean).join(' ') || 'Client');
      const r = byClient.get(inv.client_id) ?? { total: 0, name };
      r.total += inv.total_ht_cents;
      byClient.set(inv.client_id, r);
    }
    for (const [cid, r] of byClient) {
      const ratio = r.total / yearCents;
      if (ratio > 0.3) {
        insights.push({
          id: `concentration-${cid}`,
          severity: 'warning',
          category: 'client',
          title: `Forte dépendance : ${r.name}`,
          description: `Ce client représente ${Math.round(ratio * 100)} % de votre CA annuel. Diversifier le portefeuille.`,
          metric: { label: 'Part du CA', value: Math.round(ratio * 100), unit: '%' },
          cta: { label: 'Voir le client', href: `/clients/${cid}` },
        });
      }
    }
  }

  // === 5. DSO > 45j ===
  const paidInvoices = invoices.filter((i) => i.paid_at && i.issue_date);
  if (paidInvoices.length >= 5) {
    const dso = Math.round(
      paidInvoices.reduce((s, i) => s + (i.paid_at!.getTime() - i.issue_date.getTime()) / 86400_000, 0) / paidInvoices.length,
    );
    if (dso > 45) {
      insights.push({
        id: 'dso-high',
        severity: 'warning',
        category: 'cash',
        title: 'Délai de paiement trop long',
        description: `Vos clients mettent en moyenne ${dso} jours à payer. Activer les relances automatiques peut aider.`,
        metric: { label: 'DSO', value: dso, unit: 'jours' },
        cta: { label: 'Relances', href: '/invoices' },
      });
    }
  }

  return insights;
}
