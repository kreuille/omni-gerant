'use client';

import { Card, CardContent, CardTitle } from '@/components/ui/card';

// BUSINESS RULE [CDC-2.1]: Recapitulatif TVA multi-taux

export interface TvaGroupDisplay {
  tva_rate: number;
  base_ht_cents: number;
  tva_cents: number;
  total_ttc_cents: number;
}

interface QuoteTotalsProps {
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
  tvaBreakdown: TvaGroupDisplay[];
  depositRate?: number | null; // basis points
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function formatRate(basisPoints: number): string {
  return (basisPoints / 100).toFixed(basisPoints % 100 === 0 ? 0 : 1) + '%';
}

export function QuoteTotals({ totalHtCents, totalTvaCents, totalTtcCents, tvaBreakdown, depositRate }: QuoteTotalsProps) {
  const depositCents = depositRate ? Math.round((totalTtcCents * depositRate) / 10000) : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <CardTitle className="text-sm font-semibold text-gray-700 mb-3">Récapitulatif</CardTitle>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total HT</span>
            <span className="font-medium">{formatCents(totalHtCents)} EUR</span>
          </div>

          {tvaBreakdown.map((group) => (
            <div key={group.tva_rate} className="flex justify-between text-gray-500">
              <span>TVA {formatRate(group.tva_rate)} (base: {formatCents(group.base_ht_cents)})</span>
              <span>{formatCents(group.tva_cents)} EUR</span>
            </div>
          ))}

          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="text-gray-600">Total TVA</span>
            <span className="font-medium">{formatCents(totalTvaCents)} EUR</span>
          </div>

          <div className="flex justify-between pt-2 border-t border-gray-200 text-base">
            <span className="font-semibold text-gray-900">Total TTC</span>
            <span className="font-bold text-gray-900">{formatCents(totalTtcCents)} EUR</span>
          </div>

          {depositRate && depositCents > 0 && (
            <div className="flex justify-between pt-2 border-t border-gray-200 text-primary-700">
              <span>Acompte ({formatRate(depositRate)})</span>
              <span className="font-medium">{formatCents(depositCents)} EUR</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
