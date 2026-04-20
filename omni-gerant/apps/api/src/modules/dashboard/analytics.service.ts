// Vague H1 : analytics financieres avancees (P&L mensuel + cash-flow previsionnel)

export interface MonthlyPnL {
  month: string; // YYYY-MM
  revenue_ht_cents: number;   // CA HT sur factures emises
  revenue_tva_cents: number;
  revenue_ttc_cents: number;
  expenses_ht_cents: number;  // Depenses HT sur achats
  expenses_tva_cents: number;
  expenses_ttc_cents: number;
  gross_margin_cents: number; // CA HT - Depenses HT
  margin_rate: number;        // 0..1
  invoices_count: number;
  purchases_count: number;
}

export interface CashFlowPoint {
  date: string;               // YYYY-MM-DD
  balance_cents: number;       // Solde cumule projete
  inflow_cents: number;        // Attendu client
  outflow_cents: number;       // Attendu fournisseur
  sources: string[];           // ids factures/achats a cette date
}

export interface AnalyticsResult {
  pnl_monthly: MonthlyPnL[];
  pnl_ytd: {
    revenue_ht_cents: number;
    expenses_ht_cents: number;
    gross_margin_cents: number;
    margin_rate: number;
  };
  cash_flow_forecast: CashFlowPoint[];
  cash_flow_horizon_days: number;
  top_clients: Array<{ client_id: string; name: string; total_ttc_cents: number; invoices_count: number }>;
  top_suppliers: Array<{ supplier_id: string; name: string; total_ttc_cents: number; purchases_count: number }>;
  dso_days: number | null;     // Days Sales Outstanding
  dpo_days: number | null;     // Days Payables Outstanding
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function computeAnalytics(
  tenantId: string,
  now: Date = new Date(),
  pnlMonths = 12,
  forecastDays = 90,
): Promise<AnalyticsResult> {
  const { prisma } = await import('@zenadmin/db');

  // Debut de periode : il y a pnlMonths mois
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - pnlMonths + 1, 1));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const horizonEnd = new Date(now.getTime() + forecastDays * 86400_000);

  const [invoices, purchases] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        issue_date: { gte: periodStart },
      },
      include: { client: true },
      orderBy: { issue_date: 'asc' },
    }),
    prisma.purchase.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        created_at: { gte: periodStart },
      },
      include: { supplier: true },
      orderBy: { created_at: 'asc' },
    }),
  ]);

  // === P&L mensuel ===
  const byMonth = new Map<string, MonthlyPnL>();
  for (const inv of invoices) {
    const key = monthKey(inv.issue_date);
    const row = byMonth.get(key) ?? makeEmpty(key);
    row.revenue_ht_cents += inv.total_ht_cents;
    row.revenue_tva_cents += inv.total_tva_cents;
    row.revenue_ttc_cents += inv.total_ttc_cents;
    row.invoices_count++;
    byMonth.set(key, row);
  }
  for (const pur of purchases) {
    const key = monthKey(pur.created_at);
    const row = byMonth.get(key) ?? makeEmpty(key);
    row.expenses_ht_cents += pur.total_ht_cents;
    row.expenses_tva_cents += pur.total_tva_cents;
    row.expenses_ttc_cents += pur.total_ttc_cents;
    row.purchases_count++;
    byMonth.set(key, row);
  }
  // Complete les mois manquants pour eviter les trous sur le chart
  const pnl: MonthlyPnL[] = [];
  for (let i = 0; i < pnlMonths; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - pnlMonths + 1 + i, 1));
    const key = monthKey(d);
    const row = byMonth.get(key) ?? makeEmpty(key);
    row.gross_margin_cents = row.revenue_ht_cents - row.expenses_ht_cents;
    row.margin_rate = row.revenue_ht_cents > 0 ? row.gross_margin_cents / row.revenue_ht_cents : 0;
    pnl.push(row);
  }

  // === YTD ===
  const ytdInvoices = invoices.filter((i) => i.issue_date >= yearStart);
  const ytdPurchases = purchases.filter((p) => p.created_at >= yearStart);
  const ytdRevenue = ytdInvoices.reduce((s, i) => s + i.total_ht_cents, 0);
  const ytdExpenses = ytdPurchases.reduce((s, p) => s + p.total_ht_cents, 0);
  const ytdMargin = ytdRevenue - ytdExpenses;

  // === Cash flow previsionnel sur forecastDays ===
  const forecast = new Map<string, CashFlowPoint>();
  // On part d'un solde 0 et on projette les flux a venir sur les facteurs :
  //   - Inflow = factures non payees dont due_date <= horizonEnd
  //   - Outflow = achats non payes dont due_date <= horizonEnd
  const openInvoices = invoices.filter((i) => i.remaining_cents > 0 && i.due_date && i.due_date <= horizonEnd);
  const openPurchases = purchases.filter((p) => p.total_ttc_cents - p.paid_cents > 0 && p.due_date && p.due_date <= horizonEnd);

  for (const inv of openInvoices) {
    const key = inv.due_date!.toISOString().slice(0, 10);
    const point = forecast.get(key) ?? { date: key, balance_cents: 0, inflow_cents: 0, outflow_cents: 0, sources: [] };
    point.inflow_cents += inv.remaining_cents;
    point.sources.push(`inv:${inv.number}`);
    forecast.set(key, point);
  }
  for (const pur of openPurchases) {
    const key = pur.due_date!.toISOString().slice(0, 10);
    const point = forecast.get(key) ?? { date: key, balance_cents: 0, inflow_cents: 0, outflow_cents: 0, sources: [] };
    point.outflow_cents += (pur.total_ttc_cents - pur.paid_cents);
    point.sources.push(`pur:${pur.number}`);
    forecast.set(key, point);
  }
  // Solde cumule chronologique
  const sortedForecast = [...forecast.values()].sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  for (const p of sortedForecast) {
    running += p.inflow_cents - p.outflow_cents;
    p.balance_cents = running;
  }

  // === Top clients / fournisseurs ===
  const topClients = computeTop(
    invoices.map((i) => ({
      id: i.client?.id ?? '—',
      name: i.client?.company_name ?? ([i.client?.first_name, i.client?.last_name].filter(Boolean).join(' ') || 'Client'),
      total: i.total_ttc_cents,
    })),
  ).slice(0, 5).map(({ id, name, total, count }) => ({
    client_id: id, name, total_ttc_cents: total, invoices_count: count,
  }));
  const topSuppliers = computeTop(
    purchases.map((p) => ({
      id: p.supplier?.id ?? '—',
      name: p.supplier?.name ?? 'Fournisseur',
      total: p.total_ttc_cents,
    })),
  ).slice(0, 5).map(({ id, name, total, count }) => ({
    supplier_id: id, name, total_ttc_cents: total, purchases_count: count,
  }));

  // === DSO / DPO ===
  const paidInvoices = invoices.filter((i) => i.paid_at && i.issue_date);
  const dso = paidInvoices.length > 0
    ? Math.round(paidInvoices.reduce((s, i) => s + (i.paid_at!.getTime() - i.issue_date.getTime()) / 86400_000, 0) / paidInvoices.length)
    : null;

  const paidPurchases = purchases.filter((p) => p.paid_cents >= p.total_ttc_cents && p.due_date);
  const dpo = paidPurchases.length > 0
    ? Math.round(paidPurchases.reduce((s, p) => s + (p.due_date!.getTime() - p.created_at.getTime()) / 86400_000, 0) / paidPurchases.length)
    : null;

  return {
    pnl_monthly: pnl,
    pnl_ytd: {
      revenue_ht_cents: ytdRevenue,
      expenses_ht_cents: ytdExpenses,
      gross_margin_cents: ytdMargin,
      margin_rate: ytdRevenue > 0 ? ytdMargin / ytdRevenue : 0,
    },
    cash_flow_forecast: sortedForecast,
    cash_flow_horizon_days: forecastDays,
    top_clients: topClients,
    top_suppliers: topSuppliers,
    dso_days: dso,
    dpo_days: dpo,
  };
}

function makeEmpty(month: string): MonthlyPnL {
  return {
    month, revenue_ht_cents: 0, revenue_tva_cents: 0, revenue_ttc_cents: 0,
    expenses_ht_cents: 0, expenses_tva_cents: 0, expenses_ttc_cents: 0,
    gross_margin_cents: 0, margin_rate: 0, invoices_count: 0, purchases_count: 0,
  };
}

function computeTop(items: Array<{ id: string; name: string; total: number }>): Array<{ id: string; name: string; total: number; count: number }> {
  const agg = new Map<string, { id: string; name: string; total: number; count: number }>();
  for (const it of items) {
    const r = agg.get(it.id) ?? { id: it.id, name: it.name, total: 0, count: 0 };
    r.total += it.total;
    r.count++;
    agg.set(it.id, r);
  }
  return [...agg.values()].sort((a, b) => b.total - a.total);
}
