'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QuoteEditor, type QuoteEditorHandle } from '@/components/quote/quote-editor';
import { QuoteClientSelect } from '@/components/quote/quote-client-select';
import { api } from '@/lib/api-client';

export default function NewInvoicePage() {
  const router = useRouter();
  const editorRef = useRef<QuoteEditorHandle>(null);
  const [clientId, setClientId] = useState('');
  const [type, setType] = useState<'standard' | 'deposit' | 'credit_note' | 'situation'>('standard');
  const [paymentTerms, setPaymentTerms] = useState(30);
  const [notes, setNotes] = useState('');
  const [depositPercent, setDepositPercent] = useState(3000); // 30% par defaut
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const lines = editorRef.current?.getLines() ?? [];
    if (lines.filter((l) => l.type === 'line').length === 0) {
      setError('Ajoutez au moins une ligne a la facture.');
      return;
    }
    const hasEmptyLabel = lines.some((l) => l.type === 'line' && !l.label.trim());
    if (hasEmptyLabel) {
      setError('Toutes les lignes doivent avoir une designation.');
      return;
    }

    if (!clientId) {
      setError('Veuillez selectionner un client.');
      return;
    }

    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      client_id: clientId,
      type,
      payment_terms: paymentTerms,
      notes: notes || undefined,
      lines: lines.map((l, i) => ({
        position: i + 1,
        label: l.label || 'Ligne',
        description: l.description || undefined,
        quantity: l.quantity,
        unit: l.unit,
        unit_price_cents: l.unit_price_cents,
        tva_rate: l.tva_rate,
      })),
    };

    if (type === 'deposit') {
      body['deposit_percent'] = depositPercent;
    }

    const result = await api.post<{ id: string }>('/api/invoices', body);

    setSaving(false);

    if (result.ok) {
      router.push('/invoices');
    } else {
      setError(result.error.message || 'Erreur lors de la sauvegarde de la facture');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/invoices" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Retour aux factures
          </Link>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mt-1">Nouvelle facture</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/invoices')}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-4 space-y-4">
              <QuoteClientSelect value={clientId} onChange={setClientId} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Lignes de facturation</h2>
              <QuoteEditor ref={editorRef} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de facture</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as typeof type)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="standard">Standard</option>
                  <option value="deposit">Acompte</option>
                  <option value="credit_note">Avoir</option>
                  <option value="situation">Situation</option>
                </select>
              </div>

              {type === 'deposit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pourcentage acompte</label>
                  <Input
                    type="number"
                    value={depositPercent / 100}
                    onChange={(e) => setDepositPercent(Math.round(parseFloat(e.target.value || '0') * 100))}
                    min={1}
                    max={100}
                    step={1}
                  />
                  <p className="text-xs text-gray-400 mt-1">{(depositPercent / 100).toFixed(0)}% du total HT</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delai de paiement (jours)</label>
                <Input
                  type="number"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(parseInt(e.target.value, 10) || 30)}
                  min={0}
                  max={365}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={4}
                  placeholder="Notes internes..."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
