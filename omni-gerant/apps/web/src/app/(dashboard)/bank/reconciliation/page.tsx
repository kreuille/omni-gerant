'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MatchSuggestion } from '@/components/bank/match-suggestion';
import { UnmatchedList } from '@/components/bank/unmatched-list';
import { api } from '@/lib/api-client';

// BUSINESS RULE [CDC-2.3]: Interface de rapprochement bancaire

interface BankTransaction {
  id: string;
  date: string;
  label: string;
  raw_label: string | null;
  amount_cents: number;
  currency: string;
  category: string | null;
  type: string | null;
  matched: boolean;
}

interface TransactionsResponse {
  items: BankTransaction[];
  next_cursor: string | null;
  has_more: boolean;
}

// Suggestion structure for the UI (built from unmatched transactions)
interface Suggestion {
  transactionId: string;
  transactionLabel: string;
  transactionAmount: number;
  transactionDate: string;
  candidateId: string;
  candidateType: 'invoice' | 'purchase';
  candidateNumber: string | null;
  candidateAmount: number;
  entityName: string;
  score: number;
  matchedRules: string[];
}

export default function ReconciliationPage() {
  const [unmatchedTransactions, setUnmatchedTransactions] = useState<BankTransaction[]>([]);
  const [matchedTransactions, setMatchedTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchedCount, setMatchedCount] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [unmatchedResult, matchedResult] = await Promise.all([
      api.get<TransactionsResponse>('/api/bank/transactions?matched=false&limit=100'),
      api.get<TransactionsResponse>('/api/bank/transactions?matched=true&limit=100'),
    ]);

    if (!unmatchedResult.ok) {
      setError(unmatchedResult.error.message);
      setLoading(false);
      return;
    }

    setUnmatchedTransactions(unmatchedResult.value.items);
    setMatchedCount(matchedResult.ok ? matchedResult.value.items.length : 0);
    setMatchedTransactions(matchedResult.ok ? matchedResult.value.items : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleManualMatch = (transactionId: string) => {
    // TODO: Open manual match modal when matching API endpoint is available
    alert(`Rapprochement manuel pour transaction ${transactionId}`);
  };

  // Format unmatched transactions for the unmatched list component
  const unmatchedForList = unmatchedTransactions.map((tx) => ({
    id: tx.id,
    date: typeof tx.date === 'string' ? tx.date.split('T')[0]! : tx.date,
    label: tx.raw_label ?? tx.label,
    amount_cents: tx.amount_cents,
    currency: tx.currency,
    type: tx.type ?? (tx.amount_cents >= 0 ? 'credit' : 'debit'),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Chargement des transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 font-medium mb-2">Erreur de chargement</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button onClick={fetchData}>Reessayer</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Rapprochement bancaire</h1>
          <p className="text-sm text-gray-500 mt-1">
            Associez vos transactions bancaires a vos factures et achats.
          </p>
        </div>
        <Button onClick={fetchData}>Actualiser</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{matchedCount}</p>
            <p className="text-xs text-gray-500">Rapproches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{unmatchedTransactions.length}</p>
            <p className="text-xs text-gray-500">Non rapproches</p>
          </CardContent>
        </Card>
      </div>

      {/* Info banner when no reconciliation API is available yet */}
      {unmatchedTransactions.length === 0 && matchedCount === 0 && (
        <Card className="mb-6">
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 mb-2">Aucune transaction a rapprocher.</p>
            <p className="text-sm text-gray-400">
              Connectez un compte bancaire et synchronisez vos transactions pour commencer le rapprochement.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Unmatched */}
      {unmatchedForList.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Transactions non rapprochees
            <Badge variant="info" className="ml-2">{unmatchedForList.length}</Badge>
          </h2>
          <Card>
            <CardContent className="p-0">
              <UnmatchedList
                transactions={unmatchedForList}
                onManualMatch={handleManualMatch}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
