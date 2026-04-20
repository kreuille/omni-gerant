import type { FastifyInstance } from 'fastify';
import { createRgpdService } from './rgpd.service.js';
import { createPrismaRgpdRepository } from './rgpd.repository.js';
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
  const repo = createPrismaRgpdRepository();
  const rgpdService = createRgpdService(repo);
  const preHandlers = [authenticate, injectTenant];

  // C3 : GET /api/legal/rgpd/export — Export portabilite donnees (RGPD Art.20)
  // Reserve au proprietaire du tenant (propriete des donnees).
  app.get(
    '/api/legal/rgpd/export',
    { preHandler: [...preHandlers, requirePermission('legal', 'read')] },
    async (request, reply) => {
      if (request.auth.role !== 'owner') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Seul le propriétaire peut exporter les données du tenant (droit à la portabilité RGPD).' },
        });
      }
      const { generateRgpdExport } = await import('./rgpd-export.service.js');
      const result = await generateRgpdExport(request.auth.tenant_id);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      const filename = `zenadmin-export-${request.auth.tenant_id}-${new Date().toISOString().slice(0, 10)}.json`;
      return reply
        .type('application/json')
        .header('content-disposition', `attachment; filename="${filename}"`)
        .send(result.value);
    },
  );

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

  // GET /api/legal/rgpd/export-cnil — Export CNIL format (TSV registre)
  app.get(
    '/api/legal/rgpd/export-cnil',
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
