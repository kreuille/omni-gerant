'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RgpdExport } from '@/components/legal/rgpd-export';

// BUSINESS RULE [CDC-2.4]: Page registre RGPD

export default function RgpdPage() {
  const [registryExists, setRegistryExists] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [siret, setSiret] = useState('');
  const [dpoName, setDpoName] = useState('');
  const [dpoEmail, setDpoEmail] = useState('');
  const [treatmentCount, setTreatmentCount] = useState(0);

  const handleCreateRegistry = () => {
    // TODO: Call API POST /api/legal/rgpd
    setRegistryExists(true);
    setCompanyName(companyName || 'Mon Entreprise');
    setTreatmentCount(5); // pre-filled
    alert('Registre RGPD cree avec 5 traitements pre-remplis');
  };

  const handleExport = () => {
    // TODO: Call API GET /api/legal/rgpd/export
    alert('Export CNIL telecharge');
  };

  if (!registryExists) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Registre RGPD</h1>
          <p className="text-sm text-gray-500 mt-1">
            Registre des traitements de donnees personnelles conforme au RGPD.
          </p>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto max-w-md">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Creer votre registre RGPD
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Le registre sera pre-rempli avec 5 traitements types pour une TPE :
                gestion clients, facturation, fournisseurs, personnel et prospection.
              </p>

              <div className="space-y-3 mb-6 text-left">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'entreprise *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Mon Entreprise SARL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                  <input
                    type="text"
                    value={siret}
                    onChange={(e) => setSiret(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="123 456 789 01234"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      DPO / Referent
                    </label>
                    <input
                      type="text"
                      value={dpoName}
                      onChange={(e) => setDpoName(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email DPO
                    </label>
                    <input
                      type="email"
                      value={dpoEmail}
                      onChange={(e) => setDpoEmail(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleCreateRegistry}>
                Creer le registre (avec pre-remplissage)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Registre RGPD</h1>
          <p className="text-sm text-gray-500 mt-1">
            {companyName} — {treatmentCount} traitement{treatmentCount > 1 ? 's' : ''} enregistre{treatmentCount > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/legal/rgpd/treatments">
            <Button>Gerer les traitements</Button>
          </a>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{treatmentCount}</p>
            <p className="text-sm text-gray-500">Traitements</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{dpoName ? '1' : '0'}</p>
            <p className="text-sm text-gray-500">DPO designe</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">0</p>
            <p className="text-sm text-gray-500">Transferts hors UE</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">4</p>
            <p className="text-sm text-gray-500">Bases legales</p>
          </CardContent>
        </Card>
      </div>

      {/* Informations generales */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Informations generales</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Responsable de traitement : </span>
              <span className="font-medium">{companyName}</span>
            </div>
            <div>
              <span className="text-gray-500">SIRET : </span>
              <span className="font-medium">{siret || 'Non renseigne'}</span>
            </div>
            <div>
              <span className="text-gray-500">DPO / Referent : </span>
              <span className="font-medium">{dpoName || 'Non designe'}</span>
            </div>
            <div>
              <span className="text-gray-500">Email DPO : </span>
              <span className="font-medium">{dpoEmail || 'Non renseigne'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export */}
      <RgpdExport
        companyName={companyName}
        treatmentCount={treatmentCount}
        onExport={handleExport}
      />
    </div>
  );
}
