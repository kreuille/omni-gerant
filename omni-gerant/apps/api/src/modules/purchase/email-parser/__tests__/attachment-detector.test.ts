import { describe, it, expect } from 'vitest';
import {
  detectInvoiceAttachments,
  isAlreadyProcessed,
  type EmailMessage,
  type EmailAttachment,
} from '../attachment-detector.js';

const KNOWN_EMAILS = new Set(['factures@materiauxpro.fr', 'comptabilite@edf.fr']);

function createEmail(overrides: Partial<EmailMessage> = {}): EmailMessage {
  return {
    messageId: 'msg-001',
    from: 'contact@unknown.com',
    subject: 'Informations',
    date: new Date(),
    attachments: [],
    flags: [],
    ...overrides,
  };
}

function createAttachment(overrides: Partial<EmailAttachment> = {}): EmailAttachment {
  return {
    filename: 'document.pdf',
    contentType: 'application/pdf',
    size: 50000,
    ...overrides,
  };
}

describe('AttachmentDetector', () => {
  describe('detectInvoiceAttachments', () => {
    it('detects PDF with "facture" in filename', () => {
      const email = createEmail({
        attachments: [createAttachment({ filename: 'facture-2026-042.pdf' })],
      });

      const results = detectInvoiceAttachments(email, KNOWN_EMAILS);

      expect(results).toHaveLength(1);
      expect(results[0]!.confidence).toBeGreaterThanOrEqual(0.3);
      expect(results[0]!.reason).toContain('filename_match');
    });

    it('detects attachment with "invoice" in filename', () => {
      const email = createEmail({
        attachments: [createAttachment({ filename: 'invoice_april_2026.pdf' })],
      });

      const results = detectInvoiceAttachments(email, KNOWN_EMAILS);
      expect(results).toHaveLength(1);
    });

    it('detects attachment with "avoir" in filename', () => {
      const email = createEmail({
        attachments: [createAttachment({ filename: 'avoir-AV2026001.pdf' })],
      });

      const results = detectInvoiceAttachments(email, KNOWN_EMAILS);
      expect(results).toHaveLength(1);
    });

    it('detects attachment from known supplier email', () => {
      const email = createEmail({
        from: 'factures@materiauxpro.fr',
        attachments: [createAttachment({ filename: 'document.pdf' })],
      });

      const results = detectInvoiceAttachments(email, KNOWN_EMAILS);
      expect(results).toHaveLength(1);
      expect(results[0]!.reason).toContain('known_supplier');
    });

    it('boosts confidence when subject contains invoice keywords', () => {
      const email = createEmail({
        subject: 'Votre facture du mois d\'avril',
        attachments: [createAttachment({ filename: 'facture.pdf' })],
      });

      const results = detectInvoiceAttachments(email, KNOWN_EMAILS);
      expect(results).toHaveLength(1);
      expect(results[0]!.reason).toContain('subject_match');
    });

    it('rejects non-PDF/image attachments', () => {
      const email = createEmail({
        attachments: [
          createAttachment({ filename: 'facture.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
        ],
      });

      const results = detectInvoiceAttachments(email, KNOWN_EMAILS);
      expect(results).toHaveLength(0);
    });

    it('rejects tiny files (likely logos/signatures)', () => {
      const email = createEmail({
        attachments: [createAttachment({ filename: 'facture.png', size: 500 })],
      });

      const results = detectInvoiceAttachments(email, KNOWN_EMAILS);
      expect(results).toHaveLength(0);
    });

    it('accepts JPEG attachments', () => {
      const email = createEmail({
        from: 'factures@materiauxpro.fr',
        attachments: [createAttachment({ filename: 'scan.jpg', contentType: 'image/jpeg' })],
      });

      const results = detectInvoiceAttachments(email, KNOWN_EMAILS);
      expect(results).toHaveLength(1);
    });

    it('handles multiple attachments', () => {
      const email = createEmail({
        from: 'factures@materiauxpro.fr',
        attachments: [
          createAttachment({ filename: 'facture-001.pdf' }),
          createAttachment({ filename: 'logo.png', size: 200 }),
          createAttachment({ filename: 'avoir-001.pdf' }),
        ],
      });

      const results = detectInvoiceAttachments(email, KNOWN_EMAILS);
      expect(results).toHaveLength(2); // facture + avoir, not logo (too small)
    });

    it('returns empty for emails without attachments', () => {
      const email = createEmail({ attachments: [] });
      const results = detectInvoiceAttachments(email, KNOWN_EMAILS);
      expect(results).toHaveLength(0);
    });

    it('rejects generic PDFs from unknown senders', () => {
      const email = createEmail({
        from: 'random@example.com',
        subject: 'Hello',
        attachments: [createAttachment({ filename: 'document.pdf' })],
      });

      const results = detectInvoiceAttachments(email, KNOWN_EMAILS);
      expect(results).toHaveLength(0);
    });

    it('detects by supplier domain match', () => {
      const email = createEmail({
        from: 'noreply@materiauxpro.fr',
        attachments: [createAttachment({ filename: 'file.pdf' })],
      });

      const results = detectInvoiceAttachments(email, KNOWN_EMAILS);
      expect(results).toHaveLength(1);
      expect(results[0]!.reason).toContain('known_supplier');
    });
  });

  describe('isAlreadyProcessed', () => {
    it('returns true when email has processed label', () => {
      const email = createEmail({ flags: ['ZenAdmin/Traite'] });
      expect(isAlreadyProcessed(email, 'ZenAdmin/Traite')).toBe(true);
    });

    it('returns false when email is not processed', () => {
      const email = createEmail({ flags: ['\\Seen'] });
      expect(isAlreadyProcessed(email, 'ZenAdmin/Traite')).toBe(false);
    });

    it('returns false when no flags', () => {
      const email = createEmail({ flags: undefined });
      expect(isAlreadyProcessed(email, 'ZenAdmin/Traite')).toBe(false);
    });
  });
});
