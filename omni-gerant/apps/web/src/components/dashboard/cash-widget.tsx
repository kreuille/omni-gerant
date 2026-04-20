'use client';

import { KpiCard } from './kpi-card';

// BUSINESS RULE [CDC-4]: "Mon reste a vivre reel"
// = Solde bancaire - Ce que je dois + Ce qu'on me doit

interface CashWidgetProps {
  amountCents: number;
  bankBalanceCents: number;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(cents / 100);
}

export function CashWidget({ amountCents, bankBalanceCents }: CashWidgetProps) {
  return (
    <KpiCard
      title="Mon reste à vivre réel"
      value={formatCents(amountCents)}
      subtitle={`Solde bancaire : ${formatCents(bankBalanceCents)}`}
      color={amountCents >= 0 ? 'blue' : 'red'}
    />
  );
}
