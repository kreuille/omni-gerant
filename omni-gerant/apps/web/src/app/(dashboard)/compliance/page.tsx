'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';

interface HaccpRecord {
  id: string;
  kind: string;
  area: string | null;
  equipment: string | null;
  temperature_c: number | null;
  is_compliant: boolean;
  product_name: string | null;
  recorded_at: string;
}

interface Chantier {
  id: string;
  number: string;
  name: string;
  status: string;
  start_date: string;
  decennale_required: boolean;
  decennale_ok: boolean;
}

export default function CompliancePage() {
  const [tab, setTab] = useState<'haccp' | 'btp'>('haccp');
  const [haccp, setHaccp] = useState<HaccpRecord[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [hForm, setHForm] = useState({ kind: 'temperature', equipment: '', temperature: '', min: '', max: '' });
  const [cForm, setCForm] = useState({ name: '', start_date: new Date().toISOString().slice(0, 10), work_type: 'gros_oeuvre' });
  const [showH, setShowH] = useState(false);
  const [showC, setShowC] = useState(false);

  const load = () => {
    api.get<{ items: HaccpRecord[] }>('/api/compliance/haccp').then((r) => r.ok && setHaccp(r.value.items));
    api.get<{ items: Chantier[] }>('/api/compliance/chantiers').then((r) => r.ok && setChantiers(r.value.items));
  };
  useEffect(() => { load(); }, []);

  async function createHaccp(e: React.FormEvent) {
    e.preventDefault();
    const r = await api.post('/api/compliance/haccp', {
      kind: hForm.kind,
      equipment: hForm.equipment || null,
      temperature_c: hForm.temperature ? parseFloat(hForm.temperature) : null,
      threshold_min_c: hForm.min ? parseFloat(hForm.min) : null,
      threshold_max_c: hForm.max ? parseFloat(hForm.max) : null,
    });
    if (r.ok) {
      setShowH(false);
      setHForm({ kind: 'temperature', equipment: '', temperature: '', min: '', max: '' });
      load();
    }
  }

  async function createChantier(e: React.FormEvent) {
    e.preventDefault();
    const r = await api.post('/api/compliance/chantiers', {
      name: cForm.name,
      start_date: cForm.start_date,
      work_type: cForm.work_type,
    });
    if (r.ok) {
      setShowC(false);
      setCForm({ name: '', start_date: new Date().toISOString().slice(0, 10), work_type: 'gros_oeuvre' });
      load();
    }
  }

  return (
    <div>
      <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4">Conformite sectorielle</h1>

      <div className="flex gap-2 mb-4 border-b">
        <button className={`px-4 py-2 text-sm ${tab === 'haccp' ? 'border-b-2 border-primary-600 font-medium' : 'text-gray-500'}`} onClick={() => setTab('haccp')}>HACCP</button>
        <button className={`px-4 py-2 text-sm ${tab === 'btp' ? 'border-b-2 border-primary-600 font-medium' : 'text-gray-500'}`} onClick={() => setTab('btp')}>Chantiers BTP</button>
      </div>

      {tab === 'haccp' && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowH(!showH)}>{showH ? 'Annuler' : 'Nouveau releve'}</Button>
          </div>
          {showH && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <form onSubmit={createHaccp} className="space-y-3 max-w-xl">
                  <select value={hForm.kind} onChange={(e) => setHForm({ ...hForm, kind: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                    <option value="temperature">Temperature</option>
                    <option value="cleaning">Nettoyage</option>
                    <option value="delivery">Livraison</option>
                    <option value="expiration">DLC</option>
                    <option value="oil_change">Changement huile</option>
                  </select>
                  <Input placeholder="Equipement (ex: frigo bar 1)" value={hForm.equipment} onChange={(e) => setHForm({ ...hForm, equipment: e.target.value })} />
                  {hForm.kind === 'temperature' && (
                    <div className="grid grid-cols-3 gap-2">
                      <Input type="number" step="0.1" placeholder="Temp °C" value={hForm.temperature} onChange={(e) => setHForm({ ...hForm, temperature: e.target.value })} />
                      <Input type="number" step="0.1" placeholder="Min °C" value={hForm.min} onChange={(e) => setHForm({ ...hForm, min: e.target.value })} />
                      <Input type="number" step="0.1" placeholder="Max °C" value={hForm.max} onChange={(e) => setHForm({ ...hForm, max: e.target.value })} />
                    </div>
                  )}
                  <Button type="submit">Enregistrer</Button>
                </form>
              </CardContent>
            </Card>
          )}
          {haccp.length === 0 ? <Card><CardContent className="py-8 text-center text-gray-500">Aucun releve HACCP.</CardContent></Card> :
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2">Date</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-left px-4 py-2">Equipement</th>
                    <th className="text-right px-4 py-2">°C</th>
                    <th className="text-left px-4 py-2">Conforme</th>
                  </tr>
                </thead>
                <tbody>
                  {haccp.map((h) => (
                    <tr key={h.id} className="border-b">
                      <td className="px-4 py-2">{new Date(h.recorded_at).toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-2">{h.kind}</td>
                      <td className="px-4 py-2">{h.equipment ?? '—'}</td>
                      <td className="px-4 py-2 text-right">{h.temperature_c ?? '—'}</td>
                      <td className="px-4 py-2"><Badge variant={h.is_compliant ? 'success' : 'error'}>{h.is_compliant ? '✓' : '✗'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          }
        </>
      )}

      {tab === 'btp' && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowC(!showC)}>{showC ? 'Annuler' : 'Nouveau chantier'}</Button>
          </div>
          {showC && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <form onSubmit={createChantier} className="space-y-3 max-w-xl">
                  <Input placeholder="Nom chantier" value={cForm.name} onChange={(e) => setCForm({ ...cForm, name: e.target.value })} required />
                  <Input type="date" value={cForm.start_date} onChange={(e) => setCForm({ ...cForm, start_date: e.target.value })} required />
                  <select value={cForm.work_type} onChange={(e) => setCForm({ ...cForm, work_type: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                    <option value="gros_oeuvre">Gros oeuvre</option>
                    <option value="second_oeuvre">Second oeuvre</option>
                    <option value="renovation">Renovation</option>
                    <option value="neuf">Neuf</option>
                    <option value="autre">Autre</option>
                  </select>
                  <Button type="submit">Creer chantier</Button>
                </form>
              </CardContent>
            </Card>
          )}
          {chantiers.length === 0 ? <Card><CardContent className="py-8 text-center text-gray-500">Aucun chantier.</CardContent></Card> :
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2">N°</th>
                    <th className="text-left px-4 py-2">Nom</th>
                    <th className="text-left px-4 py-2">Debut</th>
                    <th className="text-left px-4 py-2">Statut</th>
                    <th className="text-left px-4 py-2">Decennale</th>
                  </tr>
                </thead>
                <tbody>
                  {chantiers.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="px-4 py-2 font-mono">{c.number}</td>
                      <td className="px-4 py-2">{c.name}</td>
                      <td className="px-4 py-2">{new Date(c.start_date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-2"><Badge>{c.status}</Badge></td>
                      <td className="px-4 py-2">
                        {!c.decennale_required ? <Badge>non requise</Badge> : c.decennale_ok ? <Badge variant="success">✓ couverte</Badge> : <Badge variant="error">✗ manquante</Badge>}
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
