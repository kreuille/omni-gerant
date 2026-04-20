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
import {
  generatePayslip, generateAllPayslips, getPayslip, listPayslips, closePeriod, markPayslipSent,
} from './payroll/payroll.service.js';
import { generateDpae, renderDpaeHtml } from './docs/dpae.js';
import { loadContractContext, renderContract, markContractSigned } from './docs/contract-templates.js';
import { computeLeaveBalance, createLeave, listLeaves, type LeaveType } from './docs/leaves.service.js';
import { getApplicablePostings, renderPostingsChecklistHtml, MANDATORY_POSTINGS } from './docs/postings.js';
import { formatAddress as formatTenantAddress } from './payroll/address-format.js';
import { computeTermination, type TerminationReason } from './termination/termination.service.js';
import { renderSoldeToutCompte, renderCertificatTravail, renderAttestationPoleEmploi } from './termination/termination-docs.js';
import { exportPayrollAccounting, formatAccountingExportCsv } from './termination/payroll-accounting.js';
import { generateMonthlyDsn, generateExitEventDsn, listDsnFilings } from './payroll/dsn.service.js';
import { issueMagicLink, verifyMagicLink, listPayslipsForEmployee } from './portal/portal.service.js';
import { initContractSignature, signAsEmployer, signAsEmployee, getSignature } from './portal/signature.service.js';
import { getHrDashboard } from './analytics/hr-analytics.service.js';
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

  // ── V2 Paie : bulletins mensuels ─────────────────────────────────

  // POST /api/hr/payroll/periods/:year/:month/generate — genere tous les bulletins
  app.post(
    '/api/hr/payroll/periods/:year/:month/generate',
    { preHandler: [...preHandlers, requirePermission('legal', 'create')] },
    async (request, reply) => {
      const { year, month } = request.params as { year: string; month: string };
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Periode invalide' } });
      }
      const result = await generateAllPayslips(request.auth.tenant_id, y, m);
      if (!result.ok) return reply.status(403).send({ error: result.error });
      return result.value;
    },
  );

  // POST /api/hr/payroll/payslips — generer un bulletin individuel ou recalculer
  app.post(
    '/api/hr/payroll/payslips',
    { preHandler: [...preHandlers, requirePermission('legal', 'create')] },
    async (request, reply) => {
      const body = request.body as {
        employeeId: string; year: number; month: number;
        overtimeCents?: number; bonusCents?: number; indemnityCents?: number; hoursWorked?: number;
      };
      if (!body?.employeeId || !body?.year || !body?.month) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'employeeId, year, month requis' } });
      }
      const result = await generatePayslip(request.auth.tenant_id, body.year, body.month, body);
      if (!result.ok) {
        const status = result.error.code === 'FORBIDDEN' ? 403 : result.error.code === 'NOT_FOUND' ? 404 : 400;
        return reply.status(status).send({ error: result.error });
      }
      return reply.status(201).send(result.value);
    },
  );

  // GET /api/hr/payroll/periods/:year/:month — liste bulletins du mois
  app.get(
    '/api/hr/payroll/periods/:year/:month',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { year, month } = request.params as { year: string; month: string };
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      if (isNaN(y) || isNaN(m)) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Periode invalide' } });
      }
      const items = await listPayslips(request.auth.tenant_id, y, m);
      return { items, total: items.length };
    },
  );

  // GET /api/hr/payroll/payslips/:id — detail bulletin
  app.get(
    '/api/hr/payroll/payslips/:id',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await getPayslip(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // GET /api/hr/payroll/payslips/:id/pdf — bulletin en HTML (print -> PDF)
  app.get(
    '/api/hr/payroll/payslips/:id/pdf',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await getPayslip(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });

      const payslip = result.value;
      const employee = await prisma.hrEmployee.findUnique({
        where: { id: payslip.employee_id },
        include: { position: true },
      });
      const tenant = await prisma.tenant.findUnique({ where: { id: request.auth.tenant_id } });

      const { formatAddress } = await import('./payroll/address-format.js');
      const { generatePayslipPdf } = await import('./payroll/payroll-pdf-binary.js');

      // Charger settings paie (URSSAF/CARSAT/CC/AT-MP)
      const settings = await prisma.hrPayrollSettings.findUnique({ where: { tenant_id: request.auth.tenant_id } });
      // Date de paiement : jour configure du mois suivant la periode
      const paymentDay = settings?.payment_day_of_month ?? 28;
      const paymentDate = new Date(payslip.period_year, payslip.period_month, Math.min(paymentDay, 28));

      const pdfBuffer = await generatePayslipPdf({
        employer: {
          name: tenant?.name ?? '',
          siret: tenant?.siret ?? null,
          nafCode: tenant?.naf_code ?? null,
          address: formatAddress(tenant?.address),
          urssafRef: settings?.urssaf_ref ?? null,
          carsatRef: settings?.carsat_ref ?? null,
          conventionCollective: settings?.convention_collective ?? employee?.position?.convention_collective ?? null,
          idcc: settings?.idcc ?? employee?.position?.code_idcc ?? null,
          atmpRateBp: settings?.atmp_rate_bp ?? 150,
        },
        employee: {
          firstName: employee?.first_name ?? '',
          lastName: employee?.last_name ?? '',
          position: employee?.position?.name ?? null,
          classification: employee?.position?.classification ?? null,
          coefficient: employee?.position?.coefficient ?? null,
          echelon: employee?.position?.echelon ?? null,
          socialSecurityNumber: employee?.social_security_number ?? null,
          startDate: employee?.start_date ?? null,
          contractType: employee?.contract_type ?? null,
        },
        payslip,
        paymentDate,
      });

      const filename = `bulletin-${employee?.last_name ?? 'salarie'}-${payslip.period_year}-${String(payslip.period_month).padStart(2, '0')}.pdf`;
      return reply
        .type('application/pdf')
        .header('content-disposition', `attachment; filename="${filename}"`)
        .send(pdfBuffer);
    },
  );

  // POST /api/hr/payroll/payslips/:id/send — envoi email via Resend
  app.post(
    '/api/hr/payroll/payslips/:id/send',
    { preHandler: [...preHandlers, requirePermission('legal', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await getPayslip(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      const payslip = result.value;
      const employee = await prisma.hrEmployee.findUnique({ where: { id: payslip.employee_id } });
      if (!employee?.email) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Salarie sans email' } });
      }
      // V2 : marquer envoye. V3 : integration Resend reelle avec PDF attache.
      await markPayslipSent(id);
      return { sent: true, email: employee.email, sentAt: new Date().toISOString() };
    },
  );

  // POST /api/hr/payroll/periods/:year/:month/close — cloture la periode
  app.post(
    '/api/hr/payroll/periods/:year/:month/close',
    { preHandler: [...preHandlers, requirePermission('legal', 'update')] },
    async (request, reply) => {
      const { year, month } = request.params as { year: string; month: string };
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      const result = await closePeriod(request.auth.tenant_id, y, m);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // ── V5 Settings Paie : mutuelle + prevoyance + TR ─────────────────

  // GET /api/hr/payroll/settings
  app.get(
    '/api/hr/payroll/settings',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request) => {
      const settings = await prisma.hrPayrollSettings.findUnique({ where: { tenant_id: request.auth.tenant_id } });
      return settings ?? {
        tenant_id: request.auth.tenant_id,
        mutuelle_enabled: false,
        mutuelle_employee_rate_bp: 0, mutuelle_employer_rate_bp: 0,
        mutuelle_flat_employee_cents: 0, mutuelle_flat_employer_cents: 0,
        mutuelle_organisme: null,
        prevoyance_enabled: false,
        prevoyance_employee_rate_bp: 0, prevoyance_employer_rate_bp: 0,
        prevoyance_organisme: null,
        tr_enabled: false, tr_face_value_cents: 0, tr_employer_share_bp: 5000,
      };
    },
  );

  // V6 DSN endpoints
  app.post(
    '/api/hr/dsn/monthly/:year/:month',
    { preHandler: [...preHandlers, requirePermission('legal', 'create')] },
    async (request, reply) => {
      const { year, month } = request.params as { year: string; month: string };
      const r = await generateMonthlyDsn(request.auth.tenant_id, parseInt(year, 10), parseInt(month, 10));
      if (!r.ok) return reply.status(400).send({ error: r.error });
      return r.value;
    },
  );

  app.post(
    '/api/hr/dsn/event-exit/:employeeId',
    { preHandler: [...preHandlers, requirePermission('legal', 'create')] },
    async (request, reply) => {
      const { employeeId } = request.params as { employeeId: string };
      const body = request.body as { reason?: string };
      const r = await generateExitEventDsn(request.auth.tenant_id, employeeId, body?.reason ?? 'fin_contrat');
      if (!r.ok) return reply.status(400).send({ error: r.error });
      return r.value;
    },
  );

  app.get(
    '/api/hr/dsn',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request) => {
      const items = await listDsnFilings(request.auth.tenant_id);
      return { items, total: items.length };
    },
  );

  // BL3 : GET /api/hr/dsn/:id/neodes — fichier NEODeS reel (format net-entreprises.fr)
  app.get(
    '/api/hr/dsn/:id/neodes',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const filing = await prisma.hrDsnFiling.findFirst({ where: { id, tenant_id: request.auth.tenant_id } });
      if (!filing) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'DSN introuvable' } });
      const { generateNeodesFile } = await import('./payroll/dsn-xml.js');
      const content = generateNeodesFile(filing.payload as unknown as import('./payroll/dsn.service.js').DsnMonthlyPayload);
      const filename = `DSN-${filing.period_year}-${String(filing.period_month).padStart(2, '0')}.dsn`;
      return reply
        .type('text/plain; charset=utf-8')
        .header('content-disposition', `attachment; filename="${filename}"`)
        .send(content);
    },
  );

  // V10 Dashboard analytics RH
  app.get(
    '/api/hr/dashboard/analytics',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request) => {
      return await getHrDashboard(request.auth.tenant_id);
    },
  );

  // ── V8 Portail salarie + signature ────────────────────────────

  // POST /api/hr/employees/:id/portal-link — genere un magic link
  app.post(
    '/api/hr/employees/:id/portal-link',
    { preHandler: [...preHandlers, requirePermission('legal', 'create')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const r = await issueMagicLink(request.auth.tenant_id, id);
      if (!r.ok) return reply.status(400).send({ error: r.error });
      return r.value;
    },
  );

  // GET /api/hr/portal/verify?token=... — verifie et retourne les bulletins du salarie
  app.get('/api/hr/portal/verify', async (request, reply) => {
    const { token } = request.query as { token?: string };
    if (!token) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Token requis' } });
    const v = await verifyMagicLink(token);
    if (!v.ok) return reply.status(401).send({ error: v.error });
    const payslips = await listPayslipsForEmployee(v.value.tenantId, v.value.employeeId);
    return { employee: v.value.employee, payslips };
  });

  // GET /api/hr/portal/payslip/:id?token=... — PDF bulletin via magic link
  app.get('/api/hr/portal/payslip/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { token } = request.query as { token?: string };
    if (!token) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Token requis' } });
    const v = await verifyMagicLink(token);
    if (!v.ok) return reply.status(401).send({ error: v.error });
    const p = await prisma.hrPayslip.findFirst({ where: { id, tenant_id: v.value.tenantId, employee_id: v.value.employeeId } });
    if (!p) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Bulletin introuvable' } });
    const emp = await prisma.hrEmployee.findUnique({ where: { id: p.employee_id }, include: { position: true } });
    const tenant = await prisma.tenant.findUnique({ where: { id: p.tenant_id } });
    const { renderPayslipHtml } = await import('./payroll/payroll-pdf.js');
    const html = renderPayslipHtml({
      employer: { name: tenant?.name ?? '', siret: tenant?.siret ?? null, nafCode: tenant?.naf_code ?? null, address: null },
      employee: { firstName: emp?.first_name ?? '', lastName: emp?.last_name ?? '', position: emp?.position?.name ?? null, classification: null, socialSecurityNumber: emp?.social_security_number ?? null, startDate: emp?.start_date ?? null, contractType: emp?.contract_type ?? null },
      payslip: p as Parameters<typeof renderPayslipHtml>[0]['payslip'],
    });
    return reply.type('text/html').send(html);
  });

  // POST /api/hr/employees/:id/signature — init signature
  app.post(
    '/api/hr/employees/:id/signature',
    { preHandler: [...preHandlers, requirePermission('legal', 'create')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { loadContractContext, renderContract } = await import('./docs/contract-templates.js');
      const ctxR = await loadContractContext(id, request.auth.tenant_id);
      if (!ctxR.ok) return reply.status(400).send({ error: ctxR.error });
      const html = renderContract(ctxR.value);
      const r = await initContractSignature(request.auth.tenant_id, id, ctxR.value.employment.contractType, html);
      if (!r.ok) return reply.status(400).send({ error: r.error });
      return reply.status(201).send(r.value);
    },
  );

  // POST /api/hr/signatures/:id/sign-employer
  app.post(
    '/api/hr/signatures/:id/sign-employer',
    { preHandler: [...preHandlers, requirePermission('legal', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const r = await signAsEmployer(id, request.auth.tenant_id, `employer-${request.auth.user_id.slice(0, 8)}@company`);
      if (!r.ok) return reply.status(400).send({ error: r.error });
      return r.value;
    },
  );

  // GET /api/hr/signatures/:id/view — public (employee) signs from portal
  app.get('/api/hr/signatures/:id/view', async (request, reply) => {
    const { id } = request.params as { id: string };
    const sig = await getSignature(id);
    if (!sig) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Signature introuvable' } });
    return { id: sig.id, contractType: sig.contractType, status: sig.status, documentHash: sig.documentHash, signedByEmployerAt: sig.signedByEmployerAt, signedByEmployeeAt: sig.signedByEmployeeAt };
  });

  app.get('/api/hr/signatures/:id/document', async (request, reply) => {
    const { id } = request.params as { id: string };
    const sig = await getSignature(id);
    if (!sig) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Introuvable' } });
    return reply.type('text/html').send(sig.documentHtml);
  });

  // POST /api/hr/signatures/:id/sign-employee — public, avec email confirmation
  app.post('/api/hr/signatures/:id/sign-employee', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { email?: string };
    if (!body?.email) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Email requis' } });
    const r = await signAsEmployee(id, body.email);
    if (!r.ok) return reply.status(400).send({ error: r.error });
    return r.value;
  });

  // V6 PAS — modifier le taux PAS d'un employe
  app.patch(
    '/api/hr/employees/:id/pas',
    { preHandler: [...preHandlers, requirePermission('legal', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { pasRateBp?: number };
      const rate = Math.max(0, Math.min(4000, Number(body?.pasRateBp ?? 0)));
      const e = await prisma.hrEmployee.findFirst({ where: { id, tenant_id: request.auth.tenant_id, deleted_at: null } });
      if (!e) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Employe introuvable' } });
      await prisma.hrEmployee.update({ where: { id }, data: { pas_rate_bp: rate } });
      return { id, pasRateBp: rate };
    },
  );

  // POST /api/hr/payroll/settings/autofill — cherche URSSAF/CARSAT/CC/IDCC depuis SIRET
  app.post(
    '/api/hr/payroll/settings/autofill',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { autofillPayrollSettings } = await import('./payroll/autofill-settings.service.js');
      const r = await autofillPayrollSettings(request.auth.tenant_id);
      if (!r.ok) return reply.status(r.error.code === 'NOT_FOUND' ? 404 : 400).send({ error: r.error });
      return r.value;
    },
  );

  // PUT /api/hr/payroll/settings
  app.put(
    '/api/hr/payroll/settings',
    { preHandler: [...preHandlers, requirePermission('legal', 'update')] },
    async (request, reply) => {
      const body = request.body as Record<string, unknown>;
      if (typeof body !== 'object' || !body) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Body invalide' } });
      }
      const clean = {
        mutuelle_enabled: Boolean(body['mutuelle_enabled']),
        mutuelle_employee_rate_bp: Math.max(0, Math.min(5000, Number(body['mutuelle_employee_rate_bp'] ?? 0))),
        mutuelle_employer_rate_bp: Math.max(0, Math.min(5000, Number(body['mutuelle_employer_rate_bp'] ?? 0))),
        mutuelle_flat_employee_cents: Math.max(0, Math.round(Number(body['mutuelle_flat_employee_cents'] ?? 0))),
        mutuelle_flat_employer_cents: Math.max(0, Math.round(Number(body['mutuelle_flat_employer_cents'] ?? 0))),
        mutuelle_organisme: typeof body['mutuelle_organisme'] === 'string' ? body['mutuelle_organisme'] : null,
        prevoyance_enabled: Boolean(body['prevoyance_enabled']),
        prevoyance_employee_rate_bp: Math.max(0, Math.min(5000, Number(body['prevoyance_employee_rate_bp'] ?? 0))),
        prevoyance_employer_rate_bp: Math.max(0, Math.min(5000, Number(body['prevoyance_employer_rate_bp'] ?? 0))),
        prevoyance_organisme: typeof body['prevoyance_organisme'] === 'string' ? body['prevoyance_organisme'] : null,
        tr_enabled: Boolean(body['tr_enabled']),
        tr_face_value_cents: Math.max(0, Math.round(Number(body['tr_face_value_cents'] ?? 0))),
        tr_employer_share_bp: Math.max(5000, Math.min(6000, Number(body['tr_employer_share_bp'] ?? 5000))),
        atmp_rate_bp: Math.max(0, Math.min(1500, Number(body['atmp_rate_bp'] ?? 150))),
        urssaf_ref: typeof body['urssaf_ref'] === 'string' ? body['urssaf_ref'] : null,
        carsat_ref: typeof body['carsat_ref'] === 'string' ? body['carsat_ref'] : null,
        convention_collective: typeof body['convention_collective'] === 'string' ? body['convention_collective'] : null,
        idcc: typeof body['idcc'] === 'string' ? body['idcc'] : null,
        payment_day_of_month: Math.max(1, Math.min(31, Math.round(Number(body['payment_day_of_month'] ?? 28)))),
      };
      const settings = await prisma.hrPayrollSettings.upsert({
        where: { tenant_id: request.auth.tenant_id },
        create: { tenant_id: request.auth.tenant_id, ...clean },
        update: clean,
      });
      return settings;
    },
  );

  // ── V3 Documents : DPAE, contrats, conges, affichages ────────────

  // POST /api/hr/employees/:id/dpae/generate — genere la DPAE
  app.post(
    '/api/hr/employees/:id/dpae/generate',
    { preHandler: [...preHandlers, requirePermission('legal', 'create')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await generateDpae(id, request.auth.tenant_id);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
        return reply.status(status).send({ error: result.error });
      }
      return reply.status(201).send({
        reference: result.value.reference,
        generatedAt: result.value.generatedAt,
        depositUrl: 'https://www.due.urssaf.fr/',
      });
    },
  );

  // GET /api/hr/employees/:id/dpae/download — HTML imprimable DPAE
  app.get(
    '/api/hr/employees/:id/dpae/download',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await generateDpae(id, request.auth.tenant_id);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
        return reply.status(status).send({ error: result.error });
      }
      return reply.type('text/html').send(renderDpaeHtml(result.value));
    },
  );

  // GET /api/hr/employees/:id/contract/generate — HTML contrat de travail
  app.get(
    '/api/hr/employees/:id/contract/generate',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await loadContractContext(id, request.auth.tenant_id);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
        return reply.status(status).send({ error: result.error });
      }
      return reply.type('text/html').send(renderContract(result.value));
    },
  );

  // POST /api/hr/employees/:id/contract/sign — marque le contrat signe
  app.post(
    '/api/hr/employees/:id/contract/sign',
    { preHandler: [...preHandlers, requirePermission('legal', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await markContractSigned(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // GET /api/hr/employees/:id/leaves/balance — solde CP/RTT
  app.get(
    '/api/hr/employees/:id/leaves/balance',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await computeLeaveBalance(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // POST /api/hr/employees/:id/leaves — enregistre une absence/conge
  app.post(
    '/api/hr/employees/:id/leaves',
    { preHandler: [...preHandlers, requirePermission('legal', 'create')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        leaveType: LeaveType; startDate: string; endDate: string;
        daysTaken: number; notes?: string; status?: 'requested' | 'approved' | 'rejected' | 'taken';
      };
      if (!body?.leaveType || !body?.startDate || !body?.endDate || typeof body.daysTaken !== 'number') {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'leaveType, startDate, endDate, daysTaken requis' } });
      }
      const result = await createLeave(request.auth.tenant_id, {
        employeeId: id,
        leaveType: body.leaveType,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        daysTaken: body.daysTaken,
        notes: body.notes,
        status: body.status,
      });
      if (!result.ok) return reply.status(400).send({ error: result.error });
      return reply.status(201).send(result.value);
    },
  );

  // GET /api/hr/leaves — liste tous les conges du tenant (filtre employee optionnel)
  app.get(
    '/api/hr/leaves',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request) => {
      const { employeeId } = request.query as { employeeId?: string };
      const items = await listLeaves(request.auth.tenant_id, employeeId);
      return { items, total: items.length };
    },
  );

  // GET /api/hr/postings — liste affichages obligatoires selon effectif
  app.get(
    '/api/hr/postings',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request) => {
      const q = request.query as { headcount?: string; isErp?: string };
      const headcount = parseInt(q.headcount ?? '0', 10);
      const isErp = q.isErp === 'true';
      const applicable = getApplicablePostings({ headcount: isNaN(headcount) ? 0 : headcount, isErp });
      return { all: MANDATORY_POSTINGS, applicable, total: applicable.length };
    },
  );

  // GET /api/hr/postings/checklist — HTML imprimable des affichages
  app.get(
    '/api/hr/postings/checklist',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const q = request.query as { headcount?: string; isErp?: string };
      const headcount = parseInt(q.headcount ?? '0', 10);
      const isErp = q.isErp === 'true';
      const tenant = await prisma.tenant.findUnique({ where: { id: request.auth.tenant_id } });
      const postings = getApplicablePostings({ headcount: isNaN(headcount) ? 0 : headcount, isErp });
      return reply.type('text/html').send(renderPostingsChecklistHtml(tenant?.name ?? 'Entreprise', postings));
    },
  );

  // ── V4 Rupture + Compta ──────────────────────────────────────────

  async function loadTerminationDocContext(employeeId: string, tenantId: string, reason: TerminationReason, terminationDate: Date, extra?: {
    avgMonthlyGrossCents?: number; cpDaysRemaining?: number; totalGrossPaidCents?: number; noticeDaysPaid?: number; noticeDailyCents?: number;
  }) {
    const breakdownResult = await computeTermination(tenantId, {
      employeeId, terminationDate, reason,
      ...(extra ?? {}),
    });
    if (!breakdownResult.ok) return { ok: false as const, error: breakdownResult.error };
    const employee = await prisma.hrEmployee.findUnique({ where: { id: employeeId }, include: { position: true } });
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!employee || !tenant) return { ok: false as const, error: { code: 'NOT_FOUND' as const, message: 'Employe ou tenant introuvable' } };
    return {
      ok: true as const,
      ctx: {
        employer: {
          name: tenant.name,
          siret: tenant.siret,
          address: formatTenantAddress(tenant.address),
          nafCode: tenant.naf_code,
        },
        employee: {
          firstName: employee.first_name,
          lastName: employee.last_name,
          birthDate: employee.birth_date,
          socialSecurityNumber: employee.social_security_number,
          address: [employee.address_line1, employee.zip_code, employee.city].filter(Boolean).join(', ') || null,
          position: employee.position?.name ?? null,
          contractType: employee.contract_type,
          hireDate: employee.start_date,
        },
        breakdown: breakdownResult.value,
      },
    };
  }

  // POST /api/hr/employees/:id/termination/compute — calcule les indemnites de sortie
  app.post(
    '/api/hr/employees/:id/termination/compute',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        reason: TerminationReason; terminationDate: string;
        avgMonthlyGrossCents?: number; cpDaysRemaining?: number;
        totalGrossPaidCents?: number; noticeDaysPaid?: number; noticeDailyCents?: number;
      };
      if (!body?.reason || !body?.terminationDate) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'reason + terminationDate requis' } });
      }
      const result = await computeTermination(request.auth.tenant_id, {
        employeeId: id,
        terminationDate: new Date(body.terminationDate),
        reason: body.reason,
        avgMonthlyGrossCents: body.avgMonthlyGrossCents,
        cpDaysRemaining: body.cpDaysRemaining,
        totalGrossPaidCents: body.totalGrossPaidCents,
        noticeDaysPaid: body.noticeDaysPaid,
        noticeDailyCents: body.noticeDailyCents,
      });
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
        return reply.status(status).send({ error: result.error });
      }
      return result.value;
    },
  );

  // GET /api/hr/employees/:id/termination/solde?reason=...&date=... — HTML solde de tout compte
  app.get(
    '/api/hr/employees/:id/termination/solde',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const q = request.query as { reason?: TerminationReason; date?: string };
      if (!q.reason || !q.date) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'reason et date requis' } });
      }
      const ctxRes = await loadTerminationDocContext(id, request.auth.tenant_id, q.reason, new Date(q.date));
      if (!ctxRes.ok) return reply.status(404).send({ error: ctxRes.error });
      return reply.type('text/html').send(renderSoldeToutCompte(ctxRes.ctx));
    },
  );

  // GET /api/hr/employees/:id/termination/certificat
  app.get(
    '/api/hr/employees/:id/termination/certificat',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const q = request.query as { reason?: TerminationReason; date?: string };
      if (!q.reason || !q.date) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'reason et date requis' } });
      }
      const ctxRes = await loadTerminationDocContext(id, request.auth.tenant_id, q.reason, new Date(q.date));
      if (!ctxRes.ok) return reply.status(404).send({ error: ctxRes.error });
      return reply.type('text/html').send(renderCertificatTravail(ctxRes.ctx));
    },
  );

  // GET /api/hr/employees/:id/termination/attestation-pe
  app.get(
    '/api/hr/employees/:id/termination/attestation-pe',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const q = request.query as { reason?: TerminationReason; date?: string };
      if (!q.reason || !q.date) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'reason et date requis' } });
      }
      const ctxRes = await loadTerminationDocContext(id, request.auth.tenant_id, q.reason, new Date(q.date));
      if (!ctxRes.ok) return reply.status(404).send({ error: ctxRes.error });
      return reply.type('text/html').send(renderAttestationPoleEmploi(ctxRes.ctx));
    },
  );

  // GET /api/hr/accounting/:year/:month — export OD comptable classe 64
  app.get(
    '/api/hr/accounting/:year/:month',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { year, month } = request.params as { year: string; month: string };
      const result = await exportPayrollAccounting(request.auth.tenant_id, parseInt(year, 10), parseInt(month, 10));
      if (!result.ok) return reply.status(400).send({ error: result.error });
      return result.value;
    },
  );

  // GET /api/hr/accounting/:year/:month/csv — export CSV
  app.get(
    '/api/hr/accounting/:year/:month/csv',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { year, month } = request.params as { year: string; month: string };
      const result = await exportPayrollAccounting(request.auth.tenant_id, parseInt(year, 10), parseInt(month, 10));
      if (!result.ok) return reply.status(400).send({ error: result.error });
      return reply.type('text/csv').header('content-disposition', `attachment; filename="paie-${result.value.periodLabel}.csv"`).send(formatAccountingExportCsv(result.value));
    },
  );
}
