import { z } from 'zod';

// BUSINESS RULE [CDC-2.2]: Validation schemas pour achats

const purchaseLineSchema = z.object({
  position: z.number().int().min(1),
  label: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unit_price_cents: z.number().int().min(0),
  tva_rate: z.number().refine(
    (rate) => [20, 10, 5.5, 2.1, 0].includes(rate),
    { message: 'TVA rate must be one of: 20 (20%), 10 (10%), 5.5 (5.5%), 2.1 (2.1%), 0 (0%)' },
  ),
});

export const createPurchaseSchema = z.object({
  supplier_id: z.string().uuid().optional(),
  number: z.string().max(100).optional(),
  source: z.enum(['manual', 'ocr', 'email', 'connector']).default('manual'),
  issue_date: z.string().datetime().optional(),
  due_date: z.string().datetime().optional(),
  category: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  document_url: z.string().url().optional(),
  lines: z.array(purchaseLineSchema).min(1),
});

export const updatePurchaseSchema = z.object({
  supplier_id: z.string().uuid().optional().nullable(),
  number: z.string().max(100).optional().nullable(),
  issue_date: z.string().datetime().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  document_url: z.string().url().optional().nullable(),
  lines: z.array(purchaseLineSchema).min(1).optional(),
});

export const purchaseListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  status: z.enum(['pending', 'validated', 'paid', 'disputed']).optional(),
  supplier_id: z.string().uuid().optional(),
  due_before: z.string().datetime().optional(),
  sort_by: z.enum(['issue_date', 'due_date', 'total_ttc_cents', 'created_at']).default('created_at'),
  sort_dir: z.enum(['asc', 'desc']).default('desc'),
});

export const validatePurchaseSchema = z.object({
  status: z.enum(['validated', 'disputed']),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;
export type PurchaseListQuery = z.infer<typeof purchaseListQuerySchema>;
export type PurchaseLineInput = z.infer<typeof purchaseLineSchema>;
export type ValidatePurchaseInput = z.infer<typeof validatePurchaseSchema>;
