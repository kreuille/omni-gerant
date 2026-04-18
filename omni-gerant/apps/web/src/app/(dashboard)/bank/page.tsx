'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BankAccountCard } from '@/components/bank/bank-account-card';
import { TransactionList } from '@/components/bank/transaction-list';

// BUSINESS RULE [CDC-2.3]: Vue principale module bancaire

// Demo data
const DEMO_ACCOUNTS = [
  {
    id: '1',
    bankName: 'Credit Agricole',
    accountName: 'Compte Courant Pro',
    iban: 'FR7630006000011234567890189',
    balanceCents: 1542300,
    currency: 'EUR',
    status: 'active',
    lastSyncAt: '2026-04-14T08:00:00Z',
  },
  {
    id: '2',
    bankName: 'BNP Paribas',
    accountName: 'Compte Epargne',
    iban: 'FR7630004000031234567890143',
    balanceCents: 850000,
    currency: 'EUR',
    status: 'active',
    lastSyncAt: '2026-04-14T08:00:00Z',
  },
];

const DEMO_TRANSACTIONS = [
  {
    id: 't1',
    date: '2026-04-14',
    label: 'Virement client Dupont SARL - FAC-2026-00042',
    raw_label: 'VIR DUPONT SARL FAC-2026-00042',
    amount_cents: 250000,
    currency: 'EUR',
    category: null,
    type: 'credit',
    matched: true,
  },
  {
    id: 't2',
    date: '2026-04-13',
    label: 'EDF Facture electricite avril',
    raw_label: 'PRELEVEMENT EDF SA FACTURE 0423',
    amount_cents: -18500,
    currency: 'EUR',
    category: 'energie',
    type: 'debit',
    matched: false,
  },
  {
    id: 't3',
    date: '2026-04-12',
    label: 'Orange forfait mobile',
    raw_label: 'CB ORANGE SA 11/04',
    amount_cents: -3999,
    currency: 'EUR',
    category: 'telecom',
    type: 'debit',
    matched: false,
  },
  {
    id: 't4',
    date: '2026-04-10',
    label: 'Loyer bureau avril',
    raw_label: 'VIR LOYER BUREAUX SCI MARTIN AVRIL 2026',
    amount_cents: -120000,
    currency: 'EUR',
    category: 'loyer',
    type: 'debit',
    matched: true,
  },
];

export default function BankPage() {
  const [accounts] = useState(DEMO_ACCOUNTS);
  const [transactions] = useState(DEMO_TRANSACTIONS);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balanceCents, 0);

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {accounts.map((account) => (
          <BankAccountCard
            key={account.id}
            id={account.id}
            bankName={account.bankName}
            accountName={account.accountName}
            iban={account.iban}
            balanceCents={account.balanceCents}
            currency={account.currency}
            status={account.status}
            lastSyncAt={account.lastSyncAt}
            onSync={() => {/* TODO: Call API */}}
            onDisconnect={() => {/* TODO: Call API */}}
          />
        ))}
      </div>

      {/* Transactions recentes */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Transactions recentes</h2>
          </div>
          <TransactionList transactions={transactions} />
        </CardContent>
      </Card>
    </div>
  );
}
