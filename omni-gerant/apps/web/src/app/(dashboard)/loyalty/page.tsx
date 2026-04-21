'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';

interface Account {
  id: string;
  client_id: string;
  points_balance: number;
  points_total: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

interface Coupon {
  id: string;
  code: string;
  kind: 'percent' | 'amount' | 'free_shipping';
  discount_bp: number;
  discount_amount_cents: number;
  uses_count: number;
  max_uses: number | null;
  is_active: boolean;
  valid_until: string | null;
}

const TIER_COLORS: Record<string, 'default' | 'info' | 'warning' | 'success'> = {
  bronze: 'default',
  silver: 'info',
  gold: 'warning',
  platinum: 'success',
};

export default function LoyaltyPage() {
  const [tab, setTab] = useState<'accounts' | 'coupons'>('accounts');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [cf, setCf] = useState({ code: '', kind: 'percent' as 'percent' | 'amount' | 'free_shipping', percent: '', amount_euros: '', max_uses: '' });

  const load = () => {
    api.get<{ items: Account[] }>('/api/loyalty/accounts').then((r) => r.ok && setAccounts(r.value.items));
    api.get<{ items: Coupon[] }>('/api/loyalty/coupons').then((r) => r.ok && setCoupons(r.value.items));
  };
  useEffect(() => { load(); }, []);

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    const r = await api.post('/api/loyalty/coupons', {
      code: cf.code || undefined,
      kind: cf.kind,
      discount_bp: cf.kind === 'percent' ? Math.round(parseFloat(cf.percent || '0') * 100) : 0,
      discount_amount_cents: cf.kind === 'amount' ? Math.round(parseFloat(cf.amount_euros || '0') * 100) : 0,
      max_uses: cf.max_uses ? parseInt(cf.max_uses, 10) : undefined,
    });
    if (r.ok) {
      setShowCouponForm(false);
      setCf({ code: '', kind: 'percent', percent: '', amount_euros: '', max_uses: '' });
      load();
    }
  }

  return (
    <div>
      <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4">Fidelisation</h1>

      <div className="flex gap-2 mb-4 border-b">
        <button className={`px-4 py-2 text-sm ${tab === 'accounts' ? 'border-b-2 border-primary-600 font-medium' : 'text-gray-500'}`} onClick={() => setTab('accounts')}>Comptes points</button>
        <button className={`px-4 py-2 text-sm ${tab === 'coupons' ? 'border-b-2 border-primary-600 font-medium' : 'text-gray-500'}`} onClick={() => setTab('coupons')}>Coupons</button>
      </div>

      {tab === 'accounts' && (
        accounts.length === 0 ? <Card><CardContent className="py-8 text-center text-gray-500">Aucun compte fidelite.</CardContent></Card> :
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2">Client</th>
                  <th className="text-left px-4 py-2">Niveau</th>
                  <th className="text-right px-4 py-2">Solde</th>
                  <th className="text-right px-4 py-2">Total gagne</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{a.client_id.slice(0, 8)}…</td>
                    <td className="px-4 py-2"><Badge variant={TIER_COLORS[a.tier]}>{a.tier}</Badge></td>
                    <td className="text-right px-4 py-2 font-semibold">{a.points_balance} pts</td>
                    <td className="text-right px-4 py-2 text-gray-500">{a.points_total} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === 'coupons' && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowCouponForm(!showCouponForm)}>{showCouponForm ? 'Annuler' : 'Nouveau coupon'}</Button>
          </div>
          {showCouponForm && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <form onSubmit={createCoupon} className="space-y-3 max-w-xl">
                  <Input placeholder="Code (auto si vide)" value={cf.code} onChange={(e) => setCf({ ...cf, code: e.target.value.toUpperCase() })} />
                  <select value={cf.kind} onChange={(e) => setCf({ ...cf, kind: e.target.value as 'percent' | 'amount' | 'free_shipping' })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                    <option value="percent">% reduction</option>
                    <option value="amount">Montant fixe</option>
                    <option value="free_shipping">Livraison offerte</option>
                  </select>
                  {cf.kind === 'percent' && <Input type="number" step="0.1" placeholder="% reduction (ex: 10)" value={cf.percent} onChange={(e) => setCf({ ...cf, percent: e.target.value })} />}
                  {cf.kind === 'amount' && <Input type="number" step="0.01" placeholder="Montant EUR" value={cf.amount_euros} onChange={(e) => setCf({ ...cf, amount_euros: e.target.value })} />}
                  <Input type="number" placeholder="Nb usages max (optionnel)" value={cf.max_uses} onChange={(e) => setCf({ ...cf, max_uses: e.target.value })} />
                  <Button type="submit">Creer</Button>
                </form>
              </CardContent>
            </Card>
          )}
          {coupons.length === 0 ? <Card><CardContent className="py-8 text-center text-gray-500">Aucun coupon.</CardContent></Card> :
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2">Code</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-left px-4 py-2">Reduction</th>
                    <th className="text-left px-4 py-2">Usages</th>
                    <th className="text-left px-4 py-2">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono">{c.code}</td>
                      <td className="px-4 py-2">{c.kind}</td>
                      <td className="px-4 py-2">{c.kind === 'percent' ? `${(c.discount_bp / 100).toFixed(1)}%` : c.kind === 'amount' ? `${(c.discount_amount_cents / 100).toFixed(2)} EUR` : 'Livraison'}</td>
                      <td className="px-4 py-2">{c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                      <td className="px-4 py-2"><Badge variant={c.is_active ? 'success' : 'default'}>{c.is_active ? 'Actif' : 'Inactif'}</Badge></td>
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
