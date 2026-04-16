import type { Result } from '@zenadmin/shared';
import { ok, err, appError } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';
import type { EmailMessage, EmailAttachment } from './attachment-detector.js';

// BUSINESS RULE [CDC-2.2]: Connexion IMAP a la boite mail pro

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
  mailbox?: string;
}

export interface ImapClient {
  connect(config: ImapConfig): Promise<Result<void, AppError>>;
  disconnect(): Promise<void>;
  fetchNewMessages(since: Date): Promise<Result<EmailMessage[], AppError>>;
  markAsProcessed(messageId: string, label: string): Promise<Result<void, AppError>>;
}

// BUSINESS RULE [CDC-2.2]: Scan periodique des nouveaux emails
const PROCESSED_LABEL = 'ZenAdmin/Traite';

export function createEmailScanner(imapClient: ImapClient) {
  return {
    async scanForInvoices(
      config: ImapConfig,
      since: Date,
    ): Promise<Result<EmailMessage[], AppError>> {
      const connectResult = await imapClient.connect(config);
      if (!connectResult.ok) {
        return err(appError('SERVICE_UNAVAILABLE', `IMAP connection failed: ${connectResult.error.message}`));
      }

      try {
        const messagesResult = await imapClient.fetchNewMessages(since);
        if (!messagesResult.ok) {
          return err(messagesResult.error);
        }

        // Filter out already processed messages
        const newMessages = messagesResult.value.filter(
          (msg) => !msg.flags?.includes(PROCESSED_LABEL),
        );

        return ok(newMessages);
      } finally {
        await imapClient.disconnect();
      }
    },

    async markProcessed(
      config: ImapConfig,
      messageId: string,
    ): Promise<Result<void, AppError>> {
      const connectResult = await imapClient.connect(config);
      if (!connectResult.ok) {
        return err(connectResult.error);
      }

      try {
        return await imapClient.markAsProcessed(messageId, PROCESSED_LABEL);
      } finally {
        await imapClient.disconnect();
      }
    },

    getProcessedLabel() {
      return PROCESSED_LABEL;
    },
  };
}
