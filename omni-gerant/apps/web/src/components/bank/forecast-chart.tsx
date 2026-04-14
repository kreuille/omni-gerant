'use client';

// BUSINESS RULE [CDC-2.3]: Graphique previsionnel de tresorerie

interface ForecastEntry {
  date: string;
  balance_cents: number;
  incoming_cents: number;
  outgoing_cents: number;
}

interface ForecastChartProps {
  entries: ForecastEntry[];
  currency: string;
}

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100);
}

export function ForecastChart({ entries, currency }: ForecastChartProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Pas assez de donnees pour le previsionnel
      </div>
    );
  }

  const maxBalance = Math.max(...entries.map((e) => e.balance_cents));
  const minBalance = Math.min(...entries.map((e) => e.balance_cents));
  const range = maxBalance - minBalance || 1;
  const chartHeight = 250;
  const chartWidth = entries.length * 8;

  // Find zero crossing points
  const hasNegative = entries.some((e) => e.balance_cents < 0);
  const zeroY = minBalance >= 0
    ? chartHeight
    : chartHeight - ((0 - minBalance) / range) * (chartHeight - 40);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex justify-between text-xs text-gray-400 mb-2 px-2">
        <span>{formatAmount(maxBalance, currency)}</span>
        {hasNegative && <span className="text-red-400">Zone negative</span>}
        <span>{formatAmount(minBalance, currency)}</span>
      </div>
      <div className="relative bg-gray-50 rounded-lg p-4" style={{ height: chartHeight, minWidth: chartWidth }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
          {/* Zero line */}
          {hasNegative && (
            <line x1="0" y1={zeroY} x2={chartWidth} y2={zeroY} stroke="#ef4444" strokeWidth="1" strokeDasharray="4" />
          )}

          {/* Negative zone fill */}
          {hasNegative && (
            <rect x="0" y={zeroY} width={chartWidth} height={chartHeight - zeroY} fill="rgba(239, 68, 68, 0.05)" />
          )}

          {/* Balance area */}
          <path
            d={`M 0 ${chartHeight} ${entries
              .map((e, i) => {
                const x = i * 8 + 4;
                const y = chartHeight - ((e.balance_cents - minBalance) / range) * (chartHeight - 40);
                return `L ${x} ${y}`;
              })
              .join(' ')} L ${(entries.length - 1) * 8 + 4} ${chartHeight} Z`}
            fill="rgba(59, 130, 246, 0.1)"
          />

          {/* Balance line */}
          <polyline
            points={entries
              .map((e, i) => {
                const x = i * 8 + 4;
                const y = chartHeight - ((e.balance_cents - minBalance) / range) * (chartHeight - 40);
                return `${x},${y}`;
              })
              .join(' ')}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />
        </svg>
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
        <span>{entries[0]?.date ? new Date(entries[0].date).toLocaleDateString('fr-FR') : ''}</span>
        <span>
          {entries.length > 0
            ? new Date(entries[entries.length - 1]!.date).toLocaleDateString('fr-FR')
            : ''}
        </span>
      </div>
    </div>
  );
}
