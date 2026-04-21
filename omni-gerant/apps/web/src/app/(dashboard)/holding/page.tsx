'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';

interface Holding {
  id: string;
  name: string;
  siren: string | null;
  description: string | null;
}

interface Member {
  id: string;
  tenant_id: string;
  role: 'parent' | 'subsidiary' | 'joint_venture';
  ownership_bp: number;
}

interface ConsolidationRow {
  tenant_id: string;
  tenant_name: string;
  role: string;
  ownership_bp: number;
  revenue_ht_cents: number;
  expense_ht_cents: number;
  invoices_count: number;
}

function fmtMoney(cents: number) {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' EUR';
}

export default function HoldingPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [selected, setSelected] = useState<Holding | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [consolidation, setConsolidation] = useState<{ members: ConsolidationRow[]; total: Record<string, number> | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', siren: '', description: '' });

  const loadList = () => {
    setLoading(true);
    api.get<{ items: Holding[] }>('/api/holding').then((r) => {
      if (r.ok) setHoldings(r.value.items);
      setLoading(false);
    });
  };

  useEffect(() => { loadList(); }, []);

  const openHolding = async (h: Holding) => {
    setSelected(h);
    const r = await api.get<{ holding: Holding; memberships: Member[] }>(`/api/holding/${h.id}`);
    if (r.ok) setMembers(r.value.memberships);
    const rc = await api.get<{ members: ConsolidationRow[]; total: Record<string, number> }>(`/api/holding/${h.id}/consolidation`);
    if (rc.ok) setConsolidation(rc.value as { members: ConsolidationRow[]; total: Record<string, number> });
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const r = await api.post('/api/holding', { name: form.name, siren: form.siren || null, description: form.description || null });
    if (r.ok) {
      setShowForm(false);
      setForm({ name: '', siren: '', description: '' });
      loadList();
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Holding / Groupe</h1>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Annuler' : 'Nouveau holding'}</Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-3 max-w-xl">
              <Input placeholder="Nom du groupe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input placeholder="SIREN mere (9 chiffres)" value={form.siren} onChange={(e) => setForm({ ...form, siren: e.target.value })} maxLength={9} />
              <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Button type="submit">Creer</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : holdings.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">Aucun holding configure.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 space-y-2">
            {holdings.map((h) => (
              <Card key={h.id} className={`cursor-pointer ${selected?.id === h.id ? 'ring-2 ring-primary-500' : ''}`} onClick={() => openHolding(h)}>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{h.name}</h3>
                  {h.siren && <p className="text-xs font-mono text-gray-500">SIREN {h.siren}</p>}
                  {h.description && <p className="text-sm text-gray-600 mt-1">{h.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="md:col-span-2 space-y-4">
            {selected && (
              <>
                <Card>
                  <CardHeader><h2 className="font-semibold">Membres ({members.length})</h2></CardHeader>
                  <CardContent>
                    {members.length === 0 ? (
                      <p className="text-gray-500">Aucun membre.</p>
                    ) : (
                      <ul className="space-y-2">
                        {members.map((m) => (
                          <li key={m.id} className="flex items-center justify-between">
                            <span className="text-sm font-mono">{m.tenant_id.slice(0, 8)}…</span>
                            <div className="flex gap-2 items-center">
                              <Badge variant={m.role === 'parent' ? 'success' : 'info'}>{m.role}</Badge>
                              <span className="text-sm text-gray-600">{(m.ownership_bp / 100).toFixed(2)}%</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {consolidation && (
                  <Card>
                    <CardHeader><h2 className="font-semibold">Consolidation</h2></CardHeader>
                    <CardContent>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-2 py-1">Societe</th>
                            <th className="text-right px-2 py-1">CA HT</th>
                            <th className="text-right px-2 py-1">Depenses</th>
                            <th className="text-right px-2 py-1">Marge</th>
                          </tr>
                        </thead>
                        <tbody>
                          {consolidation.members.map((m) => (
                            <tr key={m.tenant_id} className="border-b">
                              <td className="px-2 py-1">{m.tenant_name}</td>
                              <td className="text-right px-2 py-1">{fmtMoney(m.revenue_ht_cents)}</td>
                              <td className="text-right px-2 py-1">{fmtMoney(m.expense_ht_cents)}</td>
                              <td className="text-right px-2 py-1">{fmtMoney(m.revenue_ht_cents - m.expense_ht_cents)}</td>
                            </tr>
                          ))}
                        </tbody>
                        {consolidation.total && (
                          <tfoot className="font-semibold bg-gray-50">
                            <tr>
                              <td className="px-2 py-1">Total holding</td>
                              <td className="text-right px-2 py-1">{fmtMoney((consolidation.total as { revenue_ht_cents?: number }).revenue_ht_cents ?? 0)}</td>
                              <td className="text-right px-2 py-1">{fmtMoney((consolidation.total as { expense_ht_cents?: number }).expense_ht_cents ?? 0)}</td>
                              <td className="text-right px-2 py-1">{fmtMoney((consolidation.total as { margin_ht_cents?: number }).margin_ht_cents ?? 0)}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
