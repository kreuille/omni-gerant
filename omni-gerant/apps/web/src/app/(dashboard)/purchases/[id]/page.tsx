'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { PurchaseValidation } from '@/components/purchase/purchase-validation';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  pending: { label: 'En attente', variant: 'default' },
  validated: { label: 'Validee', variant: 'info' },
  paid: { label: 'Payee', variant: 'success' },
  disputed: { label: 'Litige', variant: 'error' },
};

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' EUR';
}

export default function PurchaseDetailPage() {
  const params = useParams();
  const id = params.id as string;

  // Placeholder - sera connecte a l'API
  const purchase = {
    id,
    number: null as string | null,
    status: 'pending',
    supplier_name: '-',
    issue_date: null as string | null,
    due_date: null as string | null,
    total_ht_cents: 0,
    total_tva_cents: 0,
    total_ttc_cents: 0,
    paid_cents: 0,
    notes: null as string | null,
    lines: [] as Array<{
      id: string;
      position: number;
      label: string;
      quantity: number;
      unit_price_cents: number;
      tva_rate: number;
      total_ht_cents: number;
    }>,
  };

  const statusInfo = STATUS_LABELS[purchase.status] ?? STATUS_LABELS['pending']!;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/purchases" className="text-sm text-gray-500 hover:text-gray-700 mb-1 block">
            ← Retour aux achats
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
              {purchase.number ?? 'Facture sans numero'}
            </h1>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {purchase.status === 'pending' && (
            <Button variant="outline">Modifier</Button>
          )}
          {purchase.status !== 'paid' && (
            <Button variant="destructive">Supprimer</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Lignes</h2>
              {purchase.lines.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune ligne</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left">#</th>
                      <th className="py-2 text-left">Designation</th>
                      <th className="py-2 text-right">Qte</th>
                      <th className="py-2 text-right">P.U. HT</th>
                      <th className="py-2 text-right">TVA</th>
                      <th className="py-2 text-right">Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchase.lines.map((line) => (
                      <tr key={line.id} className="border-b border-gray-100">
                        <td className="py-2">{line.position}</td>
                        <td className="py-2">{line.label}</td>
                        <td className="py-2 text-right">{line.quantity}</td>
                        <td className="py-2 text-right">{formatCents(line.unit_price_cents)}</td>
                        <td className="py-2 text-right">{(line.tva_rate / 100).toFixed(1)}%</td>
                        <td className="py-2 text-right font-medium">{formatCents(line.total_ht_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total HT</span>
                  <span className="font-medium">{formatCents(purchase.total_ht_cents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">TVA</span>
                  <span className="font-medium">{formatCents(purchase.total_tva_cents)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold border-t pt-2">
                  <span>Total TTC</span>
                  <span>{formatCents(purchase.total_ttc_cents)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Paye</span>
                  <span>{formatCents(purchase.paid_cents)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Reste a payer</span>
                  <span>{formatCents(purchase.total_ttc_cents - purchase.paid_cents)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <PurchaseValidation
            purchaseId={id}
            currentStatus={purchase.status}
          />

          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Informations</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Fournisseur</span>
                  <span className="font-medium">{purchase.supplier_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date facture</span>
                  <span>{purchase.issue_date ?? '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Echeance</span>
                  <span>{purchase.due_date ?? '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {purchase.notes && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-2">Notes</h2>
                <p className="text-sm text-gray-600">{purchase.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
