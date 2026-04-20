'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { SettingsNav } from '@/components/settings/settings-nav';

interface Plan {
  code: string; name: string;
  priceMonthlyCents: number; priceYearlyCents: number;
  maxUsers: number; maxInvoicesPerMonth: number; maxEmployees: number;
  features: { paie: boolean; dsn: boolean; ppf: boolean; bridgeBanking: boolean; duerp: boolean; eSignature: boolean; support: string; customDomain: boolean };
}

interface Subscription {
  planCode: string; status: string;
  trialEndsAt: string | null; currentPeriodEnd: string | null;
  maxUsers: number; maxInvoicesPerMonth: number; maxEmployees: number;
}

function euro(c: number) { return (c / 100).toFixed(0) + ' €'; }

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ plans: Plan[] }>('/api/billing/plans'),
      api.get<Subscription>('/api/billing/subscription'),
    ]).then(([p, s]) => {
      if (p.ok) setPlans(p.value.plans);
      if (s.ok) setSub(s.value);
      setLoading(false);
    });
    // Check URL params (success/canceled from Stripe)
    const u = new URL(window.location.href);
    if (u.searchParams.get('success') === 'true') setMessage('✓ Paiement confirmé ! Votre abonnement est activé.');
    if (u.searchParams.get('canceled') === 'true') setMessage('Paiement annulé — aucune modification.');
  }, []);

  async function subscribe(planCode: string) {
    const r = await api.post<{ url: string }>('/api/billing/checkout', { planCode, billingCycle });
    if (r.ok && r.value.url) window.location.href = r.value.url;
    else setMessage('Erreur : ' + (r.ok ? 'URL manquante' : r.error.message));
  }

  async function openPortal() {
    const r = await api.post<{ url: string }>('/api/billing/portal', {});
    if (r.ok && r.value.url) window.location.href = r.value.url;
    else setMessage('Erreur : ' + (r.ok ? 'URL manquante' : r.error.message));
  }

  if (loading) return <p className="text-gray-500">Chargement…</p>;

  const currentPlan = plans.find((p) => p.code === sub?.planCode);

  return (
    <div className="max-w-5xl mx-auto">
      <SettingsNav />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Abonnement & facturation</h1>
        <p className="text-sm text-gray-600 mt-1">Choisissez le plan adapté à votre activité.</p>
      </div>

      {message && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">{message}</div>}

      {/* Current subscription */}
      {sub && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase text-gray-500">Plan actuel</div>
              <div className="text-2xl font-bold">{currentPlan?.name ?? sub.planCode}</div>
              <div className="text-sm text-gray-600 mt-1">
                Statut : <span className="font-semibold">{sub.status}</span>
                {sub.trialEndsAt && sub.status === 'trialing' && <span className="ml-3">— Essai jusqu'au {new Date(sub.trialEndsAt).toLocaleDateString('fr-FR')}</span>}
                {sub.currentPeriodEnd && sub.status === 'active' && <span className="ml-3">— Prochain renouvellement {new Date(sub.currentPeriodEnd).toLocaleDateString('fr-FR')}</span>}
              </div>
            </div>
            {sub.status === 'active' && (
              <button onClick={openPortal} className="text-sm text-primary-600 hover:underline">Gérer mon abonnement (Stripe) →</button>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div><span className="text-gray-500">Utilisateurs :</span> <strong>{sub.maxUsers}</strong></div>
            <div><span className="text-gray-500">Factures/mois :</span> <strong>{sub.maxInvoicesPerMonth}</strong></div>
            <div><span className="text-gray-500">Employés :</span> <strong>{sub.maxEmployees}</strong></div>
          </div>
        </div>
      )}

      {/* Toggle cycle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white">
          <button onClick={() => setBillingCycle('monthly')} className={`px-4 py-2 rounded text-sm font-medium ${billingCycle === 'monthly' ? 'bg-primary-600 text-white' : 'text-gray-600'}`}>Mensuel</button>
          <button onClick={() => setBillingCycle('yearly')} className={`px-4 py-2 rounded text-sm font-medium ${billingCycle === 'yearly' ? 'bg-primary-600 text-white' : 'text-gray-600'}`}>Annuel <span className="text-xs bg-green-200 text-green-900 px-1.5 py-0.5 rounded ml-1">-17%</span></button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {plans.map((p) => {
          const isCurrentPlan = p.code === sub?.planCode;
          const isTrial = p.code === 'trial';
          const price = billingCycle === 'monthly' ? p.priceMonthlyCents : p.priceYearlyCents;
          const perMonth = billingCycle === 'yearly' ? Math.round(p.priceYearlyCents / 12) : p.priceMonthlyCents;
          return (
            <div key={p.code} className={`border rounded-lg p-5 ${isCurrentPlan ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'} ${p.code === 'pro' ? 'ring-2 ring-blue-200' : ''}`}>
              {p.code === 'pro' && <div className="text-xs font-bold text-blue-700 mb-2">LE PLUS POPULAIRE</div>}
              <h3 className="text-lg font-bold">{p.name}</h3>
              <div className="my-3">
                {isTrial ? (
                  <div className="text-2xl font-bold">Gratuit</div>
                ) : (
                  <>
                    <div className="text-3xl font-bold">{euro(perMonth)}<span className="text-sm font-normal text-gray-500">/mois</span></div>
                    {billingCycle === 'yearly' && <div className="text-xs text-gray-500">facturé {euro(price)} / an</div>}
                  </>
                )}
              </div>
              <ul className="text-xs text-gray-700 space-y-1.5 mb-4">
                <li>✓ {p.maxUsers === 999 ? 'Utilisateurs illimités' : `${p.maxUsers} utilisateurs`}</li>
                <li>✓ {p.maxInvoicesPerMonth === 99999 ? 'Factures illimitées' : `${p.maxInvoicesPerMonth} factures/mois`}</li>
                <li>✓ {p.maxEmployees === 999 ? 'Employés illimités' : `${p.maxEmployees} employés`}</li>
                <li>{p.features.paie ? '✓' : '×'} Paie + bulletins R3243-1</li>
                <li>{p.features.dsn ? '✓' : '×'} DSN mensuelle</li>
                <li>{p.features.ppf ? '✓' : '×'} Factur-X + PPF 2026</li>
                <li>{p.features.bridgeBanking ? '✓' : '×'} Connexion bancaire live</li>
                <li>{p.features.eSignature ? '✓' : '×'} Signature électronique</li>
                <li>✓ Support {p.features.support}</li>
              </ul>
              {isCurrentPlan ? (
                <div className="text-center py-2 bg-primary-100 text-primary-700 rounded text-sm font-semibold">Plan actuel</div>
              ) : isTrial ? null : (
                <button onClick={() => subscribe(p.code)} className="w-full bg-primary-600 text-white py-2 rounded text-sm font-medium hover:bg-primary-700">
                  Choisir {p.name}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center text-xs text-gray-500">
        Paiement sécurisé par <strong>Stripe</strong> · Annulation à tout moment · TVA incluse · Essai gratuit 14 jours sans CB
      </div>
    </div>
  );
}
