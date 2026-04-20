'use client';

import { StepIndicator } from '@/components/onboarding/step-indicator';
import { QuickQuote } from '@/components/onboarding/quick-quote';

// BUSINESS RULE [CDC-4]: Etape 4 - Votre premier devis

const STEPS = ['Entreprise', 'Personnalisation', 'Banque', 'Premier devis'];

export default function Step4Page() {
  const handleComplete = () => {
    // TODO: Call API to create client + quote
    window.location.href = '/complete';
  };

  return (
    <div>
      <StepIndicator currentStep={4} totalSteps={4} labels={STEPS} />

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Votre premier devis</h2>
        <p className="text-sm text-gray-500 mt-1">
          Créez votre premier client et devis pour decouvrir la puissance de l'outil.
        </p>
      </div>

      <QuickQuote onComplete={handleComplete} />
    </div>
  );
}
