import { z } from 'zod';

// BUSINESS RULE [CDC-2.4]: Schemas validation DUERP

export const riskEntrySchema = z.object({
  risk_id: z.string().optional(),
  category: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  gravity: z.number().int().min(1).max(4),
  probability: z.number().int().min(1).max(4),
  preventive_actions: z.array(z.string()).default([]),
  existing_measures: z.string().optional(),
  responsible: z.string().optional(),
  deadline: z.string().optional(),
});

export const workUnitSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(['chantier', 'atelier', 'bureau', 'vehicule', 'stockage', 'exterieur']),
  description: z.string().default(''),
});

export const createDuerpSchema = z.object({
  title: z.string().optional(),
  company_name: z.string().min(1),
  siret: z.string().optional(),
  naf_code: z.string().optional(),
  naf_label: z.string().optional(),
  address: z.string().optional(),
  employee_count: z.number().int().min(0).default(0),
  evaluator_name: z.string().min(1).optional().default('Responsable'),
  evaluation_date: z.string().optional(),
  convention_collective: z.string().optional(),
  code_idcc: z.string().optional(),
  work_units: z.array(workUnitSchema).default([]),
  risks: z.array(riskEntrySchema).default([]),
  notes: z.string().optional(),
});

export const updateDuerpSchema = z.object({
  title: z.string().optional(),
  risks: z.array(riskEntrySchema).optional(),
  work_units: z.array(workUnitSchema).optional(),
  evaluator_name: z.string().optional(),
  notes: z.string().optional(),
});

export type RiskEntry = z.infer<typeof riskEntrySchema>;
export type WorkUnitEntry = z.infer<typeof workUnitSchema>;
export type CreateDuerpInput = z.infer<typeof createDuerpSchema>;
export type UpdateDuerpInput = z.infer<typeof updateDuerpSchema>;
