import { describe, it, expect, beforeEach } from 'vitest';
import { slugify, computeMedicalSurveillance } from '../workforce.js';
import { getExpiredTrainings, getExpiringTrainings, getOverdueMedicalVisits, getUpcomingMedicalVisits } from '../employee.js';
import { findTemplateByNaf, autofillHeadcounts, JOB_TEMPLATES } from '../job-templates.js';
import { buildWorkforceForDuerp } from '../workforce-for-duerp.js';
import { createHrService, type PositionRepository, type EmployeeRepository } from '../hr.service.js';
import type { JobPosition } from '../workforce.js';
import type { Employee } from '../employee.js';
import type { TrainingRecord, MedicalVisitRecord, TrainingRequirement } from '../hr.schemas.js';

// ── Helper factories ────────────────────────────────────────────────

function makePosition(overrides: Partial<JobPosition> = {}): JobPosition {
  return {
    id: crypto.randomUUID(),
    tenant_id: 'tenant-1',
    name: 'Macon',
    slug: 'macon',
    category: 'ouvrier',
    headcount: 3,
    workUnitIds: ['chantier'],
    equipmentUsed: ['Betonniere'],
    chemicalExposures: [],
    physicalConstraints: [],
    workSchedule: { type: 'standard', weeklyHours: 39, nightWork: false, weekendWork: false, outdoorWork: true, travelRequired: false, remoteWork: false },
    mandatoryTrainings: [],
    medicalSurveillanceLevel: 'standard',
    isActive: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: crypto.randomUUID(),
    tenant_id: 'tenant-1',
    firstName: 'Jean',
    lastName: 'Dupont',
    jobPositionId: 'pos-1',
    workUnitIds: ['chantier'],
    hireDate: '2020-01-15T00:00:00.000Z',
    contractType: 'cdi',
    isPartTime: false,
    weeklyHours: null,
    specificTrainings: [],
    medicalVisits: [],
    specificRestrictions: null,
    isActive: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  };
}

// ── In-memory repos for service tests ───────────────────────────────

function createInMemoryRepos() {
  const positions = new Map<string, JobPosition>();
  const employees = new Map<string, Employee>();

  const positionRepo: PositionRepository = {
    async create(data) {
      const id = crypto.randomUUID();
      const pos = makePosition({
        id,
        tenant_id: data.tenant_id,
        name: data.name,
        category: data.category,
        headcount: data.headcount ?? 1,
        workUnitIds: data.workUnitIds ?? [],
        equipmentUsed: data.equipmentUsed ?? [],
        chemicalExposures: data.chemicalExposures ?? [],
        physicalConstraints: data.physicalConstraints ?? [],
        mandatoryTrainings: (data.mandatoryTrainings ?? []) as TrainingRequirement[],
      });
      positions.set(id, pos);
      return pos;
    },
    async findById(id, tenantId) {
      const p = positions.get(id);
      if (!p || p.tenant_id !== tenantId || p.deleted_at) return null;
      return p;
    },
    async update(id, tenantId, data) {
      const p = positions.get(id);
      if (!p || p.tenant_id !== tenantId || p.deleted_at) return null;
      const updated = { ...p, ...data, updated_at: new Date() } as JobPosition;
      positions.set(id, updated);
      return updated;
    },
    async softDelete(id, tenantId) {
      const p = positions.get(id);
      if (!p || p.tenant_id !== tenantId) return false;
      p.deleted_at = new Date();
      return true;
    },
    async list(tenantId, query) {
      const items = [...positions.values()].filter((p) => p.tenant_id === tenantId && !p.deleted_at).slice(0, query.limit);
      return { items, total: items.length };
    },
    async findAll(tenantId) {
      return [...positions.values()].filter((p) => p.tenant_id === tenantId && !p.deleted_at);
    },
  };

  const employeeRepo: EmployeeRepository = {
    async create(data) {
      const id = crypto.randomUUID();
      const emp = makeEmployee({
        id,
        tenant_id: data.tenant_id,
        firstName: data.firstName,
        lastName: data.lastName,
        jobPositionId: data.jobPositionId,
        contractType: data.contractType,
        hireDate: data.hireDate,
        specificTrainings: data.specificTrainings ?? [],
        medicalVisits: data.medicalVisits ?? [],
      });
      employees.set(id, emp);
      return emp;
    },
    async findById(id, tenantId) {
      const e = employees.get(id);
      if (!e || e.tenant_id !== tenantId || e.deleted_at) return null;
      return e;
    },
    async update(id, tenantId, data) {
      const e = employees.get(id);
      if (!e || e.tenant_id !== tenantId || e.deleted_at) return null;
      const updated = { ...e, ...data, updated_at: new Date() } as Employee;
      employees.set(id, updated);
      return updated;
    },
    async softDelete(id, tenantId) {
      const e = employees.get(id);
      if (!e || e.tenant_id !== tenantId) return false;
      e.deleted_at = new Date();
      return true;
    },
    async list(tenantId, query) {
      let items = [...employees.values()].filter((e) => e.tenant_id === tenantId && !e.deleted_at);
      if (query.jobPositionId) items = items.filter((e) => e.jobPositionId === query.jobPositionId);
      items = items.slice(0, query.limit);
      return { items, total: items.length };
    },
    async findByPositionId(positionId, tenantId) {
      return [...employees.values()].filter((e) => e.tenant_id === tenantId && e.jobPositionId === positionId && !e.deleted_at);
    },
    async findAll(tenantId) {
      return [...employees.values()].filter((e) => e.tenant_id === tenantId && !e.deleted_at);
    },
  };

  return { positionRepo, employeeRepo, positions, employees };
}

