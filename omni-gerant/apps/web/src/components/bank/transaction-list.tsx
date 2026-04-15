'use client';

import { Badge } from '@/components/ui/badge';

// BUSINESS RULE [CDC-2.3]: Liste des transactions bancaires

interface Transaction {
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

interface TransactionListProps {
  transactions: Transaction[];
}

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const CATEGORY_LABELS: Record<string, string> = {
  loyer: 'Loyer',
  assurance: 'Assurance',
  telecom: 'Telecom',
  energie: 'Energie',
  transport: 'Transport',
  alimentation: 'Alimentation',
  sante: 'Sante',
  loisirs: 'Loisirs',
  impots: 'Impots/Taxes',
  salaires: 'Salaires',
  services: 'Services',
  equipement: 'Equipement',
  bancaire: 'Frais bancaires',
};

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucune transaction a afficher
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {transactions.map((tx) => (
        <div key={tx.id} className="flex items-center justify-between py-3 px-4 hover:bg-gray-50">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              tx.type === 'credit' ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{tx.label}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">{formatDate(tx.date)}</span>
                {tx.category && (
                  <Badge variant="info" className="text-xs">
                    {CATEGORY_LABELS[tx.category] || tx.category}
                  </Badge>
                )}
                {tx.matched && (
                  <Badge variant="success" className="text-xs">Rapproche</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0 ml-4">
            <span className={`text-sm font-semibold ${
              tx.amount_cents >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {tx.amount_cents >= 0 ? '+' : ''}{formatAmount(tx.amount_cents, tx.currency)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
