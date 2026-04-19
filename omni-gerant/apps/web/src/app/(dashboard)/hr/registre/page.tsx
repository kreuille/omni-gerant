'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { HrNav } from '@/components/hr/hr-nav';

interface RegistryEntry {
  id: string;
  entryType: 'embauche' | 'sortie' | 'modification_contrat';
  employeeName: string;
  positionName: string | null;
  contractType: string | null;
  eventDate: string;
  createdAt: string;
}

const ENTRY_LABELS: Record<string, string> = {
  embauche: 'Embauche',
  sortie: 'Sortie',
  modification_contrat: 'Modification contrat',
};

const ENTRY_COLORS: Record<string, string> = {
  embauche: 'bg-green-100 text-green-800',
  sortie: 'bg-red-100 text-red-800',
  modification_contrat: 'bg-blue-100 text-blue-800',
};

export default function RegistrePage() {
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ entries: RegistryEntry[]; total: number }>('/api/hr/registry').then((r) => {
      if (r.ok) setEntries(r.value.entries);
      else setError(r.error.message);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <HrNav />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Registre Unique du Personnel</h1>
        <p className="text-sm text-gray-600 mt-1">
          Article L1221-13 du Code du travail. Journal chronologique immuable des embauches, sorties et modifications de contrat.
        </p>
      </div>

      {loading && <p className="text-gray-500">Chargement…</p>}
      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {entries.length === 0 ? (
            <p className="p-8 text-center text-gray-500">
              Aucune entrée. Le registre se remplit automatiquement à chaque embauche / sortie.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
                  <th className="px-4 py-3">Date événement</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Poste</th>
                  <th className="px-4 py-3">Contrat</th>
                  <th className="px-4 py-3">Enregistré</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{new Date(e.eventDate).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${ENTRY_COLORS[e.entryType] ?? ''}`}>
                        {ENTRY_LABELS[e.entryType] ?? e.entryType}
                      </span>
                    </td>
                    <td className="px-4 py-3">{e.employeeName}</td>
                    <td className="px-4 py-3 text-gray-600">{e.positionName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 uppercase text-xs">{e.contractType ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(e.createdAt).toLocaleString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4">
        Total : {entries.length} entrée(s). Conservation obligatoire : 5 ans après départ du dernier salarié concerné.
      </p>
    </div>
  );
}
