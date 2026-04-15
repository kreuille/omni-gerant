'use client';

import { useState } from 'react';

// BUSINESS RULE [CDC-3.2]: Bouton connexion Stripe Connect

interface StripeConnectButtonProps {
  tenantId: string;
  connected?: boolean;
  accountId?: string;
  onConnect?: (accountId: string) => void;
}

export function StripeConnectButton({
  tenantId,
  connected = false,
  accountId,
  onConnect: _onConnect,
}: StripeConnectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payment/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId }),
      });
      if (!res.ok) throw new Error('Erreur lors de la connexion Stripe');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  if (connected && accountId) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
          <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-green-800">Stripe connecte</p>
          <p className="text-sm text-green-600">Compte : {accountId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleConnect}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
          </svg>
        )}
        Connecter Stripe
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
