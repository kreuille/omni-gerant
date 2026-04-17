import type { FastifyInstance } from 'fastify';
import { createPurchaseService, calculatePurchaseLineTotals } from './purchase.service.js';
import { createPrismaPurchaseRepository } from './purchase.repository.js';
import {
  createPurchaseSchema,
  updatePurchaseSchema,
  purchaseListQuerySchema,
  validatePurchaseSchema,
} from './purchase.schemas.js';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// BUSINESS RULE [CDC-2.2]: Endpoints achats

export async function purchaseRoutes(app: FastifyInstance) {
  const repo = createPrismaPurchaseRepository();
  const purchaseService = createPurchaseService(repo);
  const preHandlers = [authenticate, injectTenant];

  // POST /api/purchases
  app.post(
    '/api/purchases',
    { preHandler: [...preHandlers, requirePermission('purchase', 'create')] },
    async (request, reply) => {
      const parsed = createPurchaseSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid purchase data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await purchaseService.create(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(400).send({ error: result.error });
      return reply.status(201).send(result.value);
    },
  );

  // GET /api/purchases
  app.get(
    '/api/purchases',
    { preHandler: [...preHandlers, requirePermission('purchase', 'read')] },
    async (request, reply) => {
      const parsed = purchaseListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: { issues: parsed.error.issues } },
        });
      }
      const result = await purchaseService.list(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // GET /api/purchases/:id
  app.get(
    '/api/purchases/:id',
    { preHandler: [...preHandlers, requirePermission('purchase', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await purchaseService.getById(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // PUT /api/purchases/:id
  app.put(
    '/api/purchases/:id',
    { preHandler: [...preHandlers, requirePermission('purchase', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updatePurchaseSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid purchase data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await purchaseService.update(id, request.auth.tenant_id, parsed.data);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : result.error.code === 'FORBIDDEN' ? 403 : 400;
        return reply.status(status).send({ error: result.error });
      }
      return result.value;
    },
  );

  // POST /api/purchases/:id/validate
  app.post(
    '/api/purchases/:id/validate',
    { preHandler: [...preHandlers, requirePermission('purchase', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = validatePurchaseSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid status', details: { issues: parsed.error.issues } },
        });
      }
      const result = await purchaseService.validate(id, request.auth.tenant_id, parsed.data.status);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
        return reply.status(status).send({ error: result.error });
      }
      return result.value;
    },
  );

  // POST /api/purchases/:id/pay
  app.post(
    '/api/purchases/:id/pay',
    { preHandler: [...preHandlers, requirePermission('purchase', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { amount_cents: number };
      if (!body.amount_cents || typeof body.amount_cents !== 'number') {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'amount_cents is required' },
        });
      }
      const result = await purchaseService.markPaid(id, request.auth.tenant_id, body.amount_cents);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
        return reply.status(status).send({ error: result.error });
      }
      return result.value;
    },
  );

  // GET /api/purchases/due-this-week
  app.get(
    '/api/purchases/due-this-week',
    { preHandler: [...preHandlers, requirePermission('purchase', 'read')] },
    async (request, reply) => {
      const result = await purchaseService.getDueThisWeek(request.auth.tenant_id);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // DELETE /api/purchases/:id
  app.delete(
    '/api/purchases/:id',
    { preHandler: [...preHandlers, requirePermission('purchase', 'delete')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await purchaseService.delete(id, request.auth.tenant_id);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 403;
        return reply.status(status).send({ error: result.error });
      }
      return reply.status(204).send();
    },
  );
}
