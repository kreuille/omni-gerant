import { z } from 'zod';

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  siret: z
    .string()
    .regex(/^\d{14}$/, 'SIRET must be 14 digits')
    .optional(),
  siren: z
    .string()
    .regex(/^\d{9}$/, 'SIREN must be 9 digits')
    .optional(),
  naf_code: z.string().max(10).optional(),
  legal_form: z.string().max(50).optional(),
  address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      zip_code: z.string().optional(),
      city: z.string().optional(),
      country: z.string().default('FR'),
    })
    .optional(),
  settings: z.record(z.unknown()).optional(),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export const siretLookupSchema = z.object({
  siret: z.string().regex(/^\d{14}$/, 'SIRET must be 14 digits'),
});
