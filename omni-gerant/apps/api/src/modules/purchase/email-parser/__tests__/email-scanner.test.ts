import { describe, it, expect, vi } from 'vitest';
import { createEmailScanner, type ImapClient, type ImapConfig } from '../email-scanner.js';
import { ok, err, appError } from '@zenadmin/shared';
import type { EmailMessage } from '../attachment-detector.js';

const TEST_CONFIG: ImapConfig = {
  host: 'imap.example.com',
  port: 993,
  user: 'user@example.com',
  password: 'secret',
  tls: true,
};

const mockMessages: EmailMessage[] = [
  {
    messageId: 'msg-001',
    from: 'supplier@example.com',
    subject: 'Votre facture',
    date: new Date('2026-04-14'),
    attachments: [
      { filename: 'facture.pdf', contentType: 'application/pdf', size: 50000 },
    ],
    flags: [],
  },
  {
    messageId: 'msg-002',
    from: 'info@newsletter.com',
    subject: 'Newsletter',
    date: new Date('2026-04-14'),
    attachments: [],
    flags: ['ZenAdmin/Traite'],
  },
];

function createMockImapClient(overrides?: Partial<ImapClient>): ImapClient {
  return {
    connect: vi.fn().mockResolvedValue(ok(undefined)),
    disconnect: vi.fn().mockResolvedValue(undefined),
    fetchNewMessages: vi.fn().mockResolvedValue(ok(mockMessages)),
    markAsProcessed: vi.fn().mockResolvedValue(ok(undefined)),
    ...overrides,
  };
}

describe('EmailScanner', () => {
  describe('scanForInvoices', () => {
    it('connects, fetches, and filters processed messages', async () => {
      const client = createMockImapClient();
      const scanner = createEmailScanner(client);

      const result = await scanner.scanForInvoices(TEST_CONFIG, new Date('2026-04-01'));

      expect(result.ok).toBe(true);
      if (result.ok) {
        // msg-002 has the processed label, so only msg-001 should be returned
        expect(result.value).toHaveLength(1);
        expect(result.value[0]!.messageId).toBe('msg-001');
      }

      expect(client.connect).toHaveBeenCalledWith(TEST_CONFIG);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('returns error when IMAP connection fails', async () => {
      const client = createMockImapClient({
        connect: vi.fn().mockResolvedValue(err(appError('SERVICE_UNAVAILABLE', 'Connection refused'))),
      });
      const scanner = createEmailScanner(client);

      const result = await scanner.scanForInvoices(TEST_CONFIG, new Date());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
      }
    });

    it('returns error when fetch fails', async () => {
      const client = createMockImapClient({
        fetchNewMessages: vi.fn().mockResolvedValue(err(appError('INTERNAL_ERROR', 'Fetch failed'))),
      });
      const scanner = createEmailScanner(client);

      const result = await scanner.scanForInvoices(TEST_CONFIG, new Date());

      expect(result.ok).toBe(false);
    });

    it('always disconnects even on error', async () => {
      const client = createMockImapClient({
        fetchNewMessages: vi.fn().mockRejectedValue(new Error('Crash')),
      });
      const scanner = createEmailScanner(client);

      try {
        await scanner.scanForInvoices(TEST_CONFIG, new Date());
      } catch {
        // Expected
      }

      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('markProcessed', () => {
    it('marks a message with the processed label', async () => {
      const client = createMockImapClient();
      const scanner = createEmailScanner(client);

      const result = await scanner.markProcessed(TEST_CONFIG, 'msg-001');

      expect(result.ok).toBe(true);
      expect(client.markAsProcessed).toHaveBeenCalledWith('msg-001', 'ZenAdmin/Traite');
    });
  });

  describe('getProcessedLabel', () => {
    it('returns the label used for processed emails', () => {
      const client = createMockImapClient();
      const scanner = createEmailScanner(client);
      expect(scanner.getProcessedLabel()).toBe('ZenAdmin/Traite');
    });
  });
});
