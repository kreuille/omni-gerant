'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { HrNav } from '@/components/hr/hr-nav';

interface Stats {
  headcount: { total: number; cdi: number; cdd: number; apprentice: number; intern: number };
  demographics: { avgAgeYears: number | null; avgSeniorityYears: number | null; pyramid: Array<{ range: string; count: number }> };
  payroll: { ytdGrossCents: number; ytdEmployerChargesCents: number; ytdNetToPayCents: number; avgGrossCents: number; topEarnersCount: number };
  absenteeism: { sickDaysYtd: number; cpTakenYtd: number; rttTakenYtd: number };
  turnover: { hiresYtd: number; exitsYtd: number; rate: number };
}

function euro(c: number) { return (c / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'; }

export default function AnalyticsPage() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<Stats>('/api/hr/dashboard/analytics').then((r) => { if (r.ok) setS(r.value); });
  }, []);

  if (!s) return <div><HrNav /><p>Chargement…</p></div>;

  const maxPy = Math.max(1, ...s.demographics.pyramid.map((p) => p.count));

  return (
    <div>
      <HrNav />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard RH — Analytics</h1>
        <p className="text-sm text-gray-600 mt-1">Vue synthétique de l'effectif, la masse salariale, l'absentéisme et le turnover (YTD {new Date().getFullYear()}).</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card label="Effectif total" value={s.headcount.total.toString()} color="bg-blue-50 border-blue-200" />
        <Card label="CDI" value={s.headcount.cdi.toString()} color="bg-green-50 border-green-200" />
        <Card label="CDD" value={s.headcount.cdd.toString()} color="bg-orange-50 border-orange-200" />
        <Card label="Apprentis / Stagiaires" value={(s.headcount.apprentice + s.headcount.intern).toString()} color="bg-purple-50 border-purple-200" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-xs uppercase text-gray-500 mb-3">Masse salariale YTD</h3>
          <div className="text-2xl font-bold">{euro(s.payroll.ytdGrossCents)}</div>
          <div className="text-xs text-gray-500 mt-1">Brut cumulé année</div>
          <hr className="my-3" />
          <div className="flex justify-between text-sm"><span>Charges patronales</span><span className="font-medium">{euro(s.payroll.ytdEmployerChargesCents)}</span></div>
          <div className="flex justify-between text-sm"><span>Net versé</span><span className="font-medium text-green-700">{euro(s.payroll.ytdNetToPayCents)}</span></div>
          <div className="flex justify-between text-sm mt-1"><span>Salaire moyen</span><span className="font-medium">{euro(s.payroll.avgGrossCents)}</span></div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-xs uppercase text-gray-500 mb-3">Démographie</h3>
          <div className="flex justify-between text-sm"><span>Âge moyen</span><span className="font-medium">{s.demographics.avgAgeYears ?? '—'} ans</span></div>
          <div className="flex justify-between text-sm mt-1"><span>Ancienneté moyenne</span><span className="font-medium">{s.demographics.avgSeniorityYears ?? '—'} ans</span></div>
          <div className="flex justify-between text-sm mt-1"><span>Cadres / dirigeants</span><span className="font-medium">{s.payroll.topEarnersCount}</span></div>
          <hr className="my-3" />
          <div className="text-xs text-gray-500 mb-2">Pyramide des âges</div>
          <div className="flex items-end gap-1 h-20">
            {s.demographics.pyramid.map((p) => (
              <div key={p.range} className="flex-1 flex flex-col items-center justify-end">
                <span className="text-xs text-gray-600">{p.count}</span>
                <div className="w-full bg-primary-500 rounded-t" style={{ height: `${(p.count / maxPy) * 100}%`, minHeight: p.count > 0 ? '3px' : '0' }} />
                <span className="text-xs text-gray-500 mt-1">{p.range}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-xs uppercase text-gray-500 mb-3">Turnover</h3>
          <div className="flex justify-between text-sm"><span>Embauches YTD</span><span className="font-medium text-green-700">+{s.turnover.hiresYtd}</span></div>
          <div className="flex justify-between text-sm mt-1"><span>Sorties YTD</span><span className="font-medium text-red-700">-{s.turnover.exitsYtd}</span></div>
          <div className="flex justify-between text-sm mt-1"><span>Taux turnover</span><span className="font-medium">{s.turnover.rate}%</span></div>
          <hr className="my-3" />
          <h3 className="text-xs uppercase text-gray-500 mb-2">Absentéisme</h3>
          <div className="flex justify-between text-sm"><span>Jours maladie</span><span className="font-medium">{s.absenteeism.sickDaysYtd}</span></div>
          <div className="flex justify-between text-sm mt-1"><span>CP pris</span><span className="font-medium">{s.absenteeism.cpTakenYtd}</span></div>
          <div className="flex justify-between text-sm mt-1"><span>RTT pris</span><span className="font-medium">{s.absenteeism.rttTakenYtd}</span></div>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`border rounded-lg p-4 ${color}`}>
      <div className="text-xs uppercase text-gray-600">{label}</div>
      <div className="text-3xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}
