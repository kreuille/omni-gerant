import type { Result } from '@zenadmin/shared';
import { ok, err, forbidden } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';

// BUSINESS RULE [CDC-2.1]: Machine a etats du devis
// draft → sent → viewed → signed → invoiced
//                viewed → refused
//         sent → expired

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'signed' | 'refused' | 'expired' | 'invoiced';

export type QuoteAction = 'send' | 'view' | 'accept' | 'sign' | 'refuse' | 'expire' | 'invoice' | 'duplicate';

interface Transition {
  from: QuoteStatus;
  to: QuoteStatus;
  action: QuoteAction;
}

const VALID_TRANSITIONS: Transition[] = [
  { from: 'draft', to: 'sent', action: 'send' },
  { from: 'sent', to: 'viewed', action: 'view' },
  // Acceptation (sans signature formelle) : depuis sent ou viewed
  { from: 'sent', to: 'accepted', action: 'accept' },
  { from: 'viewed', to: 'accepted', action: 'accept' },
  // Signature electronique : depuis viewed ou accepted
  { from: 'viewed', to: 'signed', action: 'sign' },
  { from: 'accepted', to: 'signed', action: 'sign' },
  { from: 'viewed', to: 'refused', action: 'refuse' },
  { from: 'sent', to: 'expired', action: 'expire' },
  { from: 'accepted', to: 'invoiced', action: 'invoice' },
  { from: 'signed', to: 'invoiced', action: 'invoice' },
];

export function canTransition(currentStatus: QuoteStatus, action: QuoteAction): boolean {
  return VALID_TRANSITIONS.some((t) => t.from === currentStatus && t.action === action);
}

export function getNextStatus(currentStatus: QuoteStatus, action: QuoteAction): Result<QuoteStatus, AppError> {
  const transition = VALID_TRANSITIONS.find((t) => t.from === currentStatus && t.action === action);
  if (!transition) {
    return err(forbidden(
      `Cannot perform '${action}' on a quote with status '${currentStatus}'`,
    ));
  }
  return ok(transition.to);
}

export function getAvailableActions(status: QuoteStatus): QuoteAction[] {
  return VALID_TRANSITIONS
    .filter((t) => t.from === status)
    .map((t) => t.action);
}

export function isTerminalStatus(status: QuoteStatus): boolean {
  return ['refused', 'expired', 'invoiced'].includes(status);
}

export function isMutableStatus(status: QuoteStatus): boolean {
  return status === 'draft';
}
