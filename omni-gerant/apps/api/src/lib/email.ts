import type { Result } from '@zenadmin/shared';
import { ok, err, appError } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';

// BUSINESS RULE [CDC-2.1]: Envoi email transactionnel (Resend ou SMTP)

export interface EmailAttachment {
  filename: string;
  content: string; // base64
  content_type?: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  reply_to?: string;
  attachments?: EmailAttachment[];
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
    async send(_options: EmailOptions): Promise<Result<{ messageId: string }, AppError>> {
      return err(appError('SERVICE_UNAVAILABLE', 'SMTP not configured'));
    },
  };
}

// BUSINESS RULE [CDC-2.1]: Resend provider pour emails transactionnels
// https://resend.com/docs/api-reference/emails/send-email
export function createResendEmailProvider(config: {
  apiKey: string;
  from: string;
  replyTo?: string;
  httpFetch?: typeof fetch;
}): EmailProvider {
  const httpFetch = config.httpFetch ?? globalThis.fetch;
  return {
    async send(options: EmailOptions): Promise<Result<{ messageId: string }, AppError>> {
      try {
        const response = await httpFetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: options.from ?? config.from,
            to: [options.to],
            subject: options.subject,
            html: options.html,
            text: options.text,
            reply_to: options.reply_to ?? config.replyTo,
            attachments: options.attachments?.map((a) => ({
              filename: a.filename,
              content: a.content,
              content_type: a.content_type,
            })),
          }),
        });

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          return err(appError('EMAIL_SEND_FAILED', `Resend returned ${response.status}: ${body.slice(0, 200)}`));
        }

        const data = await response.json() as { id?: string };
        return ok({ messageId: data.id ?? 'unknown' });
      } catch (error) {
        return err(appError(
          'EMAIL_SEND_FAILED',
          `Resend error: ${error instanceof Error ? error.message : 'unknown'}`,
        ));
      }
    },
  };
}

// BUSINESS RULE [CDC-2.1]: Selection auto du provider selon env vars
// RESEND_API_KEY present → Resend | sinon → Console
export function createDefaultEmailProvider(): EmailProvider {
  const resendKey = process.env['RESEND_API_KEY'];
  if (resendKey) {
    return createResendEmailProvider({
      apiKey: resendKey,
      from: process.env['EMAIL_FROM'] ?? 'onboarding@resend.dev',
      replyTo: process.env['EMAIL_REPLY_TO'],
    });
  }
  return createConsoleEmailProvider();
}

export function createEmailService(provider: EmailProvider) {
  return {
    async send(options: EmailOptions): Promise<Result<{ messageId: string }, AppError>> {
      return provider.send(options);
    },
  };
}
