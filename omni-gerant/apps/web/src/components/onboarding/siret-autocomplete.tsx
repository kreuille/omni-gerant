'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// BUSINESS RULE [CDC-4]: Recuperation automatique identite entreprise via SIRET

interface CompanyInfo {
  name: string;
  address: string;
  naf_code: string;
  legal_form: string;
  tva_number: string;
}

interface SiretAutocompleteProps {
  onCompanyFound: (info: CompanyInfo) => void;
}

export function SiretAutocomplete({ onCompanyFound }: SiretAutocompleteProps) {
  const [siret, setSiret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async () => {
    if (siret.replace(/\s/g, '').length !== 14) {
      setError('Le SIRET doit contenir 14 chiffres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: Call API GET /api/tenant/siret/:siret
      // Simulate response for now
      await new Promise((r) => setTimeout(r, 500));

      const siren = siret.replace(/\s/g, '').substring(0, 9);
      onCompanyFound({
        name: 'Mon Entreprise SARL',
        address: '12 rue du Commerce, 75001 Paris',
        naf_code: '43.21A',
        legal_form: 'SARL',
        tva_number: `FR${siren.substring(0, 2)}${siren}`,
      });
    } catch {
      setError('Impossible de recuperer les informations. Verifiez le SIRET.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Numero SIRET
      </label>
      <div className="flex gap-2">
        <Input
          value={siret}
          onChange={(e) => setSiret(e.target.value)}
          placeholder="123 456 789 01234"
          maxLength={17}
        />
        <Button onClick={handleLookup} disabled={loading} variant="outline">
          {loading ? 'Recherche...' : 'Rechercher'}
        </Button>
      </div>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      <p className="text-xs text-gray-400 mt-1">
        Les informations de votre entreprise seront recuperees automatiquement
      </p>
    </div>
  );
}
