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
    getTenantProfile: async (tenantId) => {
      const full = await tenantRepo.findById(tenantId);
      if (!full) return null;
      // Adapter: the DUERP autofill expects a simpler TenantProfile shape
      return {
        id: full.id,
        name: full.company_name,
        siret: full.siret,
        siren: full.siren,
        naf_code: full.naf_code,
        address: full.address
          ? `${full.address.line1}, ${full.address.zip_code} ${full.address.city}`
          : null,
        employee_count: full.effectif ?? 1,
        dirigeant_name: full.dirigeants?.[0]
          ? `${full.dirigeants[0].prenom} ${full.dirigeants[0].nom}`.trim()
          : null,
      };
    },
    getRecentPurchases: async () => [] as PurchaseInfo[],
    getInsurances: async () => [] as InsuranceInfo[],
    getLatestDuerp: async (tenantId) => repo.findLatest(tenantId),
  });

  const preHandlers = [authenticate, injectTenant];

  // POST /api/legal/duerp/autofill — Generate auto-fill data for DUERP wizard
  // BUSINESS RULE [CDC-2.4]: Zero saisie — pre-remplissage automatique
  app.post(
    '/api/legal/duerp/autofill',
    { preHandler: [...preHandlers, requirePermission('legal', 'create')] },
    async (request, reply) => {
      const tenantId = request.auth.tenant_id;
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

      const tenantId = request.auth.tenant_id;
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
