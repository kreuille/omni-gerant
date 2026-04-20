'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

interface InvoiceObligation {
  invoiceId: string;
  number: string;
  status: 'required' | 'e_reporting_only' | 'chorus_pro' | 'not_applicable';
  clientName: string | null;
}

interface Summary {
  required: number;
  e_reporting_only: number;
  chorus_pro: number;
  not_applicable: number;
}

const STATUS_COLORS: Record<string, string> = {
  required: 'bg-red-100 text-red-800 border-red-200',
  e_reporting_only: 'bg-orange-100 text-orange-800 border-orange-200',
  chorus_pro: 'bg-purple-100 text-purple-800 border-purple-200',
  not_applicable: 'bg-gray-100 text-gray-700 border-gray-200',
};

const STATUS_LABELS: Record<string, string> = {
  required: 'PPF obligatoire',
  e_reporting_only: 'E-reporting',
  chorus_pro: 'Chorus Pro (B2G)',
  not_applicable: 'Non applicable',
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  required: 'Facture B2B-FR : doit être transmise via PPF ou PDP agréée (Loi Finances 2024)',
  e_reporting_only: 'B2C ou international : e-reporting PPF mensuel requis (pas de flux e-invoice)',
  chorus_pro: 'Client probablement administration publique : transmission via Chorus Pro',
  not_applicable: 'Contexte non standard : à vérifier manuellement',
};

export default function InvoiceCompliancePage() {
  const [items, setItems] = useState<InvoiceObligation[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter] = useState<'all' | 'required' | 'e_reporting_only' | 'chorus_pro' | 'not_applicable'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ items: InvoiceObligation[]; summary: Summary }>('/api/ppf/obligations').then((r) => {
      if (r.ok) { setItems(r.value.items); setSummary(r.value.summary); }
      setLoading(false);
    });
  }, []);

  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conformité facturation 2026</h1>
        <p className="text-sm text-gray-600 mt-1">
          Classification automatique de vos factures selon la réforme (Loi Finances 2024 + décret 2025-1019). PPF obligatoire pour B2B-FR, e-reporting pour B2C et international.
        </p>
      </div>

      {loading && <p className="text-gray-500">Chargement…</p>}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <button onClick={() => setFilter('required')} className={`border rounded-lg p-4 text-left transition hover:shadow ${filter === 'required' ? 'ring-2 ring-red-500' : ''} bg-red-50 border-red-200`}>
            <div className="text-xs uppercase text-red-700 font-semibold">PPF obligatoire</div>
            <div className="text-3xl font-bold text-red-900 mt-1">{summary.required}</div>
            <div className="text-xs text-red-600 mt-1">B2B-France</div>
          </button>
          <button onClick={() => setFilter('e_reporting_only')} className={`border rounded-lg p-4 text-left transition hover:shadow ${filter === 'e_reporting_only' ? 'ring-2 ring-orange-500' : ''} bg-orange-50 border-orange-200`}>
            <div className="text-xs uppercase text-orange-700 font-semibold">E-reporting</div>
            <div className="text-3xl font-bold text-orange-900 mt-1">{summary.e_reporting_only}</div>
            <div className="text-xs text-orange-600 mt-1">B2C / International</div>
          </button>
          <button onClick={() => setFilter('chorus_pro')} className={`border rounded-lg p-4 text-left transition hover:shadow ${filter === 'chorus_pro' ? 'ring-2 ring-purple-500' : ''} bg-purple-50 border-purple-200`}>
            <div className="text-xs uppercase text-purple-700 font-semibold">Chorus Pro</div>
            <div className="text-3xl font-bold text-purple-900 mt-1">{summary.chorus_pro}</div>
            <div className="text-xs text-purple-600 mt-1">B2G (administration)</div>
          </button>
          <button onClick={() => setFilter('not_applicable')} className={`border rounded-lg p-4 text-left transition hover:shadow ${filter === 'not_applicable' ? 'ring-2 ring-gray-500' : ''} bg-gray-50 border-gray-200`}>
            <div className="text-xs uppercase text-gray-700 font-semibold">Non applicable</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{summary.not_applicable}</div>
            <div className="text-xs text-gray-600 mt-1">À vérifier</div>
          </button>
        </div>
      )}

      {filter !== 'all' && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <strong>{STATUS_LABELS[filter]}</strong> — {STATUS_DESCRIPTIONS[filter]}
          <button onClick={() => setFilter('all')} className="ml-3 text-primary-600 hover:underline text-xs">Voir tout</button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-gray-500">Aucune facture dans cette catégorie.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
                <th className="px-4 py-3">Numéro</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Classification</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.invoiceId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{inv.number}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.clientName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${STATUS_COLORS[inv.status]}`}>
                      {STATUS_LABELS[inv.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a href={`/invoices/${inv.invoiceId}/pdf`} className="text-primary-600 hover:underline text-xs font-medium">Voir facture</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-5 text-sm text-gray-700">
        <h3 className="font-semibold mb-2">PDP agréées (choix alternatif à PPF)</h3>
        <p className="text-xs text-gray-500 mb-3">Si tu préfères une plateforme partenaire pour émettre/recevoir (services premium), ces PDP sont connues :</p>
        <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 list-none text-xs mb-4">
          <li className="p-2 bg-gray-50 rounded border border-gray-200"><strong>Docaposte</strong><br/><span className="text-gray-500">AIFE-001 • Factur-X + UBL</span></li>
          <li className="p-2 bg-gray-50 rounded border border-gray-200"><strong>Yooz</strong><br/><span className="text-gray-500">AIFE-023 • Factur-X + UBL</span></li>
          <li className="p-2 bg-gray-50 rounded border border-gray-200"><strong>Pennylane</strong><br/><span className="text-gray-500">Agrément en cours • Factur-X</span></li>
          <li className="p-2 bg-gray-50 rounded border border-gray-200"><strong>Basware</strong><br/><span className="text-gray-500">AIFE-009 • Factur-X + UBL + CII</span></li>
          <li className="p-2 bg-gray-50 rounded border border-gray-200"><strong>Esker</strong><br/><span className="text-gray-500">Factur-X + UBL</span></li>
          <li className="p-2 bg-gray-50 rounded border border-gray-200"><strong>Generix</strong><br/><span className="text-gray-500">Factur-X</span></li>
        </ul>
      </div>

      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-5 text-sm text-gray-700">
        <h3 className="font-semibold mb-2">Calendrier obligations</h3>
        <ul className="space-y-1 list-disc list-inside">
          <li><strong>1er septembre 2026</strong> : réception obligatoire pour toutes les entreprises FR</li>
          <li><strong>1er septembre 2026</strong> : émission obligatoire pour grandes entreprises et ETI</li>
          <li><strong>1er septembre 2027</strong> : émission obligatoire pour PME et TPE</li>
          <li><strong>Formats acceptés PPF</strong> : Factur-X (PDF/A-3 + XML CII), UBL 2.1, CII D16B</li>
          <li><strong>Profils Factur-X</strong> : MINIMUM, BASIC WL, BASIC, EN 16931, EXTENDED. **EN 16931 obligatoire B2B-FR**.</li>
        </ul>
      </div>
    </div>
  );
}
