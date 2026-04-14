'use client';

import { Badge } from '@/components/ui/badge';

interface ReminderHistoryItem {
  level: number;
  sent_at: string;
  email_sent_to: string;
}

interface ReminderHistoryProps {
  reminders: ReminderHistoryItem[];
}

const LEVEL_LABELS: Record<number, { label: string; variant: 'default' | 'warning' | 'error' }> = {
  1: { label: 'Rappel amical', variant: 'default' },
  2: { label: 'Echeance passee', variant: 'default' },
  3: { label: 'Relance formelle', variant: 'warning' },
  4: { label: 'Relance ferme', variant: 'error' },
  5: { label: 'Derniere relance', variant: 'error' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function ReminderHistory({ reminders }: ReminderHistoryProps) {
  if (reminders.length === 0) {
    return <p className="text-sm text-gray-500">Aucune relance envoyee</p>;
  }

  return (
    <div className="space-y-2">
      {reminders.map((r, i) => {
        const config = LEVEL_LABELS[r.level] ?? LEVEL_LABELS[1]!;
        return (
          <div key={i} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
            <div className="flex items-center gap-2">
              <Badge variant={config.variant}>{config.label}</Badge>
              <span className="text-gray-500 text-xs">{r.email_sent_to}</span>
            </div>
            <span className="text-xs text-gray-400">{formatDate(r.sent_at)}</span>
          </div>
        );
      })}
    </div>
  );
}
