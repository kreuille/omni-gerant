'use client';

import { KpiCard } from './kpi-card';

// BUSINESS RULE [CDC-4]: "Ce qu'on me doit"

interface ReceivablesWidgetProps {
  amountCents: number;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(cents / 100);
}

export function ReceivablesWidget({ amountCents }: ReceivablesWidgetProps) {
  return (
    <KpiCard
      title="Ce qu'on me doit"
      value={formatCents(amountCents)}
      subtitle="Factures émises non payées"
      color="green"
    />
  );
}
