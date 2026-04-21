'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SettingsNav } from '@/components/settings/settings-nav';
import { api } from '@/lib/api-client';

interface Branding {
  id: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  font_family: string | null;
  email_sender_name: string | null;
  email_footer: string | null;
  pdf_footer: string | null;
}

interface Domain {
  id: string;
  domain: string;
  is_primary: boolean;
  verification_token: string;
  verified_at: string | null;
  status: 'pending' | 'verified' | 'active' | 'failed';
  cname_target: string;
}

export default function WhitelabelPage() {
  const [tab, setTab] = useState<'branding' | 'domains'>('branding');
  const [branding, setBranding] = useState<Branding | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [dnsInfo, setDnsInfo] = useState<Record<string, unknown> | null>(null);

  const load = () => {
    api.get<Branding | null>('/api/whitelabel/branding').then((r) => r.ok && setBranding(r.value));
    api.get<{ items: Domain[] }>('/api/whitelabel/domains').then((r) => r.ok && setDomains(r.value.items));
  };
  useEffect(() => { load(); }, []);

  async function saveBranding(e: React.FormEvent) {
    e.preventDefault();
    if (!branding) return;
    await api.put('/api/whitelabel/branding', branding);
    load();
  }

  async function addDomain(e: React.FormEvent) {
    e.preventDefault();
    const r = await api.post<Domain & { dns_instructions: Record<string, unknown> }>('/api/whitelabel/domains', { domain: newDomain });
    if (r.ok) {
      setDnsInfo(r.value.dns_instructions);
      setNewDomain('');
      load();
    }
  }

  async function verifyDomain(id: string) {
    const r = await api.post(`/api/whitelabel/domains/${id}/verify`, {});
    if (r.ok) load();
  }

  return (
    <div>
      <SettingsNav />
      <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4">White-label</h1>

      <div className="flex gap-2 mb-4 border-b">
        <button className={`px-4 py-2 text-sm ${tab === 'branding' ? 'border-b-2 border-primary-600 font-medium' : 'text-gray-500'}`} onClick={() => setTab('branding')}>Branding</button>
        <button className={`px-4 py-2 text-sm ${tab === 'domains' ? 'border-b-2 border-primary-600 font-medium' : 'text-gray-500'}`} onClick={() => setTab('domains')}>Domaines custom</button>
      </div>

      {tab === 'branding' && (
        <Card>
          <CardHeader><h2 className="font-semibold">Apparence (PDF, emails, portail)</h2></CardHeader>
          <CardContent>
            <form onSubmit={saveBranding} className="space-y-3 max-w-2xl">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-700">URL logo</label>
                  <Input value={branding?.logo_url ?? ''} onChange={(e) => setBranding({ ...(branding ?? {} as Branding), logo_url: e.target.value })} placeholder="https://…/logo.png" />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Expediteur email</label>
                  <Input value={branding?.email_sender_name ?? ''} onChange={(e) => setBranding({ ...(branding ?? {} as Branding), email_sender_name: e.target.value })} placeholder="Ma Société" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-gray-700">Primaire</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={branding?.primary_color ?? '#111827'} onChange={(e) => setBranding({ ...(branding ?? {} as Branding), primary_color: e.target.value })} className="h-10 w-16 border rounded" />
                    <Input value={branding?.primary_color ?? ''} onChange={(e) => setBranding({ ...(branding ?? {} as Branding), primary_color: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-700">Secondaire</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={branding?.secondary_color ?? '#6366F1'} onChange={(e) => setBranding({ ...(branding ?? {} as Branding), secondary_color: e.target.value })} className="h-10 w-16 border rounded" />
                    <Input value={branding?.secondary_color ?? ''} onChange={(e) => setBranding({ ...(branding ?? {} as Branding), secondary_color: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-700">Accent</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={branding?.accent_color ?? '#10B981'} onChange={(e) => setBranding({ ...(branding ?? {} as Branding), accent_color: e.target.value })} className="h-10 w-16 border rounded" />
                    <Input value={branding?.accent_color ?? ''} onChange={(e) => setBranding({ ...(branding ?? {} as Branding), accent_color: e.target.value })} />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-700">Police</label>
                <select value={branding?.font_family ?? 'Inter'} onChange={(e) => setBranding({ ...(branding ?? {} as Branding), font_family: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option>Inter</option><option>Roboto</option><option>Poppins</option><option>serif</option><option>system</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-700">Pied de page PDF</label>
                <textarea value={branding?.pdf_footer ?? ''} onChange={(e) => setBranding({ ...(branding ?? {} as Branding), pdf_footer: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" rows={3} />
              </div>
              <Button type="submit">Enregistrer</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === 'domains' && (
        <>
          <Card className="mb-4">
            <CardContent className="pt-6">
              <form onSubmit={addDomain} className="flex gap-2 max-w-xl">
                <Input placeholder="factures.monclient.fr" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} required />
                <Button type="submit">Ajouter</Button>
              </form>
              {dnsInfo && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="font-semibold text-sm mb-2">Configure ton DNS :</p>
                  <pre className="text-xs overflow-auto">{JSON.stringify(dnsInfo, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
          {domains.length === 0 ? <Card><CardContent className="py-8 text-center text-gray-500">Aucun domaine custom.</CardContent></Card> :
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2">Domaine</th>
                    <th className="text-left px-4 py-2">Statut</th>
                    <th className="text-left px-4 py-2">Verifie le</th>
                    <th className="text-right px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.map((d) => (
                    <tr key={d.id} className="border-b">
                      <td className="px-4 py-2 font-mono">{d.domain}</td>
                      <td className="px-4 py-2"><Badge variant={d.status === 'verified' || d.status === 'active' ? 'success' : d.status === 'failed' ? 'error' : 'warning'}>{d.status}</Badge></td>
                      <td className="px-4 py-2 text-xs text-gray-500">{d.verified_at ? new Date(d.verified_at).toLocaleDateString('fr-FR') : '—'}</td>
                      <td className="px-4 py-2 text-right">
                        {d.status !== 'verified' && d.status !== 'active' && <Button size="sm" onClick={() => verifyDomain(d.id)}>Verifier DNS</Button>}
                      </td>
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
