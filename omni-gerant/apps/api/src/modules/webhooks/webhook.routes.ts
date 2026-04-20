import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';
import { generateWebhookSecret } from './webhook.service.js';

// Vague I3 : CRUD endpoints pour la gestion des webhooks sortants tenant.

const endpointSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).default(['*']),
  description: z.string().max(200).optional().nullable(),
  is_active: z.boolean().default(true),
});

export async function webhookRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // GET /api/webhooks/endpoints
  app.get(
    '/api/webhooks/endpoints',
    { preHandler: [...preHandlers, requirePermission('settings', 'read')] },
    async (request, reply) => {
      if (!process.env['DATABASE_URL']) return { items: [] };
      const { prisma } = await import('@zenadmin/db');
      const items = await (prisma as unknown as { webhookEndpoint?: { findMany?: Function } })
        .webhookEndpoint?.findMany?.({
          where: { tenant_id: request.auth.tenant_id, deleted_at: null },
          orderBy: { created_at: 'desc' },
        }) ?? [];
      // On renvoie un secret tronque pour eviter l'exposition
      return {
        items: (items as Array<{ id: string; secret: string; url: string; events: string[]; is_active: boolean; last_error?: string | null; description?: string | null; created_at: Date }>)
          .map((e) => ({ ...e, secret: e.secret.slice(0, 12) + '…' })),
      };
    },
  );

  // POST /api/webhooks/endpoints
  app.post(
    '/api/webhooks/endpoints',
    { preHandler: [...preHandlers, requirePermission('settings', 'update')] },
    async (request, reply) => {
      const parsed = endpointSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } },
        });
      }
      const { prisma } = await import('@zenadmin/db');
      const secret = generateWebhookSecret();
      const created = await (prisma as unknown as { webhookEndpoint?: { create?: Function } })
        .webhookEndpoint?.create?.({
          data: {
            tenant_id: request.auth.tenant_id,
            url: parsed.data.url,
            events: parsed.data.events,
            description: parsed.data.description ?? null,
            is_active: parsed.data.is_active,
            secret,
          },
        });
      // Unique moment ou on expose le secret complet : a sauvegarder cote client
      return reply.status(201).send({ ...(created as object), secret });
    },
  );

  // PATCH /api/webhooks/endpoints/:id
  app.patch(
    '/api/webhooks/endpoints/:id',
    { preHandler: [...preHandlers, requirePermission('settings', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = endpointSchema.partial().safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } },
        });
      }
      const { prisma } = await import('@zenadmin/db');
      await (prisma as unknown as { webhookEndpoint?: { updateMany?: Function } })
        .webhookEndpoint?.updateMany?.({
          where: { id, tenant_id: request.auth.tenant_id },
          data: parsed.data as Record<string, unknown>,
        });
      const updated = await (prisma as unknown as { webhookEndpoint?: { findFirst?: Function } })
        .webhookEndpoint?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id } });
      return updated;
    },
  );

  // DELETE /api/webhooks/endpoints/:id (soft)
  app.delete(
    '/api/webhooks/endpoints/:id',
    { preHandler: [...preHandlers, requirePermission('settings', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { prisma } = await import('@zenadmin/db');
      await (prisma as unknown as { webhookEndpoint?: { updateMany?: Function } })
        .webhookEndpoint?.updateMany?.({
          where: { id, tenant_id: request.auth.tenant_id },
          data: { deleted_at: new Date(), is_active: false },
        });
      return reply.status(204).send();
    },
  );

  // GET /api/webhooks/deliveries — historique des livraisons
  app.get(
    '/api/webhooks/deliveries',
    { preHandler: [...preHandlers, requirePermission('settings', 'read')] },
    async (request) => {
      if (!process.env['DATABASE_URL']) return { items: [] };
      const { prisma } = await import('@zenadmin/db');
      const { endpoint_id, status } = request.query as { endpoint_id?: string; status?: string };
      const items = await (prisma as unknown as { webhookDelivery?: { findMany?: Function } })
        .webhookDelivery?.findMany?.({
          where: {
            tenant_id: request.auth.tenant_id,
            ...(endpoint_id ? { endpoint_id } : {}),
            ...(status ? { status } : {}),
          },
          orderBy: { created_at: 'desc' },
          take: 100,
        }) ?? [];
      return { items };
    },
  );

  // POST /api/webhooks/deliveries/:id/retry — force retry manuel
  app.post(
    '/api/webhooks/deliveries/:id/retry',
    { preHandler: [...preHandlers, requirePermission('settings', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { prisma } = await import('@zenadmin/db');
      await (prisma as unknown as { webhookDelivery?: { updateMany?: Function } })
        .webhookDelivery?.updateMany?.({
          where: { id, tenant_id: request.auth.tenant_id },
          data: { status: 'pending', next_retry_at: new Date() },
        });
      return { retrying: true };
    },
  );
}
