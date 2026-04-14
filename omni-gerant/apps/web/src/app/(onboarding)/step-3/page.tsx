'use client';

import { StepIndicator } from '@/components/onboarding/step-indicator';
import { BankConnectPrompt } from '@/components/onboarding/bank-connect-prompt';

// BUSINESS RULE [CDC-4]: Etape 3 - Connexion bancaire (optionnel, skip possible)

const STEPS = ['Entreprise', 'Personnalisation', 'Banque', 'Premier devis'];

export default function Step3Page() {
  const handleConnect = () => {
    // TODO: Redirect to Bridge connect widget
    alert('Redirection vers la connexion bancaire...');
    window.location.href = '/step-4';
  };

  const handleSkip = () => {
    window.location.href = '/step-4';
  };

  return (
    <div>
      <StepIndicator currentStep={3} totalSteps={4} labels={STEPS} />

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Connectez votre banque</h2>
        <p className="text-sm text-gray-500 mt-1">
          Cette etape est optionnelle. Vous pourrez toujours le faire plus tard.
        </p>
      </div>

      <BankConnectPrompt onConnect={handleConnect} onSkip={handleSkip} />
    </div>
  );
}
