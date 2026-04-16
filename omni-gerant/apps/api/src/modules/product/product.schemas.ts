import { z } from 'zod';

// BUSINESS RULE [R02]: Prix en centimes (entiers, jamais de floats)
// BUSINESS RULE [CDC-2.1]: Taux de TVA multiples (20%, 10%, 5.5%, 2.1%)

export const createProductSchema = z.object({
  type: z.enum(['service', 'product']).default('service'),
  reference: z.string().max(50).optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  unit: z.enum(['unit', 'hour', 'day', 'm2', 'ml', 'kg', 'forfait']).default('unit'),
  unit_price_cents: z.number().int().min(0).max(999_999_99),
  tva_rate: z
    .number()
    .refine((v) => [20, 10, 5.5, 2.1, 0].includes(v), {
      message: 'TVA rate must be 20 (20%), 10 (10%), 5.5 (5.5%), 2.1 (2.1%), or 0',
    })
    .default(20),
  category: z.string().max(100).optional(),
  is_active: z.boolean().default(true),
});

export const updateProductSchema = z.object({
  type: z.enum(['service', 'product']).optional(),
  reference: z.string().max(50).optional().nullable(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  unit: z.enum(['unit', 'hour', 'day', 'm2', 'ml', 'kg', 'forfait']).optional(),
  unit_price_cents: z.number().int().min(0).max(999_999_99).optional(),
  tva_rate: z
    .number()
    .refine((v) => [20, 10, 5.5, 2.1, 0].includes(v))
    .optional(),
  category: z.string().max(100).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const productListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  type: z.enum(['service', 'product']).optional(),
  is_active: z.coerce.boolean().optional(),
  sort_by: z.enum(['name', 'reference', 'created_at', 'unit_price_cents']).default('name'),
  sort_dir: z.enum(['asc', 'desc']).default('asc'),
});

// CSV import schema for supplier catalogs
export const csvProductRowSchema = z.object({
  reference: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  unit: z.string().optional(),
  unit_price: z.coerce.number().min(0),
  tva_rate: z.coerce.number().optional(),
  category: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type CsvProductRow = z.infer<typeof csvProductRowSchema>;
