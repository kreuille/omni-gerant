import type { FastifyInstance } from 'fastify';
import { createInvoiceService } from './invoice.service.js';
import { createInvoiceSchema, invoiceListSchema } from './invoice.schemas.js';
import { createDocumentNumberGenerator, createInMemoryNumberRepo } from '../quote/document-number.js';
import { createPrismaInvoiceRepository } from './invoice.repository.js';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// BUSINESS RULE [CDC-2.1]: Endpoints factures

export async function invoiceRoutes(app: FastifyInstance) {
  const repo = createPrismaInvoiceRepository();

  const numberRepo = createInMemoryNumberRepo();
  const numberGen = createDocumentNumberGenerator(numberRepo);
  const invoiceService = createInvoiceService(repo, {
    generate: (tenantId: string) => numberGen.generate(tenantId, 'FAC'),
  });

  const preHandlers = [authenticate, injectTenant];

  // POST /api/invoices
  app.post(
    '/api/invoices',
    { preHandler: [...preHandlers, requirePermission('invoice', 'create')] },
    async (request, reply) => {
      const parsed = createInvoiceSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid invoice data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await invoiceService.create(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(400).send({ error: result.error });
      return reply.status(201).send(result.value);
    },
  );

  // GET /api/invoices
  app.get(
    '/api/invoices',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request, reply) => {
      const parsed = invoiceListSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: { issues: parsed.error.issues } },
        });
      }
      const result = await invoiceService.list(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // GET /api/invoices/:id
  app.get(
    '/api/invoices/:id',
    { preHandler: [...preHandlers, requirePermission('invoice', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await invoiceService.getById(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // POST /api/invoices/:id/finalize
  app.post(
    '/api/invoices/:id/finalize',
    { preHandler: [...preHandlers, requirePermission('invoice', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await invoiceService.finalize(id, request.auth.tenant_id);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 403;
        return reply.status(status).send({ error: result.error });
      }
      return result.value;
    },
  );

  // DELETE /api/invoices/:id
  app.delete(
    '/api/invoices/:id',
    { preHandler: [...preHandlers, requirePermission('invoice', 'delete')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await invoiceService.delete(id, request.auth.tenant_id);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 403;
        return reply.status(status).send({ error: result.error });
      }
      return reply.status(204).send();
    },
  );
}
