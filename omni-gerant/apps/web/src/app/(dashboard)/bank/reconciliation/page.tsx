'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MatchSuggestion } from '@/components/bank/match-suggestion';
import { UnmatchedList } from '@/components/bank/unmatched-list';

// BUSINESS RULE [CDC-2.3]: Interface de rapprochement bancaire

// Demo data
const DEMO_SUGGESTIONS = [
  {
    transactionId: 't1',
    transactionLabel: 'VIR DUPONT SARL FAC-2026-00042',
    transactionAmount: 250000,
    transactionDate: '2026-04-14',
    candidateId: 'inv-1',
    candidateType: 'invoice' as const,
    candidateNumber: 'FAC-2026-00042',
    candidateAmount: 250000,
    entityName: 'Dupont SARL',
    score: 100,
    matchedRules: ['exact_amount', 'reference'],
  },
  {
    transactionId: 't5',
    transactionLabel: 'VIR MARTIN JEAN',
    transactionAmount: 85000,
    transactionDate: '2026-04-08',
    candidateId: 'inv-2',
    candidateType: 'invoice' as const,
    candidateNumber: 'FAC-2026-00039',
    candidateAmount: 85000,
    entityName: 'Martin Jean',
    score: 90,
    matchedRules: ['exact_amount', 'entity_name'],
  },
  {
    transactionId: 't2',
    transactionLabel: 'PRELEVEMENT EDF SA FACTURE 0423',
    transactionAmount: -18500,
    transactionDate: '2026-04-13',
    candidateId: 'pur-1',
    candidateType: 'purchase' as const,
    candidateNumber: null,
    candidateAmount: 18500,
    entityName: 'EDF',
    score: 60,
    matchedRules: ['exact_amount'],
  },
];

const DEMO_UNMATCHED = [
  {
    id: 't3',
    date: '2026-04-12',
    label: 'CB ORANGE SA 11/04',
    amount_cents: -3999,
    currency: 'EUR',
    type: 'debit',
  },
  {
    id: 't6',
    date: '2026-04-05',
    label: 'CB AMAZON FR FOURNITURES',
    amount_cents: -4520,
    currency: 'EUR',
    type: 'debit',
  },
];

export default function ReconciliationPage() {
  const [suggestions, setSuggestions] = useState(DEMO_SUGGESTIONS);
  const [unmatched, _setUnmatched] = useState(DEMO_UNMATCHED);
  const [matchedCount, setMatchedCount] = useState(0);

  const handleAccept = (transactionId: string, _candidateId: string, _candidateType: string) => {
    // TODO: Call API POST /api/bank/transactions/:id/match
    setSuggestions((prev) => prev.filter((s) => s.transactionId !== transactionId));
    setMatchedCount((c) => c + 1);
  };

  const handleReject = (transactionId: string, candidateId: string) => {
    setSuggestions((prev) => prev.filter((s) => !(s.transactionId === transactionId && s.candidateId === candidateId)));
  };

  const handleManualMatch = (transactionId: string) => {
    // TODO: Open manual match modal
    alert(`Rapprochement manuel pour transaction ${transactionId}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Rapprochement bancaire</h1>
          <p className="text-sm text-gray-500 mt-1">
            Associez vos transactions bancaires a vos factures et achats.
          </p>
        </div>
        <Button>Lancer le rapprochement</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{matchedCount}</p>
            <p className="text-xs text-gray-500">Rapproches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{suggestions.length}</p>
            <p className="text-xs text-gray-500">Suggestions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{unmatched.length}</p>
            <p className="text-xs text-gray-500">Non rapproches</p>
          </CardContent>
        </Card>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Suggestions de rapprochement
            <Badge variant="info" className="ml-2">{suggestions.length}</Badge>
          </h2>
          <div className="space-y-3">
            {suggestions.map((s) => (
              <MatchSuggestion
                key={`${s.transactionId}-${s.candidateId}`}
                {...s}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unmatched */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Transactions non rapprochees
          <Badge variant="info" className="ml-2">{unmatched.length}</Badge>
        </h2>
        <Card>
          <CardContent className="p-0">
            <UnmatchedList
              transactions={unmatched}
              onManualMatch={handleManualMatch}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
