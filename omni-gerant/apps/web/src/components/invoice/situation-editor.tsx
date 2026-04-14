'use client';

import { useState } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// BUSINESS RULE [CDC-2.1]: Interface avancement par ligne

interface SituationEditorProps {
  quoteLines: Array<{
    position: number;
    label: string;
    quantity: number;
    unit: string;
    total_ht_cents: number;
  }>;
  previousPercent: number; // basis points
  onSubmit: (globalPercent: number) => void;
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function SituationEditor({ quoteLines, previousPercent, onSubmit }: SituationEditorProps) {
  const [globalPercent, setGlobalPercent] = useState(previousPercent / 100 + 10);

  const totalQuoteHt = quoteLines.reduce((sum, l) => sum + l.total_ht_cents, 0);
  const cumulativeHt = Math.round((totalQuoteHt * globalPercent) / 100);
  const previousHt = Math.round((totalQuoteHt * previousPercent) / 10000);
  const situationHt = cumulativeHt - previousHt;

  return (
    <Card>
      <CardContent className="p-4">
        <CardTitle className="text-sm font-semibold text-gray-700 mb-4">Avancement</CardTitle>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Avancement cumule (%)
          </label>
          <Input
            type="number"
            value={globalPercent}
            onChange={(e) => setGlobalPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
            min={previousPercent / 100}
            max={100}
            step={1}
          />
          <p className="text-xs text-gray-500 mt-1">
            Precedent : {(previousPercent / 100).toFixed(0)}% | Cette situation : {(globalPercent - previousPercent / 100).toFixed(0)}%
          </p>
        </div>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Total devis HT</span>
            <span>{formatCents(totalQuoteHt)} EUR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Deja facture</span>
            <span>{formatCents(previousHt)} EUR</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>A facturer (cette situation)</span>
            <span>{formatCents(situationHt)} EUR</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Reste apres</span>
            <span>{formatCents(totalQuoteHt - cumulativeHt)} EUR</span>
          </div>
        </div>

        <Button onClick={() => onSubmit(Math.round(globalPercent * 100))} className="w-full">
          Creer la situation
        </Button>
      </CardContent>
    </Card>
  );
}
