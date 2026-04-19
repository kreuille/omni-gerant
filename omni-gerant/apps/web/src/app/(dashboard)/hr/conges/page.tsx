'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { HrNav } from '@/components/hr/hr-nav';

interface Leave {
  id: string; employeeId: string; leaveType: string;
  startDate: string; endDate: string; daysTaken: number;
  status: string; notes: string | null; createdAt: string;
}
interface Employee { id: string; firstName: string; lastName: string }

const LEAVE_TYPES = [
  { v: 'cp', l: 'Congés payés', c: 'bg-green-100 text-green-800' },
  { v: 'rtt', l: 'RTT', c: 'bg-blue-100 text-blue-800' },
  { v: 'maladie', l: 'Maladie', c: 'bg-red-100 text-red-800' },
  { v: 'maternite', l: 'Maternité', c: 'bg-pink-100 text-pink-800' },
  { v: 'paternite', l: 'Paternité', c: 'bg-indigo-100 text-indigo-800' },
  { v: 'at', l: 'Accident trav.', c: 'bg-orange-100 text-orange-800' },
  { v: 'parental', l: 'Parental', c: 'bg-purple-100 text-purple-800' },
  { v: 'formation', l: 'Formation', c: 'bg-yellow-100 text-yellow-800' },
  { v: 'sans_solde', l: 'Sans solde', c: 'bg-gray-100 text-gray-800' },
];

export default function CongesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: '', leaveType: 'cp', startDate: '', endDate: '', daysTaken: 1, notes: '' });
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [lv, emp] = await Promise.all([
      api.get<{ items: Leave[] }>('/api/hr/leaves'),
      api.get<{ items: Employee[] }>('/api/hr/employees?limit=100'),
    ]);
    if (lv.ok) setLeaves(lv.value.items);
    if (emp.ok) setEmployees(Object.fromEntries(emp.value.items.map((e) => [e.id, e])));
  }

  useEffect(() => { load(); }, []);

  async function submit() {
    if (!form.employeeId || !form.startDate || !form.endDate || form.daysTaken <= 0) { setMessage('Remplir tous les champs'); return; }
    const r = await api.post(`/api/hr/employees/${form.employeeId}/leaves`, {
      leaveType: form.leaveType,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      daysTaken: form.daysTaken,
      notes: form.notes,
    });
    if (r.ok) { setMessage('Congé enregistré'); setShowForm(false); setForm({ employeeId: '', leaveType: 'cp', startDate: '', endDate: '', daysTaken: 1, notes: '' }); await load(); }
    else setMessage('Erreur : ' + r.error.message);
  }

  return (
    <div>
      <HrNav />
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Congés & absences</h1>
          <p className="text-sm text-gray-600 mt-1">CP acquis 2.5j/mois (L3141-3). Planning chronologique des absences.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium">+ Nouvelle absence</button>
      </div>

      {message && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">{message}</div>}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h2 className="font-semibold mb-3">Enregistrer une absence</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs uppercase text-gray-600 block mb-1">Salarié</span>
              <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
                <option value="">—</option>
                {Object.values(employees).map((e) => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs uppercase text-gray-600 block mb-1">Type</span>
              <select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
                {LEAVE_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs uppercase text-gray-600 block mb-1">Jours</span>
              <input type="number" step="0.5" min={0} value={form.daysTaken} onChange={(e) => setForm({ ...form, daysTaken: parseFloat(e.target.value) || 0 })} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs uppercase text-gray-600 block mb-1">Début</span>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs uppercase text-gray-600 block mb-1">Fin</span>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
            </label>
            <label className="block md:col-span-3">
              <span className="text-xs uppercase text-gray-600 block mb-1">Note (optionnel)</span>
              <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
            </label>
          </div>
          <button onClick={submit} className="mt-3 bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium">Enregistrer</button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {leaves.length === 0 ? (
          <p className="p-8 text-center text-gray-500">Aucune absence enregistrée</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
                <th className="px-4 py-3">Salarié</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Du</th>
                <th className="px-4 py-3">Au</th>
                <th className="px-4 py-3 text-right">Jours</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => {
                const t = LEAVE_TYPES.find((t) => t.v === l.leaveType);
                const e = employees[l.employeeId];
                return (
                  <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">{e ? `${e.lastName} ${e.firstName}` : l.employeeId.slice(0, 8)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${t?.c ?? 'bg-gray-100 text-gray-800'}`}>{t?.l ?? l.leaveType}</span></td>
                    <td className="px-4 py-3">{new Date(l.startDate).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">{new Date(l.endDate).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right font-medium">{l.daysTaken}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{l.status}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{l.notes ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
