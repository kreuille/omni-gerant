'use client';

import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  draft: { label: 'Brouillon', variant: 'default' },
  sent: { label: 'Envoye', variant: 'info' },
  viewed: { label: 'Vu', variant: 'warning' },
  signed: { label: 'Signe', variant: 'success' },
  refused: { label: 'Refuse', variant: 'error' },
  expired: { label: 'Expire', variant: 'error' },
  invoiced: { label: 'Facture', variant: 'success' },
};

interface QuoteStatusBadgeProps {
  status: string;
}

export function QuoteStatusBadge({ status }: QuoteStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG['draft']!;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
