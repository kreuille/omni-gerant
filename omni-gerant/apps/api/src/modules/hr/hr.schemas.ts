import { z } from 'zod';

// ── Job Categories ──────────────────────────────────────────────────
export const jobCategorySchema = z.enum([
  'ouvrier',
  'employe',
  'technicien',
  'cadre',
  'apprenti',
  'stagiaire',
  'interimaire',
  'dirigeant',
]);
export type JobCategory = z.infer<typeof jobCategorySchema>;

// ── Physical Constraints ────────────────────────────────────────────
export const physicalConstraintTypeSchema = z.enum([
  'manual_handling',
  'repetitive_movements',
  'forced_postures',
  'vibrations',
  'noise',
  'extreme_temperatures',
  'night_work',
  'shift_work',
  'prolonged_standing',
  'prolonged_sitting',
  'driving',
  'height_work',
  'confined_space',
]);

export const frequencySchema = z.enum(['rare', 'occasional', 'frequent', 'daily']);

export const physicalConstraintSchema = z.object({
  type: physicalConstraintTypeSchema,
  frequency: frequencySchema,
  description: z.string().max(500).optional(),
});
export type PhysicalConstraint = z.infer<typeof physicalConstraintSchema>;

// ── Work Schedule ───────────────────────────────────────────────────
export const workScheduleSchema = z.object({
  type: z.enum(['standard', 'shift', 'night', 'weekend', 'on_call', 'flexible']),
  weeklyHours: z.number().int().min(1).max(60).default(35),
  nightWork: z.boolean().default(false),
  weekendWork: z.boolean().default(false),
  outdoorWork: z.boolean().default(false),
  travelRequired: z.boolean().default(false),
  remoteWork: z.boolean().default(false),
});
export type WorkSchedule = z.infer<typeof workScheduleSchema>;

// ── Training Requirement ────────────────────────────────────────────
export const trainingRequirementSchema = z.object({
  trainingName: z.string().min(1).max(200),
  isObtained: z.boolean().default(false),
  obtainedDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  validityYears: z.number().int().min(1).max(10).optional(),
  legalBasis: z.string().max(200).default(''),
  priority: z.enum(['mandatory', 'recommended']).default('mandatory'),
});
export type TrainingRequirement = z.infer<typeof trainingRequirementSchema>;

// ── Contract Types ──────────────────────────────────────────────────
export const contractTypeSchema = z.enum([
  'cdi', 'cdd', 'interim', 'apprentice', 'intern', 'seasonal',
]);
export type ContractType = z.infer<typeof contractTypeSchema>;

// ── Medical Visit ───────────────────────────────────────────────────
export const medicalVisitTypeSchema = z.enum([
  'embauche', 'periodique', 'reprise', 'pre_reprise', 'occasionnelle',
]);

export const medicalVisitResultSchema = z.enum([
  'apte', 'apte_avec_reserves', 'inapte_temporaire', 'inapte',
]);

export const medicalVisitRecordSchema = z.object({
  type: medicalVisitTypeSchema,
  date: z.string().datetime(),
  result: medicalVisitResultSchema,
  restrictions: z.string().max(500).optional(),
  nextVisitDate: z.string().datetime().optional(),
});
export type MedicalVisitRecord = z.infer<typeof medicalVisitRecordSchema>;

// ── Training Record ─────────────────────────────────────────────────
export const trainingRecordSchema = z.object({
  trainingName: z.string().min(1).max(200),
  obtainedDate: z.string().datetime(),
  expiryDate: z.string().datetime().optional(),
  certificateRef: z.string().max(100).optional(),
  provider: z.string().max(200).optional(),
});
export type TrainingRecord = z.infer<typeof trainingRecordSchema>;

// ── Create/Update Position ──────────────────────────────────────────
export const createPositionSchema = z.object({
  name: z.string().min(1).max(255),
  category: jobCategorySchema,
  headcount: z.number().int().min(0).default(1),
  workUnitIds: z.array(z.string()).default([]),
  equipmentUsed: z.array(z.string().max(200)).default([]),
  chemicalExposures: z.array(z.string().max(200)).default([]),
  physicalConstraints: z.array(physicalConstraintSchema).default([]),
  workSchedule: workScheduleSchema.optional(),
  mandatoryTrainings: z.array(trainingRequirementSchema).default([]),
  medicalSurveillanceLevel: z.enum(['standard', 'enhanced']).default('standard'),
});
export type CreatePositionInput = z.infer<typeof createPositionSchema>;

export const updatePositionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: jobCategorySchema.optional(),
  headcount: z.number().int().min(0).optional(),
  workUnitIds: z.array(z.string()).optional(),
  equipmentUsed: z.array(z.string().max(200)).optional(),
  chemicalExposures: z.array(z.string().max(200)).optional(),
  physicalConstraints: z.array(physicalConstraintSchema).optional(),
  workSchedule: workScheduleSchema.optional(),
  mandatoryTrainings: z.array(trainingRequirementSchema).optional(),
  medicalSurveillanceLevel: z.enum(['standard', 'enhanced']).optional(),
});
export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;

// ── Create/Update Employee ──────────────────────────────────────────
export const createEmployeeSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  jobPositionId: z.string().uuid(),
  workUnitIds: z.array(z.string()).default([]),
  hireDate: z.string().datetime(),
  contractType: contractTypeSchema,
  isPartTime: z.boolean().default(false),
  weeklyHours: z.number().int().min(1).max(60).optional(),
  specificTrainings: z.array(trainingRecordSchema).default([]),
  medicalVisits: z.array(medicalVisitRecordSchema).default([]),
  specificRestrictions: z.string().max(500).optional(),
});
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  jobPositionId: z.string().uuid().optional(),
  workUnitIds: z.array(z.string()).optional(),
  hireDate: z.string().datetime().optional(),
  contractType: contractTypeSchema.optional(),
  isPartTime: z.boolean().optional(),
  weeklyHours: z.number().int().min(1).max(60).optional().nullable(),
  specificTrainings: z.array(trainingRecordSchema).optional(),
  medicalVisits: z.array(medicalVisitRecordSchema).optional(),
  specificRestrictions: z.string().max(500).optional().nullable(),
});
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

// ── List Queries ────────────────────────────────────────────────────
export const positionListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(100).optional(),
  category: jobCategorySchema.optional(),
  sort_by: z.enum(['name', 'created_at', 'headcount']).default('name'),
  sort_dir: z.enum(['asc', 'desc']).default('asc'),
});
export type PositionListQuery = z.infer<typeof positionListQuerySchema>;

export const employeeListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(100).optional(),
  jobPositionId: z.string().uuid().optional(),
  contractType: contractTypeSchema.optional(),
  sort_by: z.enum(['lastName', 'created_at', 'hireDate']).default('lastName'),
  sort_dir: z.enum(['asc', 'desc']).default('asc'),
});
export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;
