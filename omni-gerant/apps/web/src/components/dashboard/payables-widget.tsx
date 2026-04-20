'use client';

import { KpiCard } from './kpi-card';

// BUSINESS RULE [CDC-4]: "Ce que je dois"

interface PayablesWidgetProps {
  amountCents: number;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(cents / 100);
}

export function PayablesWidget({ amountCents }: PayablesWidgetProps) {
  return (
    <KpiCard
      title="Ce que je dois"
      value={formatCents(amountCents)}
      subtitle="Factures fournisseurs non payées"
      color="red"
    />
  );
}
