'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';

interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  client_id: string | null;
  budget_cents: number;
  default_hourly_rate_cents: number;
  logged_minutes: number;
  invoiced_minutes: number;
  spent_cents: number;
  billable: boolean;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  active: { label: 'Actif', variant: 'success' },
  on_hold: { label: 'En pause', variant: 'warning' },
  completed: { label: 'Termine', variant: 'info' },
  cancelled: { label: 'Annule', variant: 'error' },
};

function fmtMoney(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',') + ' EUR';
}

function fmtHours(minutes: number) {
  return (minutes / 60).toFixed(1) + ' h';
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    budget_euros: '',
    hourly_rate_euros: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.get<{ items: Project[] }>('/api/projects').then((r) => {
      if (r.ok) setProjects(r.value.items);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const r = await api.post('/api/projects', {
      name: form.name,
      description: form.description || null,
      budget_cents: Math.round(parseFloat(form.budget_euros || '0') * 100),
      default_hourly_rate_cents: Math.round(parseFloat(form.hourly_rate_euros || '0') * 100),
    });
    if (r.ok) {
      setShowForm(false);
      setForm({ name: '', description: '', budget_euros: '', hourly_rate_euros: '' });
      load();
    } else {
      setError(r.error.message);
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Projets</h1>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Annuler' : 'Nouveau projet'}</Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader><h2 className="font-semibold">Creer un projet</h2></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3 max-w-xl">
              <Input placeholder="Nom du projet" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input placeholder="Description (optionnel)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" step="0.01" placeholder="Budget EUR" value={form.budget_euros} onChange={(e) => setForm({ ...form, budget_euros: e.target.value })} />
                <Input type="number" step="0.01" placeholder="Taux horaire EUR/h" value={form.hourly_rate_euros} onChange={(e) => setForm({ ...form, hourly_rate_euros: e.target.value })} />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={saving}>{saving ? 'Creation...' : 'Creer'}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : projects.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">Aucun projet. Cree le premier.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => {
            const status = STATUS_LABELS[p.status] ?? STATUS_LABELS['active']!;
            const budget = p.budget_cents || 0;
            const consumption = budget > 0 ? Math.round((p.spent_cents / budget) * 100) : 0;
            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-mono text-xs text-gray-500">{p.code}</p>
                      <h3 className="font-semibold">{p.name}</h3>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  {p.description && <p className="text-sm text-gray-600 mb-3">{p.description}</p>}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Budget:</span> {fmtMoney(budget)}</div>
                    <div><span className="text-gray-500">Taux:</span> {fmtMoney(p.default_hourly_rate_cents)}/h</div>
                    <div><span className="text-gray-500">Loggue:</span> {fmtHours(p.logged_minutes)}</div>
                    <div><span className="text-gray-500">Facture:</span> {fmtHours(p.invoiced_minutes)}</div>
                  </div>
                  {budget > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Consommation budget</span>
                        <span>{consumption}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full ${consumption > 100 ? 'bg-red-500' : consumption > 80 ? 'bg-orange-500' : 'bg-primary-600'}`} style={{ width: `${Math.min(100, consumption)}%` }} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
