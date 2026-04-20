'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SupplierSelect } from './supplier-select';
import { api } from '@/lib/api-client';

// BUSINESS RULE [CDC-2.2]: Formulaire saisie facture d'achat connecte a l'API

interface PurchaseLine {
  id: string;
  position: number;
  label: string;
  quantity: number;
  unit_price_cents: number;
  tva_rate: number;
  total_ht_cents: number;
}

interface PurchaseResponse {
  id: string;
}

const TVA_RATES = [
  { value: 2000, label: '20%' },
  { value: 1000, label: '10%' },
  { value: 550, label: '5,5%' },
  { value: 210, label: '2,1%' },
  { value: 0, label: '0%' },
];

function createEmptyLine(position: number): PurchaseLine {
  return {
    id: crypto.randomUUID(),
    position,
    label: '',
    quantity: 1,
    unit_price_cents: 0,
    tva_rate: 2000,
    total_ht_cents: 0,
  };
}

function formatCentsInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseCentsInput(value: string): number {
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function PurchaseForm() {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [number, setNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<PurchaseLine[]>([createEmptyLine(1)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLine = useCallback((id: string, field: keyof PurchaseLine, value: unknown) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const updated = { ...line, [field]: value };
        // BUSINESS RULE [R02]: Recalcul en centimes
        updated.total_ht_cents = Math.round(updated.quantity * updated.unit_price_cents);
        return updated;
      }),
    );
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, createEmptyLine(prev.length + 1)]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => {
      const filtered = prev.filter((l) => l.id !== id);
      return filtered.map((l, i) => ({ ...l, position: i + 1 }));
    });
  }, []);

  // Calculate totals
  const totalHtCents = lines.reduce((sum, l) => sum + l.total_ht_cents, 0);
  const totalTvaCents = lines.reduce(
    (sum, l) => sum + Math.round((l.total_ht_cents * l.tva_rate) / 10000),
    0,
  );
  const totalTtcCents = totalHtCents + totalTvaCents;

  const handleSubmit = async () => {
    // Validate at least one line has a label
    const validLines = lines.filter((l) => l.label.trim() !== '');
    if (validLines.length === 0) {
      setError('Ajoutez au moins une ligne avec une designation.');
      return;
    }

    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      source: 'manual',
      lines: validLines.map((l) => ({
        position: l.position,
        label: l.label.trim(),
        quantity: l.quantity,
        unit_price_cents: l.unit_price_cents,
        tva_rate: l.tva_rate,
      })),
    };

    if (supplierId) body['supplier_id'] = supplierId;
    if (number.trim()) body['number'] = number.trim();
    if (issueDate) body['issue_date'] = new Date(issueDate).toISOString();
    if (dueDate) body['due_date'] = new Date(dueDate).toISOString();
    if (notes.trim()) body['notes'] = notes.trim();

    const result = await api.post<PurchaseResponse>('/api/purchases', body);
    if (result.ok) {
      router.push(`/purchases/${result.value.id}`);
    } else {
      setError(result.error.message);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Header fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
          <SupplierSelect value={supplierId} onChange={setSupplierId} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Numero facture</label>
          <Input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Numero du fournisseur"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date facture</label>
          <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date echeance</label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      {/* Lines */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Lignes</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left">#</th>
              <th className="py-2 text-left">Designation</th>
              <th className="py-2 text-right w-20">Qté</th>
              <th className="py-2 text-right w-28">P.U. HT</th>
              <th className="py-2 text-right w-24">TVA</th>
              <th className="py-2 text-right w-28">Total HT</th>
              <th className="py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b border-gray-100">
                <td className="py-2 text-gray-400">{line.position}</td>
                <td className="py-2">
                  <Input
                    value={line.label}
                    onChange={(e) => updateLine(line.id, 'label', e.target.value)}
                    placeholder="Description"
                    className="h-8"
                  />
                </td>
                <td className="py-2">
                  <Input
                    type="number"
                    value={line.quantity}
                    onChange={(e) => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className="h-8 text-right"
                    min={0}
                    step="0.01"
                  />
                </td>
                <td className="py-2">
                  <Input
                    type="number"
                    value={formatCentsInput(line.unit_price_cents)}
                    onChange={(e) => updateLine(line.id, 'unit_price_cents', parseCentsInput(e.target.value))}
                    className="h-8 text-right"
                    min={0}
                    step="0.01"
                  />
                </td>
                <td className="py-2">
                  <select
                    value={line.tva_rate}
                    onChange={(e) => updateLine(line.id, 'tva_rate', parseInt(e.target.value))}
                    className="h-8 rounded border border-gray-300 text-sm w-full"
                  >
                    {TVA_RATES.map((rate) => (
                      <option key={rate.value} value={rate.value}>
                        {rate.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 text-right font-medium">
                  {(line.total_ht_cents / 100).toFixed(2).replace('.', ',')}
                </td>
                <td className="py-2">
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      x
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button variant="outline" size="sm" onClick={addLine} className="mt-2">
          + Ajouter une ligne
        </Button>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Total HT</span>
            <span className="font-medium">{(totalHtCents / 100).toFixed(2).replace('.', ',')} EUR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">TVA</span>
            <span className="font-medium">{(totalTvaCents / 100).toFixed(2).replace('.', ',')} EUR</span>
          </div>
          <div className="flex justify-between text-base font-semibold border-t pt-2">
            <span>Total TTC</span>
            <span>{(totalTtcCents / 100).toFixed(2).replace('.', ',')} EUR</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-gray-300 p-2 text-sm"
          rows={3}
          placeholder="Notes internes..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push('/purchases')}>Annuler</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
