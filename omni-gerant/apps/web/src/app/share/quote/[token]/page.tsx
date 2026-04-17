'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

// BUSINESS RULE [CDC-2.1]: Page publique vue devis client (pas d'auth)
// BUSINESS RULE [CDC-2.1]: Signature electronique integree (eIDAS)

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

interface SharedQuote {
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
}

interface ShareResponse {
  quote: SharedQuote;
  can_sign: boolean;
}

export default function SharedQuotePage({ params }: { params: { token: string } }) {
  const [signerName, setSignerName] = useState('');
  const [signerFirstName, setSignerFirstName] = useState('');
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState<SharedQuote | null>(null);
  const [canSign, setCanSign] = useState(false);

  const loadQuote = useCallback(async () => {
    const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
    try {
      const res = await fetch(`${baseUrl}/api/share/quote/${params.token}`);
      if (res.ok) {
        const data: ShareResponse = await res.json();
        setQuote(data.quote);
        setCanSign(data.can_sign);
      } else if (res.status === 404) {
        setError('Ce lien de partage est invalide ou a expire.');
      } else if (res.status === 401) {
        setError('Ce lien de partage a expire.');
      } else {
        setError('Erreur lors du chargement du devis.');
      }
    } catch {
      setError('Erreur reseau — verifiez votre connexion.');
    }
    setLoading(false);
  }, [params.token]);

  useEffect(() => {
    loadQuote();
  }, [loadQuote]);

  const handleSign = async () => {
    setSigning(true);
    const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
    try {
      const res = await fetch(`${baseUrl}/api/share/quote/${params.token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signer_name: signerName,
          signer_first_name: signerFirstName,
        }),
      });
      if (res.ok) {
        setSigned(true);
      } else {
        const errorBody = await res.json().catch(() => null);
        alert(errorBody?.error?.message ?? 'Erreur lors de la signature');
      }
    } catch {
      alert('Erreur reseau');
    }
    setSigning(false);
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-red-600 font-semibold text-lg">{error}</p>
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

        {!signed && canSign && (
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
                  onClick={handleSign}
                  disabled={!signerName || !signerFirstName || signing}
                >
                  {signing ? 'Signature en cours...' : 'Signer et accepter'}
                </Button>
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
