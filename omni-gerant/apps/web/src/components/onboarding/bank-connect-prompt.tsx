'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// BUSINESS RULE [CDC-4]: CTA connexion bancaire (optionnel, skip possible)

interface BankConnectPromptProps {
  onConnect: () => void;
  onSkip: () => void;
}

export function BankConnectPrompt({ onConnect, onSkip }: BankConnectPromptProps) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <div className="mx-auto max-w-md">
          <div className="text-4xl mb-4">B</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Connectez votre banque
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            En connectant votre compte bancaire, vous activez le rapprochement automatique
            des factures et le suivi de tresorerie en temps reel.
          </p>

          <div className="space-y-3">
            <Button onClick={onConnect} className="w-full">
              Connecter ma banque
            </Button>
            <button
              onClick={onSkip}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Vous pourrez le faire plus tard
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
