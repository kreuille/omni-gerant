import type { FastifyInstance } from 'fastify';
import { createDuerpService } from './duerp.service.js';
import { createPrismaDuerpRepository } from './duerp.repository.js';
import { createDuerpSchema, updateDuerpSchema } from './duerp.schemas.js';
import { getRisksByNafCode, detectPurchaseRisks } from './risk-database.js';
import { generateDuerpHtml } from './duerp-pdf.js';
import { createDuerpAutoFill, type PurchaseInfo, type InsuranceInfo } from './duerp-autofill.js';
import { createSiretLookup } from '../../../lib/siret-lookup.js';
import { createTenantRepository } from '../../tenant/tenant.repository.js';
import { authenticate, requirePermission } from '../../../plugins/auth.js';
import { injectTenant } from '../../../plugins/tenant.js';

// BUSINESS RULE [CDC-2.4]: Routes DUERP avec auto-fill intelligent

export async function duerpRoutes(app: FastifyInstance) {
  const repo = createPrismaDuerpRepository();
  const tenantRepo = createTenantRepository();

  const duerpService = createDuerpService(repo);
  const siretLookup = createSiretLookup();

  // Auto-fill orchestrator — wired to tenant repository
  const autoFill = createDuerpAutoFill({
    lookupSiret: (siret) => siretLookup.lookup(siret),
    getTenantProfile: async (tenantId) => tenantRepo.findById(tenantId),
    getRecentPurchases: async () => [] as PurchaseInfo[], // TODO: wire to purchases module
    getInsurances: async () => [] as InsuranceInfo[], // TODO: wire to insurance module
    getLatestDuerp: async (tenantId) => repo.findLatest(tenantId),
  });

  const preHandlers = [authenticate, injectTenant];

  // POST /api/legal/duerp/autofill — Generate auto-fill data for DUERP wizard
  // BUSINESS RULE [CDC-2.4]: Zero saisie — pre-remplissage automatique
  app.post(
    '/api/legal/duerp/autofill',
    { preHandler: [...preHandlers, requirePermission('legal', 'create')] },
    async (request, reply) => {
      const body = request.body as { siret?: string; naf_code?: string; company_name?: string; employee_count?: number } | undefined;
      // Normalize SIRET: strip spaces (accepts both "890 246 390 00029" and "89024639000029")
      const normalizedSiret = body?.siret?.replace(/\s/g, '') || undefined;

      // Store/update tenant profile for auto-fill
      const tenantId = request.auth.tenant_id;
      const existingProfile = tenantProfiles.get(tenantId);
      const profile: TenantProfile = {
        id: tenantId,
        name: body?.company_name ?? existingProfile?.name ?? 'Mon Entreprise',
        siret: normalizedSiret ?? existingProfile?.siret ?? null,
        siren: existingProfile?.siren ?? null,
        naf_code: body?.naf_code ?? existingProfile?.naf_code ?? null,
        address: existingProfile?.address ?? null,
        employee_count: body?.employee_count ?? existingProfile?.employee_count ?? 1,
        dirigeant_name: existingProfile?.dirigeant_name ?? null,
      };
      tenantProfiles.set(tenantId, profile);

      const result = await autoFill.generateAutoFill(tenantId);
      if (!result.ok) return reply.status(400).send({ error: result.error });
      return result.value;
    },
  );

  // POST /api/legal/duerp — Generate new DUERP
  app.post(
    '/api/legal/duerp',
    { preHandler: [...preHandlers, requirePermission('legal', 'create')] },
    async (request, reply) => {
      const parsed = createDuerpSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid DUERP data', details: { issues: parsed.error.issues } },
        });
      }

      // Update tenant profile for future auto-fills
      const tenantId = request.auth.tenant_id;
      tenantProfiles.set(tenantId, {
        id: tenantId,
        name: parsed.data.company_name,
        siret: parsed.data.siret ?? null,
        siren: null,
        naf_code: parsed.data.naf_code ?? null,
        address: parsed.data.address ?? null,
        employee_count: parsed.data.employee_count,
        dirigeant_name: parsed.data.evaluator_name,
      });

      const result = await duerpService.generate(tenantId, parsed.data);
      if (!result.ok) return reply.status(400).send({ error: result.error });
      return reply.status(201).send(result.value);
    },
  );

  // GET /api/legal/duerp — Get latest DUERP
  app.get(
    '/api/legal/duerp',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const result = await duerpService.getLatest(request.auth.tenant_id);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      if (!result.value) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No DUERP found' } });
      return result.value;
    },
  );

  // GET /api/legal/duerp/:id
  app.get(
    '/api/legal/duerp/:id',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await duerpService.getById(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // PUT /api/legal/duerp/:id
  app.put(
    '/api/legal/duerp/:id',
    { preHandler: [...preHandlers, requirePermission('legal', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updateDuerpSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid DUERP data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await duerpService.update(id, request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // DELETE /api/legal/duerp/:id
  app.delete(
    '/api/legal/duerp/:id',
    { preHandler: [...preHandlers, requirePermission('legal', 'delete')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await duerpService.delete(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return reply.status(204).send();
    },
  );

  // GET /api/legal/duerp/:id/pdf — Generate PDF HTML
  app.get(
    '/api/legal/duerp/:id/pdf',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await duerpService.getById(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });

      const html = generateDuerpHtml(result.value);
      return reply.type('text/html').send(html);
    },
  );

  // GET /api/legal/duerp/risks/:nafCode — Get risk templates for NAF code
  app.get(
    '/api/legal/duerp/risks/:nafCode',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { nafCode } = request.params as { nafCode: string };
      const profile = getRisksByNafCode(nafCode);
      return profile;
    },
  );

  // POST /api/legal/duerp/detect-risks — Detect risks from purchase description
  app.post(
    '/api/legal/duerp/detect-risks',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { description } = request.body as { description: string };
      if (!description) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'description is required' },
        });
      }
      const detected = detectPurchaseRisks(description);
      return { detected, should_update_duerp: detected.length > 0 };
    },
  );

  // GET /api/legal/duerp/history — List all DUERP versions
  app.get(
    '/api/legal/duerp/history',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const result = await duerpService.list(request.auth.tenant_id);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );
}
