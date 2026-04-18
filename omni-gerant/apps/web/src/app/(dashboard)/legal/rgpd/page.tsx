'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RgpdExport } from '@/components/legal/rgpd-export';
import { api } from '@/lib/api-client';

// BUSINESS RULE [CDC-2.4]: Page registre RGPD

interface RgpdTreatment {
  id: string;
  name: string;
  legal_basis: string;
  transfer_outside_eu: boolean;
}

interface RgpdRegistry {
  id: string;
  company_name: string;
  siret: string;
  dpo_name: string;
  dpo_email: string;
  treatments: RgpdTreatment[];
  created_at: string;
}

export default function RgpdPage() {
  const [registry, setRegistry] = useState<RgpdRegistry | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [siret, setSiret] = useState('');
  const [dpoName, setDpoName] = useState('');
  const [dpoEmail, setDpoEmail] = useState('');
  const [creating, setCreating] = useState(false);

  const loadRegistry = useCallback(async () => {
    const result = await api.get<RgpdRegistry>('/api/legal/rgpd');
    if (result.ok) {
      setRegistry(result.value);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRegistry();
  }, [loadRegistry]);

  const handleCreateRegistry = async () => {
    setCreating(true);
    const result = await api.post<RgpdRegistry>('/api/legal/rgpd', {
      company_name: companyName || 'Mon Entreprise',
      siret,
      dpo_name: dpoName,
      dpo_email: dpoEmail,
    });
    if (result.ok) {
      setRegistry(result.value);
    } else {
      alert(result.error.message ?? 'Erreur lors de la creation du registre');
    }
    setCreating(false);
  };

  const handleExport = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
    const res = await fetch(`${baseUrl}/api/legal/rgpd/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'registre-rgpd.tsv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert('Erreur lors de l\'export');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Registre RGPD</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-gray-400">
            Chargement...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!registry) {
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
                    Nom de l&apos;entreprise *
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

              <Button onClick={handleCreateRegistry} disabled={creating}>
                {creating ? 'Creation...' : 'Creer le registre (avec pre-remplissage)'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const treatmentCount = registry.treatments.length;
  const transfersOutsideEu = registry.treatments.filter((t) => t.transfer_outside_eu).length;
  const uniqueLegalBases = new Set(registry.treatments.map((t) => t.legal_basis)).size;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Registre RGPD</h1>
          <p className="text-sm text-gray-500 mt-1">
            {registry.company_name} — {treatmentCount} traitement{treatmentCount > 1 ? 's' : ''} enregistre{treatmentCount > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/legal/rgpd/treatments">
            <Button>Gerer les traitements</Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{treatmentCount}</p>
            <p className="text-sm text-gray-500">Traitements</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{registry.dpo_name ? '1' : '0'}</p>
            <p className="text-sm text-gray-500">DPO designe</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{transfersOutsideEu}</p>
            <p className="text-sm text-gray-500">Transferts hors UE</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{uniqueLegalBases}</p>
            <p className="text-sm text-gray-500">Bases legales</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Informations generales</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Responsable de traitement : </span>
              <span className="font-medium">{registry.company_name}</span>
            </div>
            <div>
              <span className="text-gray-500">SIRET : </span>
              <span className="font-medium">{registry.siret || 'Non renseigne'}</span>
            </div>
            <div>
              <span className="text-gray-500">DPO / Referent : </span>
              <span className="font-medium">{registry.dpo_name || 'Non designe'}</span>
            </div>
            <div>
              <span className="text-gray-500">Email DPO : </span>
              <span className="font-medium">{registry.dpo_email || 'Non renseigne'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <RgpdExport
        companyName={registry.company_name}
        treatmentCount={treatmentCount}
        onExport={handleExport}
      />
    </div>
  );
}
