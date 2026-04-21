'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SettingsNav } from '@/components/settings/settings-nav';
import { api } from '@/lib/api-client';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_min: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

const SCOPES = [
  'read:clients', 'write:clients',
  'read:invoices', 'write:invoices',
  'read:quotes', 'write:quotes',
  'read:products', 'write:products',
  'read:projects', 'write:projects',
  'read:*', 'write:*', '*',
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [form, setForm] = useState({ name: '', scopes: ['read:invoices'] as string[], rate_limit_per_min: 60 });
  const [showForm, setShowForm] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const load = () => api.get<{ items: ApiKey[] }>('/api/api-keys').then((r) => r.ok && setKeys(r.value.items));
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const r = await api.post<ApiKey & { api_key: string }>('/api/api-keys', form);
    if (r.ok) {
      setCreatedKey(r.value.api_key);
      setShowForm(false);
      load();
    }
  }

  async function revoke(id: string) {
    if (!confirm('Revoquer cette cle ? Irreversible.')) return;
    const r = await api.post(`/api/api-keys/${id}/revoke`, {});
    if (r.ok) load();
  }

  function toggleScope(s: string) {
    setForm((f) => ({ ...f, scopes: f.scopes.includes(s) ? f.scopes.filter((x) => x !== s) : [...f.scopes, s] }));
  }

  return (
    <div>
      <SettingsNav />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Cles API</h1>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Annuler' : 'Nouvelle cle'}</Button>
      </div>

      {createdKey && (
        <Card className="mb-6 border-green-300 bg-green-50">
          <CardContent className="pt-6">
            <p className="font-semibold text-green-900">Cle API creee</p>
            <p className="text-sm text-green-800 mb-2">Copie-la maintenant, elle ne sera plus affichee.</p>
            <div className="flex items-center gap-2">
              <code className="bg-white px-3 py-2 rounded border font-mono text-sm flex-1 break-all">{createdKey}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(createdKey); }}>Copier</Button>
            </div>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setCreatedKey(null)}>J&apos;ai copie la cle</Button>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardHeader><h2 className="font-semibold">Creer une cle API</h2></CardHeader>
          <CardContent>
            <form onSubmit={create} className="space-y-3 max-w-xl">
              <Input placeholder="Nom (ex: Integration Zapier)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <div>
                <p className="text-sm font-medium mb-2">Scopes</p>
                <div className="flex flex-wrap gap-2">
                  {SCOPES.map((s) => (
                    <button key={s} type="button" onClick={() => toggleScope(s)}
                      className={`px-3 py-1 text-xs rounded-full border ${form.scopes.includes(s) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <Input type="number" placeholder="Rate limit / min" value={form.rate_limit_per_min} onChange={(e) => setForm({ ...form, rate_limit_per_min: parseInt(e.target.value, 10) || 60 })} />
              <Button type="submit">Generer la cle</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {keys.length === 0 ? <Card><CardContent className="py-8 text-center text-gray-500">Aucune cle API.</CardContent></Card> :
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2">Nom</th>
                <th className="text-left px-4 py-2">Prefix</th>
                <th className="text-left px-4 py-2">Scopes</th>
                <th className="text-right px-4 py-2">Rate</th>
                <th className="text-left px-4 py-2">Derniere utilisation</th>
                <th className="text-left px-4 py-2">Statut</th>
                <th className="text-right px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b">
                  <td className="px-4 py-2 font-medium">{k.name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{k.key_prefix}…</td>
                  <td className="px-4 py-2 text-xs">{k.scopes.join(', ')}</td>
                  <td className="px-4 py-2 text-right">{k.rate_limit_per_min}/min</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{k.last_used_at ? new Date(k.last_used_at).toLocaleString('fr-FR') : 'Jamais'}</td>
                  <td className="px-4 py-2"><Badge variant={k.is_active ? 'success' : 'error'}>{k.is_active ? 'Active' : 'Revoquee'}</Badge></td>
                  <td className="px-4 py-2 text-right">{k.is_active && <Button size="sm" variant="destructive" onClick={() => revoke(k.id)}>Revoquer</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      }
    </div>
  );
}
