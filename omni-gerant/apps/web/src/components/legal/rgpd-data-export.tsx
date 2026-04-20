'use client';

import { useState } from 'react';

// Vague C3 : Droit a la portabilite (RGPD Art. 20) — export global des donnees tenant.

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'https://omni-gerant-api.onrender.com';

export function RgpdDataExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onExport() {
    setLoading(true);
    setError(null);
    try {
      // Fetch direct pour recevoir le Blob avec Content-Disposition
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/api/legal/rgpd/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message ?? `Erreur ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zenadmin-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <h3 className="font-semibold text-amber-900 mb-1">Droit à la portabilité (RGPD art. 20)</h3>
      <p className="text-sm text-amber-800 mb-3">
        Téléchargez l'intégralité de vos données tenant au format JSON structuré :
        tenant, utilisateurs, clients, fournisseurs, devis, factures, achats, comptes
        bancaires, DUERP, traitements RGPD, assurances, employés, notifications, abonnement.
      </p>
      <button
        onClick={onExport}
        disabled={loading}
        className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded"
      >
        {loading ? 'Génération…' : 'Télécharger mes données (JSON)'}
      </button>
      {error && <p className="text-xs text-red-700 mt-2">{error}</p>}
      <p className="text-xs text-amber-700 mt-2 opacity-75">
        Réservé au propriétaire du compte. Fichier structuré et lisible par machine,
        conforme à l'article 20 du RGPD.
      </p>
    </div>
  );
}
