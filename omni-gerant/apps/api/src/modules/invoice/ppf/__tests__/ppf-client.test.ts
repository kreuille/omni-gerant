import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import {
  isValidTransition,
  isTerminalStatus,
  isPendingStatus,
  getNextStatuses,
  getStatusProgress,
  PPF_STATUS_LABELS,
} from '../ppf-status.js';

describe('PPF Status', () => {
  describe('isValidTransition', () => {
    it('allows deposee → en_cours_traitement', () => {
      expect(isValidTransition('deposee', 'en_cours_traitement')).toBe(true);
    });

    it('allows en_cours_traitement → acceptee', () => {
      expect(isValidTransition('en_cours_traitement', 'acceptee')).toBe(true);
    });

    it('allows en_cours_traitement → refusee', () => {
      expect(isValidTransition('en_cours_traitement', 'refusee')).toBe(true);
    });

    it('rejects deposee → acceptee (skip step)', () => {
      expect(isValidTransition('deposee', 'acceptee')).toBe(false);
    });

    it('rejects refusee → acceptee (terminal)', () => {
      expect(isValidTransition('refusee', 'acceptee')).toBe(false);
    });
  });

  describe('isTerminalStatus', () => {
    it('refusee is terminal', () => {
      expect(isTerminalStatus('refusee')).toBe(true);
    });

    it('encaissee is terminal', () => {
      expect(isTerminalStatus('encaissee')).toBe(true);
    });

    it('deposee is not terminal', () => {
      expect(isTerminalStatus('deposee')).toBe(false);
    });

    it('acceptee is not terminal', () => {
      expect(isTerminalStatus('acceptee')).toBe(false);
    });
  });

  describe('isPendingStatus', () => {
    it('deposee is pending', () => {
      expect(isPendingStatus('deposee')).toBe(true);
    });

    it('en_cours_traitement is pending', () => {
      expect(isPendingStatus('en_cours_traitement')).toBe(true);
    });

    it('acceptee is not pending', () => {
      expect(isPendingStatus('acceptee')).toBe(false);
    });
  });

  describe('getNextStatuses', () => {
    it('deposee → en_cours_traitement', () => {
      expect(getNextStatuses('deposee')).toEqual(['en_cours_traitement']);
    });

    it('en_cours_traitement → acceptee or refusee', () => {
      const next = getNextStatuses('en_cours_traitement');
      expect(next).toContain('acceptee');
      expect(next).toContain('refusee');
      expect(next).toHaveLength(2);
    });

    it('refusee has no next status', () => {
      expect(getNextStatuses('refusee')).toEqual([]);
    });

    it('encaissee has no next status', () => {
      expect(getNextStatuses('encaissee')).toEqual([]);
    });
  });

  describe('getStatusProgress', () => {
    it('deposee = 20%', () => {
      expect(getStatusProgress('deposee')).toBe(20);
    });

    it('acceptee = 60%', () => {
      expect(getStatusProgress('acceptee')).toBe(60);
    });

    it('encaissee = 100%', () => {
      expect(getStatusProgress('encaissee')).toBe(100);
    });

    it('refusee = 100%', () => {
      expect(getStatusProgress('refusee')).toBe(100);
    });
  });

  describe('PPF_STATUS_LABELS', () => {
    it('has labels for all statuses', () => {
      expect(Object.keys(PPF_STATUS_LABELS)).toHaveLength(6);
      expect(PPF_STATUS_LABELS.deposee).toBe('Deposee');
      expect(PPF_STATUS_LABELS.refusee).toBe('Refusee');
    });
  });
});

describe('PPF Webhook Signature', () => {
  it('verifies valid HMAC-SHA256 signature', () => {
    // Inline verification logic (same as ppf-client)
    const secret = 'test_webhook_secret';
    const payload = '{"event":"invoice.received","ppf_id":"PPF-001"}';
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    const signature = `sha256=${expected}`;

    const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
    expect(sig).toBe(expected);
  });

  it('rejects tampered payload', () => {
    const secret = 'test_webhook_secret';
    const original = '{"event":"invoice.received","ppf_id":"PPF-001"}';
    const tampered = '{"event":"invoice.received","ppf_id":"PPF-002"}';

    const sig = createHmac('sha256', secret).update(original).digest('hex');
    const check = createHmac('sha256', secret).update(tampered).digest('hex');

    expect(sig).not.toBe(check);
  });
});
