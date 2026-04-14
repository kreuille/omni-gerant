'use client';

// BUSINESS RULE [CDC-2.3]: Tableau flux de tresorerie

interface CashFlowEntry {
  date: string;
  balance_cents: number;
  incoming_cents: number;
  outgoing_cents: number;
  recurring_cents: number;
}

interface CashFlowTableProps {
  entries: CashFlowEntry[];
  currency: string;
}

function formatAmount(cents: number, currency: string): string {
  if (cents === 0) return '-';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100);
}

export function CashFlowTable({ entries, currency }: CashFlowTableProps) {
  // Aggregate by week for readability
  const weeks: Array<{
    label: string;
    incoming_cents: number;
    outgoing_cents: number;
    recurring_cents: number;
    end_balance_cents: number;
  }> = [];

  let weekStart = 0;
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && i % 7 === 0) {
      const weekEntries = entries.slice(weekStart, i);
      const startDate = weekEntries[0]!.date;
      const endDate = weekEntries[weekEntries.length - 1]!.date;
      weeks.push({
        label: `${new Date(startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${new Date(endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`,
        incoming_cents: weekEntries.reduce((s, e) => s + e.incoming_cents, 0),
        outgoing_cents: weekEntries.reduce((s, e) => s + e.outgoing_cents, 0),
        recurring_cents: weekEntries.reduce((s, e) => s + e.recurring_cents, 0),
        end_balance_cents: weekEntries[weekEntries.length - 1]!.balance_cents,
      });
      weekStart = i;
    }
  }

  // Add remaining days
  if (weekStart < entries.length) {
    const remaining = entries.slice(weekStart);
    weeks.push({
      label: `${new Date(remaining[0]!.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${new Date(remaining[remaining.length - 1]!.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`,
      incoming_cents: remaining.reduce((s, e) => s + e.incoming_cents, 0),
      outgoing_cents: remaining.reduce((s, e) => s + e.outgoing_cents, 0),
      recurring_cents: remaining.reduce((s, e) => s + e.recurring_cents, 0),
      end_balance_cents: remaining[remaining.length - 1]!.balance_cents,
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-3 text-gray-500 font-medium">Periode</th>
            <th className="text-right py-2 px-3 text-green-600 font-medium">Encaissements</th>
            <th className="text-right py-2 px-3 text-red-600 font-medium">Decaissements</th>
            <th className="text-right py-2 px-3 text-orange-600 font-medium">Recurrent</th>
            <th className="text-right py-2 px-3 text-gray-700 font-medium">Solde fin</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700">{week.label}</td>
              <td className="py-2 px-3 text-right text-green-600">
                {formatAmount(week.incoming_cents, currency)}
              </td>
              <td className="py-2 px-3 text-right text-red-600">
                {formatAmount(week.outgoing_cents, currency)}
              </td>
              <td className="py-2 px-3 text-right text-orange-600">
                {formatAmount(week.recurring_cents, currency)}
              </td>
              <td className={`py-2 px-3 text-right font-semibold ${
                week.end_balance_cents >= 0 ? 'text-gray-900' : 'text-red-600'
              }`}>
                {formatAmount(week.end_balance_cents, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
