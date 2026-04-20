import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague V : inventaire mobile
// V1 : POST /api/stock/scan — lookup code-barre / SKU / reference produit
// V2 : StockReceipt + lines (bons de reception, auto-increment stock)
// V3 : InventoryCount + lines (inventaires tournants, ecarts appliques)

const scanSchema = z.object({
  code: z.string().min(1).max(100),
});

const receiptSchema = z.object({
  purchase_id: z.string().uuid().optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  warehouse_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  lines: z.array(z.object({
    product_id: z.string().uuid(),
    variant_id: z.string().uuid().optional().nullable(),
    expected_qty: z.number().int().min(0).default(0),
    received_qty: z.number().int().min(0),
    unit_cost_cents: z.number().int().min(0).default(0),
    batch_number: z.string().max(100).optional().nullable(),
    expiry_date: z.coerce.date().optional().nullable(),
  })).min(1),
});

const inventoryStartSchema = z.object({
  warehouse_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  scope: z.enum(['all', 'category', 'warehouse']).default('all'),
  category: z.string().max(100).optional().nullable(),
});

const countLineSchema = z.object({
  line_id: z.string().uuid(),
  counted_qty: z.number().int().min(0),
  notes: z.string().max(500).optional().nullable(),
});

async function nextReceiptNumber(tenantId: string): Promise<string> {
  const { prisma } = await import('@zenadmin/db');
  const year = new Date().getFullYear();
  const last = await (prisma as unknown as { stockReceipt?: { findFirst?: Function } })
    .stockReceipt?.findFirst?.({
      where: { tenant_id: tenantId, number: { startsWith: `BR-${year}-` } },
      orderBy: { number: 'desc' },
      select: { number: true },
    }) as { number: string } | null;
  const next = last ? parseInt(last.number.split('-')[2] ?? '0', 10) + 1 : 1;
  return `BR-${year}-${String(next).padStart(4, '0')}`;
}

async function nextInventoryNumber(tenantId: string): Promise<string> {
  const { prisma } = await import('@zenadmin/db');
  const year = new Date().getFullYear();
  const last = await (prisma as unknown as { inventoryCount?: { findFirst?: Function } })
    .inventoryCount?.findFirst?.({
      where: { tenant_id: tenantId, number: { startsWith: `INV-${year}-` } },
      orderBy: { number: 'desc' },
      select: { number: true },
    }) as { number: string } | null;
  const next = last ? parseInt(last.number.split('-')[2] ?? '0', 10) + 1 : 1;
  return `INV-${year}-${String(next).padStart(4, '0')}`;
}

