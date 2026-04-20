'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { HrNav } from '@/components/hr/hr-nav';

interface Posting {
  code: string;
  title: string;
  legalBasis: string;
  description: string;
  conditionalOn?: string | null;
}

export default function AffichagesPage() {
  const [headcount, setHeadcount] = useState(5);
  const [isErp, setIsErp] = useState(false);
  const [all, setAll] = useState<Posting[]>([]);
  const [applicable, setApplicable] = useState<Posting[]>([]);

  useEffect(() => {
    const q = `?headcount=${headcount}&isErp=${isErp}`;
    api.get<{ all: Posting[]; applicable: Posting[] }>(`/api/hr/postings${q}`).then((r) => {
      if (r.ok) { setAll(r.value.all); setApplicable(r.value.applicable); }
    });
  }, [headcount, isErp]);

  const applicableCodes = new Set(applicable.map((p) => p.code));
  const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'https://omni-gerant-api.onrender.com';

  return (
    <div>
      <HrNav />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Affichages obligatoires</h1>
        <p className="text-sm text-gray-600 mt-1">
          Art. L1221-20 CT et suivants. Liste des documents à afficher sur un panneau accessible à tous les salariés.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-6 bg-white border border-gray-200 rounded-lg p-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Effectif</label>
          <input type="number" value={headcount} onChange={(e) => setHeadcount(parseInt(e.target.value, 10) || 0)} className="border border-gray-300 rounded px-3 py-1.5 text-sm w-24" min={0} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="erp" checked={isErp} onChange={(e) => setIsErp(e.target.checked)} />
          <label htmlFor="erp" className="text-sm text-gray-700">Etablissement recevant du public (ERP)</label>
        </div>
        <button
          onClick={async () => {
            const { openAuthenticatedDocument } = await import('@/lib/download');
            await openAuthenticatedDocument(`/api/hr/postings/checklist?headcount=${headcount}&isErp=${isErp}`, 'affichages-obligatoires.html');
          }}
          className="ml-auto bg-primary-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-primary-700"
        >
          Télécharger la checklist imprimable
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-3">{applicable.length} sur {all.length} applicable(s) à votre entreprise.</p>

      <div className="space-y-2">
        {all.map((p, idx) => {
          const isApplicable = applicableCodes.has(p.code);
          return (
            <div key={p.code} className={`border rounded-lg p-4 ${isApplicable ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">#{idx + 1}</span>
                    <h3 className="font-semibold text-gray-900">{p.title}</h3>
                    {!isApplicable && <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">Non applicable</span>}
                  </div>
                  <p className="text-sm text-gray-600">{p.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{p.legalBasis}</p>
                </div>
                <input type="checkbox" className="mt-1 h-4 w-4" disabled={!isApplicable} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
