import type { Result } from '@omni-gerant/shared';
import { ok, err, appError } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';

// BUSINESS RULE [CDC-2.1]: Envoi email transactionnel (Resend ou SMTP)

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  reply_to?: string;
}

export interface EmailProvider {
  send(options: EmailOptions): Promise<Result<{ messageId: string }, AppError>>;
}

// Console provider for development - logs emails instead of sending
export function createConsoleEmailProvider(): EmailProvider {
  return {
    async send(options: EmailOptions): Promise<Result<{ messageId: string }, AppError>> {
      const messageId = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      console.log(`[EMAIL] To: ${options.to} | Subject: ${options.subject} | ID: ${messageId}`);
      return ok({ messageId });
    },
  };
}

// SMTP provider placeholder - will use Nodemailer or Resend in production
export function createSmtpEmailProvider(_config: {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}): EmailProvider {
  return {
    async send(options: EmailOptions): Promise<Result<{ messageId: string }, AppError>> {
      // Placeholder - will implement with Nodemailer
      return err(appError('SERVICE_UNAVAILABLE', 'SMTP not configured'));
    },
  };
}

export function createEmailService(provider: EmailProvider) {
  return {
    async send(options: EmailOptions): Promise<Result<{ messageId: string }, AppError>> {
      return provider.send(options);
    },
  };
}
