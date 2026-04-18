'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TransactionList } from '@/components/bank/transaction-list';
import { BalanceChart } from '@/components/bank/balance-chart';

// BUSINESS RULE [CDC-2.3]: Detail compte bancaire

// Demo data
const DEMO_ACCOUNT = {
  id: '1',
  bankName: 'Credit Agricole',
  accountName: 'Compte Courant Pro',
  iban: 'FR7630006000011234567890189',
  bic: 'AGRIFRPP',
  balanceCents: 1542300,
  currency: 'EUR',
  status: 'active',
  lastSyncAt: '2026-04-14T08:00:00Z',
};

const DEMO_TRANSACTIONS = [
  { id: 't1', date: '2026-04-14', label: 'Virement client Dupont SARL', raw_label: 'VIR DUPONT SARL', amount_cents: 250000, currency: 'EUR', category: null, type: 'credit', matched: true },
  { id: 't2', date: '2026-04-13', label: 'EDF Facture electricite', raw_label: 'PRELEVEMENT EDF SA', amount_cents: -18500, currency: 'EUR', category: 'energie', type: 'debit', matched: false },
  { id: 't3', date: '2026-04-12', label: 'Orange forfait mobile', raw_label: 'CB ORANGE SA', amount_cents: -3999, currency: 'EUR', category: 'telecom', type: 'debit', matched: false },
  { id: 't4', date: '2026-04-10', label: 'Loyer bureau avril', raw_label: 'VIR LOYER BUREAUX', amount_cents: -120000, currency: 'EUR', category: 'loyer', type: 'debit', matched: true },
  { id: 't5', date: '2026-04-08', label: 'Paiement client Martin', raw_label: 'VIR MARTIN J', amount_cents: 85000, currency: 'EUR', category: null, type: 'credit', matched: true },
  { id: 't6', date: '2026-04-05', label: 'Fournitures bureau', raw_label: 'CB AMAZON FR', amount_cents: -4520, currency: 'EUR', category: 'equipement', type: 'debit', matched: false },
];

const DEMO_CHART_DATA = [
  { date: '2026-04-01', balance_cents: 1200000 },
  { date: '2026-04-05', balance_cents: 1150000 },
  { date: '2026-04-08', balance_cents: 1235000 },
  { date: '2026-04-10', balance_cents: 1115000 },
  { date: '2026-04-12', balance_cents: 1111001 },
  { date: '2026-04-13', balance_cents: 1092501 },
  { date: '2026-04-14', balance_cents: 1542300 },
];

export default function BankAccountDetailPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const account = DEMO_ACCOUNT;
  const filteredTransactions = DEMO_TRANSACTIONS.filter((tx) => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (search && !tx.label.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{account.bankName}</h1>
          <p className="text-sm text-gray-500 mt-1">{account.accountName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Synchroniser</Button>
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
            <p className={`text-2xl font-bold ${account.balanceCents >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: account.currency }).format(account.balanceCents / 100)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">IBAN</p>
            <p className="text-sm font-mono text-gray-700 mt-1">{account.iban}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Derniere synchronisation</p>
            <p className="text-sm text-gray-700 mt-1">
              {new Date(account.lastSyncAt).toLocaleString('fr-FR')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique solde */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolution du solde</h2>
          <BalanceChart data={DEMO_CHART_DATA} currency={account.currency} />
        </CardContent>
      </Card>

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
          <TransactionList transactions={filteredTransactions} />
        </CardContent>
      </Card>
    </div>
  );
}