// ═══════════════════════════════════════════════════════════════════
// 1. Templates par metier
// ═══════════════════════════════════════════════════════════════════

describe('Job Templates par metier', () => {
  const metiers = ['btp', 'restaurant', 'coiffure', 'commerce', 'boulangerie', 'garage', 'aide-domicile', 'bureau'];

  it('should have templates for all 8 major metiers', () => {
    const slugs = JOB_TEMPLATES.map((t) => t.metierSlug);
    for (const metier of metiers) {
      expect(slugs).toContain(metier);
    }
  });

  it.each(JOB_TEMPLATES.map((t) => [t.metierSlug, t] as const))(
    '%s should have at least 4 positions',
    (_slug, template) => {
      expect(template.positions.length).toBeGreaterThanOrEqual(4);
    },
  );

  it('should have a dirigeant position in non-BTP/garage templates', () => {
    const templatesWithDirigeant = JOB_TEMPLATES.filter(
      (t) => !['btp', 'garage'].includes(t.metierSlug),
    );
    for (const template of templatesWithDirigeant) {
      const hasDirigeant = template.positions.some((p) => p.category === 'dirigeant');
      expect(hasDirigeant, `${template.metierSlug} should have a dirigeant`).toBe(true);
    }
  });

  it.each(JOB_TEMPLATES.map((t) => [t.metierSlug, t] as const))(
    '%s should have NAF codes',
    (_slug, template) => {
      expect(template.nafCodes.length).toBeGreaterThan(0);
    },
  );
});

// ═══════════════════════════════════════════════════════════════════
// 2. Auto-fill effectif
// ═══════════════════════════════════════════════════════════════════

