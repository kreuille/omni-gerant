'use client';

import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { QuoteLineRow, type QuoteLineData } from './quote-line-row';
import { QuoteTotals, type TvaGroupDisplay } from './quote-totals';

// BUSINESS RULE [CDC-2.1]: Editeur de devis avec lignes dynamiques et calcul temps reel

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function createEmptyLine(position: number, type: QuoteLineData['type'] = 'line'): QuoteLineData {
  return {
    id: generateId(),
    position,
    type,
    label: '',
    description: '',
    quantity: 1,
    unit: 'unit',
    unit_price_cents: 0,
    tva_rate: 2000,
    discount_type: '',
    discount_value: 0,
    total_ht_cents: 0,
  };
}

function calculateLineTotal(line: QuoteLineData): number {
  if (line.type !== 'line') return 0;
  const base = Math.round(line.quantity * line.unit_price_cents);
  if (line.discount_type === 'percentage' && line.discount_value > 0) {
    return Math.max(0, base - Math.round((base * line.discount_value) / 10000));
  }
  if (line.discount_type === 'fixed' && line.discount_value > 0) {
    return Math.max(0, base - line.discount_value);
  }
  return Math.max(0, base);
}

function calculateTotals(lines: QuoteLineData[]) {
  const tvaMap = new Map<number, { base: number; tva: number }>();
  let totalHt = 0;

  for (const line of lines) {
    if (line.type !== 'line') continue;
    const ht = line.total_ht_cents;
    totalHt += ht;
    const existing = tvaMap.get(line.tva_rate) ?? { base: 0, tva: 0 };
    existing.base += ht;
    existing.tva += Math.round((ht * line.tva_rate) / 10000);
    tvaMap.set(line.tva_rate, existing);
  }

  const breakdown: TvaGroupDisplay[] = Array.from(tvaMap.entries())
    .map(([rate, { base, tva }]) => ({
      tva_rate: rate,
      base_ht_cents: base,
      tva_cents: tva,
      total_ttc_cents: base + tva,
    }))
    .sort((a, b) => b.tva_rate - a.tva_rate);

  const totalTva = breakdown.reduce((sum, g) => sum + g.tva_cents, 0);

  return {
    totalHtCents: totalHt,
    totalTvaCents: totalTva,
    totalTtcCents: totalHt + totalTva,
    tvaBreakdown: breakdown,
  };
}

export interface QuoteEditorHandle {
  getLines: () => QuoteLineData[];
}

interface QuoteEditorProps {
  depositRate?: number | null;
  initialLines?: QuoteLineData[];
}

export const QuoteEditor = forwardRef<QuoteEditorHandle, QuoteEditorProps>(
  function QuoteEditor({ depositRate, initialLines }, ref) {
    const [lines, setLines] = useState<QuoteLineData[]>(initialLines ?? [createEmptyLine(1)]);

    useImperativeHandle(ref, () => ({
      getLines: () => lines,
    }));

    const updateLine = useCallback((id: string, field: keyof QuoteLineData, value: string | number) => {
      setLines((prev) => {
        const updated = prev.map((line) => {
          if (line.id !== id) return line;
          const newLine = { ...line, [field]: value };
          newLine.total_ht_cents = calculateLineTotal(newLine);
          return newLine;
        });
        return updated;
      });
    }, []);

    const removeLine = useCallback((id: string) => {
      setLines((prev) => {
        const filtered = prev.filter((l) => l.id !== id);
        return filtered.map((l, i) => ({ ...l, position: i + 1 }));
      });
    }, []);

    const addLine = useCallback((type: QuoteLineData['type'] = 'line') => {
      setLines((prev) => [...prev, createEmptyLine(prev.length + 1, type)]);
    }, []);

    const totals = calculateTotals(lines);

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 w-10">#</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Designation</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 w-20">Qté</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 w-16">Unité</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 w-28">P.U. HT</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 w-20">TVA</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 w-28">Total HT</th>
                <th className="px-2 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <QuoteLineRow
                  key={line.id}
                  line={line}
                  onChange={updateLine}
                  onRemove={removeLine}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => addLine('line')}>
            + Ligne
          </Button>
          <Button variant="outline" size="sm" onClick={() => addLine('section')}>
            + Section
          </Button>
          <Button variant="outline" size="sm" onClick={() => addLine('comment')}>
            + Commentaire
          </Button>
        </div>

        <div className="max-w-sm ml-auto">
          <QuoteTotals
            totalHtCents={totals.totalHtCents}
            totalTvaCents={totals.totalTvaCents}
            totalTtcCents={totals.totalTtcCents}
            tvaBreakdown={totals.tvaBreakdown}
            depositRate={depositRate}
          />
        </div>
      </div>
    );
  }
);
