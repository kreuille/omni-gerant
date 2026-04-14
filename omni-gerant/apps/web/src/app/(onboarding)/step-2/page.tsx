'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StepIndicator } from '@/components/onboarding/step-indicator';
import { LogoUpload } from '@/components/onboarding/logo-upload';

// BUSINESS RULE [CDC-4]: Etape 2 - Personnalisation

const STEPS = ['Entreprise', 'Personnalisation', 'Banque', 'Premier devis'];

const COLORS = [
  { value: '#2563eb', label: 'Bleu' },
  { value: '#16a34a', label: 'Vert' },
  { value: '#dc2626', label: 'Rouge' },
  { value: '#9333ea', label: 'Violet' },
  { value: '#ea580c', label: 'Orange' },
  { value: '#0d9488', label: 'Teal' },
];

export default function Step2Page() {
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [tvaNumber, setTvaNumber] = useState('');
  const [_logo, setLogo] = useState<File | null>(null);

  return (
    <div>
      <StepIndicator currentStep={2} totalSteps={4} labels={STEPS} />

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Personnalisez</h2>
        <p className="text-sm text-gray-500 mt-1">
          Ajoutez votre logo et choisissez vos couleurs pour vos documents.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <LogoUpload onLogoChange={setLogo} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Couleur principale
            </label>
            <div className="flex gap-3">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setPrimaryColor(c.value)}
                  className={`w-10 h-10 rounded-full border-2 ${
                    primaryColor === c.value ? 'border-gray-900 ring-2 ring-offset-2' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numero de TVA intra-communautaire
            </label>
            <Input
              value={tvaNumber}
              onChange={(e) => setTvaNumber(e.target.value)}
              placeholder="FR12 345678901"
            />
            <p className="text-xs text-gray-400 mt-1">
              Obligatoire pour les echanges intra-UE
            </p>
          </div>

          <div className="flex justify-between pt-2">
            <a href="/step-1">
              <Button variant="outline">Retour</Button>
            </a>
            <a href="/step-3">
              <Button>Suivant</Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
