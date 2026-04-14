'use client';

import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// BUSINESS RULE [CDC-2.1]: Resume cumulatif des situations

interface SituationSummaryItem {
  situation_number: number;
  global_percent: number;
  invoice_ht_cents: number;
  invoice_ttc_cents: number;
  status: string;
  created_at: string;
}

interface SituationSummaryProps {
  situations: SituationSummaryItem[];
  totalQuoteHtCents: number;
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function SituationSummary({ situations, totalQuoteHtCents }: SituationSummaryProps) {
  const totalInvoiced = situations.reduce((sum, s) => sum + s.invoice_ht_cents, 0);
  const remaining = totalQuoteHtCents - totalInvoiced;

  return (
    <Card>
      <CardContent className="p-4">
        <CardTitle className="text-sm font-semibold text-gray-700 mb-3">Situations de travaux</CardTitle>

        {situations.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune situation creee</p>
        ) : (
          <div className="space-y-2 mb-4">
            {situations.map((s) => (
              <div key={s.situation_number} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                <div>
                  <span className="font-medium">Situation {s.situation_number}</span>
                  <span className="text-gray-500 ml-2">({(s.global_percent / 100).toFixed(0)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatCents(s.invoice_ht_cents)} EUR HT</span>
                  <Badge variant={s.status === 'finalized' ? 'success' : 'default'}>
                    {s.status === 'finalized' ? 'Finalisee' : 'Brouillon'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1 text-sm pt-2 border-t border-gray-200">
          <div className="flex justify-between">
            <span className="text-gray-600">Total devis</span>
            <span>{formatCents(totalQuoteHtCents)} EUR HT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total facture</span>
            <span>{formatCents(totalInvoiced)} EUR HT</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Reste a facturer</span>
            <span>{formatCents(remaining)} EUR HT</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
