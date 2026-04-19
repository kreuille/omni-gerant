import { z } from 'zod';

// BUSINESS RULE [R08]: Validation aux frontieres

const quoteLineSchema = z.object({
  product_id: z.string().uuid().optional(),
  position: z.number().int().min(0),
  type: z.enum(['line', 'section', 'subtotal', 'comment']).default('line'),
  label: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  quantity: z.number().min(0).default(1),
  unit: z.string().max(20).default('unit'),
  unit_price_cents: z.number().int().min(0).default(0),
  // BUSINESS RULE [R02]: TVA en basis points (2000 = 20.00%)
  tva_rate: z.number().int().min(0).max(10000).default(2000),
  discount_type: z.enum(['percentage', 'fixed']).optional(),
  discount_value: z.number().int().min(0).optional(),
});

export const createQuoteSchema = z.object({
  client_id: z.string().uuid(),
  title: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  validity_days: z.number().int().min(1).max(365).default(30),
  deposit_rate: z.number().int().min(0).max(10000).optional(),
  discount_type: z.enum(['percentage', 'fixed']).optional(),
  discount_value: z.number().int().min(0).optional(),
  notes: z.string().max(5000).optional(),
  lines: z.array(quoteLineSchema).min(1),
});

export const updateQuoteSchema = z.object({
  client_id: z.string().uuid().optional(),
  title: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  validity_days: z.number().int().min(1).max(365).optional(),
  deposit_rate: z.number().int().min(0).max(10000).optional().nullable(),
  discount_type: z.enum(['percentage', 'fixed']).optional().nullable(),
  discount_value: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  lines: z.array(quoteLineSchema).min(1).optional(),
});

export const quoteListSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['draft', 'sent', 'viewed', 'signed', 'refused', 'expired']).optional(),
  client_id: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type QuoteListInput = z.infer<typeof quoteListSchema>;
