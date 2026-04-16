import type { FastifyInstance } from 'fastify';
import { createSupplierService } from './supplier.service.js';
import { createPrismaSupplierRepository } from './supplier.repository.js';
import { createSupplierSchema, updateSupplierSchema, supplierListQuerySchema } from './supplier.schemas.js';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// BUSINESS RULE [CDC-2.2]: Endpoints fournisseurs

export async function supplierRoutes(app: FastifyInstance) {
  const repo = createPrismaSupplierRepository();
  const supplierService = createSupplierService(repo);
  const preHandlers = [authenticate, injectTenant];

  // POST /api/suppliers
  app.post(
    '/api/suppliers',
    { preHandler: [...preHandlers, requirePermission('purchase', 'create')] },
    async (request, reply) => {
      const parsed = createSupplierSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid supplier data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await supplierService.createSupplier(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(400).send({ error: result.error });
      return reply.status(201).send(result.value);
    },
  );

  // GET /api/suppliers
  app.get(
    '/api/suppliers',
    { preHandler: [...preHandlers, requirePermission('purchase', 'read')] },
    async (request, reply) => {
      const parsed = supplierListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: { issues: parsed.error.issues } },
        });
      }
      const result = await supplierService.listSuppliers(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // GET /api/suppliers/:id
  app.get(
    '/api/suppliers/:id',
    { preHandler: [...preHandlers, requirePermission('purchase', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await supplierService.getSupplier(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // PUT /api/suppliers/:id
  app.put(
    '/api/suppliers/:id',
    { preHandler: [...preHandlers, requirePermission('purchase', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updateSupplierSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid supplier data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await supplierService.updateSupplier(id, request.auth.tenant_id, parsed.data);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
        return reply.status(status).send({ error: result.error });
      }
      return result.value;
    },
  );

  // DELETE /api/suppliers/:id
  app.delete(
    '/api/suppliers/:id',
    { preHandler: [...preHandlers, requirePermission('purchase', 'delete')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await supplierService.deleteSupplier(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return reply.status(204).send();
    },
  );
}
