'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';

// BUSINESS RULE [CDC-4]: Recherche client avec autocompletion entreprises

interface ExistingClient {
  id: string;
  type: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  siret: string | null;
  city: string | null;
  country: string;
}

interface CompanySearchResult {
  siren: string;
  siret: string;
  company_name: string;
  naf_code: string;
  address: { line1: string; zip_code: string; city: string; country: string };
  is_active: boolean;
}

interface ClientMetadata {
  name: string;
  country?: string;
  is_professional?: boolean;
}

interface QuoteClientSelectProps {
  value: string;
  onChange: (clientId: string, metadata?: ClientMetadata) => void;
}

function getDisplayName(client: ExistingClient): string {
  if (client.type === 'company' && client.company_name) return client.company_name;
  return [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Sans nom';
}

export function QuoteClientSelect({ value, onChange }: QuoteClientSelectProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [existingClients, setExistingClients] = useState<ExistingClient[]>([]);
  const [companyResults, setCompanyResults] = useState<CompanySearchResult[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [creatingFromSiret, setCreatingFromSiret] = useState<string | null>(null);
  const [showIndividualForm, setShowIndividualForm] = useState(false);
  const [individualFirstName, setIndividualFirstName] = useState('');
  const [individualLastName, setIndividualLastName] = useState('');
  const [creatingIndividual, setCreatingIndividual] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  const doSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.trim().length < 2) {
      setExistingClients([]);
      setCompanyResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      // Search existing clients
      setLoadingExisting(true);
      api.get<{ items: ExistingClient[]; total: number }>(`/api/clients?search=${encodeURIComponent(q)}&limit=5`)
        .then((result) => {
          if (result.ok) setExistingClients(result.value.items);
        })
        .finally(() => setLoadingExisting(false));

      // Search public company API
      setLoadingCompanies(true);
      api.get<{ results: CompanySearchResult[]; total: number }>(`/api/clients/company-search?q=${encodeURIComponent(q)}&per_page=5`)
        .then((result) => {
          if (result.ok) setCompanyResults(result.value.results);
        })
        .finally(() => setLoadingCompanies(false));
    }, 300);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearch(q);
    setOpen(true);
    setShowIndividualForm(false);
    doSearch(q);
  };

  const handleSelectExisting = (client: ExistingClient) => {
    const name = getDisplayName(client);
    setSelectedName(name);
    setSearch(name);
    setOpen(false);
    onChange(client.id, {
      name,
      country: client.country,
      is_professional: client.type === 'company',
    });
  };

  const handleSelectCompany = async (company: CompanySearchResult) => {
    setCreatingFromSiret(company.siret);
    const result = await api.post<ExistingClient>('/api/clients/from-siret', {
      siret: company.siret,
    });
    setCreatingFromSiret(null);

    if (result.ok) {
      const client = result.value;
      const name = client.company_name || company.company_name;
      setSelectedName(name);
      setSearch(name);
      setOpen(false);
      onChange(client.id, {
        name,
        country: client.country || 'FR',
        is_professional: true,
      });
    }
  };

  const handleCreateIndividual = async () => {
    if (!individualFirstName.trim() || !individualLastName.trim()) return;
    setCreatingIndividual(true);

    const result = await api.post<ExistingClient>('/api/clients', {
      type: 'individual',
      first_name: individualFirstName.trim(),
      last_name: individualLastName.trim(),
      payment_terms: 30,
    });
    setCreatingIndividual(false);

    if (result.ok) {
      const client = result.value;
      const name = `${individualFirstName.trim()} ${individualLastName.trim()}`;
      setSelectedName(name);
      setSearch(name);
      setOpen(false);
      setShowIndividualForm(false);
      onChange(client.id, {
        name,
        country: client.country || 'FR',
        is_professional: false,
      });
    }
  };

  // Clear selection
  const handleClear = () => {
    setSearch('');
    setSelectedName('');
    onChange('');
  };

  const isLoading = loadingExisting || loadingCompanies;
  const hasResults = existingClients.length > 0 || companyResults.length > 0;
  const showDropdown = open && search.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>

      <div className="relative">
        <Input
          placeholder="Rechercher un client ou une entreprise..."
          value={search}
          onChange={handleSearchChange}
          onFocus={() => { if (search.trim().length >= 2) setOpen(true); }}
          className={selectedName ? 'pr-8' : ''}
        />
        {selectedName && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
            aria-label="Effacer la selection"
          >
            x
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {isLoading && !hasResults && (
            <div className="px-4 py-3 text-sm text-gray-500">Recherche en cours...</div>
          )}

          {/* Existing clients section */}
          {existingClients.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b">
                Clients existants
              </div>
              {existingClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleSelectExisting(client)}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="text-sm font-medium text-gray-900">{getDisplayName(client)}</div>
                  <div className="text-xs text-gray-500">
                    {client.siret && <span>SIRET {client.siret}</span>}
                    {client.city && <span>{client.siret ? ' - ' : ''}{client.city}</span>}
                    {!client.siret && !client.city && <span>{client.type === 'company' ? 'Entreprise' : 'Particulier'}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Company search results section */}
          {companyResults.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-t">
                Entreprises trouvees
              </div>
              {companyResults.map((company) => (
                <button
                  key={company.siret}
                  type="button"
                  onClick={() => handleSelectCompany(company)}
                  disabled={creatingFromSiret === company.siret}
                  className="w-full text-left px-4 py-2.5 hover:bg-green-50 transition-colors border-b border-gray-100 last:border-b-0 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">{company.company_name}</div>
                    {creatingFromSiret === company.siret && (
                      <span className="text-xs text-gray-400">Ajout...</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    SIRET {company.siret}
                    {company.address.city && ` - ${company.address.city}`}
                    {company.naf_code && ` (${company.naf_code})`}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {!isLoading && !hasResults && search.trim().length >= 2 && (
            <div className="px-4 py-3 text-sm text-gray-500">Aucun resultat</div>
          )}

          {/* Create individual client */}
          <div className="border-t border-gray-200">
            {!showIndividualForm ? (
              <button
                type="button"
                onClick={() => setShowIndividualForm(true)}
                className="w-full text-left px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                + Creer un nouveau client particulier
              </button>
            ) : (
              <div className="px-4 py-3 space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Nouveau particulier</div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Prenom"
                    value={individualFirstName}
                    onChange={(e) => setIndividualFirstName(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Nom"
                    value={individualLastName}
                    onChange={(e) => setIndividualLastName(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowIndividualForm(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateIndividual}
                    disabled={creatingIndividual || !individualFirstName.trim() || !individualLastName.trim()}
                  >
                    {creatingIndividual ? 'Creation...' : 'Creer'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
