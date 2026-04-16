import { z } from 'zod';

// BUSINESS RULE [R08]: Validation aux frontieres

const invoiceLineSchema = z.object({
  position: z.number().int().min(0),
  label: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  quantity: z.number().min(0).default(1),
  unit: z.string().max(20).default('unit'),
  unit_price_cents: z.number().int().min(0).default(0),
  tva_rate: z.number().min(0).max(100).default(20),
});

export const createInvoiceSchema = z.object({
  client_id: z.string().uuid(),
  quote_id: z.string().uuid().optional(),
  type: z.enum(['standard', 'deposit', 'credit_note', 'situation']).default('standard'),
  payment_terms: z.number().int().min(0).max(365).default(30),
  deposit_percent: z.number().int().min(0).max(10000).optional(),
  situation_percent: z.number().int().min(0).max(10000).optional(),
  previous_situation_cents: z.number().int().min(0).optional(),
  notes: z.string().max(5000).optional(),
  lines: z.array(invoiceLineSchema).min(1),
});

export const invoiceListSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['draft', 'finalized', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled']).optional(),
  type: z.enum(['standard', 'deposit', 'credit_note', 'situation']).optional(),
  client_id: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type InvoiceListInput = z.infer<typeof invoiceListSchema>;
