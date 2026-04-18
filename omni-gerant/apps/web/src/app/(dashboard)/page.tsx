'use client';

import { ReceivablesWidget } from '@/components/dashboard/receivables-widget';
import { PayablesWidget } from '@/components/dashboard/payables-widget';
import { CashWidget } from '@/components/dashboard/cash-widget';
import { UpcomingPayments } from '@/components/dashboard/upcoming-payments';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { KpiCard } from '@/components/dashboard/kpi-card';

// BUSINESS RULE [CDC-4]: Dashboard principal actionnable

// Demo data — replaced by API call GET /api/dashboard in production
const DEMO_DATA = {
  kpis: {
    receivables_cents: 1250000,
    payables_cents: 480000,
    bank_balance_cents: 3200000,
    real_cash_cents: 3970000,
    revenue_month_cents: 850000,
    revenue_prev_month_cents: 720000,
    revenue_trend_pct: 18,
  },
  upcoming_payments: [
    { id: '1', type: 'receivable' as const, entity_name: 'Client Martin', amount_cents: 250000, due_date: '2026-04-16', document_number: 'FAC-2026-012' },
    { id: '2', type: 'payable' as const, entity_name: 'Leroy Merlin', amount_cents: 85000, due_date: '2026-04-17', document_number: 'ACH-2026-045' },
    { id: '3', type: 'receivable' as const, entity_name: 'SCI Dupont', amount_cents: 480000, due_date: '2026-04-19', document_number: 'FAC-2026-013' },
  ],
  recent_activity: [
    { id: '1', type: 'invoice_paid', description: 'Facture FAC-2026-011 payee par Client Durand', timestamp: '2026-04-14T14:30:00Z' },
    { id: '2', type: 'quote_sent', description: 'Devis DEV-2026-018 envoye a Mairie de Lyon', timestamp: '2026-04-14T10:15:00Z' },
    { id: '3', type: 'purchase_created', description: 'Facture fournisseur Point.P enregistree', timestamp: '2026-04-13T16:45:00Z' },
    { id: '4', type: 'bank_sync', description: 'Synchronisation bancaire terminee (12 transactions)', timestamp: '2026-04-13T06:00:00Z' },
    { id: '5', type: 'quote_signed', description: 'Devis DEV-2026-015 signe par Client Bernard', timestamp: '2026-04-12T11:20:00Z' },
  ],
  monthly_revenue: [
    { month: '2025-11', revenue_cents: 680000 },
    { month: '2025-12', revenue_cents: 520000 },
    { month: '2026-01', revenue_cents: 710000 },
    { month: '2026-02', revenue_cents: 780000 },
    { month: '2026-03', revenue_cents: 720000 },
    { month: '2026-04', revenue_cents: 850000 },
  ],
};

function formatCents(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(cents / 100);
}

export default function DashboardPage() {
  const data = DEMO_DATA;

  return (
    <div>
      <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-6">Tableau de bord</h1>

      {/* KPI principaux — toujours visibles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <ReceivablesWidget amountCents={data.kpis.receivables_cents} />
        <PayablesWidget amountCents={data.kpis.payables_cents} />
        <CashWidget
          amountCents={data.kpis.real_cash_cents}
          bankBalanceCents={data.kpis.bank_balance_cents}
        />
      </div>

      {/* CA du mois */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <KpiCard
          title="CA du mois"
          value={formatCents(data.kpis.revenue_month_cents)}
          trend={data.kpis.revenue_trend_pct}
          subtitle="vs mois precedent"
          color="blue"
        />
        <RevenueChart
          data={data.monthly_revenue}
          trendPct={data.kpis.revenue_trend_pct}
        />
      </div>

      {/* Widgets secondaires */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UpcomingPayments payments={data.upcoming_payments} />
        <RecentActivity activities={data.recent_activity} />
      </div>
    </div>
  );
}
