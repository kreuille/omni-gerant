'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';

interface Receipt {
  id: string;
  number: string;
  received_at: string;
  status: string;
  notes: string | null;
}

interface Inventory {
  id: string;
  number: string;
  status: 'open' | 'counting' | 'reviewed' | 'applied' | 'cancelled';
  started_at: string;
  completed_at: string | null;
}

export default function StockPage() {
  const [tab, setTab] = useState<'scanner' | 'receipts' | 'inventories'>('scanner');
  const [scanCode, setScanCode] = useState('');
  const [scanResult, setScanResult] = useState<Record<string, unknown> | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]);

  const load = () => {
    api.get<{ items: Receipt[] }>('/api/stock/receipts').then((r) => r.ok && setReceipts(r.value.items));
    api.get<{ items: Inventory[] }>('/api/stock/inventories').then((r) => r.ok && setInventories(r.value.items));
  };
  useEffect(() => { load(); }, []);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    setScanError(null);
    setScanResult(null);
    const r = await api.post<Record<string, unknown>>('/api/stock/scan', { code: scanCode });
    if (r.ok) setScanResult(r.value);
    else setScanError(r.error.message);
  }

  async function startInventory() {
    const r = await api.post<{ id: string; number: string }>('/api/stock/inventories', {});
    if (r.ok) load();
  }

  async function applyInventory(id: string) {
    const r = await api.post(`/api/stock/inventories/${id}/apply`, {});
    if (r.ok) load();
  }

  return (
    <div>
      <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4">Inventaire & Stock</h1>

      <div className="flex gap-2 mb-4 border-b">
        <button className={`px-4 py-2 text-sm ${tab === 'scanner' ? 'border-b-2 border-primary-600 font-medium' : 'text-gray-500'}`} onClick={() => setTab('scanner')}>Scanner</button>
        <button className={`px-4 py-2 text-sm ${tab === 'receipts' ? 'border-b-2 border-primary-600 font-medium' : 'text-gray-500'}`} onClick={() => setTab('receipts')}>Bons de reception</button>
        <button className={`px-4 py-2 text-sm ${tab === 'inventories' ? 'border-b-2 border-primary-600 font-medium' : 'text-gray-500'}`} onClick={() => setTab('inventories')}>Inventaires</button>
      </div>

      {tab === 'scanner' && (
        <Card>
          <CardHeader><h2 className="font-semibold">Scanner EAN / SKU</h2></CardHeader>
          <CardContent>
            <form onSubmit={handleScan} className="flex gap-2 max-w-xl mb-4">
              <Input placeholder="Code-barre ou SKU" value={scanCode} onChange={(e) => setScanCode(e.target.value)} autoFocus />
              <Button type="submit">Scanner</Button>
            </form>
            {scanError && <p className="text-red-600">{scanError}</p>}
            {scanResult && (
              <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto">{JSON.stringify(scanResult, null, 2)}</pre>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'receipts' && (
        receipts.length === 0 ? <Card><CardContent className="py-8 text-center text-gray-500">Aucun bon de reception.</CardContent></Card> :
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2">N°</th>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Statut</th>
                  <th className="text-left px-4 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="px-4 py-2 font-mono">{r.number}</td>
                    <td className="px-4 py-2">{new Date(r.received_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-2"><Badge variant={r.status === 'received' ? 'success' : 'warning'}>{r.status}</Badge></td>
                    <td className="px-4 py-2 text-gray-600">{r.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === 'inventories' && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={startInventory}>Lancer un inventaire</Button>
          </div>
          {inventories.length === 0 ? <Card><CardContent className="py-8 text-center text-gray-500">Aucun inventaire.</CardContent></Card> :
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2">N°</th>
                    <th className="text-left px-4 py-2">Debut</th>
                    <th className="text-left px-4 py-2">Statut</th>
                    <th className="text-right px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inventories.map((i) => (
                    <tr key={i.id} className="border-b">
                      <td className="px-4 py-2 font-mono">{i.number}</td>
                      <td className="px-4 py-2">{new Date(i.started_at).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-2"><Badge variant={i.status === 'applied' ? 'success' : 'warning'}>{i.status}</Badge></td>
                      <td className="px-4 py-2 text-right">{i.status !== 'applied' && i.status !== 'cancelled' && <Button size="sm" onClick={() => applyInventory(i.id)}>Appliquer</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          }
        </>
      )}
    </div>
  );
}
