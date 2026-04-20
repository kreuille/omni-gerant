'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';

// BUSINESS RULE [CDC-2.3]: Flow de connexion bancaire Open Banking

const POPULAR_BANKS = [
  { id: 'qonto', name: 'Qonto', logo: 'Qonto', category: 'fintech' },
  { id: 'revolut', name: 'Revolut Business', logo: 'Rv', category: 'fintech' },
  { id: 'n26', name: 'N26 Business', logo: 'N26', category: 'fintech' },
  { id: 'shine', name: 'Shine', logo: 'Sh', category: 'fintech' },
  { id: 'credit-agricole', name: 'Credit Agricole', logo: 'CA', category: 'traditional' },
  { id: 'bnp-paribas', name: 'BNP Paribas', logo: 'BNP', category: 'traditional' },
  { id: 'societe-generale', name: 'Societe Generale', logo: 'SG', category: 'traditional' },
  { id: 'credit-mutuel', name: 'Credit Mutuel', logo: 'CM', category: 'traditional' },
  { id: 'la-banque-postale', name: 'La Banque Postale', logo: 'LBP', category: 'traditional' },
  { id: 'caisse-epargne', name: 'Caisse d\'Epargne', logo: 'CE', category: 'traditional' },
  { id: 'lcl', name: 'LCL', logo: 'LCL', category: 'traditional' },
  { id: 'hsbc', name: 'HSBC', logo: 'HSBC', category: 'traditional' },
];

type Step = 'select' | 'connecting' | 'success' | 'error';

export default function ConnectBankPage() {
  const [step, setStep] = useState<Step>('select');
  const [_selectedBank, setSelectedBank] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConnect = async (bankId: string) => {
    setSelectedBank(bankId);
    setStep('connecting');
    setErrorMessage(null);

    const callbackUrl = `${window.location.origin}/bank/connect/callback`;
    const result = await api.post<{ redirect_url: string }>('/api/bank/connect', {
      callback_url: callbackUrl,
    });

    if (!result.ok) {
      // Bridge API not configured ? Affiche un message detaille avec alternative
      const msg = result.error.message ?? '';
      const isBridgeConfig = msg.includes('Bridge') || msg.includes('CLIENT_ID') || msg.includes('credentials');
      setErrorMessage(isBridgeConfig
        ? 'Connexion Open Banking non activee (compte Bridge API requis). Utilisez l\'import CSV depuis /bank/import en attendant.'
        : (msg || 'Impossible de se connecter a la banque.'));
      setStep('error');
      return;
    }

    // If the API returns a redirect URL, navigate to it
    if (result.value.redirect_url) {
      window.location.href = result.value.redirect_url;
    } else {
      // Fallback: call callback to import accounts directly
      const callbackResult = await api.post('/api/bank/callback', {});
      if (callbackResult.ok) {
        setStep('success');
      } else {
        setErrorMessage('Erreur lors de l\'import des comptes.');
        setStep('error');
      }
    }
  };

  if (step === 'connecting') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Connexion en cours...</h2>
            <p className="text-sm text-gray-500">
              Vous allez etre redirige vers votre banque pour autoriser l&apos;acces.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">!</span>
            </div>
            <h2 className="text-lg font-semibold mb-2">Erreur de connexion</h2>
            <p className="text-sm text-gray-500 mb-6">
              {errorMessage ?? 'La connexion bancaire n\'a pas pu aboutir. Veuillez reessayer.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setStep('select')}>Reessayer</Button>
              <a href="/bank">
                <Button variant="outline">Retour</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-2xl">&#10003;</span>
            </div>
            <h2 className="text-lg font-semibold mb-2">Compte connecte !</h2>
            <p className="text-sm text-gray-500 mb-6">
              Vos transactions seront synchronisees automatiquement chaque jour.
            </p>
            <a href="/bank">
              <Button>Voir mes comptes</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Connecter une banque</h1>
        <p className="text-sm text-gray-500 mt-1">
          Selectionnez votre banque pour synchroniser automatiquement vos transactions.
          Connexion securisee via Open Banking (DSP2).
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <span className="text-blue-500 text-lg flex-shrink-0">&#128274;</span>
            <div>
              <p className="font-medium text-gray-900">Securite garantie</p>
              <p className="mt-1">
                La connexion utilise le protocole Open Banking DSP2. Nous n&apos;avons jamais acces
                a vos identifiants bancaires. Seule la lecture de vos transactions est autorisee.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Banques populaires</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {POPULAR_BANKS.map((bank) => (
          <Card
            key={bank.id}
            className="cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => handleConnect(bank.id)}
          >
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                <span className="text-sm font-bold text-gray-600">{bank.logo}</span>
              </div>
              <p className="text-sm font-medium text-gray-900">{bank.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-center text-sm text-gray-400 mt-6">
        Plus de 300 banques disponibles via Bridge API
      </p>
    </div>
  );
}
