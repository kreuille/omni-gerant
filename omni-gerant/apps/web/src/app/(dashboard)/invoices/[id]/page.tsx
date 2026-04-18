'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  draft: { label: 'Brouillon', variant: 'default' },
  finalized: { label: 'Finalisee', variant: 'info' },
  sent: { label: 'Envoyee', variant: 'info' },
  paid: { label: 'Payee', variant: 'success' },
  partially_paid: { label: 'Partiellement payee', variant: 'warning' },
  overdue: { label: 'En retard', variant: 'error' },
  cancelled: { label: 'Annulee', variant: 'error' },
};

const TYPE_LABELS: Record<string, string> = {
  standard: 'Standard',
  deposit: 'Acompte',
  credit_note: 'Avoir',
  situation: 'Situation',
};

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' EUR';
}

interface InvoiceLine {
  id: string;
  position: number;
  label: string;
  description: string | null;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  tva_rate: number;
  total_ht_cents: number;
}

interface InvoiceDetail {
  id: string;
  number: string;
  client_id: string;
  type: string;
  status: string;
  issue_date: string;
  due_date: string;
  payment_terms: number;
  notes: string | null;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  paid_cents: number;
  remaining_cents: number;
  deposit_percent: number | null;
  finalized_at: string | null;
  paid_at: string | null;
  lines: InvoiceLine[];
}

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInvoice = () => {
    setLoading(true);
    setErrorMsg(null);
    api.get<InvoiceDetail>(`/api/invoices/${params.id}`)
      .then((result) => {
        if (result.ok) {
          setInvoice(result.value);
        } else {
          setErrorMsg(result.error.message || 'Facture introuvable');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleFinalize = async () => {
    setActionLoading(true);
    const result = await api.post<InvoiceDetail>(`/api/invoices/${params.id}/finalize`, {});
    setActionLoading(false);
    if (result.ok) {
      setInvoice(result.value);
    } else {
      setErrorMsg(result.error.message || 'Erreur lors de la finalisation');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer cette facture brouillon ?')) return;
    setActionLoading(true);
    const result = await api.delete(`/api/invoices/${params.id}`);
    setActionLoading(false);
    if (result.ok) {
      window.location.href = '/invoices';
    } else {
      setErrorMsg(result.error.message || 'Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/invoices" className="text-sm text-gray-500 hover:text-gray-700">
              &larr; Retour aux factures
            </Link>
            <Skeleton className="h-8 w-48 mt-1" />
          </div>
        </div>
        <Card>
          <CardContent className="p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-64 ml-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (errorMsg && !invoice) {
    return (
      <div>
        <div className="mb-6">
          <Link href="/invoices" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Retour aux factures
          </Link>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600">{errorMsg}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invoice) return null;

  const statusInfo = STATUS_LABELS[invoice.status] ?? STATUS_LABELS['draft']!;
  const isDraft = invoice.status === 'draft';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/invoices" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Retour aux factures
          </Link>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mt-1">
            Facture {invoice.number}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/invoices/${params.id}/pdf`}>
            <Button variant="outline">PDF</Button>
          </Link>
          {isDraft && (
            <>
              <Button
                onClick={handleFinalize}
                disabled={actionLoading}
              >
                {actionLoading ? 'En cours...' : 'Finaliser'}
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={actionLoading}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Supprimer
              </Button>
            </>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice lines */}
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Lignes de facturation</h2>
              {invoice.lines.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucune ligne</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Designation</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Qte</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Unite</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">PU HT</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">TVA</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.lines
                        .sort((a, b) => a.position - b.position)
                        .map((line) => (
                          <tr key={line.id} className="border-b border-gray-100">
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900">{line.label}</div>
                              {line.description && (
                                <div className="text-gray-400 text-xs mt-0.5">{line.description}</div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">{line.quantity}</td>
                            <td className="px-3 py-2">{line.unit}</td>
                            <td className="px-3 py-2 text-right">{formatCents(line.unit_price_cents)}</td>
                            <td className="px-3 py-2 text-right">{(line.tva_rate / 100).toFixed(1)}%</td>
                            <td className="px-3 py-2 text-right font-medium">{formatCents(line.total_ht_cents)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardContent className="p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Notes</h2>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Status & Info */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Statut</span>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Type</span>
                <span className="text-sm font-medium">{TYPE_LABELS[invoice.type] || invoice.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Date emission</span>
                <span className="text-sm">{new Date(invoice.issue_date).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Echeance</span>
                <span className="text-sm">{new Date(invoice.due_date).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Delai paiement</span>
                <span className="text-sm">{invoice.payment_terms} jours</span>
              </div>
              {invoice.deposit_percent != null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Acompte</span>
                  <span className="text-sm">{(invoice.deposit_percent / 100).toFixed(0)}%</span>
                </div>
              )}
              {invoice.finalized_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Finalisee le</span>
                  <span className="text-sm">{new Date(invoice.finalized_at).toLocaleDateString('fr-FR')}</span>
                </div>
              )}
              {invoice.paid_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Payee le</span>
                  <span className="text-sm">{new Date(invoice.paid_at).toLocaleDateString('fr-FR')}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total HT</span>
                <span className="text-sm font-medium">{formatCents(invoice.total_ht_cents)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">TVA</span>
                <span className="text-sm font-medium">{formatCents(invoice.total_tva_cents)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-sm font-semibold text-gray-900">Total TTC</span>
                <span className="text-base font-bold text-gray-900">{formatCents(invoice.total_ttc_cents)}</span>
              </div>
              {invoice.paid_cents > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Deja paye</span>
                  <span className="text-sm font-medium text-green-600">{formatCents(invoice.paid_cents)}</span>
                </div>
              )}
              {invoice.remaining_cents > 0 && invoice.remaining_cents !== invoice.total_ttc_cents && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Reste a payer</span>
                  <span className="text-sm font-medium text-orange-600">{formatCents(invoice.remaining_cents)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
