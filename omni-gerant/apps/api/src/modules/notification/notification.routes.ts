import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague A3 : Notifications in-app (centre + toasts)

export async function notificationRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // GET /api/notifications — liste, optionnellement non-lues seulement
  app.get(
    '/api/notifications',
    { preHandler: preHandlers },
    async (request) => {
      const { unread } = request.query as { unread?: string };
      if (!process.env['DATABASE_URL']) return { items: [] };
      try {
        const { prisma } = await import('@zenadmin/db');
        const items = await (prisma as any).notification?.findMany?.({
          where: {
            tenant_id: request.auth.tenant_id,
            AND: [
              { OR: [{ user_id: request.auth.user_id }, { user_id: null }] },
              unread === '1' ? { read_at: null } : {},
            ],
          },
          orderBy: { created_at: 'desc' },
          take: 50,
        }) ?? [];
        return { items };
      } catch {
        return { items: [] };
      }
    },
  );

  // GET /api/notifications/unread-count — badge compteur
  app.get(
    '/api/notifications/unread-count',
    { preHandler: preHandlers },
    async (request) => {
      if (!process.env['DATABASE_URL']) return { count: 0 };
      try {
        const { prisma } = await import('@zenadmin/db');
        const count = await (prisma as any).notification?.count?.({
          where: {
            tenant_id: request.auth.tenant_id,
            read_at: null,
            OR: [{ user_id: request.auth.user_id }, { user_id: null }],
          },
        }) ?? 0;
        return { count };
      } catch {
        return { count: 0 };
      }
    },
  );

  // POST /api/notifications/:id/read — marquer comme lue
  app.post(
    '/api/notifications/:id/read',
    { preHandler: preHandlers },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!process.env['DATABASE_URL']) return reply.status(204).send();
      try {
        const { prisma } = await import('@zenadmin/db');
        await (prisma as any).notification?.updateMany?.({
          where: { id, tenant_id: request.auth.tenant_id },
          data: { read_at: new Date() },
        });
        return reply.status(204).send();
      } catch {
        return reply.status(204).send();
      }
    },
  );

  // POST /api/notifications/read-all — marquer tout comme lu
  app.post(
    '/api/notifications/read-all',
    { preHandler: preHandlers },
    async (request, reply) => {
      if (!process.env['DATABASE_URL']) return reply.status(204).send();
      try {
        const { prisma } = await import('@zenadmin/db');
        await (prisma as any).notification?.updateMany?.({
          where: {
            tenant_id: request.auth.tenant_id,
            read_at: null,
            OR: [{ user_id: request.auth.user_id }, { user_id: null }],
          },
          data: { read_at: new Date() },
        });
        return reply.status(204).send();
      } catch {
        return reply.status(204).send();
      }
    },
  );
}
