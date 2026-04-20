import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague P1 : Contrats + signature simple eIDAS (reutilise le pattern quote-signature)

const contractSchema = z.object({
  client_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  kind: z.enum(['service', 'nda', 'cgv', 'maintenance', 'employment']).default('service'),
  content: z.string().min(10),
  starts_on: z.coerce.date().optional().nullable(),
  ends_on: z.coerce.date().optional().nullable(),
  auto_renew: z.boolean().default(false),
  renewal_notice_days: z.number().int().min(0).max(365).default(30),
});

const signSchema = z.object({
  signer_name: z.string().min(1).max(200),
  signer_email: z.string().email(),
  signature_image: z.string().max(500_000).optional(),
});

export async function contractRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  app.get('/api/contracts', { preHandler: [...preHandlers, requirePermission('legal', 'read')] }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const q = request.query as { status?: string; kind?: string; client_id?: string };
    const items = await (prisma as unknown as { contract?: { findMany?: Function } })
      .contract?.findMany?.({
        where: {
          tenant_id: request.auth.tenant_id,
          deleted_at: null,
          ...(q.status ? { status: q.status } : {}),
          ...(q.kind ? { kind: q.kind } : {}),
          ...(q.client_id ? { client_id: q.client_id } : {}),
        },
        orderBy: { created_at: 'desc' },
        take: 200,
      }) ?? [];
    return { items };
  });

  app.post('/api/contracts', { preHandler: [...preHandlers, requirePermission('legal', 'create')] }, async (request, reply) => {
    const parsed = contractSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const { prisma } = await import('@zenadmin/db');
    const year = new Date().getFullYear();
    const count = await (prisma as unknown as { contract?: { count?: Function } })
      .contract?.count?.({
        where: { tenant_id: request.auth.tenant_id, number: { startsWith: `CTR-${year}-` } },
      }) ?? 0;
    const number = `CTR-${year}-${String(count + 1).padStart(5, '0')}`;
    const created = await (prisma as unknown as { contract?: { create?: Function } })
      .contract?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          number,
          ...parsed.data,
          status: 'draft',
        },
      });
    return reply.status(201).send(created);
  });

  app.patch('/api/contracts/:id', { preHandler: [...preHandlers, requirePermission('legal', 'update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = contractSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.' } });
    }
    const { prisma } = await import('@zenadmin/db');
    await (prisma as unknown as { contract?: { updateMany?: Function } })
      .contract?.updateMany?.({
        where: { id, tenant_id: request.auth.tenant_id, status: 'draft' },
        data: parsed.data as Record<string, unknown>,
      });
    return { ok: true };
  });

  app.post('/api/contracts/:id/sign', { preHandler: [...preHandlers, requirePermission('legal', 'update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = signSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.' } });
    }
    const { prisma } = await import('@zenadmin/db');
    const contract = await (prisma as unknown as { contract?: { findFirst?: Function } })
      .contract?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id, deleted_at: null } });
    if (!contract) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Contrat introuvable' } });

    const c = contract as { id: string; content: string; number: string };
    const contentHash = createHash('sha256').update(c.content).digest('hex');
    const signedAt = new Date();
    const signatureHash = createHash('sha256')
      .update(`${contentHash}|${parsed.data.signer_email}|${parsed.data.signer_name}|${signedAt.toISOString()}|${request.ip}`)
      .digest('hex');

    await (prisma as unknown as { contract?: { update?: Function } })
      .contract?.update?.({
        where: { id: c.id },
        data: {
          status: 'signed',
          signed_at: signedAt,
          signer_name: parsed.data.signer_name,
          signer_email: parsed.data.signer_email,
          signature_image: parsed.data.signature_image ?? null,
          content_hash: contentHash,
          signature_hash: signatureHash,
        },
      });
    return { signed: true, content_hash: contentHash, signature_hash: signatureHash };
  });

  app.get('/api/contracts/renewals/upcoming', { preHandler: [...preHandlers, requirePermission('legal', 'read')] }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const now = new Date();
    const in60d = new Date(now.getTime() + 60 * 86400_000);
    const items = await (prisma as unknown as { contract?: { findMany?: Function } })
      .contract?.findMany?.({
        where: {
          tenant_id: request.auth.tenant_id,
          deleted_at: null,
          status: 'signed',
          ends_on: { gte: now, lte: in60d },
        },
        orderBy: { ends_on: 'asc' },
      }) ?? [];
    return { items };
  });
}
