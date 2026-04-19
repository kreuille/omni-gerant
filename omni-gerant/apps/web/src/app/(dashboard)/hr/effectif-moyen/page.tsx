'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { HrNav } from '@/components/hr/hr-nav';

interface HeadcountResult {
  year: number;
  monthly: Array<{ month: number; headcount: number }>;
  average: number;
  threshold_11_reached: boolean;
  threshold_20_reached: boolean;
  threshold_50_reached: boolean;
  details: {
    cdi_full_time: number;
    cdi_part_time: number;
    cdd: number;
    interim: number;
    excluded: number;
  };
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function EffectifMoyenPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<HeadcountResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<HeadcountResult>(`/api/hr/headcount/${year}`).then((r) => {
      if (r.ok) setData(r.value);
      setLoading(false);
    });
  }, [year]);

  const max = data ? Math.max(...data.monthly.map((m) => m.headcount), 1) : 1;

  return (
    <div>
      <HrNav />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Effectif mensuel moyen</h1>
        <p className="text-sm text-gray-600 mt-1">
          Article L130-1 du Code du travail. Moyenne annuelle glissante — seuils déclenchés après 5 années consécutives.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-gray-700">Année :</label>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value, 10))}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        >
          {[0, 1, 2, 3, 4].map((offset) => {
            const y = new Date().getFullYear() - offset;
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>
      </div>

      {loading && <p className="text-gray-500">Calcul…</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase">Moyenne annuelle</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">{data.average.toFixed(2)}</div>
            </div>
            <div className={`border rounded-lg p-4 ${data.threshold_11_reached ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200'}`}>
              <div className="text-xs uppercase text-gray-500">Seuil 11</div>
              <div className="text-sm font-semibold mt-1">{data.threshold_11_reached ? '⚠ Atteint — CSE obligatoire' : 'Non atteint'}</div>
            </div>
            <div className={`border rounded-lg p-4 ${data.threshold_20_reached ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-200'}`}>
              <div className="text-xs uppercase text-gray-500">Seuil 20</div>
              <div className="text-sm font-semibold mt-1">{data.threshold_20_reached ? '⚠ Atteint — taxe apprentissage' : 'Non atteint'}</div>
            </div>
            <div className={`border rounded-lg p-4 ${data.threshold_50_reached ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
              <div className="text-xs uppercase text-gray-500">Seuil 50</div>
              <div className="text-sm font-semibold mt-1">{data.threshold_50_reached ? '⚠ Atteint — règlement intérieur, PAPRIPACT' : 'Non atteint'}</div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Evolution mensuelle {year}</h2>
            <div className="flex items-end gap-1 h-48">
              {data.monthly.map((m) => {
                const h = max > 0 ? (m.headcount / max) * 100 : 0;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-gray-100 rounded-t flex-1 flex items-end relative group">
                      <div className="w-full bg-primary-500 rounded-t transition-all" style={{ height: `${h}%` }} />
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-700 opacity-0 group-hover:opacity-100">{m.headcount.toFixed(1)}</span>
                    </div>
                    <span className="text-xs text-gray-500 mt-1">{MONTHS[m.month - 1]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Détail par type de contrat</h2>
            <dl className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div><dt className="text-gray-500 text-xs">CDI plein</dt><dd className="font-semibold">{data.details.cdi_full_time}</dd></div>
              <div><dt className="text-gray-500 text-xs">CDI temps partiel</dt><dd className="font-semibold">{data.details.cdi_part_time}</dd></div>
              <div><dt className="text-gray-500 text-xs">CDD / saisonnier</dt><dd className="font-semibold">{data.details.cdd}</dd></div>
              <div><dt className="text-gray-500 text-xs">Intérim</dt><dd className="font-semibold">{data.details.interim}</dd></div>
              <div><dt className="text-gray-500 text-xs">Exclus (apprentis/stagiaires)</dt><dd className="font-semibold">{data.details.excluded}</dd></div>
            </dl>
          </div>
        </>
      )}
    </div>
  );
}
