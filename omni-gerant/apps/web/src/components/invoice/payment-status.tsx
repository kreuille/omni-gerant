'use client';

import { Badge } from '@/components/ui/badge';

interface PaymentStatusProps {
  totalTtcCents: number;
  paidCents: number;
  remainingCents: number;
  status: string;
  dueDate: string;
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function PaymentStatus({ totalTtcCents, paidCents, remainingCents, status, dueDate }: PaymentStatusProps) {
  const paidPercent = totalTtcCents > 0 ? Math.round((paidCents / totalTtcCents) * 100) : 0;
  const isOverdue = status === 'overdue';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Paiement</span>
        <Badge variant={status === 'paid' ? 'success' : isOverdue ? 'error' : 'default'}>
          {status === 'paid' ? 'Paye' : isOverdue ? 'En retard' : `${paidPercent}%`}
        </Badge>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${isOverdue ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: `${Math.min(100, paidPercent)}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>Paye: {formatCents(paidCents)} EUR</span>
        <span>Reste: {formatCents(remainingCents)} EUR</span>
      </div>

      {isOverdue && (
        <p className="text-xs text-red-600">Echeance depassee : {dueDate}</p>
      )}
    </div>
  );
}
