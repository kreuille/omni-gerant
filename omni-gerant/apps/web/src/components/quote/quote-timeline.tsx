'use client';

// BUSINESS RULE [CDC-2.1]: Historique du devis (timeline)

interface TimelineEvent {
  id: string;
  event_type: string;
  actor: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}

interface QuoteTimelineProps {
  events: TimelineEvent[];
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  sent: { label: 'Devis envoye', color: 'text-blue-600' },
  viewed: { label: 'Devis consulte par le client', color: 'text-yellow-600' },
  signed: { label: 'Devis signe par le client', color: 'text-green-600' },
  refused: { label: 'Devis refuse par le client', color: 'text-red-600' },
  expired: { label: 'Devis expire', color: 'text-gray-500' },
  duplicated: { label: 'Devis duplique', color: 'text-purple-600' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function QuoteTimeline({ events }: QuoteTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4 text-center">Aucun evenement pour le moment</p>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, index) => {
        const config = EVENT_LABELS[event.event_type] ?? { label: event.event_type, color: 'text-gray-600' };
        const isLast = index === events.length - 1;
        return (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${config.color.replace('text-', 'bg-')}`} />
              {!isLast && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
            </div>
            <div className="pb-4">
              <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
              <p className="text-xs text-gray-400">{formatDate(event.created_at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
