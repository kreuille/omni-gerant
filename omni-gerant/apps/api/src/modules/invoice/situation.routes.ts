import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createSituationService, type SituationRepository, type Situation, type QuoteLookup } from './situation.service.js';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

export async function situationRoutes(app: FastifyInstance) {
  // Placeholder repos
  const situationRepo: SituationRepository = {
    async findByQuote(_quoteId, _tenantId) { return []; },
    async create(data) {
      return {
        id: crypto.randomUUID(),
        ...data,
        status: 'draft',
        invoice_id: null,
        created_at: new Date(),
      };
    },
    async findById(_id, _tenantId) { return null; },
    async update(_id, _tenantId, _data) { return null; },
  };

  const quoteLookup: QuoteLookup = {
    async findById(_quoteId, _tenantId) { return null; },
  };

  const situationService = createSituationService(situationRepo, quoteLookup);
  const preHandlers = [authenticate, injectTenant];

  const createSituationSchema = z.object({
    global_percent: z.number().int().min(1).max(10000),
  });

  // POST /api/quotes/:quoteId/situations
  app.post(
    '/api/quotes/:quoteId/situations',
    { preHandler: [...preHandlers, requirePermission('invoice', 'create')] },
    async (request, reply) => {
      const { quoteId } = request.params as { quoteId: string };
      const parsed = createSituationSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await situationService.create(quoteId, request.auth.tenant_id, parsed.data.global_percent);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 403;
        return reply.status(status).send({ error: result.error });
      }
      return reply.status(201).send(result.value);
    },
  );

  // GET /api/quotes/:quoteId/situations
  app.get(
    '/api/quotes/:quoteId/situations',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request, reply) => {
      const { quoteId } = request.params as { quoteId: string };
      const result = await situationService.list(quoteId, request.auth.tenant_id);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // PATCH /api/situations/:id
  app.patch(
    '/api/situations/:id',
    { preHandler: [...preHandlers, requirePermission('invoice', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = createSituationSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await situationService.update(id, request.auth.tenant_id, parsed.data.global_percent);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 403;
        return reply.status(status).send({ error: result.error });
      }
      return result.value;
    },
  );
}
