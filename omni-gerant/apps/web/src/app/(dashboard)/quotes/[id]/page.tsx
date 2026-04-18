'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import { QuoteActions } from '@/components/quote/quote-actions';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' }> = {
  draft: { label: 'Brouillon', variant: 'default' },
  sent: { label: 'Envoye', variant: 'warning' },
  viewed: { label: 'Vu', variant: 'warning' },
  signed: { label: 'Signe', variant: 'success' },
  refused: { label: 'Refuse', variant: 'error' },
  expired: { label: 'Expire', variant: 'error' },
};

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' EUR';
}

function formatRate(basisPoints: number): string {
  return (basisPoints / 100).toFixed(basisPoints % 100 === 0 ? 0 : 1) + '%';
}

interface QuoteLine {
  id: string;
  position: number;
  type: string;
  label: string;
  description: string | null;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  tva_rate: number;
  total_ht_cents: number;
}

interface CompanyInfo {
  name: string | null;
  siret: string | null;
  address: string | null;
  zip_code: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  tva_number: string | null;
  legal_form: string | null;
}

interface Quote {
  id: string;
  number: string;
  title: string | null;
  status: string;
  client_id: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  client_zip_code: string | null;
  client_city: string | null;
  client_siret: string | null;
  issue_date: string;
  validity_date: string;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  notes: string | null;
  lines: QuoteLine[];
  company?: CompanyInfo | null;
}