describe('Auto-fill effectif', () => {
  it('should find BTP template for code NAF 43.22A', () => {
    const template = findTemplateByNaf('43.22A');
    expect(template).toBeDefined();
    expect(template!.metierSlug).toBe('btp');
  });

  it('should find restaurant template for code NAF 56.10A', () => {
    const template = findTemplateByNaf('56.10A');
    expect(template).toBeDefined();
    expect(template!.metierSlug).toBe('restaurant');
  });

  it('should find coiffure template for code NAF 96.02A', () => {
    const template = findTemplateByNaf('96.02A');
    expect(template).toBeDefined();
    expect(template!.metierSlug).toBe('coiffure');
  });

  it('should find bureau template for code NAF 62.01Z', () => {
    const template = findTemplateByNaf('62.01Z');
    expect(template).toBeDefined();
    expect(template!.metierSlug).toBe('bureau');
  });

  it('should return undefined for unknown NAF code', () => {
    const template = findTemplateByNaf('99.99Z');
    expect(template).toBeUndefined();
  });

  it('should distribute 8 employees proportionally for BTP', () => {
    const template = findTemplateByNaf('43');
    expect(template).toBeDefined();
    const filled = autofillHeadcounts(template!, 8);
    const total = filled.reduce((acc, p) => acc + p.headcount, 0);
    expect(total).toBe(8);
    // Dirigeant should always have at least 1
    const dirigeant = filled.find((p) => p.category === 'dirigeant');
    expect(dirigeant).toBeUndefined(); // BTP has no explicit dirigeant in template, it has "Secretaire"
  });

  it('should handle very small effectif (1 person)', () => {
    const template = findTemplateByNaf('43');
    expect(template).toBeDefined();
    const filled = autofillHeadcounts(template!, 1);
    const total = filled.reduce((acc, p) => acc + p.headcount, 0);
    expect(total).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. CRUD postes
// ═══════════════════════════════════════════════════════════════════

describe('CRUD postes', () => {
  let service: ReturnType<typeof createHrService>;
  let repos: ReturnType<typeof createInMemoryRepos>;

  beforeEach(() => {
    repos = createInMemoryRepos();
    service = createHrService(repos.positionRepo, repos.employeeRepo);
  });

  it('should create a position', async () => {
    const result = await service.createPosition('tenant-1', {
      name: 'Macon',
      category: 'ouvrier',
      headcount: 3,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('Macon');
      expect(result.value.headcount).toBe(3);
      expect(result.value.tenant_id).toBe('tenant-1');
    }
  });

  it('should get a position by id', async () => {
    const created = await service.createPosition('tenant-1', { name: 'Plombier', category: 'ouvrier' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await service.getPosition(created.value.id, 'tenant-1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe('Plombier');
  });

  it('should update a position', async () => {
    const created = await service.createPosition('tenant-1', { name: 'Macon', category: 'ouvrier', headcount: 2 });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await service.updatePosition(created.value.id, 'tenant-1', { headcount: 5 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.headcount).toBe(5);
  });

  it('should soft delete a position', async () => {
    const created = await service.createPosition('tenant-1', { name: 'Test', category: 'ouvrier' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const delResult = await service.deletePosition(created.value.id, 'tenant-1');
    expect(delResult.ok).toBe(true);

    const getResult = await service.getPosition(created.value.id, 'tenant-1');
    expect(getResult.ok).toBe(false);
  });

  it('should return NOT_FOUND for non-existent position', async () => {
    const result = await service.getPosition('non-existent', 'tenant-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. CRUD employes
// ═══════════════════════════════════════════════════════════════════

describe('CRUD employes', () => {
  let service: ReturnType<typeof createHrService>;
  let repos: ReturnType<typeof createInMemoryRepos>;
  let positionId: string;

  beforeEach(async () => {
    repos = createInMemoryRepos();
    service = createHrService(repos.positionRepo, repos.employeeRepo);
    const pos = await service.createPosition('tenant-1', { name: 'Macon', category: 'ouvrier' });
    if (pos.ok) positionId = pos.value.id;
  });

  it('should create an employee', async () => {
    const result = await service.createEmployee('tenant-1', {
      firstName: 'Jean',
      lastName: 'Dupont',
      jobPositionId: positionId,
      hireDate: '2020-01-15T00:00:00.000Z',
      contractType: 'cdi',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.firstName).toBe('Jean');
      expect(result.value.jobPositionId).toBe(positionId);
    }
  });

  it('should reject employee with non-existent position', async () => {
    const result = await service.createEmployee('tenant-1', {
      firstName: 'Jean',
      lastName: 'Dupont',
      jobPositionId: 'non-existent',
      hireDate: '2020-01-15T00:00:00.000Z',
      contractType: 'cdi',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('should soft delete an employee', async () => {
    const created = await service.createEmployee('tenant-1', {
      firstName: 'Marie',
      lastName: 'Martin',
      jobPositionId: positionId,
      hireDate: '2021-06-01T00:00:00.000Z',
      contractType: 'cdd',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const del = await service.deleteEmployee(created.value.id, 'tenant-1');
    expect(del.ok).toBe(true);

    const get = await service.getEmployee(created.value.id, 'tenant-1');
    expect(get.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. Lien postes <-> unites de travail
// ═══════════════════════════════════════════════════════════════════

describe('Lien postes ↔ unites de travail', () => {
  it('should associate position with work units', async () => {
    const repos = createInMemoryRepos();
    const service = createHrService(repos.positionRepo, repos.employeeRepo);

    const result = await service.createPosition('tenant-1', {
      name: 'Electricien',
      category: 'ouvrier',
      workUnitIds: ['chantier', 'atelier-electrique'],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.workUnitIds).toEqual(['chantier', 'atelier-electrique']);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. Formations manquantes
// ═══════════════════════════════════════════════════════════════════

describe('Formations manquantes', () => {
  it('should detect missing mandatory trainings', async () => {
    const repos = createInMemoryRepos();
    const service = createHrService(repos.positionRepo, repos.employeeRepo);

    const pos = await service.createPosition('tenant-1', {
      name: 'Electricien',
      category: 'ouvrier',
      mandatoryTrainings: [
        { trainingName: 'Habilitation electrique', legalBasis: 'NF C 18-510', priority: 'mandatory', isObtained: false },
        { trainingName: 'SST', legalBasis: 'Art. R4224-15', priority: 'mandatory', isObtained: false },
      ],
    });
    if (!pos.ok) return;

    // Employee WITHOUT any training
    await service.createEmployee('tenant-1', {
      firstName: 'Paul',
      lastName: 'Martin',
      jobPositionId: pos.value.id,
      hireDate: '2022-01-01T00:00:00.000Z',
      contractType: 'cdi',
      specificTrainings: [],
    });

    const result = await service.getMissingTrainings('tenant-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(2);
      expect(result.value.map((t) => t.trainingName)).toContain('Habilitation electrique');
      expect(result.value.map((t) => t.trainingName)).toContain('SST');
    }
  });

  it('should not flag trainings already obtained', async () => {
    const repos = createInMemoryRepos();
    const service = createHrService(repos.positionRepo, repos.employeeRepo);

    const pos = await service.createPosition('tenant-1', {
      name: 'Macon',
      category: 'ouvrier',
      mandatoryTrainings: [
        { trainingName: 'SST', legalBasis: 'Art. R4224-15', priority: 'mandatory', isObtained: false },
      ],
    });
    if (!pos.ok) return;

    await service.createEmployee('tenant-1', {
      firstName: 'Luc',
      lastName: 'Bernard',
      jobPositionId: pos.value.id,
      hireDate: '2022-01-01T00:00:00.000Z',
      contractType: 'cdi',
      specificTrainings: [
        { trainingName: 'SST', obtainedDate: '2023-06-01T00:00:00.000Z' },
      ],
    });

    const result = await service.getMissingTrainings('tenant-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. Formations expirees
// ═══════════════════════════════════════════════════════════════════

describe('Formations expirees', () => {
  it('should detect expired trainings', () => {
    const trainings: TrainingRecord[] = [
      { trainingName: 'SST', obtainedDate: '2021-01-01T00:00:00.000Z', expiryDate: '2023-01-01T00:00:00.000Z' },
      { trainingName: 'CACES', obtainedDate: '2020-01-01T00:00:00.000Z', expiryDate: '2025-01-01T00:00:00.000Z' },
    ];
    const ref = new Date('2024-06-01T00:00:00.000Z');
    const expired = getExpiredTrainings(trainings, ref);
    expect(expired.length).toBe(1);
    expect(expired[0]!.trainingName).toBe('SST');
  });

  it('should detect trainings expiring within 90 days', () => {
    const trainings: TrainingRecord[] = [
      { trainingName: 'SST', obtainedDate: '2022-01-01T00:00:00.000Z', expiryDate: '2024-07-15T00:00:00.000Z' },
      { trainingName: 'CACES', obtainedDate: '2020-01-01T00:00:00.000Z', expiryDate: '2025-12-01T00:00:00.000Z' },
    ];
    const ref = new Date('2024-06-01T00:00:00.000Z');
    const expiring = getExpiringTrainings(trainings, 90, ref);
    expect(expiring.length).toBe(1);
    expect(expiring[0]!.trainingName).toBe('SST');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 8. Visites medicales
// ═══════════════════════════════════════════════════════════════════

describe('Visites medicales', () => {
  it('should detect overdue medical visits', () => {
    const visits: MedicalVisitRecord[] = [
      { type: 'periodique', date: '2022-01-01T00:00:00.000Z', result: 'apte', nextVisitDate: '2023-06-01T00:00:00.000Z' },
    ];
    const ref = new Date('2024-06-01T00:00:00.000Z');
    const overdue = getOverdueMedicalVisits(visits, ref);
    expect(overdue.length).toBe(1);
  });

  it('should detect upcoming medical visits within 90 days', () => {
    const visits: MedicalVisitRecord[] = [
      { type: 'periodique', date: '2022-01-01T00:00:00.000Z', result: 'apte', nextVisitDate: '2024-07-15T00:00:00.000Z' },
    ];
    const ref = new Date('2024-06-01T00:00:00.000Z');
    const upcoming = getUpcomingMedicalVisits(visits, 90, ref);
    expect(upcoming.length).toBe(1);
  });

  it('should not flag visits without nextVisitDate', () => {
    const visits: MedicalVisitRecord[] = [
      { type: 'embauche', date: '2023-01-01T00:00:00.000Z', result: 'apte' },
    ];
    const overdue = getOverdueMedicalVisits(visits);
    expect(overdue.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 9. Surveillance medicale renforcee
// ═══════════════════════════════════════════════════════════════════

describe('Surveillance medicale renforcee', () => {
  it('should trigger enhanced for night work', () => {
    const result = computeMedicalSurveillance({
      physicalConstraints: [],
      chemicalExposures: [],
      workSchedule: { type: 'night', weeklyHours: 35, nightWork: true, weekendWork: false, outdoorWork: false, travelRequired: false, remoteWork: false },
    });
    expect(result).toBe('enhanced');
  });

  it('should trigger enhanced for chemical exposures', () => {
    const result = computeMedicalSurveillance({
      physicalConstraints: [],
      chemicalExposures: ['Solvants organiques'],
      workSchedule: { type: 'standard', weeklyHours: 35, nightWork: false, weekendWork: false, outdoorWork: false, travelRequired: false, remoteWork: false },
    });
    expect(result).toBe('enhanced');
  });

  it('should trigger enhanced for daily vibrations', () => {
    const result = computeMedicalSurveillance({
      physicalConstraints: [{ type: 'vibrations', frequency: 'daily' }],
      chemicalExposures: [],
      workSchedule: { type: 'standard', weeklyHours: 35, nightWork: false, weekendWork: false, outdoorWork: false, travelRequired: false, remoteWork: false },
    });
    expect(result).toBe('enhanced');
  });

  it('should return standard for office work', () => {
    const result = computeMedicalSurveillance({
      physicalConstraints: [{ type: 'prolonged_sitting', frequency: 'daily' }],
      chemicalExposures: [],
      workSchedule: { type: 'standard', weeklyHours: 35, nightWork: false, weekendWork: false, outdoorWork: false, travelRequired: false, remoteWork: true },
    });
    expect(result).toBe('standard');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 10. Declencheurs DUERP
// ═══════════════════════════════════════════════════════════════════

describe('Declencheurs DUERP', () => {
  it('should emit position_created trigger', async () => {
    const repos = createInMemoryRepos();
    const service = createHrService(repos.positionRepo, repos.employeeRepo);

    await service.createPosition('tenant-1', { name: 'Couvreur', category: 'ouvrier' });

    const triggers = service.getTriggers();
    expect(triggers.some((t) => t.type === 'position_created')).toBe(true);
  });

  it('should emit chemical_exposure_added trigger', async () => {
    const repos = createInMemoryRepos();
    const service = createHrService(repos.positionRepo, repos.employeeRepo);

    await service.createPosition('tenant-1', {
      name: 'Carrossier',
      category: 'ouvrier',
      chemicalExposures: ['Peintures isocyanates'],
    });

    const triggers = service.getTriggers();
    expect(triggers.some((t) => t.type === 'chemical_exposure_added')).toBe(true);
  });

  it('should emit night_work_added trigger', async () => {
    const repos = createInMemoryRepos();
    const service = createHrService(repos.positionRepo, repos.employeeRepo);

    await service.createPosition('tenant-1', {
      name: 'Boulanger',
      category: 'ouvrier',
      workSchedule: { type: 'night', weeklyHours: 39, nightWork: true, weekendWork: false, outdoorWork: false, travelRequired: false, remoteWork: false },
    });

    const triggers = service.getTriggers();
    expect(triggers.some((t) => t.type === 'night_work_added')).toBe(true);
  });

  it('should emit headcount_changed trigger on update', async () => {
    const repos = createInMemoryRepos();
    const service = createHrService(repos.positionRepo, repos.employeeRepo);

    const pos = await service.createPosition('tenant-1', { name: 'Macon', category: 'ouvrier', headcount: 3 });
    if (!pos.ok) return;
    service.clearTriggers();

    await service.updatePosition(pos.value.id, 'tenant-1', { headcount: 6 });

    const triggers = service.getTriggers();
    expect(triggers.some((t) => t.type === 'headcount_changed')).toBe(true);
  });

  it('should emit new_employee trigger', async () => {
    const repos = createInMemoryRepos();
    const service = createHrService(repos.positionRepo, repos.employeeRepo);

    const pos = await service.createPosition('tenant-1', { name: 'Plombier', category: 'ouvrier' });
    if (!pos.ok) return;
    service.clearTriggers();

    await service.createEmployee('tenant-1', {
      firstName: 'Marc',
      lastName: 'Leroy',
      jobPositionId: pos.value.id,
      hireDate: '2024-01-15T00:00:00.000Z',
      contractType: 'cdi',
    });

    const triggers = service.getTriggers();
    expect(triggers.some((t) => t.type === 'new_employee')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 11. WorkforceForDuerp
// ═══════════════════════════════════════════════════════════════════

describe('WorkforceForDuerp', () => {
  it('should build workforce data for DUERP', () => {
    const posId = 'pos-1';
    const positions: JobPosition[] = [
      makePosition({
        id: posId,
        name: 'Electricien',
        headcount: 3,
        workUnitIds: ['chantier'],
        chemicalExposures: ['Solvants'],
        mandatoryTrainings: [
          { trainingName: 'Habilitation electrique', legalBasis: 'NF C 18-510', priority: 'mandatory', isObtained: false },
        ],
        medicalSurveillanceLevel: 'enhanced',
      }),
    ];

    const employees: Employee[] = [
      makeEmployee({
        jobPositionId: posId,
        firstName: 'Paul',
        lastName: 'Martin',
        specificTrainings: [],
      }),
    ];

    const result = buildWorkforceForDuerp(positions, employees);

    expect(result.totalHeadcount).toBe(3);
    expect(result.positions.length).toBe(1);
    expect(result.positions[0]!.specificRisks.chemicalExposures).toContain('Solvants');
    expect(result.positions[0]!.medicalSurveillanceLevel).toBe('enhanced');
    expect(result.trainingAlerts.length).toBe(1);
    expect(result.trainingAlerts[0]!.status).toBe('missing');
    expect(result.trainingAlerts[0]!.trainingName).toBe('Habilitation electrique');
  });

  it('should detect expired training alerts', () => {
    const posId = 'pos-1';
    const positions: JobPosition[] = [makePosition({ id: posId })];
    const employees: Employee[] = [
      makeEmployee({
        jobPositionId: posId,
        specificTrainings: [
          { trainingName: 'SST', obtainedDate: '2021-01-01T00:00:00.000Z', expiryDate: '2023-01-01T00:00:00.000Z' },
        ],
      }),
    ];

    const ref = new Date('2024-06-01T00:00:00.000Z');
    const result = buildWorkforceForDuerp(positions, employees, ref);

    expect(result.trainingAlerts.some((a) => a.status === 'expired')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 12. Seuils PAPRIPACT
// ═══════════════════════════════════════════════════════════════════

describe('Seuils PAPRIPACT', () => {
  it('should flag PAPRIPACT required for 50+ employees', async () => {
    const repos = createInMemoryRepos();
    const service = createHrService(repos.positionRepo, repos.employeeRepo);

    await service.createPosition('tenant-1', { name: 'Employe', category: 'employe', headcount: 55 });

    const result = await service.getDashboard('tenant-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.papripactRequired).toBe(true);
    }
  });

  it('should not flag PAPRIPACT for < 50 employees', async () => {
    const repos = createInMemoryRepos();
    const service = createHrService(repos.positionRepo, repos.employeeRepo);

    await service.createPosition('tenant-1', { name: 'Macon', category: 'ouvrier', headcount: 8 });

    const result = await service.getDashboard('tenant-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.papripactRequired).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// Slugify utility
// ═══════════════════════════════════════════════════════════════════

describe('Slugify', () => {
  it('should slugify accented names', () => {
    expect(slugify('Boulanger-Pâtissier')).toBe('boulanger-patissier');
    expect(slugify('Chef de chantier')).toBe('chef-de-chantier');
    expect(slugify('Secrétaire / Comptable')).toBe('secretaire-comptable');
  });
});
