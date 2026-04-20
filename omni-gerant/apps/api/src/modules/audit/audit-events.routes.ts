import type { FastifyInstance } from 'fastify';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';
import { queryAuditEvents } from './audit-event.service.js';

export async function auditEventsRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // GET /api/audit/events — historique global (v2)
  app.get(
    '/api/audit/events',
    { preHandler: [...preHandlers, requirePermission('audit', 'read')] },
    async (request) => {
      const q = request.query as { resource_type?: string; action?: string; user_id?: string; limit?: string };
      const items = await queryAuditEvents(request.auth.tenant_id, {
        resource_type: q.resource_type,
        action: q.action,
        user_id: q.user_id,
        limit: q.limit ? Number(q.limit) : undefined,
      });
      return { items };
    },
  );
}
