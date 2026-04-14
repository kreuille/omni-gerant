import type { FastifyInstance } from 'fastify';
import { createAuditService, type AuditRepository } from './audit.service.js';
import { auditListSchema } from './audit.schemas.js';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// BUSINESS RULE [CDC-6]: Consultation journal audit
// Only owner, admin, and accountant can view audit logs (via RBAC)

export async function auditRoutes(app: FastifyInstance) {
  // Placeholder repo - will use Prisma when DB connected
  const repo: AuditRepository = {
    async create(data) {
      return {
        id: crypto.randomUUID(),
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        action: data.action,
        entity_type: data.entity_type,
        entity_id: data.entity_id ?? null,
        old_values: data.old_values ?? null,
        new_values: data.new_values ?? null,
        ip_address: data.ip_address ?? null,
        user_agent: data.user_agent ?? null,
        created_at: new Date(),
      };
    },
    async findByTenant(_params) {
      return { items: [], next_cursor: null, has_more: false };
    },
    async findById(_id, _tenantId) {
      return null;
    },
  };

  const auditService = createAuditService(repo);

  // GET /api/audit - list audit logs
  app.get(
    '/api/audit',
    { preHandler: [authenticate, injectTenant, requirePermission('audit', 'read')] },
    async (request, reply) => {
      const parsed = auditListSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: { issues: parsed.error.issues },
          },
        });
      }

      const result = await auditService.list({
        tenant_id: request.auth.tenant_id,
        ...parsed.data,
      });
      if (!result.ok) {
        return reply.status(500).send({ error: result.error });
      }
      return result.value;
    },
  );

  // GET /api/audit/:id - get single audit entry
  app.get(
    '/api/audit/:id',
    { preHandler: [authenticate, injectTenant, requirePermission('audit', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await auditService.getById(id, request.auth.tenant_id);
      if (!result.ok) {
        return reply.status(404).send({ error: result.error });
      }
      return result.value;
    },
  );
}
