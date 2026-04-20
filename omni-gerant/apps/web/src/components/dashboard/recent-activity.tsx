'use client';

import { Card, CardContent } from '@/components/ui/card';

// BUSINESS RULE [CDC-4]: Activite recente

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

const TYPE_ICONS: Record<string, string> = {
  invoice_created: 'F',
  invoice_paid: '$',
  quote_sent: 'D',
  quote_signed: 'S',
  purchase_created: 'A',
  bank_sync: 'B',
};

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Activité récente</h3>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Aucune activite recente</p>
        ) : (
          <div className="space-y-3">
            {activities.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                  {TYPE_ICONS[a.type] ?? '?'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{a.description}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(a.timestamp).toLocaleString('fr-FR')}
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
