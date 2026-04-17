'use client';

import { useState } from 'react';
import { PpfStatusBadge } from '../../../components/invoice/ppf-status-badge';

// BUSINESS RULE [CDC-3.2]: Page configuration PPF/PDP

type PpfEnvironment = 'sandbox' | 'production';

export default function PpfSettingsPage() {
  const [environment, setEnvironment] = useState<PpfEnvironment>('sandbox');
  const [apiKey, setApiKey] = useState('');
  const [technicalId, setTechnicalId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Placeholder — would POST to /api/settings/ppf
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // Demo recent transmissions
  const recentTransmissions = [
    { id: 'PPF-2026-001', invoice: 'FAC-2026-042', status: 'acceptee' as const, date: '2026-04-12' },
    { id: 'PPF-2026-002', invoice: 'FAC-2026-043', status: 'en_cours_traitement' as const, date: '2026-04-13' },
    { id: 'PPF-2026-003', invoice: 'FAC-2026-044', status: 'deposee' as const, date: '2026-04-14' },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portail Public de Facturation</h1>
        <p className="mt-1 text-gray-500">
          Configurez la connexion au PPF pour la facturation electronique obligatoire.
        </p>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-800">Obligation legale 2026</p>
            <p className="text-sm text-blue-700 mt-1">
              A compter du 1er septembre 2026, toutes les entreprises assujetties a la TVA
              devront etre en mesure de recevoir des factures electroniques via le PPF ou une PDP.
              L&apos;emission obligatoire suivra selon le calendrier.
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSave} className="rounded-xl border bg-white p-6 space-y-6">
        <h2 className="text-lg font-semibold">Configuration API</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Environnement</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="sandbox"
                  checked={environment === 'sandbox'}
                  onChange={() => setEnvironment('sandbox')}
                  className="text-indigo-600"
                />
                <span className="text-sm">Sandbox (test)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="production"
                  checked={environment === 'production'}
                  onChange={() => setEnvironment('production')}
                  className="text-indigo-600"
                />
                <span className="text-sm">Production</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="ppf-api-key">
              Cle API AIFE
            </label>
            <input
              id="ppf-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Votre cle API PPF/AIFE"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="ppf-tech-id">
              Identifiant technique
            </label>
            <input
              id="ppf-tech-id"
              type="text"
              value={technicalId}
              onChange={(e) => setTechnicalId(e.target.value)}
              placeholder="Identifiant technique PDP/PPF"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-6 py-2 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          {saved && <span className="text-sm text-green-600">Configuration sauvegardee</span>}
        </div>
      </form>

      {/* Recent Transmissions */}
      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold">Transmissions recentes</h2>
        <div className="divide-y">
          {recentTransmissions.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-sm">{t.invoice}</p>
                <p className="text-xs text-gray-500">{t.id} — {t.date}</p>
              </div>
              <PpfStatusBadge status={t.status} />
            </div>
          ))}
        </div>
      </section>

      {/* Directory Lookup */}
      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold">Annuaire PPF</h2>
        <p className="text-sm text-gray-500">
          Recherchez un destinataire par SIRET pour verifier son adresse de facturation electronique.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="SIRET (14 chiffres)"
            maxLength={14}
            className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-colors">
            Rechercher
          </button>
        </div>
      </section>
    </div>
  );
}
