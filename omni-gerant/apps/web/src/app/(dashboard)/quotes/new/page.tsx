'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QuoteEditor, type QuoteEditorHandle } from '@/components/quote/quote-editor';
import { QuoteClientSelect } from '@/components/quote/quote-client-select';
import { QuotePreviewModal } from '@/components/quote/quote-preview-modal';
import { api } from '@/lib/api-client';

export default function NewQuotePage() {
  const router = useRouter();
  const editorRef = useRef<QuoteEditorHandle>(null);
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [validityDays, setValidityDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const lines = editorRef.current?.getLines() ?? [];
    if (lines.filter((l) => l.type === 'line').length === 0) {
      setError('Ajoutez au moins une ligne au devis.');
      return;
    }
    const hasEmptyLabel = lines.some((l) => l.type === 'line' && !l.label.trim());
    if (hasEmptyLabel) {
      setError('Toutes les lignes doivent avoir une designation.');
      return;
    }

    setSaving(true);
    setError(null);

    // Ensure we have a client_id — create a default client if none selected
    let resolvedClientId = clientId;
    if (!resolvedClientId) {
      const clientResult = await api.post<{ id: string }>('/api/clients', {
        type: 'company',
        company_name: title || 'Client sans nom',
        payment_terms: 30,
      });
      if (clientResult.ok) {
        resolvedClientId = clientResult.value.id;
      } else {
        setSaving(false);
        setError('Veuillez selectionner un client avant d\'enregistrer le devis.');
        return;
      }
    }

    const result = await api.post<{ id: string }>('/api/quotes', {
      client_id: resolvedClientId,
      title: title || 'Devis sans titre',
      validity_days: validityDays,
      notes: notes || undefined,
      lines: lines.map((l, i) => ({
        position: i + 1,
        type: l.type,
        label: l.label || 'Ligne',
        description: l.description || undefined,
        quantity: l.quantity,
        unit: l.unit,
        unit_price_cents: l.unit_price_cents,
        tva_rate: l.tva_rate,
        discount_type: l.discount_type || undefined,
        discount_value: l.discount_value || undefined,
      })),
    });

    setSaving(false);

    if (result.ok) {
      router.push('/quotes');
    } else {
      setError(result.error.message || 'Erreur lors de la sauvegarde');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/quotes" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Retour aux devis
          </Link>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mt-1">Nouveau devis</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            Apercu
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre du devis</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Renovation salle de bain"
                />
              </div>
              <QuoteClientSelect value={clientId} onChange={setClientId} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Lignes du devis</h2>
              <QuoteEditor ref={editorRef} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Validite (jours)</label>
                <Input
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(parseInt(e.target.value, 10) || 30)}
                  min={1}
                  max={365}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Conditions</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={4}
                  placeholder="Conditions particulieres..."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showPreview && (
        <QuotePreviewModal
          title={title}
          lines={editorRef.current?.getLines() ?? []}
          validityDays={validityDays}
          notes={notes}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
