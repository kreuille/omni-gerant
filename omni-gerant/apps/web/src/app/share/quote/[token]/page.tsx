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

function formatRate(basisPoints: number): string {
  return (basisPoints / 100).toFixed(basisPoints % 100 === 0 ? 0 : 1) + '%';
}

interface SharedQuote {
  number: string;
  title: string | null;
  status: string;
  issue_date: string;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  validity_date: string;
  notes: string | null;
  client_name: string | null;
  client_address: string | null;
  client_zip_code: string | null;
  client_city: string | null;
  client_siret: string | null;
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

interface SharedCompany {
  name: string | null;
  siret: string | null;
  address: string | null;
  zip_code: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  tva_number: string | null;
}

interface ShareResponse {
  quote: SharedQuote;
  company: SharedCompany | null;
  can_sign: boolean;
}

export default function SharedQuotePage({ params }: { params: { token: string } }) {
  const [signerName, setSignerName] = useState('');
  const [signerFirstName, setSignerFirstName] = useState('');
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [refused, setRefused] = useState(false);
  const [showRefuseForm, setShowRefuseForm] = useState(false);
  const [refuseReason, setRefuseReason] = useState('');
  const [refusing, setRefusing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState<SharedQuote | null>(null);
  const [company, setCompany] = useState<SharedCompany | null>(null);
  const [canSign, setCanSign] = useState(false);

  const loadQuote = useCallback(async () => {
    const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
    try {
      const res = await fetch(`${baseUrl}/api/share/quote/${params.token}`);
      if (res.ok) {
        const data: ShareResponse = await res.json();
        setQuote(data.quote);
        setCompany(data.company);
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

  const handleRefuse = async () => {
    setRefusing(true);
    const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
    try {
      const res = await fetch(`${baseUrl}/api/share/quote/${params.token}/refuse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refuseReason.trim() || undefined }),
      });
      if (res.ok) {
        setRefused(true);
      } else {
        alert('Erreur lors du refus');
      }
    } catch {
      alert('Erreur reseau');
    }
    setRefusing(false);
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
        {/* Emetteur + Destinataire */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {company && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-2">De</p>
                  <p className="font-semibold text-gray-900">{company.name ?? '—'}</p>
                  {company.address && <p className="text-sm text-gray-700">{company.address}</p>}
                  {(company.zip_code || company.city) && (
                    <p className="text-sm text-gray-700">{company.zip_code} {company.city}</p>
                  )}
                  {company.siret && <p className="text-xs text-gray-500 mt-1">SIRET : {company.siret}</p>}
                  {company.tva_number && <p className="text-xs text-gray-500">TVA : {company.tva_number}</p>}
                  {company.email && <p className="text-xs text-gray-500">{company.email}</p>}
                  {company.phone && <p className="text-xs text-gray-500">{company.phone}</p>}
                </div>
              )}
              {quote?.client_name && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Pour</p>
                  <p className="font-semibold text-gray-900">{quote.client_name}</p>
                  {quote.client_address && <p className="text-sm text-gray-700">{quote.client_address}</p>}
                  {(quote.client_zip_code || quote.client_city) && (
                    <p className="text-sm text-gray-700">{quote.client_zip_code} {quote.client_city}</p>
                  )}
                  {quote.client_siret && <p className="text-xs text-gray-500 mt-1">SIRET : {quote.client_siret}</p>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Devis {quote?.number}</h1>
            {quote?.title && (
              <p className="text-gray-600 mt-1">{quote.title}</p>
            )}
          </div>
          <div className="text-right text-sm text-gray-600">
            {quote?.issue_date && <p>Date : {new Date(quote.issue_date).toLocaleDateString('fr-FR')}</p>}
            {quote?.validity_date && <p>Validite : {new Date(quote.validity_date).toLocaleDateString('fr-FR')}</p>}
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="overflow-x-auto">
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-gray-500">Designation</th>
                  <th className="text-right py-2 text-gray-500">Qte</th>
                  <th className="text-center py-2 text-gray-500">Unite</th>
                  <th className="text-right py-2 text-gray-500">P.U. HT</th>
                  <th className="text-center py-2 text-gray-500">TVA</th>
                  <th className="text-right py-2 text-gray-500">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {quote?.lines.map((line) => {
                  if (line.type === 'section') {
                    return (
                      <tr key={line.position} className="bg-gray-50">
                        <td colSpan={6} className="py-2 font-semibold">{line.label}</td>
                      </tr>
                    );
                  }
                  if (line.type === 'comment') {
                    return (
                      <tr key={line.position}>
                        <td colSpan={6} className="py-1 text-gray-500 italic text-xs">{line.label}</td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={line.position} className="border-b border-gray-100">
                      <td className="py-2">{line.label}</td>
                      <td className="py-2 text-right">{line.quantity}</td>
                      <td className="py-2 text-center">{line.unit}</td>
                      <td className="py-2 text-right">{formatCents(line.unit_price_cents)} EUR</td>
                      <td className="py-2 text-center text-gray-500">{formatRate(line.tva_rate)}</td>
                      <td className="py-2 text-right font-medium">{formatCents(line.total_ht_cents)} EUR</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>

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

        {!signed && !refused && canSign && !showRefuseForm && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Signer ce devis</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Nom" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prenom</label>
                  <Input value={signerFirstName} onChange={(e) => setSignerFirstName(e.target.value)} placeholder="Prenom" />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleSign}
                  disabled={!signerName || !signerFirstName || signing}
                >
                  {signing ? 'Signature en cours...' : 'Signer et accepter'}
                </Button>
                <Button variant="outline" onClick={() => setShowRefuseForm(true)}>
                  Refuser
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {showRefuseForm && !refused && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Refuser ce devis</h2>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Raison (optionnel)
              </label>
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mb-4"
                rows={3}
                value={refuseReason}
                onChange={(e) => setRefuseReason(e.target.value)}
                placeholder="Expliquez pourquoi vous refusez ce devis..."
              />
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleRefuse} disabled={refusing}>
                  {refusing ? 'Refus en cours...' : 'Confirmer le refus'}
                </Button>
                <Button variant="outline" onClick={() => setShowRefuseForm(false)}>
                  Annuler
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

        {refused && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-red-600 font-semibold text-lg">Devis refuse</p>
              <p className="text-sm text-gray-500 mt-1">L&apos;emetteur du devis a ete informe.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
