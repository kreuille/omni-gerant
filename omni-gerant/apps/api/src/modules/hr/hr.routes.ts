import type { FastifyInstance } from 'fastify';
import { createHrService, type PositionRepository, type EmployeeRepository } from './hr.service.js';
import type { JobPosition } from './workforce.js';
import { slugify, computeMedicalSurveillance } from './workforce.js';
import type { Employee } from './employee.js';
import {
  createPositionSchema, updatePositionSchema, positionListQuerySchema,
  createEmployeeSchema, updateEmployeeSchema, employeeListQuerySchema,
} from './hr.schemas.js';
import { findTemplateByNaf, autofillHeadcounts } from './job-templates.js';
import { buildWorkforceForDuerp } from './workforce-for-duerp.js';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// BUSINESS RULE [CDC-2.4]: Module RH — Effectif & Postes

export async function hrRoutes(app: FastifyInstance) {
  // ── In-memory repositories ──────────────────────────────────────
  const positions = new Map<string, JobPosition>();
  const employees = new Map<string, Employee>();

  const positionRepo: PositionRepository = {
    async create(data) {
      const id = crypto.randomUUID();
      const workSchedule = data.workSchedule ?? {
        type: 'standard' as const, weeklyHours: 35,
        nightWork: false, weekendWork: false, outdoorWork: false,
        travelRequired: false, remoteWork: false,
      };
      const medLevel = data.medicalSurveillanceLevel ?? computeMedicalSurveillance({
        physicalConstraints: data.physicalConstraints ?? [],
        chemicalExposures: data.chemicalExposures ?? [],
        workSchedule,
      });
      const position: JobPosition = {
        id,
        tenant_id: data.tenant_id,
        name: data.name,
        slug: slugify(data.name),
        category: data.category,
        headcount: data.headcount ?? 1,
        workUnitIds: data.workUnitIds ?? [],
        equipmentUsed: data.equipmentUsed ?? [],
        chemicalExposures: data.chemicalExposures ?? [],
        physicalConstraints: data.physicalConstraints ?? [],
        workSchedule,
        mandatoryTrainings: data.mandatoryTrainings ?? [],
        medicalSurveillanceLevel: medLevel,
        isActive: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      positions.set(id, position);
      return position;
    },
    async findById(id, tenantId) {
      const p = positions.get(id);
      if (!p || p.tenant_id !== tenantId || p.deleted_at) return null;
      return p;
    },
    async update(id, tenantId, data) {
      const p = positions.get(id);
      if (!p || p.tenant_id !== tenantId || p.deleted_at) return null;
      const updated: JobPosition = {
        ...p,
        ...data,
        slug: data.name ? slugify(data.name) : p.slug,
        updated_at: new Date(),
      };
      if (data.workSchedule || data.physicalConstraints || data.chemicalExposures) {
        updated.medicalSurveillanceLevel = data.medicalSurveillanceLevel ?? computeMedicalSurveillance({
          physicalConstraints: updated.physicalConstraints,
          chemicalExposures: updated.chemicalExposures,
          workSchedule: updated.workSchedule,
        });
      }
      positions.set(id, updated);
      return updated;
    },
    async softDelete(id, tenantId) {
      const p = positions.get(id);
      if (!p || p.tenant_id !== tenantId) return false;
      p.deleted_at = new Date();
      p.isActive = false;
      return true;
    },
    async list(tenantId, query) {
      let items = [...positions.values()].filter((p) => p.tenant_id === tenantId && !p.deleted_at);
      if (query.search) {
        const s = query.search.toLowerCase();
        items = items.filter((p) => p.name.toLowerCase().includes(s));
      }
      if (query.category) {
        items = items.filter((p) => p.category === query.category);
      }
      items.sort((a, b) => {
        const key = query.sort_by === 'headcount' ? 'headcount' : query.sort_by === 'created_at' ? 'created_at' : 'name';
        if (key === 'headcount') return query.sort_dir === 'asc' ? a.headcount - b.headcount : b.headcount - a.headcount;
        if (key === 'created_at') return query.sort_dir === 'asc' ? a.created_at.getTime() - b.created_at.getTime() : b.created_at.getTime() - a.created_at.getTime();
        return query.sort_dir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      });
      const total = items.length;
      items = items.slice(0, query.limit);
      return { items, total };
    },
    async findAll(tenantId) {
      return [...positions.values()].filter((p) => p.tenant_id === tenantId && !p.deleted_at);
    },
  };

  const employeeRepo: EmployeeRepository = {
    async create(data) {
      const id = crypto.randomUUID();
      const employee: Employee = {
        id,
        tenant_id: data.tenant_id,
        firstName: data.firstName,
        lastName: data.lastName,
        jobPositionId: data.jobPositionId,
        workUnitIds: data.workUnitIds ?? [],
        hireDate: data.hireDate,
        contractType: data.contractType,
        isPartTime: data.isPartTime ?? false,
        weeklyHours: data.weeklyHours ?? null,
        specificTrainings: data.specificTrainings ?? [],
        medicalVisits: data.medicalVisits ?? [],
        specificRestrictions: data.specificRestrictions ?? null,
        isActive: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      employees.set(id, employee);
      return employee;
    },
    async findById(id, tenantId) {
      const e = employees.get(id);
      if (!e || e.tenant_id !== tenantId || e.deleted_at) return null;
      return e;
    },
    async update(id, tenantId, data) {
      const e = employees.get(id);
      if (!e || e.tenant_id !== tenantId || e.deleted_at) return null;
      const updated: Employee = { ...e, ...data, updated_at: new Date() };
      if (data.weeklyHours === null) updated.weeklyHours = null;
      if (data.specificRestrictions === null) updated.specificRestrictions = null;
      employees.set(id, updated);
      return updated;
    },
    async softDelete(id, tenantId) {
      const e = employees.get(id);
      if (!e || e.tenant_id !== tenantId) return false;
      e.deleted_at = new Date();
      e.isActive = false;
      return true;
    },
    async list(tenantId, query) {
      let items = [...employees.values()].filter((e) => e.tenant_id === tenantId && !e.deleted_at);
      if (query.search) {
        const s = query.search.toLowerCase();
        items = items.filter((e) => `${e.firstName} ${e.lastName}`.toLowerCase().includes(s));
      }
      if (query.jobPositionId) {
        items = items.filter((e) => e.jobPositionId === query.jobPositionId);
      }
      if (query.contractType) {
        items = items.filter((e) => e.contractType === query.contractType);
      }
      items.sort((a, b) => {
        const key = query.sort_by === 'hireDate' ? 'hireDate' : query.sort_by === 'created_at' ? 'created_at' : 'lastName';
        if (key === 'hireDate') return query.sort_dir === 'asc' ? a.hireDate.localeCompare(b.hireDate) : b.hireDate.localeCompare(a.hireDate);
        if (key === 'created_at') return query.sort_dir === 'asc' ? a.created_at.getTime() - b.created_at.getTime() : b.created_at.getTime() - a.created_at.getTime();
        return query.sort_dir === 'asc' ? a.lastName.localeCompare(b.lastName) : b.lastName.localeCompare(a.lastName);
      });
      const total = items.length;
      items = items.slice(0, query.limit);
      return { items, total };
    },
    async findByPositionId(positionId, tenantId) {
      return [...employees.values()].filter((e) => e.tenant_id === tenantId && e.jobPositionId === positionId && !e.deleted_at);
    },
    async findAll(tenantId) {
      return [...employees.values()].filter((e) => e.tenant_id === tenantId && !e.deleted_at);
    },
  };

  const service = createHrService(positionRepo, employeeRepo);
  const preHandlers = [authenticate, injectTenant];

  // ── Positions CRUD ──────────────────────────────────────────────

  // POST /api/hr/positions
  app.post(
    '/api/hr/positions',
    { preHandler: [...preHandlers, requirePermission('legal', 'create')] },
    async (request, reply) => {
      const parsed = createPositionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid data', details: { issues: parsed.error.issues } } });
      }
      const result = await service.createPosition(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(400).send({ error: result.error });
      return reply.status(201).send(result.value);
    },
  );

  // GET /api/hr/positions
  app.get(
    '/api/hr/positions',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const parsed = positionListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: { issues: parsed.error.issues } } });
      }
      const result = await service.listPositions(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // GET /api/hr/positions/:id
  app.get(
    '/api/hr/positions/:id',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await service.getPosition(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // PUT /api/hr/positions/:id
  app.put(
    '/api/hr/positions/:id',
    { preHandler: [...preHandlers, requirePermission('legal', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updatePositionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid data', details: { issues: parsed.error.issues } } });
      }
      const result = await service.updatePosition(id, request.auth.tenant_id, parsed.data);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
        return reply.status(status).send({ error: result.error });
      }
      return result.value;
    },
  );

  // DELETE /api/hr/positions/:id
  app.delete(
    '/api/hr/positions/:id',
    { preHandler: [...preHandlers, requirePermission('legal', 'delete')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await service.deletePosition(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return reply.status(204).send();
    },
  );

  // ── Employees CRUD ──────────────────────────────────────────────

  // POST /api/hr/employees
  app.post(
    '/api/hr/employees',
    { preHandler: [...preHandlers, requirePermission('legal', 'create')] },
    async (request, reply) => {
      const parsed = createEmployeeSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid data', details: { issues: parsed.error.issues } } });
      }
      const result = await service.createEmployee(request.auth.tenant_id, parsed.data);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
        return reply.status(status).send({ error: result.error });
      }
      return reply.status(201).send(result.value);
    },
  );

  // GET /api/hr/employees
  app.get(
    '/api/hr/employees',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const parsed = employeeListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: { issues: parsed.error.issues } } });
      }
      const result = await service.listEmployees(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // GET /api/hr/employees/:id
  app.get(
    '/api/hr/employees/:id',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await service.getEmployee(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // PUT /api/hr/employees/:id
  app.put(
    '/api/hr/employees/:id',
    { preHandler: [...preHandlers, requirePermission('legal', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updateEmployeeSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid data', details: { issues: parsed.error.issues } } });
      }
      const result = await service.updateEmployee(id, request.auth.tenant_id, parsed.data);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
        return reply.status(status).send({ error: result.error });
      }
      return result.value;
    },
  );

  // DELETE /api/hr/employees/:id
  app.delete(
    '/api/hr/employees/:id',
    { preHandler: [...preHandlers, requirePermission('legal', 'delete')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await service.deleteEmployee(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return reply.status(204).send();
    },
  );

  // ── Templates ───────────────────────────────────────────────────

  // GET /api/hr/templates/:nafCode
  app.get(
    '/api/hr/templates/:nafCode',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { nafCode } = request.params as { nafCode: string };
      const effectifParam = (request.query as Record<string, string>).effectif;
      const effectif = effectifParam ? parseInt(effectifParam, 10) : 5;

      const template = findTemplateByNaf(nafCode);
      if (!template) {
        return reply.status(200).send({ metier: null, positions: [] });
      }

      const filledPositions = autofillHeadcounts(template, isNaN(effectif) ? 5 : effectif);
      return {
        metier: { slug: template.metierSlug, label: template.label },
        positions: template.positions.map((p, i) => ({
          ...p,
          suggestedHeadcount: filledPositions[i]?.headcount ?? 1,
        })),
      };
    },
  );

  // ── Trainings ───────────────────────────────────────────────────

  // GET /api/hr/trainings
  app.get(
    '/api/hr/trainings',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const result = await service.getAllTrainings(request.auth.tenant_id);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // GET /api/hr/trainings/expiring
  app.get(
    '/api/hr/trainings/expiring',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const daysParam = (request.query as Record<string, string>).days;
      const days = daysParam ? parseInt(daysParam, 10) : 90;
      const result = await service.getExpiringTrainings(request.auth.tenant_id, isNaN(days) ? 90 : days);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // GET /api/hr/trainings/missing
  app.get(
    '/api/hr/trainings/missing',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const result = await service.getMissingTrainings(request.auth.tenant_id);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // ── Medical Visits ──────────────────────────────────────────────

  // GET /api/hr/medical-visits
  app.get(
    '/api/hr/medical-visits',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const result = await service.getAllMedicalVisits(request.auth.tenant_id);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // GET /api/hr/medical-visits/upcoming
  app.get(
    '/api/hr/medical-visits/upcoming',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const daysParam = (request.query as Record<string, string>).days;
      const days = daysParam ? parseInt(daysParam, 10) : 90;
      const result = await service.getUpcomingMedicalVisits(request.auth.tenant_id, isNaN(days) ? 90 : days);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // ── Dashboard ───────────────────────────────────────────────────

  // GET /api/hr/dashboard
  app.get(
    '/api/hr/dashboard',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const result = await service.getDashboard(request.auth.tenant_id);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // ── Workforce for DUERP ─────────────────────────────────────────

  // GET /api/hr/workforce-for-duerp
  app.get(
    '/api/hr/workforce-for-duerp',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const allPositions = await positionRepo.findAll(request.auth.tenant_id);
      const allEmployees = await employeeRepo.findAll(request.auth.tenant_id);
      const workforce = buildWorkforceForDuerp(allPositions, allEmployees);
      return workforce;
    },
  );

  // ── Triggers ────────────────────────────────────────────────────

  // GET /api/hr/triggers
  app.get(
    '/api/hr/triggers',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async () => {
      return service.getTriggers();
    },
  );
}
