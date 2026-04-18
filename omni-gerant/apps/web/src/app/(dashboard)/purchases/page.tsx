'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

// BUSINESS RULE [CDC-2.2]: Dashboard achats

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  pending: { label: 'En attente', variant: 'default' },
  validated: { label: 'Validee', variant: 'info' },
  paid: { label: 'Payee', variant: 'success' },
  disputed: { label: 'Litige', variant: 'error' },
};

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' EUR';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

export default function PurchasesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Placeholder - sera connecte a l'API
  const purchases: Array<{
    id: string;
    number: string | null;
    supplier_name: string;
    status: string;
    total_ttc_cents: number;
    paid_cents: number;
    due_date: string | null;
    issue_date: string | null;
  }> = [];

  const dueThisWeek: typeof purchases = [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Achats</h1>
        <Link href="/purchases/new">
          <Button>Nouvelle facture d&apos;achat</Button>
        </Link>
      </div>

      {/* Dashboard cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">A payer cette semaine</p>
            <p className="text-2xl font-bold text-gray-900">{dueThisWeek.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">En attente de validation</p>
            <p className="text-2xl font-bold text-gray-900">
              {purchases.filter((p) => p.status === 'pending').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total en cours</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCents(
                purchases
                  .filter((p) => p.status !== 'paid')
                  .reduce((sum, p) => sum + (p.total_ttc_cents - p.paid_cents), 0),
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="validated">Validee</option>
          <option value="paid">Payee</option>
          <option value="disputed">Litige</option>
        </select>
      </div>

      {purchases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p className="text-lg mb-2">Aucune facture d&apos;achat pour le moment</p>
            <p className="text-sm">Creez votre premiere facture d&apos;achat ou importez-en via OCR.</p>
          </CardContent>
        </Card>
      ) : (
        {/* Mobile card view */}
        <div className="space-y-3 md:hidden">
          {purchases.map((purchase) => {
            const statusInfo = STATUS_LABELS[purchase.status] ?? STATUS_LABELS['pending']!;
            const remaining = purchase.total_ttc_cents - purchase.paid_cents;
            return (
              <Card key={purchase.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Link href={`/purchases/${purchase.id}`} className="text-primary-600 hover:underline font-medium text-sm">
                      {purchase.number ?? '-'}
                    </Link>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </div>
                  <p className="text-sm text-gray-900 mb-1">{purchase.supplier_name}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{purchase.due_date ? formatDate(purchase.due_date) : '-'}</span>
                    <span className="font-medium">{formatCents(purchase.total_ttc_cents)}</span>
                  </div>
                  {remaining > 0 && remaining !== purchase.total_ttc_cents && (
                    <p className="text-xs text-orange-600 mt-1">Reste : {formatCents(remaining)}</p>
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Fournisseur</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Total TTC</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Reste a payer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Echeance</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => {
                  const statusInfo = STATUS_LABELS[purchase.status] ?? STATUS_LABELS['pending']!;
                  const remaining = purchase.total_ttc_cents - purchase.paid_cents;
                  return (
                    <tr key={purchase.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/purchases/${purchase.id}`} className="text-primary-600 hover:underline font-medium">
                          {purchase.number ?? '-'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{purchase.supplier_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCents(purchase.total_ttc_cents)}</td>
                      <td className="px-4 py-3 text-right">{formatCents(remaining)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {purchase.due_date ? formatDate(purchase.due_date) : '-'}
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
