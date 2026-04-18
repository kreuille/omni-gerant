'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BankAccountCard } from '@/components/bank/bank-account-card';
import { TransactionList } from '@/components/bank/transaction-list';
import { api } from '@/lib/api-client';

// BUSINESS RULE [CDC-2.3]: Vue principale module bancaire

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string | null;
  iban: string | null;
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

interface AccountsResponse {
  items: BankAccount[];
  next_cursor: string | null;
  has_more: boolean;
}

interface TransactionsResponse {
  items: BankTransaction[];
  next_cursor: string | null;
  has_more: boolean;
}

export default function BankPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [accountsResult, transactionsResult] = await Promise.all([
      api.get<AccountsResponse>('/api/bank/accounts'),
      api.get<TransactionsResponse>('/api/bank/transactions?limit=20'),
    ]);

    if (!accountsResult.ok) {
      setError(accountsResult.error.message);
      setLoading(false);
      return;
    }

    setAccounts(accountsResult.value.items);
    setTransactions(transactionsResult.ok ? transactionsResult.value.items : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);
    const result = await api.post(`/api/bank/accounts/${accountId}/sync`, {});
    if (result.ok) {
      await fetchData();
    }
    setSyncing(null);
  };

  const handleDisconnect = async (accountId: string) => {
    const result = await api.post(`/api/bank/accounts/${accountId}/disconnect`, {});
    if (result.ok) {
      await fetchData();
    }
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance_cents, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Chargement des comptes bancaires...</p>
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
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Banque</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerez vos comptes bancaires et suivez vos transactions.
          </p>
        </div>
        <a href="/bank/connect">
          <Button>Connecter une banque</Button>
        </a>
      </div>

      {/* Solde total */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <p className="text-sm text-gray-500">Solde total</p>
          <p className={`text-3xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalBalance / 100)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {accounts.length} compte{accounts.length > 1 ? 's' : ''} connecte{accounts.length > 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Comptes */}
      {accounts.length === 0 ? (
        <Card className="mb-8">
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 mb-4">Aucun compte bancaire connecte.</p>
            <a href="/bank/connect">
              <Button>Connecter votre premiere banque</Button>
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {accounts.map((account) => (
            <BankAccountCard
              key={account.id}
              id={account.id}
              bankName={account.bank_name}
              accountName={account.account_name ?? 'Compte'}
              iban={account.iban ?? ''}
              balanceCents={account.balance_cents}
              currency={account.currency}
              status={account.status}
              lastSyncAt={account.last_sync_at ?? ''}
              onSync={() => handleSync(account.id)}
              onDisconnect={() => handleDisconnect(account.id)}
            />
          ))}
        </div>
      )}

      {/* Transactions recentes */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Transactions recentes</h2>
          </div>
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              Aucune transaction pour le moment.
            </div>
          ) : (
            <TransactionList transactions={transactions} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
