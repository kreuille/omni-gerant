'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// BUSINESS RULE [CDC-2.3]: Carte compte bancaire

interface BankAccountCardProps {
  id: string;
  bankName: string;
  accountName: string | null;
  iban: string | null;
  balanceCents: number;
  currency: string;
  status: string;
  lastSyncAt: string | null;
  onSync?: () => void;
  onDisconnect?: () => void;
}

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function maskIban(iban: string): string {
  if (iban.length <= 8) return iban;
  return `${iban.slice(0, 4)} **** **** ${iban.slice(-4)}`;
}

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'error' | 'default' }> = {
  active: { label: 'Connecte', variant: 'success' },
  error: { label: 'Erreur', variant: 'error' },
  disconnected: { label: 'Deconnecte', variant: 'default' },
};

export function BankAccountCard({
  id,
  bankName,
  accountName,
  iban,
  balanceCents,
  currency,
  status,
  lastSyncAt,
  onSync,
  onDisconnect,
}: BankAccountCardProps) {
  const statusInfo = STATUS_MAP[status] || STATUS_MAP['disconnected']!;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{bankName}</h3>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
            {accountName && (
              <p className="text-sm text-gray-600">{accountName}</p>
            )}
            {iban && (
              <p className="text-xs text-gray-400 font-mono mt-1">{maskIban(iban)}</p>
            )}
          </div>
          <div className="text-right">
            <p className={`text-xl font-bold ${balanceCents >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatAmount(balanceCents, currency)}
            </p>
            {lastSyncAt && (
              <p className="text-xs text-gray-400 mt-1">
                Sync: {new Date(lastSyncAt).toLocaleString('fr-FR')}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          {status === 'active' && onSync && (
            <Button variant="outline" size="sm" onClick={onSync}>
              Synchroniser
            </Button>
          )}
          {status !== 'disconnected' && onDisconnect && (
            <Button variant="outline" size="sm" onClick={onDisconnect}>
              Deconnecter
            </Button>
          )}
          <a href={`/bank/${id}`}>
            <Button variant="outline" size="sm">
              Details
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
