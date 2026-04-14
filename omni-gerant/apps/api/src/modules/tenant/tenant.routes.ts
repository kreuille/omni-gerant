import type { FastifyInstance } from 'fastify';
import { createTenantService, type TenantRepository } from './tenant.service.js';
import { updateTenantSchema, siretLookupSchema } from './tenant.schemas.js';
import { createSiretLookup } from '../../lib/siret-lookup.js';

export async function tenantRoutes(app: FastifyInstance) {
  // Placeholder repo - will use Prisma when DB connected
  const repo: TenantRepository = {
    async findById(_id: string) {
      return null;
    },
    async update(_id: string, _data: unknown) {
      return null;
    },
  };

  const tenantService = createTenantService(repo);
  const siretLookup = createSiretLookup();

  // GET /api/tenants/me
  app.get('/api/tenants/me', async (request, reply) => {
    const tenantId = (request as { tenant_id?: string }).tenant_id;
    if (!tenantId) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }

    const result = await tenantService.getTenant(tenantId);
    if (!result.ok) {
      return reply.status(404).send({ error: result.error });
    }
    return result.value;
  });

  // PATCH /api/tenants/me
  app.patch('/api/tenants/me', async (request, reply) => {
    const tenantId = (request as { tenant_id?: string }).tenant_id;
    if (!tenantId) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }

    const parsed = updateTenantSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { issues: parsed.error.issues },
        },
      });
    }

    const result = await tenantService.updateTenant(tenantId, parsed.data);
    if (!result.ok) {
      return reply.status(404).send({ error: result.error });
    }
    return result.value;
  });

  // GET /api/lookup/siret/:siret
  app.get('/api/lookup/siret/:siret', async (request, reply) => {
    const { siret } = request.params as { siret: string };
    const parsed = siretLookupSchema.safeParse({ siret });
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid SIRET format',
          details: { issues: parsed.error.issues },
        },
      });
    }

    const result = await siretLookup.lookup(parsed.data.siret);
    if (!result.ok) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 503;
      return reply.status(status).send({ error: result.error });
    }
    return result.value;
  });
}
