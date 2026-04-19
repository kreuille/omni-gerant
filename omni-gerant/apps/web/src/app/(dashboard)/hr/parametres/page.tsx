'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { HrNav } from '@/components/hr/hr-nav';

interface Settings {
  mutuelle_enabled: boolean;
  mutuelle_employee_rate_bp: number;
  mutuelle_employer_rate_bp: number;
  mutuelle_flat_employee_cents: number;
  mutuelle_flat_employer_cents: number;
  mutuelle_organisme: string | null;
  prevoyance_enabled: boolean;
  prevoyance_employee_rate_bp: number;
  prevoyance_employer_rate_bp: number;
  prevoyance_organisme: string | null;
  tr_enabled: boolean;
  tr_face_value_cents: number;
  tr_employer_share_bp: number;
}

const empty: Settings = {
  mutuelle_enabled: false,
  mutuelle_employee_rate_bp: 0, mutuelle_employer_rate_bp: 0,
  mutuelle_flat_employee_cents: 0, mutuelle_flat_employer_cents: 0,
  mutuelle_organisme: null,
  prevoyance_enabled: false,
  prevoyance_employee_rate_bp: 0, prevoyance_employer_rate_bp: 0,
  prevoyance_organisme: null,
  tr_enabled: false, tr_face_value_cents: 900, tr_employer_share_bp: 5000,
};

export default function ParametresPaiePage() {
  const [s, setS] = useState<Settings>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.get<Settings>('/api/hr/payroll/settings').then((r) => {
      if (r.ok) setS({ ...empty, ...r.value });
      setLoading(false);
    });
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await api.put('/api/hr/payroll/settings', s);
    setSaving(false);
    setMessage(res.ok ? 'Paramètres enregistrés. Les prochains bulletins utiliseront ces taux.' : 'Erreur : ' + res.error.message);
  }

  function bp(v: number): string { return (v / 100).toFixed(2); }
  function euro(v: number): string { return (v / 100).toFixed(2); }

  if (loading) return <div><HrNav /><p>Chargement…</p></div>;

  return (
    <div>
      <HrNav />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres paie</h1>
        <p className="text-sm text-gray-600 mt-1">
          Mutuelle, prévoyance et titres restaurants. Appliqués automatiquement aux prochains bulletins.
        </p>
      </div>

      {message && <div className={`mb-4 p-3 rounded text-sm border ${message.startsWith('Erreur') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-800'}`}>{message}</div>}

      {/* MUTUELLE */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Mutuelle complémentaire santé</h2>
            <p className="text-xs text-gray-500">Obligatoire (loi ANI 2013) — minimum 50% employeur</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.mutuelle_enabled} onChange={(e) => setS({ ...s, mutuelle_enabled: e.target.checked })} className="h-4 w-4" />
            <span>Activer</span>
          </label>
        </div>
        {s.mutuelle_enabled && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input label="Taux salarial (%)" value={bp(s.mutuelle_employee_rate_bp)} onChange={(v) => setS({ ...s, mutuelle_employee_rate_bp: Math.round(parseFloat(v || '0') * 100) })} />
            <Input label="Taux patronal (%)" value={bp(s.mutuelle_employer_rate_bp)} onChange={(v) => setS({ ...s, mutuelle_employer_rate_bp: Math.round(parseFloat(v || '0') * 100) })} />
            <Input label="OU forfait salarié (€/mois)" value={euro(s.mutuelle_flat_employee_cents)} onChange={(v) => setS({ ...s, mutuelle_flat_employee_cents: Math.round(parseFloat(v || '0') * 100) })} />
            <Input label="OU forfait patronal (€/mois)" value={euro(s.mutuelle_flat_employer_cents)} onChange={(v) => setS({ ...s, mutuelle_flat_employer_cents: Math.round(parseFloat(v || '0') * 100) })} />
            <Input label="Organisme" value={s.mutuelle_organisme ?? ''} onChange={(v) => setS({ ...s, mutuelle_organisme: v || null })} placeholder="ex: AG2R, Harmonie" full />
          </div>
        )}
      </section>

      {/* PRÉVOYANCE */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Prévoyance complémentaire</h2>
            <p className="text-xs text-gray-500">Obligatoire cadres (convention 1947) — facultatif autres sauf CC spécifique</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.prevoyance_enabled} onChange={(e) => setS({ ...s, prevoyance_enabled: e.target.checked })} className="h-4 w-4" />
            <span>Activer</span>
          </label>
        </div>
        {s.prevoyance_enabled && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Input label="Taux salarial (%)" value={bp(s.prevoyance_employee_rate_bp)} onChange={(v) => setS({ ...s, prevoyance_employee_rate_bp: Math.round(parseFloat(v || '0') * 100) })} />
            <Input label="Taux patronal (%)" value={bp(s.prevoyance_employer_rate_bp)} onChange={(v) => setS({ ...s, prevoyance_employer_rate_bp: Math.round(parseFloat(v || '0') * 100) })} />
            <Input label="Organisme" value={s.prevoyance_organisme ?? ''} onChange={(v) => setS({ ...s, prevoyance_organisme: v || null })} placeholder="ex: Malakoff, Humanis" />
          </div>
        )}
      </section>

      {/* TICKETS RESTAURANTS */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Titres restaurants</h2>
            <p className="text-xs text-gray-500">Part patronale exonérée entre 50% et 60% (URSSAF 2026 : max ~6,91€/jour exonéré)</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.tr_enabled} onChange={(e) => setS({ ...s, tr_enabled: e.target.checked })} className="h-4 w-4" />
            <span>Activer</span>
          </label>
        </div>
        {s.tr_enabled && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valeur faciale du titre (€)" value={euro(s.tr_face_value_cents)} onChange={(v) => setS({ ...s, tr_face_value_cents: Math.round(parseFloat(v || '0') * 100) })} />
            <Input label="Part patronale (%)" value={bp(s.tr_employer_share_bp)} onChange={(v) => setS({ ...s, tr_employer_share_bp: Math.max(5000, Math.min(6000, Math.round(parseFloat(v || '50') * 100))) })} />
          </div>
        )}
      </section>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="bg-primary-600 text-white px-5 py-2 rounded font-medium hover:bg-primary-700 disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <p className="text-xs text-gray-500">Ces paramètres s'appliquent à tous les bulletins générés après modification.</p>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, full, placeholder }: { label: string; value: string; onChange: (v: string) => void; full?: boolean; placeholder?: string }) {
  return (
    <label className={`block ${full ? 'md:col-span-4' : ''}`}>
      <span className="text-xs font-semibold text-gray-600 uppercase block mb-1">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
      />
    </label>
  );
}
