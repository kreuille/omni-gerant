'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { HrNav } from '@/components/hr/hr-nav';

interface Entry { account: string; label: string; debitCents: number; creditCents: number }
interface Export {
  year: number; month: number; periodLabel: string;
  entries: Entry[];
  totalDebitCents: number; totalCreditCents: number;
  balanced: boolean; payslipsCount: number;
}

const MONTHS = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre'];
function euro(c: number) { return (c / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'; }

export default function ComptaPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [data, setData] = useState<Export | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<Export>(`/api/hr/accounting/${year}/${month}`).then((r) => {
      if (r.ok) setData(r.value);
      setLoading(false);
    });
  }, [year, month]);

  const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'https://omni-gerant-api.onrender.com';

  return (
    <div>
      <HrNav />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Export comptable — Classe 64</h1>
        <p className="text-sm text-gray-600 mt-1">
          Opération diverse (OD) mensuelle équilibrée. Comptes : 641 / 645 (débit), 421 / 431 / 437 (crédit).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Année</label>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            {[0, 1, 2].map((o) => { const y = today.getFullYear() - o; return <option key={y} value={y}>{y}</option>; })}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Mois</label>
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <button
          onClick={async () => {
            const { openAuthenticatedDocument } = await import('@/lib/download');
            await openAuthenticatedDocument(`/api/hr/accounting/${year}/${month}/csv`, `paie-${year}-${String(month).padStart(2,'0')}.csv`);
          }}
          className="bg-primary-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-primary-700"
        >
          Télécharger CSV
        </button>
      </div>

      {loading && <p className="text-gray-500">Chargement…</p>}

      {data && (
        <>
          {data.payslipsCount === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
              Aucun bulletin pour {MONTHS[data.month - 1]} {data.year}. Générez d'abord les bulletins dans l'onglet Paie.
            </div>
          ) : (
            <>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
                      <th className="px-4 py-3">Compte</th>
                      <th className="px-4 py-3">Libellé</th>
                      <th className="px-4 py-3 text-right">Débit</th>
                      <th className="px-4 py-3 text-right">Crédit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.entries.map((e, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-4 py-3 font-mono font-bold">{e.account}</td>
                        <td className="px-4 py-3">{e.label}</td>
                        <td className="px-4 py-3 text-right">{e.debitCents > 0 ? euro(e.debitCents) : '—'}</td>
                        <td className="px-4 py-3 text-right">{e.creditCents > 0 ? euro(e.creditCents) : '—'}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                      <td colSpan={2} className="px-4 py-3 text-right">TOTAUX</td>
                      <td className="px-4 py-3 text-right">{euro(data.totalDebitCents)}</td>
                      <td className="px-4 py-3 text-right">{euro(data.totalCreditCents)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className={`p-3 rounded border text-sm ${data.balanced ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                {data.balanced ? '✓' : '✗'} {data.balanced ? 'OD équilibrée' : 'Déséquilibre détecté'} · {data.payslipsCount} bulletin(s)
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
