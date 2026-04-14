'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ForecastChart } from '@/components/bank/forecast-chart';
import { ForecastAlert } from '@/components/bank/forecast-alert';
import { CashFlowTable } from '@/components/bank/cash-flow-table';

// BUSINESS RULE [CDC-2.3]: Vue previsionnel de tresorerie

// Demo data - 90 days forecast
function generateDemoEntries() {
  const entries = [];
  let balance = 1542300; // 15,423.00 EUR
  const startDate = new Date('2026-04-14');

  for (let d = 0; d <= 90; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);

    let incoming = 0;
    let outgoing = 0;
    let recurring = 0;

    // Simulate some cash flows
    if (d === 5) incoming = 350000; // Client payment
    if (d === 12) incoming = 180000;
    if (d === 20) outgoing = 85000; // Supplier
    if (d === 25) incoming = 420000;
    if (d === 30) { recurring = 120000; outgoing = 45000; } // Rent + supplier
    if (d === 45) incoming = 250000;
    if (d === 60) { recurring = 120000; recurring += 3999; } // Rent + telecom
    if (d === 75) incoming = 180000;
    if (d === 90) recurring = 120000;

    balance = balance + incoming - outgoing - recurring;

    entries.push({
      date: date.toISOString().split('T')[0]!,
      balance_cents: balance,
      incoming_cents: incoming,
      outgoing_cents: outgoing,
      recurring_cents: recurring,
    });
  }
  return entries;
}

const DEMO_ENTRIES = generateDemoEntries();

const DEMO_ALERTS = [
  {
    type: 'warning' as const,
    message: 'Solde previsionnel bas a J+30 apres paiement loyer',
    date: '2026-05-14',
    projected_balance_cents: 312300,
  },
];

const DEMO_RECURRING = [
  { label: 'Loyer bureau', amount: -120000, frequency: 'Mensuel', category: 'loyer', confidence: 95 },
  { label: 'Orange forfait', amount: -3999, frequency: 'Mensuel', category: 'telecom', confidence: 90 },
  { label: 'EDF electricite', amount: -18500, frequency: 'Mensuel', category: 'energie', confidence: 85 },
  { label: 'Assurance MAIF', amount: -45000, frequency: 'Trimestriel', category: 'assurance', confidence: 80 },
];

function formatAmount(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export default function ForecastPage() {
  const entries = DEMO_ENTRIES;
  const endBalance = entries[entries.length - 1]?.balance_cents ?? 0;
  const totalIncoming = entries.reduce((s, e) => s + e.incoming_cents, 0);
  const totalOutgoing = entries.reduce((s, e) => s + e.outgoing_cents, 0);
  const totalRecurring = entries.reduce((s, e) => s + e.recurring_cents, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Previsionnel de tresorerie</h1>
          <p className="text-sm text-gray-500 mt-1">
            Projection sur 90 jours basee sur vos factures, achats et charges recurrentes.
          </p>
        </div>
        <a href="/bank">
          <Button variant="outline">Retour</Button>
        </a>
      </div>

      {/* Alertes */}
      <div className="mb-6">
        <ForecastAlert alerts={DEMO_ALERTS} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Solde actuel</p>
            <p className="text-xl font-bold text-gray-900">{formatAmount(1542300)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Encaissements prevus</p>
            <p className="text-xl font-bold text-green-600">+{formatAmount(totalIncoming)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Decaissements prevus</p>
            <p className="text-xl font-bold text-red-600">-{formatAmount(totalOutgoing + totalRecurring)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Solde a J+90</p>
            <p className={`text-xl font-bold ${endBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {formatAmount(endBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolution du solde previsionnel</h2>
          <ForecastChart entries={entries} currency="EUR" />
        </CardContent>
      </Card>

      {/* Charges recurrentes detectees */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Charges recurrentes detectees</h2>
          <div className="divide-y divide-gray-100">
            {DEMO_RECURRING.map((charge, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{charge.label}</p>
                  <p className="text-xs text-gray-400">{charge.frequency} — {charge.category} — {charge.confidence}% confiance</p>
                </div>
                <span className="text-sm font-semibold text-red-600">{formatAmount(charge.amount)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tableau flux */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Flux de tresorerie par semaine</h2>
          <CashFlowTable entries={entries} currency="EUR" />
        </CardContent>
      </Card>
    </div>
  );
}
