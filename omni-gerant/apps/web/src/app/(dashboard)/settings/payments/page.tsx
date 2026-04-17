'use client';

import { StripeConnectButton } from '@/components/payment/stripe-connect-button';
import { GoCardlessMandate } from '@/components/payment/gocardless-mandate';

// BUSINESS RULE [CDC-3.2]: Page configuration paiements

// Demo data
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export default function PaymentsSettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Moyens de paiement</h1>
        <p className="mt-1 text-gray-500">
          Configurez les modes de paiement que vos clients peuvent utiliser.
        </p>
      </div>

      {/* Stripe Section */}
      <section className="rounded-xl border bg-white p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50">
            <svg className="h-6 w-6 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Stripe</h2>
            <p className="text-sm text-gray-500">Paiements par carte bancaire (Visa, Mastercard, etc.)</p>
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Fonctionnalites</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Liens de paiement securises
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Confirmation automatique via webhook
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Stripe Connect (paiements sur votre compte)
            </li>
          </ul>
        </div>

        <StripeConnectButton tenantId={DEMO_TENANT_ID} />
      </section>

      {/* GoCardless Section */}
      <section className="rounded-xl border bg-white p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold">GoCardless</h2>
            <p className="text-sm text-gray-500">Prelevements SEPA automatiques</p>
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Fonctionnalites</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Mandats SEPA en ligne
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Prelevements automatiques recurrents
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Couts reduits vs carte bancaire
            </li>
          </ul>
        </div>

        <GoCardlessMandate clientId="demo-client" />
      </section>

      {/* Virement Section */}
      <section className="rounded-xl border bg-white p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50">
            <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Virement bancaire</h2>
            <p className="text-sm text-gray-500">Coordonnees bancaires sur vos factures</p>
          </div>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-800">
            Les coordonnees bancaires (IBAN) sont automatiquement incluses sur vos factures
            a partir de vos parametres de compte.
          </p>
        </div>
      </section>
    </div>
  );
}
