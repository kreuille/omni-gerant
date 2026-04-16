import { ok, err } from '@zenadmin/shared';
import type { Result, AppError } from '@zenadmin/shared';
import type { createPpfClient, PpfInvoiceSubmission, PpfStatus } from './ppf-client.js';

// BUSINESS RULE [CDC-2.1]: Envoi factures au PPF avec suivi cycle de vie
// Flux: facture finalisee → Factur-X → transmission PPF → suivi statut

export interface PpfTransmissionRecord {
  id: string;
  tenant_id: string;
  invoice_id: string;
  invoice_number: string;
  ppf_id: string;
  status: PpfStatus;
  submitted_at: Date;
  last_status_check: Date;
  rejection_reason?: string;
}

export interface PpfTransmissionRepository {
  create(data: Omit<PpfTransmissionRecord, 'id'>): Promise<PpfTransmissionRecord>;
  findByInvoiceId(tenantId: string, invoiceId: string): Promise<PpfTransmissionRecord | null>;
  findByPpfId(ppfId: string): Promise<PpfTransmissionRecord | null>;
  updateStatus(id: string, status: PpfStatus, rejectionReason?: string): Promise<void>;
  findPending(tenantId: string): Promise<PpfTransmissionRecord[]>;
}

export interface InvoiceDataForPpf {
  id: string;
  number: string;
  date: string;
  sender_siret: string;
  receiver_siret: string;
  amount_ht_cents: number;
  amount_ttc_cents: number;
  tax_amount_cents: number;
  facturx_xml: string;
  pdf_base64?: string;
}

export function createPpfSender(
  ppfClient: ReturnType<typeof createPpfClient>,
  repo: PpfTransmissionRepository,
) {
  return {
    /**
     * Submit an invoice to PPF
     */
    async submitInvoice(
      tenantId: string,
      invoice: InvoiceDataForPpf,
    ): Promise<Result<PpfTransmissionRecord, AppError>> {
      // Check if already submitted
      const existing = await repo.findByInvoiceId(tenantId, invoice.id);
      if (existing) {
        return err({
          code: 'ALREADY_SUBMITTED',
          message: `Facture ${invoice.number} deja transmise au PPF (${existing.ppf_id})`,
        });
      }

      // Verify receiver is in PPF directory
      const directory = await ppfClient.lookupDirectory(invoice.receiver_siret);
      if (!directory || !directory.active) {
        return err({
          code: 'RECEIVER_NOT_FOUND',
          message: `Destinataire SIRET ${invoice.receiver_siret} non trouve dans l'annuaire PPF`,
        });
      }

      try {
        const submission: PpfInvoiceSubmission = {
          sender_siret: invoice.sender_siret,
          receiver_siret: invoice.receiver_siret,
          invoice_number: invoice.number,
          invoice_date: invoice.date,
          amount_ht_cents: invoice.amount_ht_cents,
          amount_ttc_cents: invoice.amount_ttc_cents,
          tax_amount_cents: invoice.tax_amount_cents,
          facturx_xml: invoice.facturx_xml,
          pdf_base64: invoice.pdf_base64,
        };

        const result = await ppfClient.submitInvoice(submission);

        const record = await repo.create({
          tenant_id: tenantId,
          invoice_id: invoice.id,
          invoice_number: invoice.number,
          ppf_id: result.ppf_id,
          status: result.status,
          submitted_at: new Date(),
          last_status_check: new Date(),
        });

        return ok(record);
      } catch (error) {
        return err({
          code: 'PPF_SUBMISSION_ERROR',
          message: `Erreur transmission PPF: ${error instanceof Error ? error.message : 'inconnue'}`,
        });
      }
    },

    /**
     * Check and update status of a pending transmission
     */
    async refreshStatus(
      ppfId: string,
    ): Promise<Result<PpfTransmissionRecord, AppError>> {
      const record = await repo.findByPpfId(ppfId);
      if (!record) {
        return err({ code: 'NOT_FOUND', message: `Transmission PPF ${ppfId} non trouvee` });
      }

      try {
        const statusResponse = await ppfClient.getInvoiceStatus(ppfId);
        await repo.updateStatus(record.id, statusResponse.status, statusResponse.rejection_reason);

        return ok({
          ...record,
          status: statusResponse.status,
          last_status_check: new Date(),
          rejection_reason: statusResponse.rejection_reason,
        });
      } catch (error) {
        return err({
          code: 'PPF_STATUS_ERROR',
          message: `Erreur verification statut: ${error instanceof Error ? error.message : 'inconnue'}`,
        });
      }
    },

    /**
     * Refresh all pending transmissions for a tenant
     */
    async refreshAllPending(
      tenantId: string,
    ): Promise<Result<PpfTransmissionRecord[], AppError>> {
      const pending = await repo.findPending(tenantId);
      const updated: PpfTransmissionRecord[] = [];

      for (const record of pending) {
        const result = await this.refreshStatus(record.ppf_id);
        if (result.ok) {
          updated.push(result.value);
        }
      }

      return ok(updated);
    },

    /**
     * Get transmission status for an invoice
     */
    async getTransmissionStatus(
      tenantId: string,
      invoiceId: string,
    ): Promise<Result<PpfTransmissionRecord | null, AppError>> {
      const record = await repo.findByInvoiceId(tenantId, invoiceId);
      return ok(record);
    },
  };
}
