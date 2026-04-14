import { describe, it, expect } from 'vitest';
import {
  canTransition,
  getNextStatus,
  getAvailableActions,
  isTerminalStatus,
  isMutableStatus,
  type QuoteStatus,
  type QuoteAction,
} from '../quote-workflow.js';

// BUSINESS RULE [CDC-2.1]: Test machine a etats - toutes les transitions

describe('Quote Workflow - State Machine', () => {
  describe('valid transitions', () => {
    const validCases: Array<[QuoteStatus, QuoteAction, QuoteStatus]> = [
      ['draft', 'send', 'sent'],
      ['sent', 'view', 'viewed'],
      ['viewed', 'sign', 'signed'],
      ['viewed', 'refuse', 'refused'],
      ['sent', 'expire', 'expired'],
      ['signed', 'invoice', 'invoiced'],
    ];

    it.each(validCases)('%s + %s → %s', (from, action, expectedTo) => {
      expect(canTransition(from, action)).toBe(true);

      const result = getNextStatus(from, action);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(expectedTo);
      }
    });
  });

  describe('invalid transitions', () => {
    const invalidCases: Array<[QuoteStatus, QuoteAction]> = [
      ['draft', 'sign'],      // Cannot sign a draft
      ['draft', 'view'],      // Cannot view a draft (must be sent first)
      ['draft', 'refuse'],    // Cannot refuse a draft
      ['draft', 'expire'],    // Cannot expire a draft
      ['draft', 'invoice'],   // Cannot invoice a draft
      ['sent', 'send'],       // Cannot send again
      ['sent', 'sign'],       // Must be viewed first
      ['sent', 'refuse'],     // Must be viewed first
      ['sent', 'invoice'],    // Must be signed first
      ['viewed', 'send'],     // Cannot re-send from viewed
      ['viewed', 'expire'],   // Expiry only from sent
      ['signed', 'sign'],     // Already signed
      ['signed', 'refuse'],   // Already signed
      ['signed', 'send'],     // Already signed
      ['refused', 'sign'],    // Terminal state
      ['refused', 'send'],    // Terminal state
      ['expired', 'send'],    // Terminal state
      ['expired', 'sign'],    // Terminal state
      ['invoiced', 'send'],   // Terminal state
    ];

    it.each(invalidCases)('%s + %s → FORBIDDEN', (from, action) => {
      expect(canTransition(from, action)).toBe(false);

      const result = getNextStatus(from, action);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('getAvailableActions', () => {
    it('draft can only be sent', () => {
      const actions = getAvailableActions('draft');
      expect(actions).toEqual(['send']);
    });

    it('sent can be viewed or expired', () => {
      const actions = getAvailableActions('sent');
      expect(actions).toContain('view');
      expect(actions).toContain('expire');
    });

    it('viewed can be signed or refused', () => {
      const actions = getAvailableActions('viewed');
      expect(actions).toContain('sign');
      expect(actions).toContain('refuse');
    });

    it('signed can be invoiced', () => {
      const actions = getAvailableActions('signed');
      expect(actions).toContain('invoice');
    });

    it('terminal states have no actions', () => {
      expect(getAvailableActions('refused')).toHaveLength(0);
      expect(getAvailableActions('expired')).toHaveLength(0);
      expect(getAvailableActions('invoiced')).toHaveLength(0);
    });
  });

  describe('isTerminalStatus', () => {
    it('identifies terminal states', () => {
      expect(isTerminalStatus('signed')).toBe(true);
      expect(isTerminalStatus('refused')).toBe(true);
      expect(isTerminalStatus('expired')).toBe(true);
      expect(isTerminalStatus('invoiced')).toBe(true);
    });

    it('identifies non-terminal states', () => {
      expect(isTerminalStatus('draft')).toBe(false);
      expect(isTerminalStatus('sent')).toBe(false);
      expect(isTerminalStatus('viewed')).toBe(false);
    });
  });

  describe('isMutableStatus', () => {
    it('only draft is mutable', () => {
      expect(isMutableStatus('draft')).toBe(true);
      expect(isMutableStatus('sent')).toBe(false);
      expect(isMutableStatus('viewed')).toBe(false);
      expect(isMutableStatus('signed')).toBe(false);
    });
  });
});
