import type { JobCategory, PhysicalConstraint, WorkSchedule, TrainingRequirement } from './hr.schemas.js';

// BUSINESS RULE [CDC-2.4]: Modele de poste pour le module RH / DUERP

export interface JobPosition {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  category: JobCategory;
  headcount: number;
  workUnitIds: string[];
  equipmentUsed: string[];
  chemicalExposures: string[];
  physicalConstraints: PhysicalConstraint[];
  workSchedule: WorkSchedule;
  mandatoryTrainings: TrainingRequirement[];
  medicalSurveillanceLevel: 'standard' | 'enhanced';
  isActive: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// BUSINESS RULE [CDC-2.4]: Calcul automatique du niveau de surveillance medicale
export function computeMedicalSurveillance(position: {
  physicalConstraints: PhysicalConstraint[];
  chemicalExposures: string[];
  workSchedule: WorkSchedule;
}): 'standard' | 'enhanced' {
  // Night work triggers enhanced surveillance (Art. R4624-18)
  if (position.workSchedule.nightWork) return 'enhanced';

  // Chemical exposures (CMR agents) trigger enhanced surveillance
  if (position.chemicalExposures.length > 0) return 'enhanced';

  // Specific physical constraints trigger enhanced surveillance
  const enhancedTriggers: PhysicalConstraint['type'][] = [
    'vibrations', 'noise', 'height_work', 'confined_space',
  ];
  const hasEnhancedConstraint = position.physicalConstraints.some(
    (c) => enhancedTriggers.includes(c.type) && (c.frequency === 'frequent' || c.frequency === 'daily'),
  );
  if (hasEnhancedConstraint) return 'enhanced';

  return 'standard';
}

// BUSINESS RULE [CDC-2.4]: Generation du slug depuis le nom
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
