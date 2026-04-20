import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague P3 : Bibliotheque docs legaux (CGV, CGU, mentions legales...).

const docSchema = z.object({
  kind: z.enum(['cgv', 'cgu', 'mentions_legales', 'politique_confidentialite', 'cookies']),
  version: z.string().max(20).default('1.0'),
  content: z.string().min(10),
  is_current: z.boolean().default(true),
  language: z.string().default('fr'),
});

export async function legalDocsRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  app.get('/api/legal/documents', { preHandler: [...preHandlers, requirePermission('legal', 'read')] }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const q = request.query as { kind?: string; current_only?: string };
    const items = await (prisma as unknown as { legalDocument?: { findMany?: Function } })
      .legalDocument?.findMany?.({
        where: {
          tenant_id: request.auth.tenant_id,
          ...(q.kind ? { kind: q.kind } : {}),
          ...(q.current_only === '1' ? { is_current: true } : {}),
        },
        orderBy: { updated_at: 'desc' },
      }) ?? [];
    return { items };
  });

  app.post('/api/legal/documents', { preHandler: [...preHandlers, requirePermission('legal', 'create')] }, async (request, reply) => {
    const parsed = docSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.' } });
    }
    const { prisma } = await import('@zenadmin/db');
    // Si is_current -> unset les autres versions du meme kind
    if (parsed.data.is_current) {
      await (prisma as unknown as { legalDocument?: { updateMany?: Function } })
        .legalDocument?.updateMany?.({
          where: { tenant_id: request.auth.tenant_id, kind: parsed.data.kind, is_current: true },
          data: { is_current: false },
        });
    }
    const created = await (prisma as unknown as { legalDocument?: { create?: Function } })
      .legalDocument?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          ...parsed.data,
          published_at: parsed.data.is_current ? new Date() : null,
        },
      });
    return reply.status(201).send(created);
  });

  // GET public : affichage sans auth (pour /cgv publique)
  app.get('/api/public/legal/:tenantId/:kind', async (request, reply) => {
    const { tenantId, kind } = request.params as { tenantId: string; kind: string };
    if (!process.env['DATABASE_URL']) return reply.status(503).send({ error: { code: 'SERVICE_UNAVAILABLE', message: 'DB indisponible' } });
    const { prisma } = await import('@zenadmin/db');
    const doc = await (prisma as unknown as { legalDocument?: { findFirst?: Function } })
      .legalDocument?.findFirst?.({
        where: { tenant_id: tenantId, kind, is_current: true },
      });
    if (!doc) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Document non disponible' } });
    return doc;
  });
}
