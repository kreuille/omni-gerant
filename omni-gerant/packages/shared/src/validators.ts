import { z } from 'zod';

// BUSINESS RULE [R08]: Validation avec Zod a l'entree de chaque endpoint

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().email().toLowerCase().trim();

// P1-02 : Algorithme de Luhn (INSEE) pour SIREN/SIRET
export function luhnCheck(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  const len = digits.length;
  for (let i = 0; i < len; i++) {
    // parite : doubler les positions paires en partant de la droite (1-indexe)
    const fromRight = len - i;
    let d = Number(digits[i]);
    if (fromRight % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export const siretSchema = z
  .string()
  .transform((v) => v.replace(/\s/g, ''))
  .refine((v) => /^\d{14}$/.test(v), { message: 'Le SIRET doit contenir 14 chiffres.' })
  .refine((v) => luhnCheck(v), { message: 'Le SIRET est invalide (échec du contrôle Luhn).' });

export const sirenSchema = z
  .string()
  .transform((v) => v.replace(/\s/g, ''))
  .refine((v) => /^\d{9}$/.test(v), { message: 'Le SIREN doit contenir 9 chiffres.' })
  .refine((v) => luhnCheck(v), { message: 'Le SIREN est invalide (échec du contrôle Luhn).' });

// P1-03 : IBAN MOD-97 (ISO 13616)
const IBAN_LENGTHS: Record<string, number> = {
  FR: 27, BE: 16, DE: 22, ES: 24, IT: 27, LU: 20, MC: 27, PT: 25, NL: 18,
  AT: 20, CH: 21, GB: 22, IE: 22, DK: 18, FI: 18, SE: 24, PL: 28, CZ: 24,
};
export function ibanCheck(iban: string): boolean {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  if (clean.length < 4) return false;
  const country = clean.slice(0, 2);
  const expected = IBAN_LENGTHS[country];
  if (expected && clean.length !== expected) return false;
  if (!/^[A-Z0-9]+$/.test(clean)) return false;
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  const numeric = rearranged.split('').map((c) => {
    const code = c.charCodeAt(0);
    return code >= 65 && code <= 90 ? String(code - 55) : c;
  }).join('');
  // mod97 sur string longue
  let remainder = 0;
  for (const ch of numeric) remainder = (remainder * 10 + Number(ch)) % 97;
  return remainder === 1;
}

export const ibanSchema = z
  .string()
  .transform((v) => v.replace(/\s/g, '').toUpperCase())
  .refine((v) => /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(v), { message: 'Format IBAN invalide.' })
  .refine(ibanCheck, { message: 'IBAN invalide (longueur ou clé MOD-97 incorrecte).' });

// P2-09 : Code NAF FR (format NN.NNA, ex 62.01Z)
export const nafCodeSchema = z
  .string()
  .transform((v) => v.toUpperCase().trim())
  .refine((v) => /^\d{2}\.\d{2}[A-Z]$/.test(v), {
    message: 'Code NAF invalide (format attendu : NN.NNA, ex : 62.01Z).',
  });

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
