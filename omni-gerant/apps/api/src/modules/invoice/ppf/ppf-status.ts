import type { PpfStatus } from './ppf-client.js';

// BUSINESS RULE [CDC-2.1]: Suivi statut transmission PPF

export interface StatusTransition {
  from: PpfStatus;
  to: PpfStatus;
  label: string;
}

export const PPF_STATUS_LABELS: Record<PpfStatus, string> = {
  deposee: 'Deposee',
  en_cours_traitement: 'En cours de traitement',
  acceptee: 'Acceptee',
  refusee: 'Refusee',
  mise_a_disposition: 'Mise a disposition',
  encaissee: 'Encaissee',
};

export const PPF_STATUS_COLORS: Record<PpfStatus, string> = {
  deposee: 'blue',
  en_cours_traitement: 'yellow',
  acceptee: 'green',
  refusee: 'red',
  mise_a_disposition: 'indigo',
  encaissee: 'emerald',
};

const VALID_TRANSITIONS: StatusTransition[] = [
  { from: 'deposee', to: 'en_cours_traitement', label: 'Prise en charge' },
  { from: 'en_cours_traitement', to: 'acceptee', label: 'Acceptation' },
  { from: 'en_cours_traitement', to: 'refusee', label: 'Refus' },
  { from: 'acceptee', to: 'mise_a_disposition', label: 'Mise a disposition' },
  { from: 'mise_a_disposition', to: 'encaissee', label: 'Encaissement' },
];

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: PpfStatus, to: PpfStatus): boolean {
  return VALID_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

/**
 * Check if a status is terminal (no further transitions)
 */
export function isTerminalStatus(status: PpfStatus): boolean {
  return status === 'refusee' || status === 'encaissee';
}

/**
 * Check if a status is pending (needs follow-up)
 */
export function isPendingStatus(status: PpfStatus): boolean {
  return status === 'deposee' || status === 'en_cours_traitement';
}

/**
 * Get the next possible statuses from current
 */
export function getNextStatuses(current: PpfStatus): PpfStatus[] {
  return VALID_TRANSITIONS
    .filter((t) => t.from === current)
    .map((t) => t.to);
}

/**
 * Calculate the progress percentage of the lifecycle
 */
export function getStatusProgress(status: PpfStatus): number {
  const progressMap: Record<PpfStatus, number> = {
    deposee: 20,
    en_cours_traitement: 40,
    acceptee: 60,
    refusee: 100,
    mise_a_disposition: 80,
    encaissee: 100,
  };
  return progressMap[status];
}
