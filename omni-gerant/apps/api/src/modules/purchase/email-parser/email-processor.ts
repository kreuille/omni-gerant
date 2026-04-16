import type { Result } from '@omni-gerant/shared';
import { ok, err, appError } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';
import type { EmailMessage, DetectionResult } from './attachment-detector.js';
import { detectInvoiceAttachments } from './attachment-detector.js';
import type { OcrExtractionResult } from '../ocr-client.js';

// BUSINESS RULE [CDC-2.2]: Pipeline traitement email -> OCR -> Purchase

export interface ProcessedAttachment {
  messageId: string;
  from: string;
  subject: string;
  filename: string;
  ocrResult: OcrExtractionResult;
  detectionConfidence: number;
}

export interface EmailProcessorDeps {
  extractDocument: (file: Buffer, filename: string) => Promise<Result<OcrExtractionResult, AppError>>;
  createPurchase: (tenantId: string, data: {
    supplier_id?: string;
    number?: string;
    source: string;
    issue_date?: string;
    due_date?: string;
    lines: Array<{
      position: number;
      label: string;
      quantity: number;
      unit_price_cents: number;
      tva_rate: number;
    }>;
  }) => Promise<Result<{ id: string }, AppError>>;
  findSupplierByEmail: (tenantId: string, email: string) => Promise<string | null>;
  notifyUser: (tenantId: string, message: string) => Promise<void>;
}

export function createEmailProcessor(deps: EmailProcessorDeps) {
  return {
    async processEmails(
      tenantId: string,
      messages: EmailMessage[],
      knownSupplierEmails: Set<string>,
    ): Promise<Result<ProcessedAttachment[], AppError>> {
      const processed: ProcessedAttachment[] = [];

      for (const message of messages) {
        const detections = detectInvoiceAttachments(message, knownSupplierEmails);

        for (const detection of detections) {
          const result = await this.processDetection(tenantId, message, detection);
          if (result.ok) {
            processed.push(result.value);
          }
        }
      }

      return ok(processed);
    },

    async processDetection(
      tenantId: string,
      message: EmailMessage,
      detection: DetectionResult,
    ): Promise<Result<ProcessedAttachment, AppError>> {
      const { attachment } = detection;

      if (!attachment.content) {
        return err(appError('BAD_REQUEST', `No content for attachment: ${attachment.filename}`));
      }

      // Step 1: OCR extraction
      const ocrResult = await deps.extractDocument(attachment.content, attachment.filename);
      if (!ocrResult.ok) {
        return err(ocrResult.error);
      }

      // Step 2: Find supplier
      const supplierId = await deps.findSupplierByEmail(tenantId, message.from);

      // Step 3: Create purchase from OCR data
      const fields = ocrResult.value.fields;
      const lines = ocrResult.value.lines.length > 0
        ? ocrResult.value.lines.map((l, i) => ({
            position: i + 1,
            label: l.label,
            quantity: l.quantity,
            unit_price_cents: l.unit_price_cents,
            tva_rate: l.tva_rate,
          }))
        : [{
            position: 1,
            label: `Facture ${fields.invoice_number ?? attachment.filename}`,
            quantity: 1,
            unit_price_cents: fields.total_ht_cents ?? 0,
            tva_rate: 20,
          }];

      const purchaseResult = await deps.createPurchase(tenantId, {
        supplier_id: supplierId ?? undefined,
        number: fields.invoice_number ?? undefined,
        source: 'email',
        issue_date: fields.invoice_date ?? undefined,
        due_date: fields.due_date ?? undefined,
        lines,
      });

      if (!purchaseResult.ok) {
        return err(purchaseResult.error);
      }

      // Step 4: Notify user
      await deps.notifyUser(
        tenantId,
        `Nouvelle facture detectee dans l'email de ${message.from}: ${attachment.filename}`,
      );

      return ok({
        messageId: message.messageId,
        from: message.from,
        subject: message.subject,
        filename: attachment.filename,
        ocrResult: ocrResult.value,
        detectionConfidence: detection.confidence,
      });
    },
  };
}
