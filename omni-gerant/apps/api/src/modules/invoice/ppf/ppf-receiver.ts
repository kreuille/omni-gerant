import { ok, err } from '@omni-gerant/shared';
import type { Result, AppError } from '@omni-gerant/shared';
import type { createPpfClient, PpfIncomingInvoice } from './ppf-client.js';

// BUSINESS RULE [CDC-2.1]: Reception factures entrantes via PPF
// Flux: webhook PPF → telechargement Factur-X → extraction donnees → creation Purchase

export interface ReceivedInvoiceRecord {
  id: string;
  tenant_id: string;
  ppf_id: string;
  sender_siret: string;
  sender_name: string;
  invoice_number: string;
  invoice_date: string;
  amount_ht_cents: number;
  amount_ttc_cents: number;
  tax_amount_cents: number;
  facturx_xml: string;
  purchase_id?: string;
  status: 'received' | 'processed' | 'rejected';
  received_at: Date;
}

export interface ReceivedInvoiceRepository {
  create(data: Omit<ReceivedInvoiceRecord, 'id'>): Promise<ReceivedInvoiceRecord>;
  findByPpfId(ppfId: string): Promise<ReceivedInvoiceRecord | null>;
  updatePurchaseId(id: string, purchaseId: string): Promise<void>;
  updateStatus(id: string, status: ReceivedInvoiceRecord['status']): Promise<void>;
  findByTenant(tenantId: string): Promise<ReceivedInvoiceRecord[]>;
}

export interface PurchaseCreator {
  createFromPpf(tenantId: string, invoice: ReceivedInvoiceRecord): Promise<string>;
}

export function createPpfReceiver(
  ppfClient: ReturnType<typeof createPpfClient>,
  repo: ReceivedInvoiceRepository,
  purchaseCreator?: PurchaseCreator,
) {
  return {
    /**
     * Handle incoming invoice webhook from PPF
     */
    async handleIncomingInvoice(
      tenantId: string,
      incoming: PpfIncomingInvoice,
    ): Promise<Result<ReceivedInvoiceRecord, AppError>> {
      // Check for duplicate
      const existing = await repo.findByPpfId(incoming.ppf_id);
      if (existing) {
        return ok(existing);
      }

      const record = await repo.create({
        tenant_id: tenantId,
        ppf_id: incoming.ppf_id,
        sender_siret: incoming.sender_siret,
        sender_name: incoming.sender_name,
        invoice_number: incoming.invoice_number,
        invoice_date: incoming.invoice_date,
        amount_ht_cents: incoming.amount_ht_cents,
        amount_ttc_cents: incoming.amount_ttc_cents,
        tax_amount_cents: incoming.tax_amount_cents,
        facturx_xml: incoming.facturx_xml,
        status: 'received',
        received_at: new Date(),
      });

      // Auto-create purchase if creator available
      if (purchaseCreator) {
        try {
          const purchaseId = await purchaseCreator.createFromPpf(tenantId, record);
          await repo.updatePurchaseId(record.id, purchaseId);
          await repo.updateStatus(record.id, 'processed');
          return ok({ ...record, purchase_id: purchaseId, status: 'processed' as const });
        } catch {
          // Purchase creation failed, but invoice is still received
          return ok(record);
        }
      }

      return ok(record);
    },

    /**
     * Poll PPF for new incoming invoices
     */
    async pollIncoming(
      tenantId: string,
      since?: string,
    ): Promise<Result<ReceivedInvoiceRecord[], AppError>> {
      try {
        const invoices = await ppfClient.listIncomingInvoices(since);
        const processed: ReceivedInvoiceRecord[] = [];

        for (const invoice of invoices) {
          const result = await this.handleIncomingInvoice(tenantId, invoice);
          if (result.ok) {
            processed.push(result.value);
          }
        }

        return ok(processed);
      } catch (error) {
        return err({
          code: 'PPF_POLL_ERROR',
          message: `Erreur interrogation PPF: ${error instanceof Error ? error.message : 'inconnue'}`,
        });
      }
    },

    /**
     * List received invoices for a tenant
     */
    async listReceived(tenantId: string): Promise<Result<ReceivedInvoiceRecord[], AppError>> {
      const records = await repo.findByTenant(tenantId);
      return ok(records);
    },
  };
}
