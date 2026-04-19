import { prisma } from '@zenadmin/db';
import type { Prisma } from '@zenadmin/db';
import type { PositionRepository, EmployeeRepository } from './hr.service.js';
import type { JobPosition } from './workforce.js';
import type { Employee } from './employee.js';
import { slugify, computeMedicalSurveillance } from './workforce.js';
import type {
  PhysicalConstraint, WorkSchedule, TrainingRequirement, TrainingRecord, MedicalVisitRecord,
} from './hr.schemas.js';

// BUSINESS RULE [CDC-RH-V1]: Prisma-backed HR repositories
// Replaces the in-memory Maps that lost data on every Render redeploy.

const DEFAULT_SCHEDULE: WorkSchedule = {
  type: 'standard', weeklyHours: 35,
  nightWork: false, weekendWork: false, outdoorWork: false,
  travelRequired: false, remoteWork: false,
};

interface PositionRow {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  category: string;
  target_headcount: number;
  work_unit_ids: unknown;
  equipment_used: unknown;
  chemical_exposures: unknown;
  physical_constraints: unknown;
  work_schedule: unknown;
  mandatory_trainings: unknown;
  medical_surveillance: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

function mapPosition(row: PositionRow): JobPosition {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    slug: row.slug,
    category: row.category as JobPosition['category'],
    headcount: row.target_headcount,
    workUnitIds: (row.work_unit_ids as string[]) ?? [],
    equipmentUsed: (row.equipment_used as string[]) ?? [],
    chemicalExposures: (row.chemical_exposures as string[]) ?? [],
    physicalConstraints: (row.physical_constraints as PhysicalConstraint[]) ?? [],
    workSchedule: (row.work_schedule as WorkSchedule) ?? DEFAULT_SCHEDULE,
    mandatoryTrainings: (row.mandatory_trainings as TrainingRequirement[]) ?? [],
    medicalSurveillanceLevel: (row.medical_surveillance as 'standard' | 'enhanced') ?? 'standard',
    isActive: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}

export function createPrismaPositionRepository(): PositionRepository {
  return {
    async create(data) {
      const workSchedule: WorkSchedule = { ...DEFAULT_SCHEDULE, ...(data.workSchedule ?? {}) };
      const medLevel = data.medicalSurveillanceLevel ?? computeMedicalSurveillance({
        physicalConstraints: (data.physicalConstraints ?? []) as PhysicalConstraint[],
        chemicalExposures: data.chemicalExposures ?? [],
        workSchedule,
      });
      const row = await prisma.hrPosition.create({
        data: {
          tenant_id: data.tenant_id,
          name: data.name,
          slug: slugify(data.name),
          category: data.category,
          target_headcount: data.headcount ?? 1,
          work_unit_ids: (data.workUnitIds ?? []) as Prisma.InputJsonValue,
          equipment_used: (data.equipmentUsed ?? []) as Prisma.InputJsonValue,
          chemical_exposures: (data.chemicalExposures ?? []) as Prisma.InputJsonValue,
          physical_constraints: (data.physicalConstraints ?? []) as Prisma.InputJsonValue,
          work_schedule: workSchedule as Prisma.InputJsonValue,
          mandatory_trainings: (data.mandatoryTrainings ?? []) as Prisma.InputJsonValue,
          medical_surveillance: medLevel,
        },
      });
      return mapPosition(row as PositionRow);
    },
    async findById(id, tenantId) {
      const row = await prisma.hrPosition.findFirst({
        where: { id, tenant_id: tenantId, deleted_at: null },
      });
      return row ? mapPosition(row as PositionRow) : null;
    },
    async update(id, tenantId, data) {
      const existing = await prisma.hrPosition.findFirst({ where: { id, tenant_id: tenantId, deleted_at: null } });
      if (!existing) return null;

      const updateData: Prisma.HrPositionUpdateInput = {};
      if (data.name !== undefined) {
        updateData.name = data.name;
        updateData.slug = slugify(data.name);
      }
      if (data.category !== undefined) updateData.category = data.category;
      if (data.headcount !== undefined) updateData.target_headcount = data.headcount;
      if (data.workUnitIds !== undefined) updateData.work_unit_ids = data.workUnitIds as Prisma.InputJsonValue;
      if (data.equipmentUsed !== undefined) updateData.equipment_used = data.equipmentUsed as Prisma.InputJsonValue;
      if (data.chemicalExposures !== undefined) updateData.chemical_exposures = data.chemicalExposures as Prisma.InputJsonValue;
      if (data.physicalConstraints !== undefined) updateData.physical_constraints = data.physicalConstraints as Prisma.InputJsonValue;
      if (data.workSchedule !== undefined) updateData.work_schedule = data.workSchedule as Prisma.InputJsonValue;
      if (data.mandatoryTrainings !== undefined) updateData.mandatory_trainings = data.mandatoryTrainings as Prisma.InputJsonValue;
      if (data.medicalSurveillanceLevel !== undefined) updateData.medical_surveillance = data.medicalSurveillanceLevel;

      const row = await prisma.hrPosition.update({ where: { id }, data: updateData });
      return mapPosition(row as PositionRow);
    },
    async softDelete(id, tenantId) {
      const existing = await prisma.hrPosition.findFirst({ where: { id, tenant_id: tenantId, deleted_at: null } });
      if (!existing) return false;
      await prisma.hrPosition.update({ where: { id }, data: { deleted_at: new Date() } });
      return true;
    },
    async list(tenantId, query) {
      const where: Prisma.HrPositionWhereInput = { tenant_id: tenantId, deleted_at: null };
      if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
      if (query.category) where.category = query.category;
      const [total, rows] = await Promise.all([
        prisma.hrPosition.count({ where }),
        prisma.hrPosition.findMany({ where, take: query.limit ?? 50, orderBy: { created_at: 'desc' } }),
      ]);
      return { items: rows.map((r) => mapPosition(r as PositionRow)), total };
    },
    async findAll(tenantId) {
      const rows = await prisma.hrPosition.findMany({
        where: { tenant_id: tenantId, deleted_at: null },
        orderBy: { name: 'asc' },
      });
      return rows.map((r) => mapPosition(r as PositionRow));
    },
  };
}

// ── Employees ─────────────────────────────────────────────────────

interface EmployeeRow {
  id: string;
  tenant_id: string;
  position_id: string | null;
  first_name: string;
  last_name: string;
  birth_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: Date | null;
  birth_place: string | null;
  nationality: string;
  social_security_number: string | null;
  address_line1: string | null;
  zip_code: string | null;
  city: string | null;
  country: string;
  contract_type: string;
  cdd_reason: string | null;
  start_date: Date;
  end_date: Date | null;
  probation_end_date: Date | null;
  is_part_time: boolean;
  weekly_hours: number;
  monthly_gross_cents: number;
  dpae_declared_at: Date | null;
  dpae_reference: string | null;
  contract_signed_at: Date | null;
  contract_document_url: string | null;
  exit_date: Date | null;
  exit_reason: string | null;
  specific_restrictions: string | null;
  work_unit_ids: unknown;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  trainings?: Array<{
    id: string; training_code: string; training_label: string;
    obtained_date: Date; expiry_date: Date | null;
    certificate_ref: string | null; provider: string | null;
  }>;
  medical_visits?: Array<{
    id: string; visit_type: string; visit_date: Date;
    result: string | null; restrictions: string | null;
    next_visit_date: Date | null; medecin_name: string | null;
  }>;
}

function mapEmployee(row: EmployeeRow): Employee {
  const trainings: TrainingRecord[] = (row.trainings ?? []).map((t) => ({
    trainingName: t.training_label,
    obtainedDate: t.obtained_date.toISOString(),
    ...(t.expiry_date ? { expiryDate: t.expiry_date.toISOString() } : {}),
    ...(t.certificate_ref ? { certificateRef: t.certificate_ref } : {}),
    ...(t.provider ? { provider: t.provider } : {}),
  }));
  const visits: MedicalVisitRecord[] = (row.medical_visits ?? []).map((v) => ({
    type: v.visit_type as MedicalVisitRecord['type'],
    date: v.visit_date.toISOString(),
    result: (v.result ?? 'apte') as MedicalVisitRecord['result'],
    ...(v.restrictions ? { restrictions: v.restrictions } : {}),
    ...(v.next_visit_date ? { nextVisitDate: v.next_visit_date.toISOString() } : {}),
  }));
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    firstName: row.first_name,
    lastName: row.last_name,
    jobPositionId: row.position_id ?? '',
    workUnitIds: (row.work_unit_ids as string[]) ?? [],
    hireDate: row.start_date.toISOString().split('T')[0]!,
    contractType: row.contract_type as Employee['contractType'],
    isPartTime: row.is_part_time,
    weeklyHours: row.is_part_time ? row.weekly_hours : null,
    specificTrainings: trainings,
    medicalVisits: visits,
    specificRestrictions: row.specific_restrictions,
    isActive: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}

export function createPrismaEmployeeRepository(): EmployeeRepository {
  return {
    async create(data) {
      const row = await prisma.hrEmployee.create({
        data: {
          tenant_id: data.tenant_id,
          position_id: data.jobPositionId || null,
          first_name: data.firstName,
          last_name: data.lastName,
          birth_name: data.birthName ?? null,
          email: data.email ?? null,
          phone: data.phone ?? null,
          birth_date: data.birthDate ? new Date(data.birthDate) : null,
          birth_place: data.birthPlace ?? null,
          nationality: data.nationality ?? 'FR',
          social_security_number: data.socialSecurityNumber ?? null,
          address_line1: data.addressLine1 ?? null,
          zip_code: data.zipCode ?? null,
          city: data.city ?? null,
          country: data.country ?? 'FR',
          contract_type: data.contractType,
          cdd_reason: data.cddReason ?? null,
          start_date: new Date(data.hireDate),
          end_date: data.endDate ? new Date(data.endDate) : null,
          probation_end_date: data.probationEndDate ? new Date(data.probationEndDate) : null,
          is_part_time: data.isPartTime ?? false,
          weekly_hours: data.weeklyHours ?? 35,
          monthly_gross_cents: data.monthlyGrossCents ?? 0,
          work_unit_ids: (data.workUnitIds ?? []) as Prisma.InputJsonValue,
          specific_restrictions: data.specificRestrictions ?? null,
        },
        include: { trainings: true, medical_visits: true },
      });
      return mapEmployee(row as EmployeeRow);
    },
    async findById(id, tenantId) {
      const row = await prisma.hrEmployee.findFirst({
        where: { id, tenant_id: tenantId, deleted_at: null },
        include: { trainings: true, medical_visits: true },
      });
      return row ? mapEmployee(row as EmployeeRow) : null;
    },
    async update(id, tenantId, data) {
      const existing = await prisma.hrEmployee.findFirst({ where: { id, tenant_id: tenantId, deleted_at: null } });
      if (!existing) return null;

      const updateData: Prisma.HrEmployeeUpdateInput = {};
      if (data.firstName !== undefined) updateData.first_name = data.firstName;
      if (data.lastName !== undefined) updateData.last_name = data.lastName;
      if (data.birthName !== undefined) updateData.birth_name = data.birthName;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.birthDate !== undefined) updateData.birth_date = data.birthDate ? new Date(data.birthDate) : null;
      if (data.birthPlace !== undefined) updateData.birth_place = data.birthPlace;
      if (data.nationality !== undefined) updateData.nationality = data.nationality;
      if (data.socialSecurityNumber !== undefined) updateData.social_security_number = data.socialSecurityNumber;
      if (data.addressLine1 !== undefined) updateData.address_line1 = data.addressLine1;
      if (data.zipCode !== undefined) updateData.zip_code = data.zipCode;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.country !== undefined) updateData.country = data.country;
      if (data.jobPositionId !== undefined) {
        updateData.position = data.jobPositionId ? { connect: { id: data.jobPositionId } } : { disconnect: true };
      }
      if (data.contractType !== undefined) updateData.contract_type = data.contractType;
      if (data.cddReason !== undefined) updateData.cdd_reason = data.cddReason;
      if (data.hireDate !== undefined) updateData.start_date = new Date(data.hireDate);
      if (data.endDate !== undefined) updateData.end_date = data.endDate ? new Date(data.endDate) : null;
      if (data.probationEndDate !== undefined) updateData.probation_end_date = data.probationEndDate ? new Date(data.probationEndDate) : null;
      if (data.isPartTime !== undefined) updateData.is_part_time = data.isPartTime;
      if (data.weeklyHours !== undefined) updateData.weekly_hours = data.weeklyHours ?? 35;
      if (data.monthlyGrossCents !== undefined) updateData.monthly_gross_cents = data.monthlyGrossCents;
      if (data.workUnitIds !== undefined) updateData.work_unit_ids = data.workUnitIds as Prisma.InputJsonValue;
      if (data.specificRestrictions !== undefined) updateData.specific_restrictions = data.specificRestrictions;

      const row = await prisma.hrEmployee.update({
        where: { id },
        data: updateData,
        include: { trainings: true, medical_visits: true },
      });
      return mapEmployee(row as EmployeeRow);
    },
    async softDelete(id, tenantId) {
      const existing = await prisma.hrEmployee.findFirst({ where: { id, tenant_id: tenantId, deleted_at: null } });
      if (!existing) return false;
      await prisma.hrEmployee.update({ where: { id }, data: { deleted_at: new Date() } });
      return true;
    },
    async list(tenantId, query) {
      const where: Prisma.HrEmployeeWhereInput = { tenant_id: tenantId, deleted_at: null };
      if (query.search) {
        where.OR = [
          { first_name: { contains: query.search, mode: 'insensitive' } },
          { last_name: { contains: query.search, mode: 'insensitive' } },
        ];
      }
      if (query.contractType) where.contract_type = query.contractType;
      const [total, rows] = await Promise.all([
        prisma.hrEmployee.count({ where }),
        prisma.hrEmployee.findMany({
          where,
          take: query.limit ?? 50,
          include: { trainings: true, medical_visits: true },
          orderBy: { start_date: 'desc' },
        }),
      ]);
      return { items: rows.map((r) => mapEmployee(r as EmployeeRow)), total };
    },
    async findByPositionId(positionId, tenantId) {
      const rows = await prisma.hrEmployee.findMany({
        where: { tenant_id: tenantId, position_id: positionId, deleted_at: null },
        include: { trainings: true, medical_visits: true },
      });
      return rows.map((r) => mapEmployee(r as EmployeeRow));
    },
    async findAll(tenantId) {
      const rows = await prisma.hrEmployee.findMany({
        where: { tenant_id: tenantId, deleted_at: null },
        include: { trainings: true, medical_visits: true },
        orderBy: { last_name: 'asc' },
      });
      return rows.map((r) => mapEmployee(r as EmployeeRow));
    },
  };
}
