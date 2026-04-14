'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StepIndicator } from '@/components/onboarding/step-indicator';
import { SiretAutocomplete } from '@/components/onboarding/siret-autocomplete';

// BUSINESS RULE [CDC-4]: Etape 1 - Votre entreprise
// BUSINESS RULE [CDC-4]: Recuperation automatique identite via SIRET

const STEPS = ['Entreprise', 'Personnalisation', 'Banque', 'Premier devis'];

export default function Step1Page() {
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [nafCode, setNafCode] = useState('');
  const [legalForm, setLegalForm] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');

  const handleCompanyFound = (info: {
    name: string;
    address: string;
    naf_code: string;
    legal_form: string;
  }) => {
    setCompanyName(info.name);
    setAddress(info.address);
    setNafCode(info.naf_code);
    setLegalForm(info.legal_form);
  };

  return (
    <div>
      <StepIndicator currentStep={1} totalSteps={4} labels={STEPS} />

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Votre entreprise</h2>
        <p className="text-sm text-gray-500 mt-1">
          Saisissez votre SIRET pour pre-remplir automatiquement vos informations.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <SiretAutocomplete onCompanyFound={handleCompanyFound} />

          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'entreprise *
                </label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code NAF</label>
                <Input value={nafCode} onChange={(e) => setNafCode(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forme juridique</label>
                <Input value={legalForm} onChange={(e) => setLegalForm(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Coordonnees</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@entreprise.fr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01 23 45 67 89" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://www.mon-entreprise.fr" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <a href="/step-2">
              <Button disabled={!companyName}>Suivant</Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
