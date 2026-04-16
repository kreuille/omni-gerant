import type { ContractType, TrainingRecord, MedicalVisitRecord } from './hr.schemas.js';

// BUSINESS RULE [CDC-2.4]: Fiche employe simplifiee pour module RH / DUERP

export interface Employee {
  id: string;
  tenant_id: string;
  firstName: string;
  lastName: string;
  jobPositionId: string;
  workUnitIds: string[];
  hireDate: string;
  contractType: ContractType;
  isPartTime: boolean;
  weeklyHours: number | null;
  specificTrainings: TrainingRecord[];
  medicalVisits: MedicalVisitRecord[];
  specificRestrictions: string | null;
  isActive: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// BUSINESS RULE [CDC-2.4]: Detection formations expirees
export function getExpiredTrainings(trainings: TrainingRecord[], referenceDate: Date = new Date()): TrainingRecord[] {
  return trainings.filter((t) => {
    if (!t.expiryDate) return false;
    return new Date(t.expiryDate) < referenceDate;
  });
}

// BUSINESS RULE [CDC-2.4]: Detection formations expirant dans N jours
export function getExpiringTrainings(trainings: TrainingRecord[], withinDays: number = 90, referenceDate: Date = new Date()): TrainingRecord[] {
  const threshold = new Date(referenceDate);
  threshold.setDate(threshold.getDate() + withinDays);
  return trainings.filter((t) => {
    if (!t.expiryDate) return false;
    const expiry = new Date(t.expiryDate);
    return expiry >= referenceDate && expiry <= threshold;
  });
}

// BUSINESS RULE [CDC-2.4]: Detection visites medicales en retard
export function getOverdueMedicalVisits(visits: MedicalVisitRecord[], referenceDate: Date = new Date()): MedicalVisitRecord[] {
  return visits.filter((v) => {
    if (!v.nextVisitDate) return false;
    return new Date(v.nextVisitDate) < referenceDate;
  });
}

// BUSINESS RULE [CDC-2.4]: Detection visites medicales a planifier dans N jours
export function getUpcomingMedicalVisits(visits: MedicalVisitRecord[], withinDays: number = 90, referenceDate: Date = new Date()): MedicalVisitRecord[] {
  const threshold = new Date(referenceDate);
  threshold.setDate(threshold.getDate() + withinDays);
  return visits.filter((v) => {
    if (!v.nextVisitDate) return false;
    const nextDate = new Date(v.nextVisitDate);
    return nextDate >= referenceDate && nextDate <= threshold;
  });
}
