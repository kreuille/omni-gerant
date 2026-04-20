'use client';

import { Card, CardContent } from '@/components/ui/card';

// BUSINESS RULE [CDC-4]: Graphique CA mensuel (6 derniers mois, barres simples)
// BUSINESS RULE [CDC-4]: Pas de graphiques complexes inutiles

interface MonthlyRevenue {
  month: string;
  revenue_cents: number;
}

interface RevenueChartProps {
  data: MonthlyRevenue[];
  trendPct: number;
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Avr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Aou',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

function formatCents(cents: number): string {
  if (cents >= 100000) {
    return `${(cents / 100000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(cents / 100);
}

export function RevenueChart({ data, trendPct }: RevenueChartProps) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue_cents), 1);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">CA mensuel</h3>
          <span className={`text-sm font-medium ${trendPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trendPct >= 0 ? '+' : ''}{trendPct}% vs mois précédent
          </span>
        </div>

        {data.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Aucune donnée disponible</p>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {data.map((d) => {
              const height = Math.max((d.revenue_cents / maxRevenue) * 100, 2);
              const monthKey = d.month.split('-')[1] ?? '';
              return (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{formatCents(d.revenue_cents)}</span>
                  <div
                    className="w-full bg-blue-500 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-gray-400">
                    {MONTH_LABELS[monthKey] ?? monthKey}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
