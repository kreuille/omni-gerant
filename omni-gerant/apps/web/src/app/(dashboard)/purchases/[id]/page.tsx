'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { PurchaseValidation } from '@/components/purchase/purchase-validation';
import { api } from '@/lib/api-client';

// BUSINESS RULE [CDC-2.2]: Detail achat connecte a l'API

interface PurchaseLine {
  id: string;
  position: number;
  label: string;
  quantity: number;
  unit_price_cents: number;
  tva_rate: number;
  total_ht_cents: number;
}

interface Purchase {
  id: string;
  supplier_id: string | null;
  number: string | null;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  paid_cents: number;
  notes: string | null;
  lines: PurchaseLine[];
}

interface Supplier {
  id: string;
  name: string;
}

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

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [supplierName, setSupplierName] = useState<string>('-');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const result = await api.get<Purchase>(`/api/purchases/${id}`);
      if (cancelled) return;
      if (result.ok) {
        setPurchase(result.value);
        // Fetch supplier name if available
        if (result.value.supplier_id) {
          const supplierResult = await api.get<Supplier>(`/api/suppliers/${result.value.supplier_id}`);
          if (!cancelled && supplierResult.ok) {
            setSupplierName(supplierResult.value.name);
          }
        }
      } else {
        setError(result.error.message);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Supprimer cette facture d\'achat ?')) return;
    setDeleting(true);
    const result = await api.delete(`/api/purchases/${id}`);
    if (result.ok) {
      router.push('/purchases');
    } else {
      alert(result.error.message);
      setDeleting(false);
    }
  };

  const handleStatusChange = async () => {
    // Re-fetch purchase after status change from PurchaseValidation
    const result = await api.get<Purchase>(`/api/purchases/${id}`);
    if (result.ok) {
      setPurchase(result.value);
    }
  };

  if (loading) {
    return (
      <div>
        <Link href="/purchases" className="text-sm text-gray-500 hover:text-gray-700 mb-1 block">
          &larr; Retour aux achats
        </Link>
        <Card className="mt-4">
          <CardContent className="py-12 text-center text-gray-500">
            <p>Chargement...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div>
        <Link href="/purchases" className="text-sm text-gray-500 hover:text-gray-700 mb-1 block">
          &larr; Retour aux achats
        </Link>
        <Card className="mt-4">
          <CardContent className="py-12 text-center text-red-500">
            <p className="text-lg mb-2">Erreur de chargement</p>
            <p className="text-sm">{error ?? 'Facture introuvable'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[purchase.status] ?? STATUS_LABELS['pending']!;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/purchases" className="text-sm text-gray-500 hover:text-gray-700 mb-1 block">
            &larr; Retour aux achats
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
              {purchase.number ?? 'Facture sans numero'}
            </h1>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {purchase.status !== 'paid' && (
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Suppression...' : 'Supprimer'}
            </Button>
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
            totalTtcCents={purchase.total_ttc_cents}
            paidCents={purchase.paid_cents}
            onStatusChange={handleStatusChange}
          />

          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Informations</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Fournisseur</span>
                  <span className="font-medium">{supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date facture</span>
                  <span>{purchase.issue_date ? formatDate(purchase.issue_date) : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Echeance</span>
                  <span>{purchase.due_date ? formatDate(purchase.due_date) : '-'}</span>
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
