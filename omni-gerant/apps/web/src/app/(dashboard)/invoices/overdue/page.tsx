'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' EUR';
}

interface InvoiceItem {
  id: string;
  number: string;
  client_id: string;
  status: string;
  total_ttc_cents: number;
  remaining_cents: number;
  due_date: string;
}

export default function OverdueInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ items: InvoiceItem[]; has_more: boolean }>('/api/invoices?status=overdue')
      .then((result) => {
        if (result.ok) {
          setInvoices(result.value.items);
        } else {
          setErrorMsg(result.error.message || 'Erreur lors du chargement');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const getDaysOverdue = (dueDateStr: string): number => {
    const due = new Date(dueDateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Factures en retard</h1>
        <Link href="/invoices" className="text-sm text-primary-600 hover:underline">
          Toutes les factures
        </Link>
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
            <p className="text-lg mb-2">Aucune facture en retard</p>
            <p className="text-sm">Toutes vos factures sont a jour.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Facture</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Echeance</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Retard</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Reste a payer</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const daysOverdue = getDaysOverdue(inv.due_date);
                  return (
                    <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/invoices/${inv.id}`} className="text-primary-600 hover:underline font-medium">
                          {inv.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-red-600">
                        {new Date(inv.due_date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant="error">J+{daysOverdue}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCents(inv.remaining_cents)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
