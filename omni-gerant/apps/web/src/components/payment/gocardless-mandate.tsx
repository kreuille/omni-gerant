'use client';

import { useState } from 'react';

// BUSINESS RULE [CDC-3.2]: Gestion mandats SEPA GoCardless

interface GoCardlessMandateProps {
  clientId: string;
  mandateActive?: boolean;
  mandateId?: string;
  onMandateCreated?: (mandateId: string) => void;
}

export function GoCardlessMandate({
  clientId,
  mandateActive = false,
  mandateId,
  onMandateCreated: _onMandateCreated,
}: GoCardlessMandateProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function initiateMandate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payment/gocardless/mandate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      });
      if (!res.ok) throw new Error('Erreur creation mandat');
      const data = await res.json();
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  async function cancelMandate() {
    if (!mandateId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payment/gocardless/mandate/${mandateId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erreur annulation mandat');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  if (mandateActive && mandateId) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-green-800">Mandat SEPA actif</p>
            <p className="text-sm text-green-600">ID : {mandateId}</p>
          </div>
        </div>
        <button
          onClick={cancelMandate}
          disabled={loading}
          className="text-sm text-red-600 hover:underline disabled:opacity-50"
        >
          {loading ? 'Annulation...' : 'Revoquer le mandat'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-3">
        <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
        <div>
          <p className="font-medium">Prelevement SEPA</p>
          <p className="text-sm text-gray-500">Mettre en place un mandat de prelevement automatique</p>
        </div>
      </div>
      <button
        onClick={initiateMandate}
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Redirection...' : 'Configurer le prelevement SEPA'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
