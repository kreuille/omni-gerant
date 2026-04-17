'use client';

import { useState, useEffect, useCallback } from 'react';
import { PpfStatusBadge } from '@/components/invoice/ppf-status-badge';
import { api } from '@/lib/api-client';

// BUSINESS RULE [CDC-3.2]: Page configuration PPF/PDP

type PpfEnvironment = 'sandbox' | 'production';

interface PpfSettings {
  environment: PpfEnvironment;
  api_key: string;
  technical_id: string;
}

interface PpfTransmission {
  id: string;
  invoice_id: string;
  ppf_id: string;
  status: string;
  last_status_check: string;
}

interface PpfDirectoryEntry {
  siret: string;
  name: string;
  platform: string;
  address: string;
}

export default function PpfSettingsPage() {
  const [environment, setEnvironment] = useState<PpfEnvironment>('sandbox');
  const [apiKey, setApiKey] = useState('');
  const [technicalId, setTechnicalId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [transmissions, setTransmissions] = useState<PpfTransmission[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [directorySiret, setDirectorySiret] = useState('');
  const [directoryResult, setDirectoryResult] = useState<PpfDirectoryEntry | null>(null);
  const [directoryError, setDirectoryError] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  const loadSettings = useCallback(async () => {
    const result = await api.get<PpfSettings>('/api/settings/ppf');
    if (result.ok) {
      setEnvironment(result.value.environment ?? 'sandbox');
      setApiKey(result.value.api_key ?? '');
      setTechnicalId(result.value.technical_id ?? '');
    }
  }, []);

  const loadTransmissions = useCallback(async () => {
    const result = await api.post<PpfTransmission[]>('/api/ppf/refresh', {});
    if (result.ok) {
      setTransmissions(result.value);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadTransmissions();
  }, [loadSettings, loadTransmissions]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await api.put('/api/settings/ppf', {
      environment,
      api_key: apiKey,
      technical_id: technicalId,
    });
    setSaving(false);
    if (result.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      alert(result.error.message ?? 'Erreur');
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    const result = await api.post<PpfTransmission[]>('/api/ppf/refresh', {});
    if (result.ok) {
      setTransmissions(result.value);
    }
    setRefreshing(false);
  }

  async function handleDirectoryLookup() {
    const cleaned = directorySiret.replace(/\s/g, '');
    if (cleaned.length !== 14) {
      setDirectoryError('Le SIRET doit contenir 14 chiffres');
      return;
    }
    setLookingUp(true);
    setDirectoryError('');
    setDirectoryResult(null);
    const result = await api.get<PpfDirectoryEntry>(`/api/ppf/directory/${cleaned}`);
    if (result.ok) {
      setDirectoryResult(result.value);
    } else {
      setDirectoryError(result.error.message ?? 'SIRET non trouve');
    }
    setLookingUp(false);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portail Public de Facturation</h1>
        <p className="mt-1 text-gray-500">
          Configurez la connexion au PPF pour la facturation electronique obligatoire.
        </p>
      </div>

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

      <section className="rounded-xl border bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Transmissions recentes</h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
          >
            {refreshing ? 'Actualisation...' : 'Actualiser'}
          </button>
        </div>
        <div className="divide-y">
          {transmissions.length === 0 ? (
            <p className="text-sm text-gray-400 py-3">Aucune transmission</p>
          ) : (
            transmissions.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">{t.invoice_id}</p>
                  <p className="text-xs text-gray-500">{t.ppf_id} — {t.last_status_check ? new Date(t.last_status_check).toLocaleDateString('fr-FR') : ''}</p>
                </div>
                <PpfStatusBadge status={t.status as 'deposee' | 'en_cours_traitement' | 'acceptee' | 'refusee' | 'encaissee'} />
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold">Annuaire PPF</h2>
        <p className="text-sm text-gray-500">
          Recherchez un destinataire par SIRET pour verifier son adresse de facturation electronique.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={directorySiret}
            onChange={(e) => setDirectorySiret(e.target.value)}
            placeholder="SIRET (14 chiffres)"
            maxLength={14}
            className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleDirectoryLookup}
            disabled={lookingUp}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {lookingUp ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>
        {directoryError && <p className="text-sm text-red-500">{directoryError}</p>}
        {directoryResult && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
            <p className="font-medium text-green-800">{directoryResult.name}</p>
            <p className="text-green-700">SIRET: {directoryResult.siret}</p>
            <p className="text-green-700">Plateforme: {directoryResult.platform}</p>
            <p className="text-green-700">Adresse: {directoryResult.address}</p>
          </div>
        )}
      </section>
    </div>
  );
}
