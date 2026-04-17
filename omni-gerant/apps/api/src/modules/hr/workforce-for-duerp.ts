import type { JobPosition } from './workforce.js';
import type { Employee } from './employee.js';
import { getExpiredTrainings, getExpiringTrainings, getOverdueMedicalVisits, getUpcomingMedicalVisits } from './employee.js';
import type { PhysicalConstraint } from './hr.schemas.js';

// BUSINESS RULE [CDC-2.4]: Interface exposee au module DUERP
// Ce service formate les donnees RH pour consommation par le DUERP

export interface WorkforceForDuerp {
  totalHeadcount: number;
  positions: WorkforcePositionForDuerp[];
  trainingAlerts: WorkforceTrainingAlert[];
  medicalAlerts: WorkforceMedicalAlert[];
}

export interface WorkforcePositionForDuerp {
  id: string;
  name: string;
  category: string;
  headcount: number;
  workUnitIds: string[];
  specificRisks: {
    physicalConstraints: PhysicalConstraint[];
    chemicalExposures: string[];
    equipmentUsed: string[];
    nightWork: boolean;
    outdoorWork: boolean;
  };
  requiredTrainings: string[];
  trainingGaps: string[];
  medicalSurveillanceLevel: 'standard' | 'enhanced';
}

export interface WorkforceTrainingAlert {
  positionName: string;
  employeeName: string;
  trainingName: string;
  status: 'missing' | 'expiring_soon' | 'expired';
  expiryDate?: string;
}

export interface WorkforceMedicalAlert {
  positionName: string;
  employeeName: string;
  visitType: string;
  status: 'overdue' | 'due_soon';
  dueDate: string;
}

// BUSINESS RULE [CDC-2.4]: Assemblage des donnees RH pour le DUERP
export function buildWorkforceForDuerp(
  positions: JobPosition[],
  employees: Employee[],
  referenceDate: Date = new Date(),
): WorkforceForDuerp {
  const totalHeadcount = positions.reduce((acc, p) => acc + p.headcount, 0);
  const posMap = new Map(positions.map((p) => [p.id, p]));

  // Build training gaps per position
  const trainingGapsByPosition = new Map<string, Set<string>>();
  const trainingAlerts: WorkforceTrainingAlert[] = [];
  const medicalAlerts: WorkforceMedicalAlert[] = [];

  for (const emp of employees) {
    const pos = posMap.get(emp.jobPositionId);
    if (!pos) continue;

    const empName = `${emp.firstName} ${emp.lastName}`;

    // Check missing trainings
    for (const req of pos.mandatoryTrainings) {
      const hasTraining = emp.specificTrainings.some(
        (t) => t.trainingName.toLowerCase() === req.trainingName.toLowerCase(),
      );
      if (!hasTraining) {
        if (!trainingGapsByPosition.has(pos.id)) {
          trainingGapsByPosition.set(pos.id, new Set());
        }
        trainingGapsByPosition.get(pos.id)!.add(req.trainingName);
        trainingAlerts.push({
          positionName: pos.name,
          employeeName: empName,
          trainingName: req.trainingName,
          status: 'missing',
        });
      }
    }

    // Check expired trainings
    for (const t of getExpiredTrainings(emp.specificTrainings, referenceDate)) {
      trainingAlerts.push({
        positionName: pos.name,
        employeeName: empName,
        trainingName: t.trainingName,
        status: 'expired',
        expiryDate: t.expiryDate,
      });
    }

    // Check expiring soon trainings
    for (const t of getExpiringTrainings(emp.specificTrainings, 90, referenceDate)) {
      trainingAlerts.push({
        positionName: pos.name,
        employeeName: empName,
        trainingName: t.trainingName,
        status: 'expiring_soon',
        expiryDate: t.expiryDate,
      });
    }

    // Check overdue medical visits
    for (const v of getOverdueMedicalVisits(emp.medicalVisits, referenceDate)) {
      medicalAlerts.push({
        positionName: pos.name,
        employeeName: empName,
        visitType: v.type,
        status: 'overdue',
        dueDate: v.nextVisitDate!,
      });
    }

    // Check upcoming medical visits
    for (const v of getUpcomingMedicalVisits(emp.medicalVisits, 90, referenceDate)) {
      medicalAlerts.push({
        positionName: pos.name,
        employeeName: empName,
        visitType: v.type,
        status: 'due_soon',
        dueDate: v.nextVisitDate!,
      });
    }
  }

  // Build positions for DUERP
  const duerpPositions: WorkforcePositionForDuerp[] = positions.map((pos) => ({
    id: pos.id,
    name: pos.name,
    category: pos.category,
    headcount: pos.headcount,
    workUnitIds: pos.workUnitIds,
    specificRisks: {
      physicalConstraints: pos.physicalConstraints,
      chemicalExposures: pos.chemicalExposures,
      equipmentUsed: pos.equipmentUsed,
      nightWork: pos.workSchedule.nightWork,
      outdoorWork: pos.workSchedule.outdoorWork,
    },
    requiredTrainings: pos.mandatoryTrainings.map((t) => t.trainingName),
    trainingGaps: [...(trainingGapsByPosition.get(pos.id) ?? [])],
    medicalSurveillanceLevel: pos.medicalSurveillanceLevel,
  }));

  return {
    totalHeadcount,
    positions: duerpPositions,
    trainingAlerts,
    medicalAlerts,
  };
}