export async function stockRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // V1 : scanner — lookup par EAN/SKU/reference
  app.post('/api/stock/scan', { preHandler: preHandlers }, async (request, reply) => {
    const parsed = scanSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Code invalide.' } });
    }
    const code = parsed.data.code.trim();
    const { prisma } = await import('@zenadmin/db');

    // 1. Match variant par SKU
    const variant = await (prisma as unknown as { productVariant?: { findFirst?: Function } })
      .productVariant?.findFirst?.({
        where: {
          tenant_id: request.auth.tenant_id,
          sku: code,
          deleted_at: null,
          is_active: true,
        },
      }) as { id: string; product_id: string; name: string; sku: string | null; stock_qty: number; unit_price_cents: number | null } | null;

    if (variant) {
      const product = await prisma.product.findFirst({
        where: { id: variant.product_id, tenant_id: request.auth.tenant_id },
      });
      return {
        match: 'variant',
        variant,
        product,
        stock_qty: variant.stock_qty,
      };
    }

    // 2. Match produit par reference
    const product = await prisma.product.findFirst({
      where: { tenant_id: request.auth.tenant_id, reference: code, deleted_at: null },
    });
    if (product) {
      return { match: 'product', product };
    }

    return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Aucun article pour ce code.' } });
  });

  // V2 : bons de reception
  app.get('/api/stock/receipts', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const items = await (prisma as unknown as { stockReceipt?: { findMany?: Function } })
      .stockReceipt?.findMany?.({
        where: { tenant_id: request.auth.tenant_id },
        orderBy: { received_at: 'desc' },
        take: 200,
      }) ?? [];
    return { items };
  });

  app.post('/api/stock/receipts', { preHandler: [...preHandlers, requirePermission('purchase', 'create')] }, async (request, reply) => {
    const parsed = receiptSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const number = await nextReceiptNumber(request.auth.tenant_id);
    const { prisma } = await import('@zenadmin/db');

    // Determiner statut
    const expectedTotal = parsed.data.lines.reduce((acc, l) => acc + l.expected_qty, 0);
    const receivedTotal = parsed.data.lines.reduce((acc, l) => acc + l.received_qty, 0);
    const status = expectedTotal === 0 || receivedTotal >= expectedTotal ? 'received' : 'partial';

    const receipt = await (prisma as unknown as { stockReceipt?: { create?: Function } })
      .stockReceipt?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          number,
          purchase_id: parsed.data.purchase_id ?? null,
          supplier_id: parsed.data.supplier_id ?? null,
          warehouse_id: parsed.data.warehouse_id ?? null,
          received_by: request.auth.user_id,
          status,
          notes: parsed.data.notes ?? null,
        },
      }) as { id: string; number: string };

    // Creer les lignes et incrementer le stock
    for (const line of parsed.data.lines) {
      await (prisma as unknown as { stockReceiptLine?: { create?: Function } })
        .stockReceiptLine?.create?.({
          data: {
            receipt_id: receipt.id,
            product_id: line.product_id,
            variant_id: line.variant_id ?? null,
            expected_qty: line.expected_qty,
            received_qty: line.received_qty,
            unit_cost_cents: line.unit_cost_cents,
            batch_number: line.batch_number ?? null,
            expiry_date: line.expiry_date ?? null,
          },
        });

      // Increment stock
      if (line.variant_id) {
        await (prisma as unknown as { productVariant?: { update?: Function } })
          .productVariant?.update?.({
            where: { id: line.variant_id },
            data: { stock_qty: { increment: line.received_qty } },
          });
      }
      if (parsed.data.warehouse_id) {
        const existingWs = await (prisma as unknown as { warehouseStock?: { findFirst?: Function } })
          .warehouseStock?.findFirst?.({
            where: {
              tenant_id: request.auth.tenant_id,
              warehouse_id: parsed.data.warehouse_id,
              product_id: line.product_id,
              variant_id: line.variant_id ?? null,
            },
          }) as { id: string } | null;
        if (existingWs) {
          await (prisma as unknown as { warehouseStock?: { update?: Function } })
            .warehouseStock?.update?.({
              where: { id: existingWs.id },
              data: { quantity: { increment: line.received_qty } },
            });
        } else {
          await (prisma as unknown as { warehouseStock?: { create?: Function } })
            .warehouseStock?.create?.({
              data: {
                tenant_id: request.auth.tenant_id,
                warehouse_id: parsed.data.warehouse_id,
                product_id: line.product_id,
                variant_id: line.variant_id ?? null,
                quantity: line.received_qty,
              },
            });
        }
      }
      // Creer mouvement de stock
      await (prisma as unknown as { stockMovement?: { create?: Function } })
        .stockMovement?.create?.({
          data: {
            tenant_id: request.auth.tenant_id,
            product_id: line.product_id,
            variant_id: line.variant_id ?? null,
            direction: 'in',
            quantity: line.received_qty,
            reason: 'receipt',
            reference: number,
            created_by: request.auth.user_id,
          },
        });
    }

    return reply.status(201).send({ id: receipt.id, number: receipt.number, status });
  });

  // V3 : inventaires tournants
  app.get('/api/stock/inventories', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const items = await (prisma as unknown as { inventoryCount?: { findMany?: Function } })
      .inventoryCount?.findMany?.({
        where: { tenant_id: request.auth.tenant_id },
        orderBy: { started_at: 'desc' },
      }) ?? [];
    return { items };
  });

  app.post('/api/stock/inventories', { preHandler: [...preHandlers, requirePermission('purchase', 'create')] }, async (request, reply) => {
    const parsed = inventoryStartSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.' } });
    }
    const number = await nextInventoryNumber(request.auth.tenant_id);
    const { prisma } = await import('@zenadmin/db');

    const count = await (prisma as unknown as { inventoryCount?: { create?: Function } })
      .inventoryCount?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          number,
          warehouse_id: parsed.data.warehouse_id ?? null,
          status: 'counting',
          started_by: request.auth.user_id,
          notes: parsed.data.notes ?? null,
        },
      }) as { id: string };

    // Generer les lignes depuis les variantes (ou produits) du scope
    const variants = await (prisma as unknown as { productVariant?: { findMany?: Function } })
      .productVariant?.findMany?.({
        where: { tenant_id: request.auth.tenant_id, deleted_at: null, is_active: true },
      }) as Array<{ id: string; product_id: string; stock_qty: number }> ?? [];

    for (const v of variants) {
      await (prisma as unknown as { inventoryCountLine?: { create?: Function } })
        .inventoryCountLine?.create?.({
          data: {
            count_id: count.id,
            product_id: v.product_id,
            variant_id: v.id,
            expected_qty: v.stock_qty,
          },
        });
    }

    return reply.status(201).send({ id: count.id, number, lines_generated: variants.length });
  });

  app.get('/api/stock/inventories/:id', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const count = await (prisma as unknown as { inventoryCount?: { findFirst?: Function } })
      .inventoryCount?.findFirst?.({
        where: { id, tenant_id: request.auth.tenant_id },
      });
    if (!count) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Inventaire introuvable.' } });
    const lines = await (prisma as unknown as { inventoryCountLine?: { findMany?: Function } })
      .inventoryCountLine?.findMany?.({ where: { count_id: id } }) ?? [];
    return { count, lines };
  });

  app.post('/api/stock/inventories/:id/count', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = countLineSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.' } });
    }
    const { prisma } = await import('@zenadmin/db');
    const line = await (prisma as unknown as { inventoryCountLine?: { findFirst?: Function } })
      .inventoryCountLine?.findFirst?.({
        where: { id: parsed.data.line_id, count_id: id },
      }) as { id: string; expected_qty: number } | null;
    if (!line) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Ligne introuvable.' } });

    const variance = parsed.data.counted_qty - line.expected_qty;
    const updated = await (prisma as unknown as { inventoryCountLine?: { update?: Function } })
      .inventoryCountLine?.update?.({
        where: { id: line.id },
        data: {
          counted_qty: parsed.data.counted_qty,
          variance,
          counted_at: new Date(),
          counted_by: request.auth.user_id,
          notes: parsed.data.notes ?? null,
        },
      });
    return updated;
  });

  // Finaliser l'inventaire : applique les ecarts comme StockMovements
  app.post('/api/stock/inventories/:id/apply', { preHandler: [...preHandlers, requirePermission('purchase', 'update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const count = await (prisma as unknown as { inventoryCount?: { findFirst?: Function } })
      .inventoryCount?.findFirst?.({
        where: { id, tenant_id: request.auth.tenant_id },
      }) as { id: string; status: string; number: string } | null;
    if (!count) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Inventaire introuvable.' } });
    if (count.status === 'applied') {
      return reply.status(409).send({ error: { code: 'ALREADY_APPLIED', message: 'Deja applique.' } });
    }

    const lines = await (prisma as unknown as { inventoryCountLine?: { findMany?: Function } })
      .inventoryCountLine?.findMany?.({
        where: { count_id: id, counted_qty: { not: null } },
      }) as Array<{ id: string; product_id: string; variant_id: string | null; expected_qty: number; counted_qty: number | null; variance: number | null }> ?? [];

    let totalVariance = 0;
    let adjusted = 0;
    for (const l of lines) {
      if (l.counted_qty === null || l.variance === null || l.variance === 0) continue;
      totalVariance += Math.abs(l.variance);
      adjusted += 1;

      if (l.variant_id) {
        await (prisma as unknown as { productVariant?: { update?: Function } })
          .productVariant?.update?.({
            where: { id: l.variant_id },
            data: { stock_qty: l.counted_qty },
          });
      }
      await (prisma as unknown as { stockMovement?: { create?: Function } })
        .stockMovement?.create?.({
          data: {
            tenant_id: request.auth.tenant_id,
            product_id: l.product_id,
            variant_id: l.variant_id,
            direction: 'adjust',
            quantity: l.variance,
            reason: 'inventory',
            reference: count.number,
            created_by: request.auth.user_id,
          },
        });
    }

    await (prisma as unknown as { inventoryCount?: { update?: Function } })
      .inventoryCount?.update?.({
        where: { id },
        data: { status: 'applied', applied_at: new Date(), completed_at: new Date() },
      });

    return { applied_lines: adjusted, total_variance_abs: totalVariance };
  });
}
