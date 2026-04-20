import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague G2 : CRUD variantes + mouvements de stock.

const variantSchema = z.object({
  sku: z.string().max(64).optional().nullable(),
  name: z.string().min(1).max(200),
  attributes: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  unit_price_cents: z.number().int().min(0).optional().nullable(),
  stock_qty: z.number().int().min(0).default(0),
  stock_alert_at: z.number().int().min(0).optional().nullable(),
  is_active: z.boolean().default(true),
});

const movementSchema = z.object({
  variant_id: z.string().uuid().optional().nullable(),
  direction: z.enum(['in', 'out', 'adjust']),
  quantity: z.number().int().refine((n) => n !== 0, 'quantity ne peut pas etre 0'),
  reason: z.string().max(64).optional(),
  reference: z.string().max(128).optional(),
  notes: z.string().max(500).optional(),
});

export async function productVariantRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // GET /api/products/:id/variants
  app.get(
    '/api/products/:id/variants',
    { preHandler: [...preHandlers, requirePermission('product', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!process.env['DATABASE_URL']) return { items: [] };
      try {
        const { prisma } = await import('@zenadmin/db');
        const items = await (prisma as unknown as { productVariant?: { findMany?: Function } })
          .productVariant?.findMany?.({
            where: { tenant_id: request.auth.tenant_id, product_id: id, deleted_at: null },
            orderBy: { created_at: 'asc' },
          }) ?? [];
        return { items };
      } catch (e) {
        return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: e instanceof Error ? e.message : 'unknown' } });
      }
    },
  );

  // POST /api/products/:id/variants
  app.post(
    '/api/products/:id/variants',
    { preHandler: [...preHandlers, requirePermission('product', 'create')] },
    async (request, reply) => {
      const { id: productId } = request.params as { id: string };
      const parsed = variantSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } },
        });
      }
      if (!process.env['DATABASE_URL']) return reply.status(503).send({ error: { code: 'SERVICE_UNAVAILABLE', message: 'DB indisponible' } });
      const { prisma } = await import('@zenadmin/db');
      const created = await (prisma as unknown as { productVariant?: { create?: Function } })
        .productVariant?.create?.({
          data: {
            tenant_id: request.auth.tenant_id,
            product_id: productId,
            sku: parsed.data.sku ?? null,
            name: parsed.data.name,
            attributes: (parsed.data.attributes ?? {}) as Record<string, unknown>,
            unit_price_cents: parsed.data.unit_price_cents ?? null,
            stock_qty: parsed.data.stock_qty,
            stock_alert_at: parsed.data.stock_alert_at ?? null,
            is_active: parsed.data.is_active,
          },
        });
      return reply.status(201).send(created);
    },
  );

  // PATCH /api/variants/:id
  app.patch(
    '/api/variants/:id',
    { preHandler: [...preHandlers, requirePermission('product', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = variantSchema.partial().safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } },
        });
      }
      const { prisma } = await import('@zenadmin/db');
      await (prisma as unknown as { productVariant?: { updateMany?: Function } })
        .productVariant?.updateMany?.({
          where: { id, tenant_id: request.auth.tenant_id },
          data: parsed.data as Record<string, unknown>,
        });
      const updated = await (prisma as unknown as { productVariant?: { findFirst?: Function } })
        .productVariant?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id } });
      return updated;
    },
  );

  // DELETE /api/variants/:id
  app.delete(
    '/api/variants/:id',
    { preHandler: [...preHandlers, requirePermission('product', 'delete')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { prisma } = await import('@zenadmin/db');
      await (prisma as unknown as { productVariant?: { updateMany?: Function } })
        .productVariant?.updateMany?.({
          where: { id, tenant_id: request.auth.tenant_id },
          data: { deleted_at: new Date() },
        });
      return reply.status(204).send();
    },
  );

  // --- Stock movements ---

  // POST /api/products/:id/stock/movement — entree/sortie/ajustement
  app.post(
    '/api/products/:id/stock/movement',
    { preHandler: [...preHandlers, requirePermission('product', 'update')] },
    async (request, reply) => {
      const { id: productId } = request.params as { id: string };
      const parsed = movementSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } },
        });
      }
      const { prisma } = await import('@zenadmin/db');
      const p = prisma as unknown as {
        productVariant?: { update?: Function; findFirst?: Function };
        stockMovement?: { create?: Function };
      };

      // Calcule le delta : in +, out -, adjust = set absolute
      const data = parsed.data;
      let delta: number;
      if (data.direction === 'out') delta = -Math.abs(data.quantity);
      else if (data.direction === 'in') delta = Math.abs(data.quantity);
      else delta = data.quantity; // adjust = +/- explicit

      if (data.variant_id) {
        const variant = await p.productVariant?.findFirst?.({
          where: { id: data.variant_id, tenant_id: request.auth.tenant_id, product_id: productId, deleted_at: null },
        });
        if (!variant) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Variante introuvable' } });
        await p.productVariant?.update?.({
          where: { id: data.variant_id },
          data: { stock_qty: { increment: delta } },
        });
      }

      const movement = await p.stockMovement?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          product_id: productId,
          variant_id: data.variant_id ?? null,
          direction: data.direction,
          quantity: delta,
          reason: data.reason ?? null,
          reference: data.reference ?? null,
          notes: data.notes ?? null,
          created_by: request.auth.user_id,
        },
      });
      return reply.status(201).send(movement);
    },
  );

  // GET /api/products/:id/stock/movements
  app.get(
    '/api/products/:id/stock/movements',
    { preHandler: [...preHandlers, requirePermission('product', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!process.env['DATABASE_URL']) return { items: [] };
      const { prisma } = await import('@zenadmin/db');
      const items = await (prisma as unknown as { stockMovement?: { findMany?: Function } })
        .stockMovement?.findMany?.({
          where: { tenant_id: request.auth.tenant_id, product_id: id },
          orderBy: { created_at: 'desc' },
          take: 100,
        }) ?? [];
      return { items };
    },
  );

  // GET /api/stock/low — variantes sous le seuil d'alerte
  app.get(
    '/api/stock/low',
    { preHandler: [...preHandlers, requirePermission('product', 'read')] },
    async (request, reply) => {
      if (!process.env['DATABASE_URL']) return { items: [] };
      try {
        const { prisma } = await import('@zenadmin/db');
        // Prisma ne supporte pas "< stock_alert_at" directement -> raw
        const items = await prisma.$queryRawUnsafe<unknown[]>(
          `SELECT * FROM product_variants
           WHERE tenant_id = $1::uuid
             AND deleted_at IS NULL
             AND stock_alert_at IS NOT NULL
             AND stock_qty <= stock_alert_at
           ORDER BY stock_qty ASC
           LIMIT 200`,
          request.auth.tenant_id,
        );
        return { items };
      } catch (e) {
        return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: e instanceof Error ? e.message : 'unknown' } });
      }
    },
  );
}
