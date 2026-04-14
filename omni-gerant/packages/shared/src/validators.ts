import { z } from 'zod';

// BUSINESS RULE [R08]: Validation avec Zod a l'entree de chaque endpoint

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().email().toLowerCase().trim();

export const siretSchema = z
  .string()
  .regex(/^\d{14}$/, 'SIRET must be 14 digits')
  .transform((v) => v.replace(/\s/g, ''));

export const sirenSchema = z
  .string()
  .regex(/^\d{9}$/, 'SIREN must be 9 digits')
  .transform((v) => v.replace(/\s/g, ''));

export const phoneSchema = z
  .string()
  .regex(/^(\+33|0)[1-9](\d{2}){4}$/, 'Invalid French phone number')
  .transform((v) => v.replace(/\s/g, ''));

export const moneyAmountSchema = z
  .number()
  .int('Amount must be an integer (centimes)')
  .min(-999_999_999_99, 'Amount too small')
  .max(999_999_999_99, 'Amount too large');

export const tvaRateSchema = z
  .number()
  .int()
  .refine((v) => [2000, 1000, 550, 210, 0].includes(v), {
    message: 'Invalid TVA rate. Must be 2000 (20%), 1000 (10%), 550 (5.5%), 210 (2.1%), or 0',
  });

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  direction: z.enum(['forward', 'backward']).default('forward'),
});

export const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
}).refine((data) => data.from <= data.to, {
  message: 'from must be before to',
});

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit');
