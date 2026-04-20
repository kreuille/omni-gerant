import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomBytes, createHash } from 'node:crypto';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague Y2 : API keys — generation, liste, revocation
// Vague Y : rate limit + scopes pour usage externe

const VALID_SCOPES = [
  'read:clients', 'write:clients',
  'read:invoices', 'write:invoices',
  'read:quotes', 'write:quotes',
  'read:products', 'write:products',
  'read:purchases', 'write:purchases',
  'read:projects', 'write:projects',
  'read:timesheets', 'write:timesheets',
  'read:*', 'write:*',
  '*',
] as const;

const apiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(VALID_SCOPES)).min(1),
  rate_limit_per_min: z.number().int().min(1).max(10_000).default(60),
  expires_at: z.coerce.date().optional().nullable(),
});

function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
  const random = randomBytes(24).toString('base64url');
  const fullKey = `zen_live_${random}`;
  const prefix = fullKey.slice(0, 16);
  const hash = createHash('sha256').update(fullKey).digest('hex');
  return { fullKey, prefix, hash };
}

export async function apiKeysRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  app.get('/api/api-keys', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const items = await (prisma as unknown as { apiKey?: { findMany?: Function } })
      .apiKey?.findMany?.({
        where: { tenant_id: request.auth.tenant_id },
        orderBy: { created_at: 'desc' },
        select: {
          id: true, name: true, key_prefix: true, scopes: true,
          rate_limit_per_min: true, is_active: true, last_used_at: true,
          expires_at: true, revoked_at: true, created_at: true,
        },
      }) ?? [];
    return { items };
  });

  app.post('/api/api-keys', { preHandler: [...preHandlers, requirePermission('tenant', 'update')] }, async (request, reply) => {
    const parsed = apiKeySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const { fullKey, prefix, hash } = generateApiKey();
    const { prisma } = await import('@zenadmin/db');
    const created = await (prisma as unknown as { apiKey?: { create?: Function } })
      .apiKey?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          name: parsed.data.name,
          scopes: parsed.data.scopes as unknown as string[],
          rate_limit_per_min: parsed.data.rate_limit_per_min,
          expires_at: parsed.data.expires_at ?? null,
          key_prefix: prefix,
          key_hash: hash,
          created_by: request.auth.user_id,
        },
      });
    return reply.status(201).send({
      ...(created as Record<string, unknown>),
      // La cle complete n'est affichee qu'une seule fois
      api_key: fullKey,
      warning: 'Cette cle ne sera plus jamais affichee — copiez-la maintenant.',
    });
  });

  app.post('/api/api-keys/:id/revoke', { preHandler: [...preHandlers, requirePermission('tenant', 'update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const existing = await (prisma as unknown as { apiKey?: { findFirst?: Function } })
      .apiKey?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id } }) as { id: string; is_active: boolean } | null;
    if (!existing) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Cle API introuvable.' } });
    await (prisma as unknown as { apiKey?: { update?: Function } })
      .apiKey?.update?.({
        where: { id },
        data: { is_active: false, revoked_at: new Date(), revoked_by: request.auth.user_id },
      });
    return reply.status(204).send();
  });

  // Stats d'usage
  app.get('/api/api-keys/:id/usage', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const key = await (prisma as unknown as { apiKey?: { findFirst?: Function } })
      .apiKey?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id } });
    if (!key) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Cle API introuvable.' } });

    const last24h = new Date(Date.now() - 86_400_000);
    const usage = await (prisma as unknown as { apiKeyUsage?: { findMany?: Function } })
      .apiKeyUsage?.findMany?.({
        where: { api_key_id: id, created_at: { gte: last24h } },
        orderBy: { created_at: 'desc' },
        take: 500,
      }) as Array<{ endpoint: string; method: string; status_code: number; count: number }> ?? [];

    const totalRequests = usage.reduce((a, u) => a + u.count, 0);
    const byEndpoint = new Map<string, number>();
    for (const u of usage) {
      byEndpoint.set(`${u.method} ${u.endpoint}`, (byEndpoint.get(`${u.method} ${u.endpoint}`) ?? 0) + u.count);
    }
    return {
      total_last_24h: totalRequests,
      by_endpoint: [...byEndpoint.entries()].map(([k, v]) => ({ endpoint: k, count: v })).sort((a, b) => b.count - a.count).slice(0, 20),
    };
  });
}
