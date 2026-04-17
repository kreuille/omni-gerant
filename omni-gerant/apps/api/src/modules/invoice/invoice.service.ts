import type { Result, PaginatedResult } from '@zenadmin/shared';
import { ok, err, notFound, forbidden } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';
import { calculateInvoiceTotals, calculateInvoiceLineTotal, calculateDepositTotals, type InvoiceLineInput } from './invoice-calculator.js';
import type { CreateInvoiceInput, InvoiceListInput } from './invoice.schemas.js';

// BUSINESS RULE [CDC-2.1]: Module Ventes - Factures CRUD

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  position: number;
  label: string;
  description: string | null;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  tva_rate: number;
  total_ht_cents: number;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  client_id: string;
  quote_id: string | null;
  number: string;
  type: string;
  status: string;
  issue_date: Date;
  due_date: Date;
  deposit_percent: number | null;
  situation_percent: number | null;
  previous_situation_cents: number | null;
  payment_terms: number;
  notes: string | null;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  paid_cents: number;
  remaining_cents: number;
  finalized_at: Date | null;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  lines: InvoiceLine[];
}

export interface InvoiceRepository {
  create(data: {
    tenant_id: string;
    client_id: string;
    quote_id?: string;
    number: string;
    type: string;
    due_date: Date;
    deposit_percent?: number;
    situation_percent?: number;
    previous_situation_cents?: number;
    payment_terms: number;
    notes?: string;
    total_ht_cents: number;
    total_tva_cents: number;
    total_ttc_cents: number;
    remaining_cents: number;
    lines: Array<{
      position: number;
      label: string;
      description?: string;
      quantity: number;
      unit: string;
      unit_price_cents: number;
      tva_rate: number;
      total_ht_cents: number;
    }>;
  }): Promise<Invoice>;
  findById(id: string, tenantId: string): Promise<Invoice | null>;
  findMany(params: {
    tenant_id: string;
    cursor?: string;
    limit: number;
    status?: string;
    type?: string;
    client_id?: string;
    search?: string;
  }): Promise<{ items: Invoice[]; next_cursor: string | null; has_more: boolean }>;
  updateStatus(id: string, tenantId: string, status: string, extra?: Record<string, unknown>): Promise<Invoice | null>;
  updatePayment(id: string, tenantId: string, paidCents: number, remainingCents: number, status: string, paidAt?: Date): Promise<Invoice | null>;
  delete(id: string, tenantId: string): Promise<boolean>;
}

export interface DocumentNumberGenerator {
  generate(tenantId: string): Promise<Result<string, AppError>>;
}

export function createInvoiceService(repo: InvoiceRepository, numberGen: DocumentNumberGenerator) {
  return {
    async create(tenantId: string, input: CreateInvoiceInput): Promise<Result<Invoice, AppError>> {
      const numberResult = await numberGen.generate(tenantId);
      if (!numberResult.ok) return numberResult as Result<Invoice, AppError>;

      // Calculate totals
      const lineInputs: InvoiceLineInput[] = input.lines.map((l) => ({
        quantity: l.quantity,
        unit_price_cents: l.unit_price_cents,
        tva_rate: l.tva_rate,
      }));

      let totals = calculateInvoiceTotals(lineInputs);

      // BUSINESS RULE [CDC-2.1]: Facture d'acompte
      if (input.type === 'deposit' && input.deposit_percent) {
        totals = calculateDepositTotals(totals, input.deposit_percent);
      }

      const linesWithTotals = input.lines.map((line) => ({
        ...line,
        description: line.description,
        total_ht_cents: calculateInvoiceLineTotal({
          quantity: line.quantity,
          unit_price_cents: line.unit_price_cents,
          tva_rate: line.tva_rate,
        }).total_ht_cents,
      }));

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (input.payment_terms ?? 30));

      const invoice = await repo.create({
        tenant_id: tenantId,
        client_id: input.client_id,
        quote_id: input.quote_id,
        number: numberResult.value,
        type: input.type ?? 'standard',
        due_date: dueDate,
        deposit_percent: input.deposit_percent,
        situation_percent: input.situation_percent,
        previous_situation_cents: input.previous_situation_cents,
        payment_terms: input.payment_terms ?? 30,
        notes: input.notes,
        total_ht_cents: totals.total_ht_cents,
        total_tva_cents: totals.total_tva_cents,
        total_ttc_cents: totals.total_ttc_cents,
        remaining_cents: totals.total_ttc_cents,
        lines: linesWithTotals,
      });

      return ok(invoice);
    },

    async getById(id: string, tenantId: string): Promise<Result<Invoice, AppError>> {
      const invoice = await repo.findById(id, tenantId);
      if (!invoice) return err(notFound('Invoice', id));
      return ok(invoice);
    },

    async list(tenantId: string, params: InvoiceListInput): Promise<Result<PaginatedResult<Invoice>, AppError>> {
      const result = await repo.findMany({
        tenant_id: tenantId,
        cursor: params.cursor,
        limit: params.limit ?? 20,
        status: params.status,
        type: params.type,
        client_id: params.client_id,
        search: params.search,
      });
      return ok({
        items: result.items,
        next_cursor: result.next_cursor,
        has_more: result.has_more,
      });
    },

    // BUSINESS RULE [CDC-2.1]: Fige la facture (plus modifiable, numero immuable)
    async finalize(id: string, tenantId: string): Promise<Result<Invoice, AppError>> {
      const invoice = await repo.findById(id, tenantId);
      if (!invoice) return err(notFound('Invoice', id));
      if (invoice.status !== 'draft') {
        return err(forbidden('Only draft invoices can be finalized'));
      }

      const updated = await repo.updateStatus(id, tenantId, 'finalized', { finalized_at: new Date() });
      if (!updated) return err(notFound('Invoice', id));
      return ok(updated);
    },

    // Record a payment
    async recordPayment(
      id: string,
      tenantId: string,
      amountCents: number,
    ): Promise<Result<Invoice, AppError>> {
      const invoice = await repo.findById(id, tenantId);
      if (!invoice) return err(notFound('Invoice', id));
      if (invoice.status === 'draft') {
        return err(forbidden('Cannot record payment on a draft invoice'));
      }
      if (invoice.status === 'cancelled') {
        return err(forbidden('Cannot record payment on a cancelled invoice'));
      }

      const newPaidCents = invoice.paid_cents + amountCents;
      const newRemainingCents = Math.max(0, invoice.total_ttc_cents - newPaidCents);

      // BUSINESS RULE: Si paid_cents >= total_ttc_cents → status = "paid"
      let newStatus = invoice.status;
      let paidAt: Date | undefined;
      if (newPaidCents >= invoice.total_ttc_cents) {
        newStatus = 'paid';
        paidAt = new Date();
      } else if (newPaidCents > 0) {
        newStatus = 'partially_paid';
      }

      const updated = await repo.updatePayment(id, tenantId, newPaidCents, newRemainingCents, newStatus, paidAt);
      if (!updated) return err(notFound('Invoice', id));
      return ok(updated);
    },

    async delete(id: string, tenantId: string): Promise<Result<void, AppError>> {
      const invoice = await repo.findById(id, tenantId);
      if (!invoice) return err(notFound('Invoice', id));
      if (invoice.status !== 'draft') {
        return err(forbidden('Cannot delete a finalized invoice'));
      }
      await repo.delete(id, tenantId);
      return ok(undefined);
    },
  };
}
