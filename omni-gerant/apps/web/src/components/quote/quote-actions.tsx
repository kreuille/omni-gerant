'use client';

import { Button } from '@/components/ui/button';

// BUSINESS RULE [CDC-2.1]: Actions disponibles selon le statut du devis

interface QuoteActionsProps {
  status: string;
  onSend?: () => void;
  onDuplicate?: () => void;
  onPreview?: () => void;
  onDelete?: () => void;
  onConvert?: () => void;
}

const STATUS_ACTIONS: Record<string, string[]> = {
  draft: ['edit', 'preview', 'send', 'duplicate', 'delete'],
  sent: ['preview', 'duplicate'],
  viewed: ['preview', 'duplicate'],
  signed: ['preview', 'duplicate', 'invoice'],
  refused: ['preview', 'duplicate'],
  expired: ['preview', 'duplicate'],
  invoiced: ['preview'],
};

export function QuoteActions({ status, onSend, onDuplicate, onPreview, onDelete, onConvert }: QuoteActionsProps) {
  const actions = STATUS_ACTIONS[status] ?? [];

  return (
    <div className="flex gap-2 flex-wrap">
      {actions.includes('preview') && (
        <Button variant="outline" size="sm" onClick={onPreview}>
          Apercu
        </Button>
      )}
      {actions.includes('send') && (
        <Button size="sm" onClick={onSend}>
          Envoyer
        </Button>
      )}
      {actions.includes('duplicate') && (
        <Button variant="secondary" size="sm" onClick={onDuplicate}>
          Dupliquer
        </Button>
      )}
      {actions.includes('invoice') && (
        <Button variant="primary" size="sm" onClick={onConvert}>
          Convertir en facture
        </Button>
      )}
      {actions.includes('delete') && (
        <Button variant="destructive" size="sm" onClick={onDelete}>
          Supprimer
        </Button>
      )}
    </div>
  );
}