export default function QuoteDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<string | null>(null);

  useEffect(() => {
    api.get<Quote>(`/api/quotes/${params.id}`)
      .then((result) => {
        if (result.ok) {
          setQuote(result.value);
        } else {
          setError(result.error.message || 'Devis introuvable');
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm('Supprimer ce devis ?')) return;
    setDeleting(true);
    const result = await api.delete(`/api/quotes/${params.id}`);
    if (result.ok) {
      router.push('/quotes');
    } else {
      setError('Erreur lors de la suppression');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/quotes" className="text-sm text-gray-500 hover:text-gray-700">
              &larr; Retour aux devis
            </Link>
            <Skeleton className="h-8 w-48 mt-1" />
          </div>
        </div>
        <Card>
          <CardContent className="p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div>
        <Link href="/quotes" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Retour aux devis
        </Link>
        <Card className="mt-4">
          <CardContent className="py-12 text-center text-red-500">
            <p>{error || 'Devis introuvable'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[quote.status] ?? STATUS_LABELS['draft']!;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <Link href="/quotes" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Retour aux devis
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
            {quote.number} {quote.title ? `— ${quote.title}` : ''}
          </h1>
          {quote.client_name && (
            <p className="text-sm text-gray-600 mt-0.5">Client : {quote.client_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <QuoteActions
            status={quote.status}
            onPreview={() => { /* TODO: open preview modal */ }}
            onSend={() => setShowSendModal(true)}
            onDuplicate={() => router.push(`/quotes/new?duplicate=${params.id}`)}
            onConvert={async () => {
              if (!confirm('Convertir ce devis signe en facture ?')) return;
              setActionLoading(true);
              const result = await api.post<{ id: string }>(`/api/quotes/${params.id}/convert`, {});
              setActionLoading(false);
              if (result.ok) {
                router.push(`/invoices/${result.value.id}`);
              } else {
                setError(result.error.message || 'Erreur lors de la conversion');
              }
            }}
            onDownloadPdf={() => {
              const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
              const token = localStorage.getItem('access_token');
              // Open in new tab with bearer token in URL is not ideal — use fetch + blob
              fetch(`${apiUrl}/api/quotes/${params.id}/pdf`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              })
                .then((r) => r.text())
                .then((html) => {
                  const blob = new Blob([html], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                  setTimeout(() => URL.revokeObjectURL(url), 60000);
                });
            }}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Emetteur + Destinataire */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Emetteur</p>
            {quote.company ? (
              <div className="text-sm space-y-0.5">
                <p className="font-semibold text-gray-900">{quote.company.name ?? '—'}</p>
                {quote.company.legal_form && <p className="text-gray-600">{quote.company.legal_form}</p>}
                {quote.company.address && <p className="text-gray-700">{quote.company.address}</p>}
                {(quote.company.zip_code || quote.company.city) && (
                  <p className="text-gray-700">{quote.company.zip_code} {quote.company.city}</p>
                )}
                {quote.company.siret && <p className="text-xs text-gray-500 mt-1">SIRET : {quote.company.siret}</p>}
                {quote.company.tva_number && <p className="text-xs text-gray-500">TVA : {quote.company.tva_number}</p>}
                {quote.company.email && <p className="text-xs text-gray-500">{quote.company.email}</p>}
                {quote.company.phone && <p className="text-xs text-gray-500">{quote.company.phone}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Profil entreprise incomplet —{' '}
                <Link href="/settings/profile" className="text-primary-600 hover:underline">
                  completer ici
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Client</p>
            {quote.client_name ? (
              <div className="text-sm space-y-0.5">
                <p className="font-semibold text-gray-900">{quote.client_name}</p>
                {quote.client_address && <p className="text-gray-700">{quote.client_address}</p>}
                {(quote.client_zip_code || quote.client_city) && (
                  <p className="text-gray-700">{quote.client_zip_code} {quote.client_city}</p>
                )}
                {quote.client_siret && <p className="text-xs text-gray-500 mt-1">SIRET : {quote.client_siret}</p>}
                {quote.client_email && <p className="text-xs text-gray-500">{quote.client_email}</p>}
                {quote.client_phone && <p className="text-xs text-gray-500">{quote.client_phone}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Aucun client selectionne</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Lignes du devis</h2>
              <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="py-2 text-left font-semibold text-gray-700">Designation</th>
                    <th className="py-2 text-right font-semibold text-gray-700 w-16">Qte</th>
                    <th className="py-2 text-center font-semibold text-gray-700 w-14">Unite</th>
                    <th className="py-2 text-right font-semibold text-gray-700 w-24">P.U. HT</th>
                    <th className="py-2 text-center font-semibold text-gray-700 w-14">TVA</th>
                    <th className="py-2 text-right font-semibold text-gray-700 w-28">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lines.map((line) => {
                    if (line.type === 'section') {
                      return (
                        <tr key={line.id} className="bg-gray-50">
                          <td colSpan={6} className="py-2 font-semibold text-gray-700">{line.label}</td>
                        </tr>
                      );
                    }
                    if (line.type === 'comment') {
                      return (
                        <tr key={line.id}>
                          <td colSpan={6} className="py-1 text-gray-500 italic text-xs">{line.label}</td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={line.id} className="border-b border-gray-100">
                        <td className="py-2 text-gray-800">{line.label}</td>
                        <td className="py-2 text-right text-gray-700">{line.quantity}</td>
                        <td className="py-2 text-center text-gray-500">{line.unit}</td>
                        <td className="py-2 text-right text-gray-700">{formatCents(line.unit_price_cents)}</td>
                        <td className="py-2 text-center text-gray-500">{formatRate(line.tva_rate)}</td>
                        <td className="py-2 text-right font-medium">{formatCents(line.total_ht_cents)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total HT</span>
                <span className="font-medium">{formatCents(quote.total_ht_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total TVA</span>
                <span className="font-medium">{formatCents(quote.total_tva_cents)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-base font-bold">
                <span>Total TTC</span>
                <span>{formatCents(quote.total_ttc_cents)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Date</span>
                <span>{new Date(quote.issue_date).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Validite</span>
                <span>{new Date(quote.validity_date).toLocaleDateString('fr-FR')}</span>
              </div>
            </CardContent>
          </Card>

          {quote.notes && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Send modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !actionLoading && setShowSendModal(false)}>
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-[calc(100vw-2rem)] sm:max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-2">Envoyer le devis au client</h2>
              <p className="text-sm text-gray-600 mb-4">
                Le client recevra un email avec un lien pour consulter et signer le devis en ligne.
              </p>

              {quote.client_email ? (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <p className="text-xs text-blue-900 font-medium">Destinataire</p>
                  <p className="text-sm text-blue-800 mt-0.5">{quote.client_name}</p>
                  <p className="text-sm text-blue-700">{quote.client_email}</p>
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-orange-900 font-medium">Aucun email renseigne pour ce client</p>
                  <p className="text-xs text-orange-700 mt-1">
                    Ajoutez un email dans la fiche client avant d&apos;envoyer. Un lien public sera quand meme genere.
                  </p>
                </div>
              )}

              {sendFeedback && (
                <p className="text-sm text-green-700 mb-3">{sendFeedback}</p>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowSendModal(false); setSendFeedback(null); }}
                  disabled={actionLoading}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    setActionLoading(true);
                    setSendFeedback(null);
                    const result = await api.post<{ status: string; share_url: string; email_sent: boolean }>(
                      `/api/quotes/${params.id}/send`, {}
                    );
                    if (result.ok) {
                      setQuote({ ...quote, status: 'sent' });
                      setSendFeedback(
                        result.value.email_sent
                          ? 'Devis envoye ! Lien partage : ' + result.value.share_url
                          : 'Lien genere (aucun email envoye faute d\'adresse) : ' + result.value.share_url,
                      );
                      setTimeout(() => { setShowSendModal(false); setSendFeedback(null); }, 3000);
                    } else {
                      setSendFeedback('Erreur lors de l\'envoi');
                    }
                    setActionLoading(false);
                  }}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Envoi...' : 'Envoyer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
