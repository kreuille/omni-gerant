import type { Result, AppError, PaginatedResult } from '@zenadmin/shared';
import { ok, err, notFound } from '@zenadmin/shared';
import type { JobPosition } from './workforce.js';
import type { Employee } from './employee.js';
import { slugify, computeMedicalSurveillance } from './workforce.js';
import { getExpiredTrainings, getExpiringTrainings, getOverdueMedicalVisits, getUpcomingMedicalVisits } from './employee.js';
import type {
  CreatePositionInput, UpdatePositionInput, PositionListQuery,
  CreateEmployeeInput, UpdateEmployeeInput, EmployeeListQuery,
  WorkSchedule,
} from './hr.schemas.js';
import { findTemplateByNaf, autofillHeadcounts } from './job-templates.js';

// BUSINESS RULE [CDC-2.4]: Repository interfaces for HR module

export interface PositionRepository {
  create(data: CreatePositionInput & { tenant_id: string }): Promise<JobPosition>;
  findById(id: string, tenantId: string): Promise<JobPosition | null>;
  update(id: string, tenantId: string, data: UpdatePositionInput): Promise<JobPosition | null>;
  softDelete(id: string, tenantId: string): Promise<boolean>;
  list(tenantId: string, query: PositionListQuery): Promise<{ items: JobPosition[]; total: number }>;
  findAll(tenantId: string): Promise<JobPosition[]>;
}

export interface EmployeeRepository {
  create(data: CreateEmployeeInput & { tenant_id: string }): Promise<Employee>;
  findById(id: string, tenantId: string): Promise<Employee | null>;
  update(id: string, tenantId: string, data: UpdateEmployeeInput): Promise<Employee | null>;
  softDelete(id: string, tenantId: string): Promise<boolean>;
  list(tenantId: string, query: EmployeeListQuery): Promise<{ items: Employee[]; total: number }>;
  findByPositionId(positionId: string, tenantId: string): Promise<Employee[]>;
  findAll(tenantId: string): Promise<Employee[]>;
}

// BUSINESS RULE [CDC-2.4]: HR DUERP triggers
export type HrDuerpTriggerType =
  | 'position_created'
  | 'position_deleted'
  | 'headcount_changed'
  | 'new_employee'
  | 'training_expired'
  | 'medical_visit_overdue'
  | 'contract_type_changed'
  | 'night_work_added'
  | 'chemical_exposure_added';

export interface HrDuerpTrigger {
  type: HrDuerpTriggerType;
  timestamp: Date;
  description: string;
  entityId: string;
  entityType: 'position' | 'employee';
}

const HR_DUERP_TRIGGER_MESSAGES: Record<HrDuerpTriggerType, string> = {
  position_created: 'Nouveau poste cree — verifier les risques associes',
  position_deleted: 'Poste supprime — mettre a jour les unites de travail',
  headcount_changed: 'Effectif modifie — verifier la conformite PAPRIPACT',
  new_employee: 'Nouvel employe — verifier formations et visite medicale',
  training_expired: 'Formation expiree — risque accru, action requise',
  medical_visit_overdue: 'Visite medicale en retard — obligation legale',
  contract_type_changed: 'Changement de contrat — verifier expositions',
  night_work_added: 'Travail de nuit ajoute — surveillance medicale renforcee',
  chemical_exposure_added: 'Nouvelle exposition chimique — mise a jour DUERP requise',
};

const defaultSchedule: WorkSchedule = {
  type: 'standard', weeklyHours: 35,
  nightWork: false, weekendWork: false, outdoorWork: false,
  travelRequired: false, remoteWork: false,
};

