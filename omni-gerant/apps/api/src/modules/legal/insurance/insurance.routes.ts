import type { FastifyInstance } from 'fastify';
import { createInsuranceService } from './insurance.service.js';
import { createPrismaInsuranceRepository } from './insurance.repository.js';
import { createInsuranceSchema, updateInsuranceSchema } from './insurance.schemas.js';
import { authenticate, requirePermission } from '../../../plugins/auth.js';
import { injectTenant } from '../../../plugins/tenant.js';

// BUSINESS RULE [CDC-2.4]: Routes Coffre-Fort Assurances

export async function insuranceRoutes(app: FastifyInstance) {
  const repo = createPrismaInsuranceRepository();
  const insuranceService = createInsuranceService(repo);
  const preHandlers = [authenticate, injectTenant];

  // POST /api/legal/insurance — Create insurance
  app.post(
    '/api/legal/insurance',
    { preHandler: [...preHandlers, requirePermission('legal', 'create')] },
    async (request, reply) => {
      const parsed = createInsuranceSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid insurance data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await insuranceService.create(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(400).send({ error: result.error });
      return reply.status(201).send(result.value);
    },
  );

  // GET /api/legal/insurance — List all insurances
  app.get(
    '/api/legal/insurance',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const result = await insuranceService.list(request.auth.tenant_id);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // GET /api/legal/insurance/expiring — Get expiring insurances
  app.get(
    '/api/legal/insurance/expiring',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { days } = request.query as { days?: string };
      const withinDays = days ? parseInt(days, 10) : 60;
      const result = await insuranceService.getExpiring(request.auth.tenant_id, withinDays);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // GET /api/legal/insurance/:id — Get insurance by id
  app.get(
    '/api/legal/insurance/:id',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await insuranceService.getById(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // PUT /api/legal/insurance/:id — Update insurance
  app.put(
    '/api/legal/insurance/:id',
    { preHandler: [...preHandlers, requirePermission('legal', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updateInsuranceSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid insurance data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await insuranceService.update(id, request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // DELETE /api/legal/insurance/:id — Delete insurance
  app.delete(
    '/api/legal/insurance/:id',
    { preHandler: [...preHandlers, requirePermission('legal', 'delete')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await insuranceService.delete(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return reply.status(204).send();
    },
  );

  // POST /api/legal/insurance/:id/document — Upload document
  app.post(
    '/api/legal/insurance/:id/document',
    { preHandler: [...preHandlers, requirePermission('legal', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { document_url } = request.body as { document_url: string };
      if (!document_url) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'document_url is required' },
        });
      }
      const result = await insuranceService.uploadDocument(id, request.auth.tenant_id, document_url);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );
}
