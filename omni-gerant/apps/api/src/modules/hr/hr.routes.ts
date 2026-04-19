import type { FastifyInstance } from 'fastify';
import { createHrService } from './hr.service.js';
import { createPrismaPositionRepository, createPrismaEmployeeRepository } from './hr.repository.js';
import {
  createPositionSchema, updatePositionSchema, positionListQuerySchema,
  createEmployeeSchema, updateEmployeeSchema, employeeListQuerySchema,
  exitEmployeeSchema,
} from './hr.schemas.js';
import { findTemplateByNaf, autofillHeadcounts } from './job-templates.js';
import { buildWorkforceForDuerp } from './workforce-for-duerp.js';
import { validateSmic, computeAverageHeadcount, appendRegistryEntry, listRegistryEntries } from './hr-compliance.js';
import { prisma } from '@zenadmin/db';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// BUSINESS RULE [CDC-2.4]: Module RH — Effectif & Postes

export async function hrRoutes(app: FastifyInstance) {
  // BUSINESS RULE [CDC-RH-V1]: Persistance Prisma (remplace les Maps qui perdaient
  // toutes les donnees RH a chaque redeploy Render).
  const positionRepo = createPrismaPositionRepository();
  const employeeRepo = createPrismaEmployeeRepository();

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
    async (request) => {
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

  // ── V1 Fondations : SMIC, effectif moyen, Registre Unique, sortie ──

  // POST /api/hr/employees/:id/exit — enregistre sortie de l'employe
  app.post(
    '/api/hr/employees/:id/exit',
    { preHandler: [...preHandlers, requirePermission('legal', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = exitEmployeeSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid exit data', details: { issues: parsed.error.issues } } });
      }
      const employee = await employeeRepo.findById(id, request.auth.tenant_id);
      if (!employee) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });

      await prisma.hrEmployee.update({
        where: { id },
        data: {
          exit_date: new Date(parsed.data.exitDate),
          exit_reason: parsed.data.exitReason,
          is_active: false,
        },
      });

      // Registre Unique du Personnel
      await appendRegistryEntry({
        tenant_id: request.auth.tenant_id,
        employee_id: id,
        entry_type: 'sortie',
        employee_name: `${employee.lastName} ${employee.firstName}`,
        contract_type: employee.contractType,
        event_date: new Date(parsed.data.exitDate),
        metadata: { reason: parsed.data.exitReason } as any,
        created_by: request.auth.user_id,
      });

      return { status: 'exited', exitDate: parsed.data.exitDate, exitReason: parsed.data.exitReason };
    },
  );

  // POST /api/hr/validate-smic — valide un salaire par rapport au SMIC
  app.post(
    '/api/hr/validate-smic',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request) => {
      const body = request.body as {
        monthlyGrossCents: number;
        weeklyHours: number;
        contractType: string;
        birthDate?: string;
        startDate?: string;
      };
      return validateSmic(body);
    },
  );

  // GET /api/hr/headcount/:year — effectif mensuel moyen + seuils
  app.get(
    '/api/hr/headcount/:year',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { year } = request.params as { year: string };
      const y = parseInt(year, 10);
      if (isNaN(y) || y < 2000 || y > 2100) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Annee invalide' } });
      }
      const result = await computeAverageHeadcount(request.auth.tenant_id, y);
      return result;
    },
  );

  // GET /api/hr/registry — Registre Unique du Personnel
  app.get(
    '/api/hr/registry',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request) => {
      const limit = parseInt((request.query as Record<string, string>).limit ?? '200', 10);
      const entries = await listRegistryEntries(request.auth.tenant_id, isNaN(limit) ? 200 : limit);
      return { entries, total: entries.length };
    },
  );
}
