'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TransactionList } from '@/components/bank/transaction-list';
import { BalanceChart } from '@/components/bank/balance-chart';
import { api } from '@/lib/api-client';

// BUSINESS RULE [CDC-2.3]: Detail compte bancaire

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string | null;
  iban: string | null;
  bic: string | null;
  balance_cents: number;
  currency: string;
  status: string;
  last_sync_at: string | null;
}

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

export default function BankAccountDetailPage() {
  const params = useParams();
  const accountId = params.id as string;

  const [account, setAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [accountResult, transactionsResult] = await Promise.all([
      api.get<BankAccount>(`/api/bank/accounts/${accountId}`),
      api.get<TransactionsResponse>(`/api/bank/transactions?bank_account_id=${accountId}&limit=50`),
    ]);

    if (!accountResult.ok) {
      setError(accountResult.error.message);
      setLoading(false);
      return;
    }

    setAccount(accountResult.value);
    setTransactions(transactionsResult.ok ? transactionsResult.value.items : []);
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    const result = await api.post(`/api/bank/accounts/${accountId}/sync`, {});
    if (result.ok) {
      await fetchData();
    }
    setSyncing(false);
  };

  // Client-side filtering of loaded transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (search && !tx.label.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Build balance chart data from transactions (sorted by date ascending)
  const chartData = transactions.length > 0
    ? (() => {
        const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
        // Use running balance from account balance working backward
        const currentBalance = account?.balance_cents ?? 0;
        const totalDelta = sorted.reduce((sum, tx) => sum + tx.amount_cents, 0);
        let runningBalance = currentBalance - totalDelta;
        return sorted.map((tx) => {
          runningBalance += tx.amount_cents;
          return { date: typeof tx.date === 'string' ? tx.date.split('T')[0]! : tx.date, balance_cents: runningBalance };
        });
      })()
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Chargement du compte...</p>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 font-medium mb-2">Erreur de chargement</p>
            <p className="text-sm text-gray-500 mb-4">{error ?? 'Compte introuvable'}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={fetchData}>Reessayer</Button>
              <a href="/bank"><Button variant="outline">Retour</Button></a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{account.bank_name}</h1>
          <p className="text-sm text-gray-500 mt-1">{account.account_name ?? 'Compte'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Synchronisation...' : 'Synchroniser'}
          </Button>
          <a href="/bank">
            <Button variant="outline">Retour</Button>
          </a>
        </div>
      </div>

      {/* Infos compte */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Solde actuel</p>
            <p className={`text-2xl font-bold ${account.balance_cents >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: account.currency }).format(account.balance_cents / 100)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">IBAN</p>
            <p className="text-sm font-mono text-gray-700 mt-1">{account.iban ?? 'Non renseigne'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Derniere synchronisation</p>
            <p className="text-sm text-gray-700 mt-1">
              {account.last_sync_at
                ? new Date(account.last_sync_at).toLocaleString('fr-FR')
                : 'Jamais'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique solde */}
      {chartData.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolution du solde</h2>
            <BalanceChart data={chartData} currency={account.currency} />
          </CardContent>
        </Card>
      )}

      {/* Transactions */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Tous</option>
                <option value="credit">Credits</option>
                <option value="debit">Debits</option>
              </select>
            </div>
          </div>
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              Aucune transaction trouvee.
            </div>
          ) : (
            <TransactionList transactions={filteredTransactions} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
