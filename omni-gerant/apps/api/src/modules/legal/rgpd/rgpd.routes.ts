import type { FastifyInstance } from 'fastify';
import {
  createRgpdService,
  type RgpdRepository,
  type RgpdRegistry,
  type RgpdTreatment,
} from './rgpd.service.js';
import {
  createRegistrySchema,
  updateRegistrySchema,
  addTreatmentSchema,
  updateTreatmentSchema,
} from './rgpd.schemas.js';
import { authenticate, requirePermission } from '../../../plugins/auth.js';
import { injectTenant } from '../../../plugins/tenant.js';

// BUSINESS RULE [CDC-2.4]: Routes Registre RGPD

export async function rgpdRoutes(app: FastifyInstance) {
  // Placeholder in-memory repo
  const registries = new Map<string, RgpdRegistry>();

  const repo: RgpdRepository = {
    async createRegistry(tenantId, data) {
      const id = crypto.randomUUID();
      const registry: RgpdRegistry = {
        ...data,
        id,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      registries.set(tenantId, registry);
      return registry;
    },
    async findRegistry(tenantId) {
      const r = registries.get(tenantId);
      if (!r || r.deleted_at) return null;
      return r;
    },
    async updateRegistry(tenantId, data) {
      const r = registries.get(tenantId);
      if (!r || r.deleted_at) return null;
      const updated = { ...r, ...data, updated_at: new Date() } as RgpdRegistry;
      registries.set(tenantId, updated);
      return updated;
    },
    async deleteRegistry(tenantId) {
      const r = registries.get(tenantId);
      if (!r || r.deleted_at) return false;
      r.deleted_at = new Date();
      return true;
    },
    async addTreatment(registryId, data) {
      const registry = [...registries.values()].find((r) => r.id === registryId);
      if (!registry) throw new Error('Registry not found');
      const treatment: RgpdTreatment = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      registry.treatments.push(treatment);
      return treatment;
    },
    async updateTreatment(registryId, treatmentId, data) {
      const registry = [...registries.values()].find((r) => r.id === registryId);
      if (!registry) return null;
      const idx = registry.treatments.findIndex((t) => t.id === treatmentId);
      if (idx === -1) return null;
      registry.treatments[idx] = { ...registry.treatments[idx]!, ...data, updated_at: new Date() } as RgpdTreatment;
      return registry.treatments[idx]!;
    },
    async deleteTreatment(registryId, treatmentId) {
      const registry = [...registries.values()].find((r) => r.id === registryId);
      if (!registry) return false;
      const idx = registry.treatments.findIndex((t) => t.id === treatmentId);
      if (idx === -1) return false;
      registry.treatments.splice(idx, 1);
      return true;
    },
  };

  const rgpdService = createRgpdService(repo);
  const preHandlers = [authenticate, injectTenant];

  // POST /api/legal/rgpd — Create registry
  app.post(
    '/api/legal/rgpd',
    { preHandler: [...preHandlers, requirePermission('legal', 'create')] },
    async (request, reply) => {
      const parsed = createRegistrySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid registry data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await rgpdService.createRegistry(request.auth.tenant_id, parsed.data);
      if (!result.ok) {
        const status = result.error.code === 'CONFLICT' ? 409 : 400;
        return reply.status(status).send({ error: result.error });
      }
      return reply.status(201).send(result.value);
    },
  );

  // GET /api/legal/rgpd — Get registry
  app.get(
    '/api/legal/rgpd',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const result = await rgpdService.getRegistry(request.auth.tenant_id);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      if (!result.value) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No RGPD registry found' } });
      return result.value;
    },
  );

  // PUT /api/legal/rgpd — Update registry
  app.put(
    '/api/legal/rgpd',
    { preHandler: [...preHandlers, requirePermission('legal', 'update')] },
    async (request, reply) => {
      const parsed = updateRegistrySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid registry data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await rgpdService.updateRegistry(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // DELETE /api/legal/rgpd — Delete registry
  app.delete(
    '/api/legal/rgpd',
    { preHandler: [...preHandlers, requirePermission('legal', 'delete')] },
    async (request, reply) => {
      const result = await rgpdService.deleteRegistry(request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return reply.status(204).send();
    },
  );

  // POST /api/legal/rgpd/treatments — Add treatment
  app.post(
    '/api/legal/rgpd/treatments',
    { preHandler: [...preHandlers, requirePermission('legal', 'create')] },
    async (request, reply) => {
      const parsed = addTreatmentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid treatment data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await rgpdService.addTreatment(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return reply.status(201).send(result.value);
    },
  );

  // PUT /api/legal/rgpd/treatments/:id — Update treatment
  app.put(
    '/api/legal/rgpd/treatments/:id',
    { preHandler: [...preHandlers, requirePermission('legal', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updateTreatmentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid treatment data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await rgpdService.updateTreatment(request.auth.tenant_id, id, parsed.data);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // DELETE /api/legal/rgpd/treatments/:id — Delete treatment
  app.delete(
    '/api/legal/rgpd/treatments/:id',
    { preHandler: [...preHandlers, requirePermission('legal', 'delete')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await rgpdService.deleteTreatment(request.auth.tenant_id, id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return reply.status(204).send();
    },
  );

  // GET /api/legal/rgpd/export — Export CNIL format
  app.get(
    '/api/legal/rgpd/export',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      const result = await rgpdService.exportCnil(request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return reply
        .type('text/tab-separated-values')
        .header('Content-Disposition', 'attachment; filename="registre-rgpd.tsv"')
        .send(result.value);
    },
  );

  // GET /api/legal/rgpd/defaults — Get default treatments list
  app.get(
    '/api/legal/rgpd/defaults',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async () => {
      return rgpdService.getDefaultTreatments();
    },
  );
}
