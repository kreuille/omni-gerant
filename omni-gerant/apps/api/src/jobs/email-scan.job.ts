// BUSINESS RULE [CDC-2.2]: Job periodique scan emails (toutes les 15min)
// Uses BullMQ pattern for job scheduling

export interface EmailScanJobData {
  tenantId: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPasswordEncrypted: string;
  imapTls: boolean;
  lastScanAt: string; // ISO date
}

export interface EmailScanJobResult {
  scannedEmails: number;
  detectedInvoices: number;
  createdPurchases: number;
  errors: string[];
}

// Job name and configuration
export const EMAIL_SCAN_JOB = {
  name: 'email-scan',
  queue: 'purchase-emails',
  defaultRepeat: {
    every: 15 * 60 * 1000, // 15 minutes
  },
} as const;

// Job processor factory
export function createEmailScanProcessor(deps: {
  decryptPassword: (encrypted: string) => string;
  createImapClient: () => import('../modules/purchase/email-parser/email-scanner.js').ImapClient;
  getKnownSupplierEmails: (tenantId: string) => Promise<Set<string>>;
  processEmails: (
    tenantId: string,
    messages: import('../modules/purchase/email-parser/attachment-detector.js').EmailMessage[],
    knownEmails: Set<string>,
  ) => Promise<import('@zenadmin/shared').Result<unknown[], import('@zenadmin/shared').AppError>>;
  markProcessed: (
    config: import('../modules/purchase/email-parser/email-scanner.js').ImapConfig,
    messageId: string,
  ) => Promise<import('@zenadmin/shared').Result<void, import('@zenadmin/shared').AppError>>;
}) {
  return async function processEmailScanJob(
    data: EmailScanJobData,
  ): Promise<EmailScanJobResult> {
    const result: EmailScanJobResult = {
      scannedEmails: 0,
      detectedInvoices: 0,
      createdPurchases: 0,
      errors: [],
    };

    const imapConfig = {
      host: data.imapHost,
      port: data.imapPort,
      user: data.imapUser,
      password: deps.decryptPassword(data.imapPasswordEncrypted),
      tls: data.imapTls,
    };

    // Create scanner and fetch new messages
    const { createEmailScanner } = await import('../modules/purchase/email-parser/email-scanner.js');
    const imapClient = deps.createImapClient();
    const scanner = createEmailScanner(imapClient);

    const since = new Date(data.lastScanAt);
    const messagesResult = await scanner.scanForInvoices(imapConfig, since);

    if (!messagesResult.ok) {
      result.errors.push(`Scan failed: ${messagesResult.error.message}`);
      return result;
    }

    result.scannedEmails = messagesResult.value.length;

    // Get known supplier emails for detection
    const knownEmails = await deps.getKnownSupplierEmails(data.tenantId);

    // Process emails
    const processResult = await deps.processEmails(
      data.tenantId,
      messagesResult.value,
      knownEmails,
    );

    if (processResult.ok) {
      result.createdPurchases = processResult.value.length;
      result.detectedInvoices = processResult.value.length;

      // Mark emails as processed
      for (const msg of messagesResult.value) {
        await deps.markProcessed(imapConfig, msg.messageId);
      }
    } else {
      result.errors.push(`Processing failed: ${processResult.error.message}`);
    }

    return result;
  };
}
