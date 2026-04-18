'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';

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

interface QuoteItem {
  id: string;
  number: string;
  title: string | null;
  client_id: string;
  status: string;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  issue_date: string;
  validity_date: string;
  created_at: string;
}

export default function QuotesPage() {
  const [search, setSearch] = useState('');
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    api.get<{ items: QuoteItem[]; has_more: boolean }>(`/api/quotes?${params.toString()}`)
      .then((result) => {
        if (result.ok) setQuotes(result.value.items);
      })
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Devis</h1>
        <Link href="/quotes/new">
          <Button>Nouveau devis</Button>
        </Link>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Rechercher un devis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p className="text-sm">Chargement...</p>
          </CardContent>
        </Card>
      ) : quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p className="text-lg mb-2">Aucun devis pour le moment</p>
            <p className="text-sm">Creez votre premier devis pour commencer.</p>
          </CardContent>
        </Card>
      ) : (
        {/* Mobile card view */}
        <div className="space-y-3 md:hidden">
          {quotes.map((quote) => {
            const statusInfo = STATUS_LABELS[quote.status] ?? STATUS_LABELS['draft']!;
            return (
              <Card key={quote.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Link href={`/quotes/${quote.id}`} className="text-primary-600 hover:underline font-medium text-sm">
                      {quote.number}
                    </Link>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </div>
                  {quote.title && <p className="text-sm text-gray-900 mb-1">{quote.title}</p>}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{new Date(quote.issue_date).toLocaleDateString('fr-FR')}</span>
                    <span className="font-medium">{formatCents(quote.total_ttc_cents)}</span>
                  </div>
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Titre</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Montant TTC</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => {
                  const statusInfo = STATUS_LABELS[quote.status] ?? STATUS_LABELS['draft']!;
                  return (
                    <tr key={quote.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/quotes/${quote.id}`} className="text-primary-600 hover:underline font-medium">
                          {quote.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{quote.title || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCents(quote.total_ttc_cents)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(quote.issue_date).toLocaleDateString('fr-FR')}
                      </td>
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