export function createHrService(positionRepo: PositionRepository, employeeRepo: EmployeeRepository) {
  const triggers: HrDuerpTrigger[] = [];

  function emitTrigger(type: HrDuerpTriggerType, entityId: string, entityType: 'position' | 'employee'): void {
    triggers.push({
      type,
      timestamp: new Date(),
      description: HR_DUERP_TRIGGER_MESSAGES[type],
      entityId,
      entityType,
    });
  }

  return {
    // ── Positions ────────────────────────────────────────────────
    async createPosition(tenantId: string, input: CreatePositionInput): Promise<Result<JobPosition, AppError>> {
      const position = await positionRepo.create({ ...input, tenant_id: tenantId });
      emitTrigger('position_created', position.id, 'position');
      if (input.chemicalExposures && input.chemicalExposures.length > 0) {
        emitTrigger('chemical_exposure_added', position.id, 'position');
      }
      if (input.workSchedule?.nightWork) {
        emitTrigger('night_work_added', position.id, 'position');
      }
      return ok(position);
    },

    async getPosition(id: string, tenantId: string): Promise<Result<JobPosition, AppError>> {
      const position = await positionRepo.findById(id, tenantId);
      if (!position) return err(notFound('JobPosition', id));
      return ok(position);
    },

    async updatePosition(id: string, tenantId: string, input: UpdatePositionInput): Promise<Result<JobPosition, AppError>> {
      const existing = await positionRepo.findById(id, tenantId);
      if (!existing) return err(notFound('JobPosition', id));

      const updated = await positionRepo.update(id, tenantId, input);
      if (!updated) return err(notFound('JobPosition', id));

      if (input.headcount !== undefined && input.headcount !== existing.headcount) {
        emitTrigger('headcount_changed', id, 'position');
      }
      if (input.chemicalExposures && input.chemicalExposures.length > existing.chemicalExposures.length) {
        emitTrigger('chemical_exposure_added', id, 'position');
      }
      if (input.workSchedule?.nightWork && !existing.workSchedule.nightWork) {
        emitTrigger('night_work_added', id, 'position');
      }
      return ok(updated);
    },

    async deletePosition(id: string, tenantId: string): Promise<Result<void, AppError>> {
      const existing = await positionRepo.findById(id, tenantId);
      if (!existing) return err(notFound('JobPosition', id));
      await positionRepo.softDelete(id, tenantId);
      emitTrigger('position_deleted', id, 'position');
      return ok(undefined);
    },

    async listPositions(tenantId: string, query: PositionListQuery): Promise<Result<PaginatedResult<JobPosition>, AppError>> {
      const { items, total } = await positionRepo.list(tenantId, query);
      const hasMore = items.length === query.limit;
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!.id : null;
      return ok({ items, next_cursor: nextCursor, has_more: hasMore, total });
    },

    // ── Employees ────────────────────────────────────────────────
    async createEmployee(tenantId: string, input: CreateEmployeeInput): Promise<Result<Employee, AppError>> {
      // Position optionnelle (V1) : si fournie, on la valide.
      let position = null;
      if (input.jobPositionId) {
        position = await positionRepo.findById(input.jobPositionId, tenantId);
        if (!position) return err(notFound('JobPosition', input.jobPositionId));
      }

      const employee = await employeeRepo.create({ ...input, tenant_id: tenantId });
      emitTrigger('new_employee', employee.id, 'employee');

      // BUSINESS RULE [CDC-RH-V1]: Registre Unique du Personnel — append on hire
      // L1221-13 du Code du travail : tout employeur doit tenir un registre
      // chronologique de tous les embauchages.
      try {
        const { appendRegistryEntry } = await import('./hr-compliance.js');
        await appendRegistryEntry({
          tenant_id: tenantId,
          employee_id: employee.id,
          entry_type: 'embauche',
          employee_name: `${employee.lastName} ${employee.firstName}`,
          position_name: position?.name ?? null,
          contract_type: employee.contractType,
          event_date: new Date(employee.hireDate),
        });
      } catch {
        // Non-blocking: registry failure doesn't prevent hire
      }

      return ok(employee);
    },

    async getEmployee(id: string, tenantId: string): Promise<Result<Employee, AppError>> {
      const employee = await employeeRepo.findById(id, tenantId);
      if (!employee) return err(notFound('Employee', id));
      return ok(employee);
    },

    async updateEmployee(id: string, tenantId: string, input: UpdateEmployeeInput): Promise<Result<Employee, AppError>> {
      const existing = await employeeRepo.findById(id, tenantId);
      if (!existing) return err(notFound('Employee', id));

      if (input.jobPositionId) {
        const position = await positionRepo.findById(input.jobPositionId, tenantId);
        if (!position) return err(notFound('JobPosition', input.jobPositionId));
      }

      const updated = await employeeRepo.update(id, tenantId, input);
      if (!updated) return err(notFound('Employee', id));

      if (input.contractType && input.contractType !== existing.contractType) {
        emitTrigger('contract_type_changed', id, 'employee');
      }
      return ok(updated);
    },

    async deleteEmployee(id: string, tenantId: string): Promise<Result<void, AppError>> {
      const existing = await employeeRepo.findById(id, tenantId);
      if (!existing) return err(notFound('Employee', id));
      await employeeRepo.softDelete(id, tenantId);
      return ok(undefined);
    },

    async listEmployees(tenantId: string, query: EmployeeListQuery): Promise<Result<PaginatedResult<Employee>, AppError>> {
      const { items, total } = await employeeRepo.list(tenantId, query);
      const hasMore = items.length === query.limit;
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!.id : null;
      return ok({ items, next_cursor: nextCursor, has_more: hasMore, total });
    },

    // ── Templates ────────────────────────────────────────────────
    getTemplatesByNaf(nafCode: string): Result<ReturnType<typeof autofillHeadcounts> | null, AppError> {
      const template = findTemplateByNaf(nafCode);
      if (!template) return ok(null);
      return ok(autofillHeadcounts(template, 5)); // default 5 as placeholder
    },

    getTemplatesByNafWithEffectif(nafCode: string, effectif: number): Result<ReturnType<typeof autofillHeadcounts> | null, AppError> {
      const template = findTemplateByNaf(nafCode);
      if (!template) return ok(null);
      return ok(autofillHeadcounts(template, effectif));
    },

    // ── Trainings ────────────────────────────────────────────────
    async getAllTrainings(tenantId: string): Promise<Result<Array<{ employeeId: string; employeeName: string; positionName: string; training: { trainingName: string; obtainedDate: string; expiryDate?: string; certificateRef?: string; provider?: string } }>, AppError>> {
      const employees = await employeeRepo.findAll(tenantId);
      const positions = await positionRepo.findAll(tenantId);
      const posMap = new Map(positions.map((p) => [p.id, p]));

      const result = employees.flatMap((emp) =>
        emp.specificTrainings.map((t) => ({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          positionName: posMap.get(emp.jobPositionId)?.name ?? 'Inconnu',
          training: t,
        })),
      );
      return ok(result);
    },

    async getExpiringTrainings(tenantId: string, withinDays: number = 90): Promise<Result<Array<{ employeeId: string; employeeName: string; positionName: string; training: { trainingName: string; obtainedDate: string; expiryDate?: string } }>, AppError>> {
      const employees = await employeeRepo.findAll(tenantId);
      const positions = await positionRepo.findAll(tenantId);
      const posMap = new Map(positions.map((p) => [p.id, p]));
      const now = new Date();

      const result = employees.flatMap((emp) => {
        const expiring = getExpiringTrainings(emp.specificTrainings, withinDays, now);
        const expired = getExpiredTrainings(emp.specificTrainings, now);
        return [...expiring, ...expired].map((t) => ({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          positionName: posMap.get(emp.jobPositionId)?.name ?? 'Inconnu',
          training: t,
        }));
      });
      return ok(result);
    },

    async getMissingTrainings(tenantId: string): Promise<Result<Array<{ employeeId: string; employeeName: string; positionName: string; trainingName: string; priority: string }>, AppError>> {
      const employees = await employeeRepo.findAll(tenantId);
      const positions = await positionRepo.findAll(tenantId);
      const posMap = new Map(positions.map((p) => [p.id, p]));

      const result: Array<{ employeeId: string; employeeName: string; positionName: string; trainingName: string; priority: string }> = [];
      for (const emp of employees) {
        const pos = posMap.get(emp.jobPositionId);
        if (!pos) continue;
        for (const req of pos.mandatoryTrainings) {
          const hasTraining = emp.specificTrainings.some(
            (t) => t.trainingName.toLowerCase() === req.trainingName.toLowerCase(),
          );
          if (!hasTraining) {
            result.push({
              employeeId: emp.id,
              employeeName: `${emp.firstName} ${emp.lastName}`,
              positionName: pos.name,
              trainingName: req.trainingName,
              priority: req.priority,
            });
          }
        }
      }
      return ok(result);
    },

    // ── Medical Visits ───────────────────────────────────────────
    async getAllMedicalVisits(tenantId: string): Promise<Result<Array<{ employeeId: string; employeeName: string; visit: { type: string; date: string; result: string; nextVisitDate?: string } }>, AppError>> {
      const employees = await employeeRepo.findAll(tenantId);
      const result = employees.flatMap((emp) =>
        emp.medicalVisits.map((v) => ({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          visit: v,
        })),
      );
      return ok(result);
    },

    async getUpcomingMedicalVisits(tenantId: string, withinDays: number = 90): Promise<Result<Array<{ employeeId: string; employeeName: string; visit: { type: string; date: string; nextVisitDate?: string } }>, AppError>> {
      const employees = await employeeRepo.findAll(tenantId);
      const now = new Date();

      const result = employees.flatMap((emp) => {
        const upcoming = getUpcomingMedicalVisits(emp.medicalVisits, withinDays, now);
        const overdue = getOverdueMedicalVisits(emp.medicalVisits, now);
        return [...upcoming, ...overdue].map((v) => ({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          visit: v,
        }));
      });
      return ok(result);
    },

    // ── Dashboard ────────────────────────────────────────────────
    async getDashboard(tenantId: string): Promise<Result<{
      totalPositions: number;
      totalEmployees: number;
      totalHeadcount: number;
      positionsByCategory: Record<string, number>;
      expiredTrainings: number;
      expiringTrainings: number;
      missingTrainings: number;
      overdueMedicalVisits: number;
      upcomingMedicalVisits: number;
      papripactRequired: boolean;
    }, AppError>> {
      const positions = await positionRepo.findAll(tenantId);
      const employees = await employeeRepo.findAll(tenantId);
      const now = new Date();

      const totalHeadcount = positions.reduce((acc, p) => acc + p.headcount, 0);

      const positionsByCategory: Record<string, number> = {};
      for (const p of positions) {
        positionsByCategory[p.category] = (positionsByCategory[p.category] ?? 0) + p.headcount;
      }

      let expiredTrainings = 0;
      let expiringTrainings = 0;
      let missingTrainings = 0;
      let overdueMedicalVisits = 0;
      let upcomingMedicalVisits = 0;

      const posMap = new Map(positions.map((p) => [p.id, p]));
      for (const emp of employees) {
        expiredTrainings += getExpiredTrainings(emp.specificTrainings, now).length;
        expiringTrainings += getExpiringTrainings(emp.specificTrainings, 90, now).length;
        overdueMedicalVisits += getOverdueMedicalVisits(emp.medicalVisits, now).length;
        upcomingMedicalVisits += getUpcomingMedicalVisits(emp.medicalVisits, 90, now).length;

        const pos = posMap.get(emp.jobPositionId);
        if (pos) {
          for (const req of pos.mandatoryTrainings) {
            const has = emp.specificTrainings.some(
              (t) => t.trainingName.toLowerCase() === req.trainingName.toLowerCase(),
            );
            if (!has) missingTrainings++;
          }
        }
      }

      // BUSINESS RULE [CDC-2.4]: PAPRIPACT obligatoire si effectif >= 50
      const papripactRequired = totalHeadcount >= 50;

      return ok({
        totalPositions: positions.length,
        totalEmployees: employees.length,
        totalHeadcount,
        positionsByCategory,
        expiredTrainings,
        expiringTrainings,
        missingTrainings,
        overdueMedicalVisits,
        upcomingMedicalVisits,
        papripactRequired,
      });
    },

    // ── Triggers ─────────────────────────────────────────────────
    getTriggers(): HrDuerpTrigger[] {
      return [...triggers];
    },

    clearTriggers(): void {
      triggers.length = 0;
    },

    // Expose for tests
    _slugify: slugify,
    _computeMedicalSurveillance: computeMedicalSurveillance,
    _defaultSchedule: defaultSchedule,
  };
}
