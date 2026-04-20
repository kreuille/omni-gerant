'use client';

import { Card, CardContent } from '@/components/ui/card';

// BUSINESS RULE [CDC-4]: Echeances a venir

interface Payment {
  id: string;
  type: 'receivable' | 'payable';
  entity_name: string;
  amount_cents: number;
  due_date: string;
  document_number: string;
}

interface UpcomingPaymentsProps {
  payments: Payment[];
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(cents / 100);
}

export function UpcomingPayments({ payments }: UpcomingPaymentsProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Échéances cette semaine</h3>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Aucune échéance cette semaine</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${p.type === 'receivable' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <span className="font-medium text-gray-700">{p.entity_name}</span>
                    <span className="text-gray-400 ml-1">({p.document_number})</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-medium ${p.type === 'receivable' ? 'text-green-600' : 'text-red-600'}`}>
                    {p.type === 'receivable' ? '+' : '-'}{formatCents(p.amount_cents)}
                  </span>
                  <p className="text-xs text-gray-400">
                    {new Date(p.due_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
