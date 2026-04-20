'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' EUR';
}

interface InvoiceItem {
  id: string;
  number: string;
  client_id: string;
  client_name?: string | null;
  type: string;
  status: string;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  paid_cents: number;
  remaining_cents: number;
  issue_date: string;
  due_date: string;
  created_at: string;
}

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErrorMsg(null);
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    api.get<{ items: InvoiceItem[]; has_more: boolean }>(`/api/invoices?${params.toString()}`)
      .then((result) => {
        if (result.ok) {
          setInvoices(result.value.items);
        } else {
          setErrorMsg(result.error.message || 'Erreur lors du chargement des factures');
        }
      })
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Factures</h1>
        <Link href="/invoices/new">
          <Button>Nouvelle facture</Button>
        </Link>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Rechercher une facture..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p className="text-sm">Chargement...</p>
          </CardContent>
        </Card>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p className="text-lg mb-2">Aucune facture pour le moment</p>
            <p className="text-sm">Créez votre premiere facture ou generez-en une depuis un devis signe.</p>
          </CardContent>
        </Card>
      ) : (
        <>
        {/* Mobile card view */}
        <div className="space-y-3 md:hidden">
          {invoices.map((inv) => {
            const statusInfo = STATUS_LABELS[inv.status] ?? STATUS_LABELS['draft']!;
            return (
              <Card key={inv.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Link href={`/invoices/${inv.id}`} className="text-primary-600 hover:underline font-medium text-sm">
                      {inv.number}
                    </Link>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </div>
                  <p className="text-sm text-gray-900 mb-1">{inv.client_name}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Ech. {inv.due_date}</span>
                    <span className="font-medium">{formatCents(inv.total_ttc_cents)}</span>
                  </div>
                  {inv.remaining_cents > 0 && inv.remaining_cents !== inv.total_ttc_cents && (
                    <p className="text-xs text-orange-600 mt-1">Reste : {formatCents(inv.remaining_cents)}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Desktop table view */}
        <Card className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Numero</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Client</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Total TTC</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Reste a payer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Echeance</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const statusInfo = STATUS_LABELS[inv.status] ?? STATUS_LABELS['draft']!;
                  return (
                    <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/invoices/${inv.id}`} className="text-primary-600 hover:underline font-medium">
                          {inv.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{inv.client_id}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCents(inv.total_ttc_cents)}</td>
                      <td className="px-4 py-3 text-right">{formatCents(inv.remaining_cents)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(inv.due_date).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        </>
      )}
    </div>
  );
}
