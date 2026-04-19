'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { HrNav } from '@/components/hr/hr-nav';

interface Employee {
  id: string; firstName: string; lastName: string;
  contractType: string; hireDate: string;
}

interface Breakdown {
  reason: string;
  seniorityYears: number;
  seniorityMonths: number;
  baseMonthlyGrossCents: number;
  indemniteLegaleLicenciementCents: number;
  indemniteRuptureConventionnelleCents: number;
  indemnitePrecariteCents: number;
  indemniteCompensatriceCongesCents: number;
  indemniteCompensatricePreavisCents: number;
  totalIndemnitesCents: number;
  documentsRequis: string[];
  notes: string[];
}

const REASONS = [
  { value: 'demission', label: 'Démission' },
  { value: 'licenciement', label: 'Licenciement' },
  { value: 'fin_cdd', label: 'Fin de CDD' },
  { value: 'rupture_conventionnelle', label: 'Rupture conventionnelle' },
  { value: 'retraite', label: 'Départ à la retraite' },
  { value: 'fin_periode_essai', label: "Fin de période d'essai" },
  { value: 'fin_apprentissage', label: "Fin d'apprentissage" },
];

function euro(cents: number) { return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'; }

export default function SortiePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [reason, setReason] = useState('licenciement');
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split('T')[0]);
  const [cpDaysRemaining, setCpDaysRemaining] = useState(0);
  const [totalGrossPaidCents, setTotalGrossPaidCents] = useState(0);
  const [noticeDaysPaid, setNoticeDaysPaid] = useState(0);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ items: Employee[] }>('/api/hr/employees?limit=200').then((r) => {
      if (r.ok) setEmployees(r.value.items.filter((e) => !('exit_date' in e) || !e.exit_date));
    });
  }, []);

  async function compute() {
    if (!employeeId) { setError('Sélectionnez un salarié'); return; }
    setLoading(true);
    setError(null);
    const body: Record<string, unknown> = {
      reason,
      terminationDate,
    };
    if (cpDaysRemaining > 0) body.cpDaysRemaining = cpDaysRemaining;
    if (totalGrossPaidCents > 0) body.totalGrossPaidCents = totalGrossPaidCents;
    if (noticeDaysPaid > 0) body.noticeDaysPaid = noticeDaysPaid;

    const res = await api.post<Breakdown>(`/api/hr/employees/${employeeId}/termination/compute`, body);
    if (res.ok) setBreakdown(res.value);
    else setError(res.error.message);
    setLoading(false);
  }

  const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'https://omni-gerant-api.onrender.com';
  const docUrl = (type: string) => `${apiBase}/api/hr/employees/${employeeId}/termination/${type}?reason=${reason}&date=${terminationDate}`;

  return (
    <div>
      <HrNav />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rupture contrat de travail</h1>
        <p className="text-sm text-gray-600 mt-1">
          Calcul des indemnités (Art. R1234-2, L1237-13, L1243-8) et génération des documents obligatoires de sortie.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Salarié</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
              <option value="">— Sélectionner —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.lastName} {e.firstName} ({e.contractType.toUpperCase()})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Motif de rupture</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
              {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Date de sortie</label>
            <input type="date" value={terminationDate} onChange={(e) => setTerminationDate(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Jours CP restants</label>
            <input type="number" min={0} value={cpDaysRemaining} onChange={(e) => setCpDaysRemaining(parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
          </div>
          {reason === 'fin_cdd' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Brut total versé (€)</label>
              <input type="number" min={0} value={totalGrossPaidCents / 100} onChange={(e) => setTotalGrossPaidCents(Math.round((parseFloat(e.target.value) || 0) * 100))} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Jours préavis payé non effectué</label>
            <input type="number" min={0} value={noticeDaysPaid} onChange={(e) => setNoticeDaysPaid(parseInt(e.target.value, 10) || 0)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
          </div>
        </div>
        <button onClick={compute} disabled={loading} className="mt-4 bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
          {loading ? 'Calcul…' : 'Calculer les indemnités'}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}

      {breakdown && (
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Détail du solde</h2>
            <div className="text-sm text-gray-600 mb-3">
              Ancienneté : <strong>{breakdown.seniorityYears} an(s) et {breakdown.seniorityMonths} mois</strong>
              {' · '}Base mensuelle : <strong>{euro(breakdown.baseMonthlyGrossCents)}</strong>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {breakdown.indemniteLegaleLicenciementCents > 0 && (
                  <tr className="border-b border-gray-100"><td className="py-2">Indemnité légale de licenciement</td><td className="py-2 text-right font-medium">{euro(breakdown.indemniteLegaleLicenciementCents)}</td></tr>
                )}
                {breakdown.indemniteRuptureConventionnelleCents > 0 && (
                  <tr className="border-b border-gray-100"><td className="py-2">Indemnité rupture conventionnelle</td><td className="py-2 text-right font-medium">{euro(breakdown.indemniteRuptureConventionnelleCents)}</td></tr>
                )}
                {breakdown.indemnitePrecariteCents > 0 && (
                  <tr className="border-b border-gray-100"><td className="py-2">Indemnité de précarité CDD (10%)</td><td className="py-2 text-right font-medium">{euro(breakdown.indemnitePrecariteCents)}</td></tr>
                )}
                {breakdown.indemniteCompensatriceCongesCents > 0 && (
                  <tr className="border-b border-gray-100"><td className="py-2">Indemnité compensatrice de congés payés</td><td className="py-2 text-right font-medium">{euro(breakdown.indemniteCompensatriceCongesCents)}</td></tr>
                )}
                {breakdown.indemniteCompensatricePreavisCents > 0 && (
                  <tr className="border-b border-gray-100"><td className="py-2">Indemnité compensatrice de préavis</td><td className="py-2 text-right font-medium">{euro(breakdown.indemniteCompensatricePreavisCents)}</td></tr>
                )}
                <tr className="bg-yellow-50 border-t-2 border-yellow-300"><td className="py-3 font-bold">TOTAL NET À VERSER</td><td className="py-3 text-right font-bold text-lg">{euro(breakdown.totalIndemnitesCents)}</td></tr>
              </tbody>
            </table>

            {breakdown.notes.length > 0 && (
              <ul className="mt-4 text-xs text-gray-500 space-y-1">
                {breakdown.notes.map((n, i) => <li key={i}>• {n}</li>)}
              </ul>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Documents à remettre au salarié</h2>
            <div className="flex flex-wrap gap-3">
              {breakdown.documentsRequis.includes('solde_tout_compte') && (
                <a href={docUrl('solde')} target="_blank" rel="noopener noreferrer" className="bg-primary-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-primary-700">Solde de tout compte</a>
              )}
              {breakdown.documentsRequis.includes('certificat_travail') && (
                <a href={docUrl('certificat')} target="_blank" rel="noopener noreferrer" className="bg-primary-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-primary-700">Certificat de travail</a>
              )}
              {breakdown.documentsRequis.includes('attestation_pole_emploi') && (
                <a href={docUrl('attestation-pe')} target="_blank" rel="noopener noreferrer" className="bg-primary-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-primary-700">Attestation Pôle Emploi</a>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Solde de tout compte : double exemplaire (L1234-20). Dénonçable sous 6 mois par le salarié. Au-delà : libératoire pour l'employeur.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
