import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'node:crypto';

// Vague Y : API publique v1 avec auth par API key
// Usage : Authorization: Bearer zen_live_xxxxx

interface ApiKeyContext {
  api_key_id: string;
  tenant_id: string;
  scopes: string[];
  rate_limit_per_min: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    apiKey?: ApiKeyContext;
  }
}

async function authenticateApiKey(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    reply.status(401).send({ error: { code: 'MISSING_API_KEY', message: 'En-tete Authorization Bearer requis.' } });
    return;
  }
  const fullKey = header.slice(7).trim();
  if (!fullKey.startsWith('zen_')) {
    reply.status(401).send({ error: { code: 'INVALID_API_KEY_FORMAT', message: 'Format de cle API invalide.' } });
    return;
  }
  const hash = createHash('sha256').update(fullKey).digest('hex');
  const { prisma } = await import('@zenadmin/db');
  const key = await (prisma as unknown as { apiKey?: { findFirst?: Function } })
    .apiKey?.findFirst?.({
      where: { key_hash: hash, is_active: true },
    }) as { id: string; tenant_id: string; scopes: string[]; rate_limit_per_min: number; expires_at: Date | null } | null;
  if (!key) {
    reply.status(401).send({ error: { code: 'INVALID_API_KEY', message: 'Cle API inconnue ou revoquee.' } });
    return;
  }
  if (key.expires_at && key.expires_at < new Date()) {
    reply.status(401).send({ error: { code: 'EXPIRED_API_KEY', message: 'Cle API expiree.' } });
    return;
  }

  // Rate limit : count requests in current minute bucket
  const bucket = new Date();
  bucket.setSeconds(0, 0);
  const usage = await (prisma as unknown as { apiKeyUsage?: { findFirst?: Function } })
    .apiKeyUsage?.findFirst?.({
      where: { api_key_id: key.id, bucket_minute: bucket },
    }) as { id: string; count: number } | null;
  if (usage && usage.count >= key.rate_limit_per_min) {
    reply.status(429).send({ error: { code: 'RATE_LIMIT_EXCEEDED', message: `Limite de ${key.rate_limit_per_min} req/min atteinte.` } });
    return;
  }

  // Increment usage counter et last_used_at
  if (usage) {
    await (prisma as unknown as { apiKeyUsage?: { update?: Function } })
      .apiKeyUsage?.update?.({ where: { id: usage.id }, data: { count: { increment: 1 } } });
  } else {
    await (prisma as unknown as { apiKeyUsage?: { create?: Function } })
      .apiKeyUsage?.create?.({
        data: {
          api_key_id: key.id,
          tenant_id: key.tenant_id,
          endpoint: request.url,
          method: request.method,
          status_code: 0,
          bucket_minute: bucket,
          count: 1,
        },
      });
  }
  await (prisma as unknown as { apiKey?: { update?: Function } })
    .apiKey?.update?.({
      where: { id: key.id },
      data: { last_used_at: new Date(), last_used_ip: request.ip },
    });

  request.apiKey = {
    api_key_id: key.id,
    tenant_id: key.tenant_id,
    scopes: key.scopes,
    rate_limit_per_min: key.rate_limit_per_min,
  };
}

function hasScope(scopes: string[], required: string): boolean {
  if (scopes.includes('*') || scopes.includes(required)) return true;
  const [verb] = required.split(':');
  if (scopes.includes(`${verb}:*`)) return true;
  return false;
}

function requireScope(scope: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.apiKey || !hasScope(request.apiKey.scopes, scope)) {
      reply.status(403).send({ error: { code: 'INSUFFICIENT_SCOPE', message: `Scope ${scope} requis.` } });
    }
  };
}

export async function publicV1Routes(app: FastifyInstance) {
  // Clients
  app.get('/api/v1/clients', { preHandler: [authenticateApiKey, requireScope('read:clients')] }, async (request) => {
    const { prisma } = await import('@zenadmin/db');
    const q = request.query as { cursor?: string; limit?: string };
    const limit = Math.min(parseInt(q.limit ?? '50', 10) || 50, 100);
    const items = await prisma.client.findMany({
      where: { tenant_id: request.apiKey!.tenant_id, deleted_at: null },
      take: limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      orderBy: { created_at: 'desc' },
    });
    const hasMore = items.length > limit;
    const results = hasMore ? items.slice(0, limit) : items;
    return {
      items: results,
      next_cursor: hasMore ? results[results.length - 1]?.id ?? null : null,
    };
  });

  app.post('/api/v1/clients', { preHandler: [authenticateApiKey, requireScope('write:clients')] }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const { prisma } = await import('@zenadmin/db');
    const created = await prisma.client.create({
      data: {
        tenant_id: request.apiKey!.tenant_id,
        type: (body['type'] as string) ?? 'company',
        company_name: (body['company_name'] as string) ?? null,
        first_name: (body['first_name'] as string) ?? null,
        last_name: (body['last_name'] as string) ?? null,
        email: (body['email'] as string) ?? null,
        phone: (body['phone'] as string) ?? null,
        siret: (body['siret'] as string) ?? null,
      },
    });
    return reply.status(201).send(created);
  });

  // Invoices
  app.get('/api/v1/invoices', { preHandler: [authenticateApiKey, requireScope('read:invoices')] }, async (request) => {
    const { prisma } = await import('@zenadmin/db');
    const q = request.query as { status?: string; cursor?: string; limit?: string };
    const limit = Math.min(parseInt(q.limit ?? '50', 10) || 50, 100);
    const items = await prisma.invoice.findMany({
      where: {
        tenant_id: request.apiKey!.tenant_id,
        deleted_at: null,
        ...(q.status ? { status: q.status } : {}),
      },
      take: limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      orderBy: { issue_date: 'desc' },
    });
    const hasMore = items.length > limit;
    const results = hasMore ? items.slice(0, limit) : items;
    return {
      items: results,
      next_cursor: hasMore ? results[results.length - 1]?.id ?? null : null,
    };
  });

  app.get('/api/v1/invoices/:id', { preHandler: [authenticateApiKey, requireScope('read:invoices')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenant_id: request.apiKey!.tenant_id, deleted_at: null },
      include: { lines: true },
    });
    if (!invoice) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Facture introuvable.' } });
    return invoice;
  });

  // Quotes
  app.get('/api/v1/quotes', { preHandler: [authenticateApiKey, requireScope('read:quotes')] }, async (request) => {
    const { prisma } = await import('@zenadmin/db');
    const q = request.query as { cursor?: string; limit?: string };
    const limit = Math.min(parseInt(q.limit ?? '50', 10) || 50, 100);
    const items = await prisma.quote.findMany({
      where: { tenant_id: request.apiKey!.tenant_id, deleted_at: null },
      take: limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      orderBy: { created_at: 'desc' },
    });
    const hasMore = items.length > limit;
    return {
      items: hasMore ? items.slice(0, limit) : items,
      next_cursor: hasMore ? items[limit - 1]?.id ?? null : null,
    };
  });

  // Health/whoami
  app.get('/api/v1/whoami', { preHandler: [authenticateApiKey] }, async (request) => {
    return {
      tenant_id: request.apiKey!.tenant_id,
      scopes: request.apiKey!.scopes,
      rate_limit_per_min: request.apiKey!.rate_limit_per_min,
    };
  });
}
