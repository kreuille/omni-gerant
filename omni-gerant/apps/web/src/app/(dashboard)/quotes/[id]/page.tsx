'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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

interface Quote {
  id: string;
  number: string;
  title: string | null;
  status: string;
  issue_date: string;
  validity_date: string;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  notes: string | null;
  lines: QuoteLine[];
}

export default function QuoteDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/quotes" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Retour aux devis
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {quote.number} {quote.title ? `— ${quote.title}` : ''}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <Button variant="outline" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Lignes du devis</h2>
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
    </div>
  );
}
