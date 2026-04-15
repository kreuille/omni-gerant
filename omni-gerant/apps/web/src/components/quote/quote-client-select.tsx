'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';

// Placeholder client select - will be connected to API

interface Client {
  id: string;
  name: string;
}

interface QuoteClientSelectProps {
  value: string;
  onChange: (clientId: string) => void;
}

export function QuoteClientSelect({ value: _value, onChange: _onChange }: QuoteClientSelectProps) {
  const [search, setSearch] = useState('');

  // Placeholder - will fetch from API
  const clients: Client[] = [];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
      <Input
        placeholder="Rechercher un client..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {clients.length === 0 && search && (
        <p className="text-sm text-gray-500 mt-1">Aucun client trouve</p>
      )}
    </div>
  );
}
