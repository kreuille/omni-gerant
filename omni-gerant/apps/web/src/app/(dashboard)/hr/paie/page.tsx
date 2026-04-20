'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { HrNav } from '@/components/hr/hr-nav';

interface Payslip {
  id: string;
  employee_id: string;
  period_year: number;
  period_month: number;
  gross_total_cents: number;
  total_employee_deductions_cents: number;
  net_to_pay_cents: number;
  total_employer_charges_cents: number;
  fillon_reduction_cents: number;
  sent_to_employee_at: string | null;
}

interface Employee { id: string; firstName: string; lastName: string; email: string | null }

const MONTHS = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre'];

function euro(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function PaiePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [listRes, empRes] = await Promise.all([
      api.get<{ items: Payslip[] }>(`/api/hr/payroll/periods/${year}/${month}`),
      api.get<{ items: Employee[] }>('/api/hr/employees?limit=100'),
    ]);
    if (listRes.ok) setPayslips(listRes.value.items);
    if (empRes.ok) {
      const map: Record<string, Employee> = {};
      for (const e of empRes.value.items) map[e.id] = e;
      setEmployees(map);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [year, month]);

  async function generateAll() {
    setGenerating(true);
    setMessage(null);
    const res = await api.post<{ generated: number; skipped: number; errors: Array<{ reason: string }> }>(
      `/api/hr/payroll/periods/${year}/${month}/generate`,
      {},
    );
    if (res.ok) {
      setMessage(`${res.value.generated} bulletin(s) généré(s), ${res.value.skipped} ignoré(s), ${res.value.errors.length} erreur(s).`);
      await load();
    } else {
      setMessage('Erreur : ' + res.error.message);
    }
    setGenerating(false);
  }

  async function closePeriod() {
    if (!confirm('Clôturer la période ? Plus aucune modification ne sera possible.')) return;
    const res = await api.post(`/api/hr/payroll/periods/${year}/${month}/close`, {});
    if (res.ok) setMessage('Période clôturée.');
    else setMessage('Erreur : ' + res.error.message);
  }

  async function downloadPdf(id: string, filename: string) {
    const { openAuthenticatedDocument } = await import('@/lib/download');
    const r = await openAuthenticatedDocument(`/api/hr/payroll/payslips/${id}/pdf`, filename);
    if (!r.ok) setMessage('Erreur téléchargement : ' + r.error);
  }

  async function sendPayslip(id: string) {
    const res = await api.post<{ sent: boolean; email: string }>(`/api/hr/payroll/payslips/${id}/send`, {});
    if (res.ok) setMessage(`Envoyé à ${res.value.email}`);
    else setMessage('Erreur : ' + res.error.message);
  }

  const totalGross = payslips.reduce((s, p) => s + p.gross_total_cents, 0);
  const totalNet = payslips.reduce((s, p) => s + p.net_to_pay_cents, 0);
  const totalCharges = payslips.reduce((s, p) => s + p.total_employer_charges_cents, 0);

  return (
    <div>
      <HrNav />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Paie — bulletins mensuels</h1>
        <p className="text-sm text-gray-600 mt-1">Taux URSSAF 2026 + AGIRC-ARRCO + CSG/CRDS + réduction Fillon. Bulletin conforme Article R3243-1.</p>
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
        <button onClick={generateAll} disabled={generating} className="bg-primary-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
          {generating ? 'Génération…' : 'Générer les bulletins'}
        </button>
        <button onClick={closePeriod} className="bg-gray-800 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-900">
          Clôturer la période
        </button>
      </div>

      {message && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">{message}</div>}

      {payslips.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs uppercase text-gray-500">Masse salariale brute</div>
            <div className="text-2xl font-bold mt-1">{euro(totalGross)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs uppercase text-gray-500">Net à verser</div>
            <div className="text-2xl font-bold mt-1 text-green-700">{euro(totalNet)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs uppercase text-gray-500">Charges patronales</div>
            <div className="text-2xl font-bold mt-1 text-orange-700">{euro(totalCharges)}</div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Chargement…</p>
      ) : payslips.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
          Aucun bulletin pour {MONTHS[month - 1]} {year}. Cliquez sur <strong>Générer les bulletins</strong>.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
                <th className="px-4 py-3">Salarié</th>
                <th className="px-4 py-3 text-right">Brut</th>
                <th className="px-4 py-3 text-right">Cotis.</th>
                <th className="px-4 py-3 text-right">Net à payer</th>
                <th className="px-4 py-3 text-right">Fillon</th>
                <th className="px-4 py-3">Envoyé</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((p) => {
                const emp = employees[p.employee_id];
                return (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{emp ? `${emp.lastName} ${emp.firstName}` : p.employee_id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-right">{euro(p.gross_total_cents)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">-{euro(p.total_employee_deductions_cents)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{euro(p.net_to_pay_cents)}</td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">{p.fillon_reduction_cents > 0 ? `-${euro(p.fillon_reduction_cents)}` : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.sent_to_employee_at ? new Date(p.sent_to_employee_at).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => downloadPdf(p.id, `bulletin-${emp?.lastName ?? 'salarie'}-${p.period_year}-${String(p.period_month).padStart(2, '0')}.html`)} className="text-primary-600 hover:underline text-xs font-medium">PDF</button>
                      <button onClick={() => sendPayslip(p.id)} className="text-blue-600 hover:underline text-xs font-medium">Envoyer</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
