import type { Result } from '@zenadmin/shared';
import { ok, err, notFound } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';
import type { CreatePaymentInput } from './payment.schemas.js';

// BUSINESS RULE [CDC-2.1]: Enregistrement paiements

export interface Payment {
  id: string;
  tenant_id: string;
  invoice_id: string;
  amount_cents: number;
  payment_date: Date;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  created_at: Date;
}

export interface PaymentRepository {
  create(data: {
    tenant_id: string;
    invoice_id: string;
    amount_cents: number;
    payment_date: Date;
    payment_method: string;
    reference?: string;
    notes?: string;
  }): Promise<Payment>;
  findByInvoice(invoiceId: string, tenantId: string): Promise<Payment[]>;
}

export function createPaymentService(repo: PaymentRepository) {
  return {
    async create(tenantId: string, invoiceId: string, input: CreatePaymentInput): Promise<Result<Payment, AppError>> {
      const payment = await repo.create({
        tenant_id: tenantId,
        invoice_id: invoiceId,
        amount_cents: input.amount_cents,
        payment_date: input.payment_date,
        payment_method: input.payment_method,
        reference: input.reference,
        notes: input.notes,
      });
      return ok(payment);
    },

    async listByInvoice(invoiceId: string, tenantId: string): Promise<Result<Payment[], AppError>> {
      const payments = await repo.findByInvoice(invoiceId, tenantId);
      return ok(payments);
    },
  };
}
