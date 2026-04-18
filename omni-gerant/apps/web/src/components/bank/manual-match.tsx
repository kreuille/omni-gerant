'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// BUSINESS RULE [CDC-2.3]: Rapprochement manuel

interface Document {
  id: string;
  type: 'invoice' | 'purchase';
  number: string;
  amount_cents: number;
  entity_name: string;
}

interface ManualMatchProps {
  transactionId: string;
  transactionLabel: string;
  transactionAmount: number;
  documents: Document[];
  onMatch: (transactionId: string, documentId: string, documentType: string) => void;
  onClose: () => void;
}

function formatAmount(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function ManualMatch({
  transactionId,
  transactionLabel,
  transactionAmount,
  documents,
  onMatch,
  onClose,
}: ManualMatchProps) {
  const [search, setSearch] = useState('');

  const filtered = documents.filter((doc) => {
    const term = search.toLowerCase();
    return (
      doc.number.toLowerCase().includes(term) ||
      doc.entity_name.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full mx-4 max-w-[calc(100vw-2rem)] sm:max-w-lg shadow-xl max-h-[80vh] flex flex-col">
        <h2 className="text-lg font-semibold mb-2">Rapprochement manuel</h2>
        <p className="text-sm text-gray-500 mb-4">
          Transaction: <span className="font-medium">{transactionLabel}</span>
          {' — '}
          <span className={transactionAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
            {formatAmount(transactionAmount)}
          </span>
        </p>

        <Input
          placeholder="Rechercher par numero ou nom..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
        />

        <div className="flex-1 overflow-y-auto space-y-2">
          {filtered.map((doc) => (
            <Card
              key={doc.id}
              className="cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => onMatch(transactionId, doc.id, doc.type)}
            >
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{doc.number}</span>
                  <span className="text-sm text-gray-500 ml-2">{doc.entity_name}</span>
                </div>
                <span className="text-sm font-semibold">{formatAmount(doc.amount_cents)}</span>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-4">Aucun document trouve</p>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}
