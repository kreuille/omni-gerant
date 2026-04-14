import { z } from 'zod';

// BUSINESS RULE [CDC-2.4]: Schemas validation Registre RGPD

export const legalBasisEnum = z.enum([
  'contrat',
  'interet_legitime',
  'obligation_legale',
  'consentement',
]);

export const treatmentSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
  legal_basis: legalBasisEnum,
  data_categories: z.array(z.string().min(1)).min(1),
  data_subjects: z.string().min(1),
  recipients: z.array(z.string().min(1)).default([]),
  retention_period: z.string().min(1),
  security_measures: z.array(z.string().min(1)).default([]),
  transfer_outside_eu: z.boolean().default(false),
  transfer_details: z.string().optional(),
  notes: z.string().optional(),
});

export const createRegistrySchema = z.object({
  company_name: z.string().min(1),
  siret: z.string().optional(),
  dpo_name: z.string().optional(),
  dpo_email: z.string().email().optional(),
  prefill: z.boolean().default(true),
});

export const updateRegistrySchema = z.object({
  company_name: z.string().optional(),
  siret: z.string().optional(),
  dpo_name: z.string().optional(),
  dpo_email: z.string().optional(),
});

export const addTreatmentSchema = treatmentSchema;

export const updateTreatmentSchema = treatmentSchema.partial();

export type LegalBasis = z.infer<typeof legalBasisEnum>;
export type TreatmentInput = z.infer<typeof treatmentSchema>;
export type CreateRegistryInput = z.infer<typeof createRegistrySchema>;
export type UpdateRegistryInput = z.infer<typeof updateRegistrySchema>;
export type UpdateTreatmentInput = z.infer<typeof updateTreatmentSchema>;
