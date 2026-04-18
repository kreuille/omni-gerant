'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface ExistingClient {
  id: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  siret: string | null;
  city: string | null;
  zip_code: string | null;
  type: string;
}

interface CompanySearchResult {
  siren: string;
  siret: string;
  company_name: string;
  legal_form: string;
  naf_code: string;
  naf_label: string;
  address: {
    line1: string;
    zip_code: string;
    city: string;
    country: string;
  };
  is_active: boolean;
  employee_count: number | null;
  creation_date: string | null;
}

interface QuoteClientSelectProps {
  value: string;
  onChange: (clientId: string) => void;
}

function getClientName(c: ExistingClient): string {
  if (c.company_name) return c.company_name;
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Sans nom';
}

export function QuoteClientSelect({ value, onChange }: QuoteClientSelectProps) {
  const [search, setSearch] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ExistingClient[]>([]);
  const [companyResults, setCompanyResults] = useState<CompanySearchResult[]>([]);
  const [creatingClient, setCreatingClient] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address_line1: '',
    zip_code: '',
    city: '',
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchClients = useCallback(async (term: string) => {
    if (term.length < 2) {
      setClients([]);
      setCompanyResults([]);
      return;
    }
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

      const [existingRes, publicRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/clients?search=${encodeURIComponent(term)}&limit=5`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
        fetch(`${API_URL}/api/clients/company-search?q=${encodeURIComponent(term)}&limit=5`),
      ]);

      if (existingRes.status === 'fulfilled' && existingRes.value.ok) {
        const data = await existingRes.value.json();
        setClients(data.items ?? []);
      } else {
        setClients([]);
      }

      if (publicRes.status === 'fulfilled' && publicRes.value.ok) {
        const data = await publicRes.value.json();
        setCompanyResults(data.results ?? []);
      } else {
        setCompanyResults([]);
      }
    } catch {
      setClients([]);
      setCompanyResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchChange = useCallback((term: string) => {
    setSearch(term);
    setShowDropdown(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchClients(term), 300);
  }, [fetchClients]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelectExisting(client: ExistingClient) {
    const name = getClientName(client);
    setSelectedName(name);
    setSearch(name);
    setShowDropdown(false);
    setCompanyResults([]);
    onChange(client.id);
  }

  async function handleSelectCompany(company: CompanySearchResult) {
    setCreatingClient(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch(`${API_URL}/api/clients/from-siret`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ siret: company.siret }),
      });

      if (res.ok) {
        const data = await res.json();
        const client = data.client;
        const name = client.company_name ?? company.company_name;
        setSelectedName(name);
        setSearch(name);
        setShowDropdown(false);
        setCompanyResults([]);
        onChange(client.id);
      } else {
        const errData = await res.json().catch(() => null);
        if (errData?.client) {
          handleSelectExisting(errData.client);
        }
      }
    } catch {
      // silently fail
    } finally {
      setCreatingClient(false);
    }
  }

  async function handleCreateIndividualClient() {
    if (!newClientForm.last_name.trim()) return;
    setCreatingClient(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch(`${API_URL}/api/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: 'individual',
          first_name: newClientForm.first_name.trim() || undefined,
          last_name: newClientForm.last_name.trim(),
          email: newClientForm.email.trim() || undefined,
          phone: newClientForm.phone.trim() || undefined,
          address_line1: newClientForm.address_line1.trim() || undefined,
          zip_code: newClientForm.zip_code.trim() || undefined,
          city: newClientForm.city.trim() || undefined,
          country: 'FR',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const client = data.client ?? data;
        const name = [client.first_name, client.last_name].filter(Boolean).join(' ');
        setSelectedName(name);
        setSearch(name);
        setShowNewClientForm(false);
        setNewClientForm({ first_name: '', last_name: '', email: '', phone: '', address_line1: '', zip_code: '', city: '' });
        onChange(client.id);
      }
    } catch {
      // silently fail
    } finally {
      setCreatingClient(false);
    }
  }

  function handleClear() {
    setSearch('');
    setSelectedName('');
    setClients([]);
    setCompanyResults([]);
    onChange('');
  }

  const hasResults = clients.length > 0 || companyResults.length > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
      <div className="relative">
        <Input
          placeholder="Rechercher un client ou une entreprise..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => { if (search.length >= 2) setShowDropdown(true); }}
        />
        {value && selectedName && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
            onClick={handleClear}
          >
            &times;
          </button>
        )}
      </div>

      {showDropdown && search.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500">Recherche en cours...</div>
          )}

          {!loading && clients.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase bg-gray-50">
                Clients existants
              </div>
              {clients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-primary-50 border-b border-gray-100 transition-colors"
                  onClick={() => handleSelectExisting(client)}
                >
                  <div className="font-medium text-sm">{getClientName(client)}</div>
                  <div className="text-xs text-gray-500">
                    {client.email && <span className="mr-2">{client.email}</span>}
                    {client.city && <span>{client.zip_code} {client.city}</span>}
                  </div>
                </button>
              ))}
            </>
          )}

          {!loading && companyResults.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase bg-gray-50">
                Entreprises trouvees
              </div>
              {companyResults.map((company) => (
                <button
                  key={company.siret}
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 transition-colors"
                  onClick={() => handleSelectCompany(company)}
                  disabled={creatingClient}
                >
                  <div className="font-medium text-sm">{company.company_name}</div>
                  <div className="text-xs text-gray-500">
                    <span className="mr-2">SIRET: {company.siret}</span>
                    {company.naf_code && <span className="mr-2">{company.naf_code}</span>}
                    <span>{company.address.zip_code} {company.address.city}</span>
                  </div>
                </button>
              ))}
            </>
          )}

          {!loading && !hasResults && (
            <div className="px-4 py-3 text-sm text-gray-500">
              Aucun resultat trouve
            </div>
          )}

          <div className="px-3 py-2 border-t border-gray-200">
            <button
              type="button"
              className="w-full text-left text-sm text-primary-600 hover:text-primary-800 py-1"
              onClick={() => { setShowNewClientForm(true); setShowDropdown(false); }}
            >
              + Creer un nouveau client particulier
            </button>
          </div>
        </div>
      )}

      {showNewClientForm && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 space-y-3 mt-2">
          <h4 className="text-sm font-medium text-green-800">Nouveau client particulier</h4>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Prenom"
              value={newClientForm.first_name}
              onChange={(e) => setNewClientForm((p) => ({ ...p, first_name: e.target.value }))}
            />
            <Input
              placeholder="Nom *"
              value={newClientForm.last_name}
              onChange={(e) => setNewClientForm((p) => ({ ...p, last_name: e.target.value }))}
            />
            <Input
              placeholder="Email"
              value={newClientForm.email}
              onChange={(e) => setNewClientForm((p) => ({ ...p, email: e.target.value }))}
              className="col-span-2"
            />
            <Input
              placeholder="Telephone"
              value={newClientForm.phone}
              onChange={(e) => setNewClientForm((p) => ({ ...p, phone: e.target.value }))}
              className="col-span-2"
            />
            <Input
              placeholder="Adresse"
              value={newClientForm.address_line1}
              onChange={(e) => setNewClientForm((p) => ({ ...p, address_line1: e.target.value }))}
              className="col-span-2"
            />
            <Input
              placeholder="Code postal"
              value={newClientForm.zip_code}
              onChange={(e) => setNewClientForm((p) => ({ ...p, zip_code: e.target.value }))}
            />
            <Input
              placeholder="Ville"
              value={newClientForm.city}
              onChange={(e) => setNewClientForm((p) => ({ ...p, city: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleCreateIndividualClient}
              disabled={!newClientForm.last_name.trim() || creatingClient}
            >
              {creatingClient ? 'Creation...' : 'Creer'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowNewClientForm(false)}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
