'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

// BUSINESS RULE [CDC-2.1]: Page publique vue devis client (pas d'auth)
// BUSINESS RULE [CDC-2.1]: Signature electronique integree (eIDAS)

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export default function SharedQuotePage({ params }: { params: { token: string } }) {
  const [signerName, setSignerName] = useState('');
  const [signerFirstName, setSignerFirstName] = useState('');
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  // Placeholder - will fetch from API
  const loading = true;
  const quote = null as null | {
    number: string;
    title: string | null;
    status: string;
    total_ht_cents: number;
    total_tva_cents: number;
    total_ttc_cents: number;
    validity_date: string;
    notes: string | null;
    lines: Array<{
      position: number;
      type: string;
      label: string;
      quantity: number;
      unit: string;
      unit_price_cents: number;
      tva_rate: number;
      total_ht_cents: number;
    }>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-10 w-48 mb-6" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-24 w-64 ml-auto" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Devis {quote?.number}</h1>
        {quote?.title && (
          <p className="text-gray-600 mb-6">{quote.title}</p>
        )}

        <Card className="mb-6">
          <CardContent className="p-6">
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-gray-500">Designation</th>
                  <th className="text-right py-2 text-gray-500">Qte</th>
                  <th className="text-center py-2 text-gray-500">Unite</th>
                  <th className="text-right py-2 text-gray-500">P.U. HT</th>
                  <th className="text-right py-2 text-gray-500">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {quote?.lines.map((line) => (
                  <tr key={line.position} className="border-b border-gray-100">
                    <td className="py-2">{line.label}</td>
                    <td className="py-2 text-right">{line.type === 'line' ? line.quantity : ''}</td>
                    <td className="py-2 text-center">{line.type === 'line' ? line.unit : ''}</td>
                    <td className="py-2 text-right">{line.type === 'line' ? `${formatCents(line.unit_price_cents)} EUR` : ''}</td>
                    <td className="py-2 text-right font-medium">{line.type === 'line' ? `${formatCents(line.total_ht_cents)} EUR` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="max-w-xs ml-auto space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total HT</span>
                <span className="font-medium">{formatCents(quote?.total_ht_cents ?? 0)} EUR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">TVA</span>
                <span>{formatCents(quote?.total_tva_cents ?? 0)} EUR</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-bold text-base">
                <span>Total TTC</span>
                <span>{formatCents(quote?.total_ttc_cents ?? 0)} EUR</span>
              </div>
            </div>

            {quote?.notes && (
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm text-gray-500 font-medium mb-1">Conditions</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {!signed && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Signer ce devis</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Nom" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prenom</label>
                  <Input value={signerFirstName} onChange={(e) => setSignerFirstName(e.target.value)} placeholder="Prenom" />
                </div>
              </div>
              <div className="flex gap-4">
                <Button
                  onClick={() => setSigning(true)}
                  disabled={!signerName || !signerFirstName || signing}
                >
                  {signing ? 'Signature en cours...' : 'Signer et accepter'}
                </Button>
                <Button variant="outline">Refuser</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {signed && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-green-600 font-semibold text-lg">Devis signe avec succes</p>
              <p className="text-sm text-gray-500 mt-1">Merci pour votre confiance.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
