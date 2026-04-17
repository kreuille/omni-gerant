'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

// BUSINESS RULE [CDC-2.2]: Selection fournisseur pour facture d'achat

interface Supplier {
  id: string;
  name: string;
}

interface SupplierListResponse {
  items: Supplier[];
  next_cursor: string | null;
  has_more: boolean;
}

interface SupplierSelectProps {
  value: string | null;
  onChange: (id: string | null) => void;
}

export function SupplierSelect({ value, onChange }: SupplierSelectProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await api.get<SupplierListResponse>('/api/suppliers?limit=100&sort_by=name&sort_dir=asc');
      if (!cancelled && result.ok) {
        setSuppliers(result.value.items);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      disabled={loading}
    >
      <option value="">
        {loading ? 'Chargement...' : 'Selectionner un fournisseur...'}
      </option>
      {suppliers.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
