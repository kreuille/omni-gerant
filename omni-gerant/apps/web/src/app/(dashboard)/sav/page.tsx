'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';

interface Rma {
  id: string;
  number: string;
  client_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'received' | 'refunded' | 'rejected' | 'cancelled';
  total_refund_cents: number;
  requested_at: string;
  credit_note_id: string | null;
}

interface Warranty {
  id: string;
  client_id: string;
  product_id: string | null;
  serial_number: string | null;
  starts_at: string;
  ends_at: string;
  duration_months: number;
  kind: 'standard' | 'extended' | 'manufacturer';
  is_active: boolean;
}

export default function SavPage() {
  const [tab, setTab] = useState<'returns' | 'warranties'>('returns');
  const [rmas, setRmas] = useState<Rma[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);

  const load = () => {
    api.get<{ items: Rma[] }>('/api/sav/returns').then((r) => r.ok && setRmas(r.value.items));
    api.get<{ items: Warranty[] }>('/api/sav/warranties').then((r) => r.ok && setWarranties(r.value.items));
  };
  useEffect(() => { load(); }, []);

  async function approve(id: string) {
    const r = await api.post(`/api/sav/returns/${id}/approve`, {});
    if (r.ok) load();
  }
  async function receive(id: string) {
    const r = await api.post(`/api/sav/returns/${id}/receive`, {});
    if (r.ok) load();
  }
  async function generateCreditNote(id: string) {
    const r = await api.post(`/api/sav/returns/${id}/credit-note`, {});
    if (r.ok) load();
  }

  return (
    <div>
      <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4">Service apres-vente</h1>

      <div className="flex gap-2 mb-4 border-b">
        <button className={`px-4 py-2 text-sm ${tab === 'returns' ? 'border-b-2 border-primary-600 font-medium' : 'text-gray-500'}`} onClick={() => setTab('returns')}>Retours (RMA)</button>
        <button className={`px-4 py-2 text-sm ${tab === 'warranties' ? 'border-b-2 border-primary-600 font-medium' : 'text-gray-500'}`} onClick={() => setTab('warranties')}>Garanties</button>
      </div>

      {tab === 'returns' && (
        rmas.length === 0 ? <Card><CardContent className="py-8 text-center text-gray-500">Aucun RMA.</CardContent></Card> :
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2">N° RMA</th>
                  <th className="text-left px-4 py-2">Motif</th>
                  <th className="text-right px-4 py-2">Remboursement</th>
                  <th className="text-left px-4 py-2">Statut</th>
                  <th className="text-right px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rmas.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="px-4 py-2 font-mono">{r.number}</td>
                    <td className="px-4 py-2">{r.reason}</td>
                    <td className="px-4 py-2 text-right">{(r.total_refund_cents / 100).toFixed(2)} EUR</td>
                    <td className="px-4 py-2"><Badge variant={r.status === 'refunded' ? 'success' : r.status === 'rejected' ? 'error' : 'warning'}>{r.status}</Badge></td>
                    <td className="px-4 py-2 text-right space-x-1">
                      {r.status === 'pending' && <Button size="sm" onClick={() => approve(r.id)}>Approuver</Button>}
                      {r.status === 'approved' && <Button size="sm" onClick={() => receive(r.id)}>Receptionner</Button>}
                      {(r.status === 'received' || r.status === 'approved') && !r.credit_note_id && <Button size="sm" variant="outline" onClick={() => generateCreditNote(r.id)}>Avoir</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === 'warranties' && (
        warranties.length === 0 ? <Card><CardContent className="py-8 text-center text-gray-500">Aucune garantie.</CardContent></Card> :
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2">N° serie</th>
                  <th className="text-left px-4 py-2">Client</th>
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-left px-4 py-2">Fin</th>
                  <th className="text-left px-4 py-2">Active</th>
                </tr>
              </thead>
              <tbody>
                {warranties.map((w) => (
                  <tr key={w.id} className="border-b">
                    <td className="px-4 py-2 font-mono">{w.serial_number ?? '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs">{w.client_id.slice(0, 8)}…</td>
                    <td className="px-4 py-2"><Badge variant={w.kind === 'extended' ? 'success' : 'default'}>{w.kind}</Badge></td>
                    <td className="px-4 py-2">{new Date(w.ends_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-2"><Badge variant={w.is_active ? 'success' : 'default'}>{w.is_active ? 'Oui' : 'Non'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
