'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';

interface TimeEntry {
  id: string;
  project_id: string;
  user_id: string;
  phase: string | null;
  entry_date: string;
  minutes: number;
  hourly_rate_cents: number;
  billable: boolean;
  description: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'invoiced' | 'rejected';
}

interface Project {
  id: string;
  code: string;
  name: string;
}

const STATUS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  draft: { label: 'Brouillon', variant: 'default' },
  submitted: { label: 'Soumis', variant: 'info' },
  approved: { label: 'Approuve', variant: 'success' },
  invoiced: { label: 'Facture', variant: 'success' },
  rejected: { label: 'Rejete', variant: 'error' },
};

export default function TimesheetsPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ project_id: '', entry_date: new Date().toISOString().slice(0, 10), hours: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<{ items: TimeEntry[] }>('/api/timesheets'),
      api.get<{ items: Project[] }>('/api/projects'),
    ]).then(([r1, r2]) => {
      if (r1.ok) setEntries(r1.value.items);
      if (r2.ok) setProjects(r2.value.items);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const r = await api.post('/api/timesheets', {
      project_id: form.project_id,
      entry_date: form.entry_date,
      minutes: Math.round(parseFloat(form.hours || '0') * 60),
      description: form.description || null,
    });
    if (r.ok) {
      setShowForm(false);
      setForm({ project_id: '', entry_date: new Date().toISOString().slice(0, 10), hours: '', description: '' });
      load();
    } else {
      setError(r.error.message);
    }
    setSaving(false);
  }

  async function submitEntry(id: string) {
    const r = await api.post(`/api/timesheets/${id}/submit`, {});
    if (r.ok) load();
  }

  async function approveEntry(id: string) {
    const r = await api.post(`/api/timesheets/${id}/approve`, {});
    if (r.ok) load();
  }

  const projectsById = new Map(projects.map((p) => [p.id, p]));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Pointages</h1>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Annuler' : 'Nouveau pointage'}</Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader><h2 className="font-semibold">Saisir un pointage</h2></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3 max-w-xl">
              <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} required className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="">Projet…</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} required />
                <Input type="number" step="0.25" placeholder="Heures" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} required />
              </div>
              <Input placeholder="Description (optionnel)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={saving}>{saving ? 'Saisie…' : 'Enregistrer'}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : entries.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">Aucun pointage.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Projet</th>
                  <th className="text-left px-4 py-2">Duree</th>
                  <th className="text-left px-4 py-2">Description</th>
                  <th className="text-left px-4 py-2">Statut</th>
                  <th className="text-right px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const status = STATUS[e.status] ?? STATUS['draft']!;
                  const project = projectsById.get(e.project_id);
                  return (
                    <tr key={e.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{new Date(e.entry_date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-2">{project ? `${project.code}` : e.project_id.slice(0, 8)}</td>
                      <td className="px-4 py-2">{(e.minutes / 60).toFixed(2)} h</td>
                      <td className="px-4 py-2 text-gray-600">{e.description ?? '—'}</td>
                      <td className="px-4 py-2"><Badge variant={status.variant}>{status.label}</Badge></td>
                      <td className="px-4 py-2 text-right space-x-2">
                        {e.status === 'draft' && <Button size="sm" variant="outline" onClick={() => submitEntry(e.id)}>Soumettre</Button>}
                        {e.status === 'submitted' && <Button size="sm" onClick={() => approveEntry(e.id)}>Approuver</Button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
