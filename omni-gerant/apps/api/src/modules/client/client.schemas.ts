import { z } from 'zod';

// P1-09 : sanitization XSS basique (strip balises HTML + entites dangereuses)
// Evite les exploits dans PDF servi via Puppeteer et autres rendus serveur.
function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')            // supprime balises
    .replace(/&[#a-zA-Z0-9]+;?/g, '')   // supprime entites
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}
const cleanString = (max: number) => z.string().max(max).transform(stripHtml);

export const createClientSchema = z.object({
  type: z.enum(['company', 'individual']).default('company'),
  company_name: cleanString(255).pipe(z.string().min(2, 'Le nom de l\'entreprise doit contenir au moins 2 caractères.')).optional(),
  siret: z
    .string()
    .regex(/^\d{14}$/, 'SIRET must be 14 digits')
    .optional(),
  first_name: cleanString(100).pipe(z.string().min(1)).optional(),
  last_name: cleanString(100).pipe(z.string().min(1)).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address_line1: cleanString(255).optional(),
  address_line2: cleanString(255).optional(),
  zip_code: z.string().max(10).optional(),
  city: cleanString(100).optional(),
  country: z.string().length(2).default('FR'),
  notes: cleanString(2000).optional(),
  payment_terms: z.number().int().min(0).max(365).default(30),
}).refine(
  (data) => {
    if (data.type === 'company') return !!data.company_name;
    return !!data.first_name && !!data.last_name;
  },
  { message: 'Company name is required for company type, first/last name for individual' },
);

export const updateClientSchema = z.object({
  type: z.enum(['company', 'individual']).optional(),
  company_name: z.string().min(1).max(255).optional(),
  siret: z.string().regex(/^\d{14}$/).optional().nullable(),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address_line1: z.string().max(255).optional().nullable(),
  address_line2: z.string().max(255).optional().nullable(),
  zip_code: z.string().max(10).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().length(2).optional(),
  notes: z.string().max(2000).optional().nullable(),
  payment_terms: z.number().int().min(0).max(365).optional(),
});

export const clientListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  type: z.enum(['company', 'individual']).optional(),
  city: z.string().max(100).optional(),
  sort_by: z.enum(['name', 'created_at']).default('name'),
  sort_dir: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ClientListQuery = z.infer<typeof clientListQuerySchema>;
