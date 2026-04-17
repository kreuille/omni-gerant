'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';

// BUSINESS RULE [CDC-4]: Recuperation automatique identite entreprise via SIRET

interface CompanyInfo {
  name: string;
  address: string;
  naf_code: string;
  legal_form: string;
  tva_number: string;
}

interface SiretLookupResponse {
  company_name: string;
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
    const cleaned = siret.replace(/\s/g, '');
    if (cleaned.length !== 14) {
      setError('Le SIRET doit contenir 14 chiffres');
      return;
    }

    setLoading(true);
    setError('');

    const result = await api.post<SiretLookupResponse>('/api/tenant/profile/lookup-siret', {
      siret: cleaned,
    });

    if (result.ok) {
      onCompanyFound({
        name: result.value.company_name,
        address: result.value.address,
        naf_code: result.value.naf_code,
        legal_form: result.value.legal_form,
        tva_number: result.value.tva_number,
      });
    } else {
      const code = result.error.code;
      if (code === 'NOT_FOUND') {
        setError('SIRET non trouve. Verifiez le numero et reessayez.');
      } else if (code === 'SERVICE_UNAVAILABLE') {
        setError('Service de recherche temporairement indisponible. Reessayez plus tard.');
      } else {
        setError(result.error.message ?? 'Impossible de recuperer les informations.');
      }
    }

    setLoading(false);
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
