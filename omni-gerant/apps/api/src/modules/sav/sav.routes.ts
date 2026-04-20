import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague W : service apres-vente
// W1 : ReturnAuthorization (RMA-YYYY-NNNN) + lignes
// W2 : CreditNote = facture type=credit_note, generation auto depuis RMA
// W3 : Warranty (garanties produit/vente, extensions)

const returnSchema = z.object({
  client_id: z.string().uuid(),
  invoice_id: z.string().uuid().optional().nullable(),
  reason: z.enum(['defect', 'wrong_item', 'damaged', 'customer_change', 'other']),
  condition: z.enum(['new', 'like_new', 'used', 'defective', 'broken']).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  lines: z.array(z.object({
    product_id: z.string().uuid().optional().nullable(),
    variant_id: z.string().uuid().optional().nullable(),
    invoice_line_id: z.string().uuid().optional().nullable(),
    label: z.string().min(1).max(500),
    quantity: z.number().int().min(1),
    unit_price_cents: z.number().int().min(0).default(0),
    tva_rate: z.number().int().refine((v) => [0, 210, 550, 1000, 2000].includes(v)).default(2000),
    restock: z.boolean().default(true),
  })).min(1),
});

const warrantySchema = z.object({
  client_id: z.string().uuid(),
  product_id: z.string().uuid().optional().nullable(),
  variant_id: z.string().uuid().optional().nullable(),
  invoice_id: z.string().uuid().optional().nullable(),
  serial_number: z.string().max(100).optional().nullable(),
  starts_at: z.coerce.date(),
  duration_months: z.number().int().min(1).max(120).default(24),
  kind: z.enum(['standard', 'extended', 'manufacturer']).default('standard'),
  terms: z.string().max(5000).optional().nullable(),
});

async function nextRmaNumber(tenantId: string): Promise<string> {
  const { prisma } = await import('@zenadmin/db');
  const year = new Date().getFullYear();
  const last = await (prisma as unknown as { returnAuthorization?: { findFirst?: Function } })
    .returnAuthorization?.findFirst?.({
      where: { tenant_id: tenantId, number: { startsWith: `RMA-${year}-` } },
      orderBy: { number: 'desc' },
      select: { number: true },
    }) as { number: string } | null;
  const next = last ? parseInt(last.number.split('-')[2] ?? '0', 10) + 1 : 1;
  return `RMA-${year}-${String(next).padStart(4, '0')}`;
}

export async function savRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // W1 : Retours client (RMA)
  app.get('/api/sav/returns', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const q = request.query as { status?: string; client_id?: string };
    const { prisma } = await import('@zenadmin/db');
    const where: Record<string, unknown> = {
      tenant_id: request.auth.tenant_id,
      ...(q.status ? { status: q.status } : {}),
      ...(q.client_id ? { client_id: q.client_id } : {}),
    };
    const items = await (prisma as unknown as { returnAuthorization?: { findMany?: Function } })
      .returnAuthorization?.findMany?.({
        where,
        orderBy: { requested_at: 'desc' },
        take: 200,
      }) ?? [];
    return { items };
  });

  app.get('/api/sav/returns/:id', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const rma = await (prisma as unknown as { returnAuthorization?: { findFirst?: Function } })
      .returnAuthorization?.findFirst?.({
        where: { id, tenant_id: request.auth.tenant_id },
      });
    if (!rma) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'RMA introuvable.' } });
    const lines = await (prisma as unknown as { returnLine?: { findMany?: Function } })
      .returnLine?.findMany?.({ where: { return_id: id } }) ?? [];
    return { rma, lines };
  });

  app.post('/api/sav/returns', { preHandler: preHandlers }, async (request, reply) => {
    const parsed = returnSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const number = await nextRmaNumber(request.auth.tenant_id);
    const { prisma } = await import('@zenadmin/db');

    const totalRefund = parsed.data.lines.reduce((acc, l) => acc + (l.unit_price_cents * l.quantity), 0);

    const rma = await (prisma as unknown as { returnAuthorization?: { create?: Function } })
      .returnAuthorization?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          number,
          client_id: parsed.data.client_id,
          invoice_id: parsed.data.invoice_id ?? null,
          reason: parsed.data.reason,
          condition: parsed.data.condition ?? null,
          description: parsed.data.description ?? null,
          total_refund_cents: totalRefund,
        },
      }) as { id: string; number: string };

    for (const line of parsed.data.lines) {
      await (prisma as unknown as { returnLine?: { create?: Function } })
        .returnLine?.create?.({
          data: {
            return_id: rma.id,
            product_id: line.product_id ?? null,
            variant_id: line.variant_id ?? null,
            invoice_line_id: line.invoice_line_id ?? null,
            label: line.label,
            quantity: line.quantity,
            unit_price_cents: line.unit_price_cents,
            tva_rate: line.tva_rate,
            refund_ht_cents: line.unit_price_cents * line.quantity,
            restock: line.restock,
          },
        });
    }

    return reply.status(201).send({ id: rma.id, number });
  });

  app.post('/api/sav/returns/:id/approve', { preHandler: [...preHandlers, requirePermission('invoice', 'update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const rma = await (prisma as unknown as { returnAuthorization?: { findFirst?: Function } })
      .returnAuthorization?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id } }) as { id: string; status: string } | null;
    if (!rma) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'RMA introuvable.' } });
    if (rma.status !== 'pending') {
      return reply.status(409).send({ error: { code: 'INVALID_STATE', message: `RMA deja ${rma.status}.` } });
    }
    const updated = await (prisma as unknown as { returnAuthorization?: { update?: Function } })
      .returnAuthorization?.update?.({
        where: { id },
        data: {
          status: 'approved',
          approved_at: new Date(),
          approved_by: request.auth.user_id,
        },
      });
    return updated;
  });

  app.post('/api/sav/returns/:id/receive', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const rma = await (prisma as unknown as { returnAuthorization?: { findFirst?: Function } })
      .returnAuthorization?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id } }) as
      { id: string; status: string } | null;
    if (!rma) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'RMA introuvable.' } });
    if (rma.status !== 'approved') {
      return reply.status(409).send({ error: { code: 'NOT_APPROVED', message: 'RMA doit etre approuve avant reception.' } });
    }

    // Reintegrer le stock des lignes marquees restock=true
    const lines = await (prisma as unknown as { returnLine?: { findMany?: Function } })
      .returnLine?.findMany?.({ where: { return_id: id } }) as
      Array<{ variant_id: string | null; product_id: string | null; quantity: number; restock: boolean }> ?? [];
    for (const l of lines) {
      if (!l.restock) continue;
      if (l.variant_id) {
        await (prisma as unknown as { productVariant?: { update?: Function } })
          .productVariant?.update?.({
            where: { id: l.variant_id },
            data: { stock_qty: { increment: l.quantity } },
          });
      }
      if (l.product_id) {
        await (prisma as unknown as { stockMovement?: { create?: Function } })
          .stockMovement?.create?.({
            data: {
              tenant_id: request.auth.tenant_id,
              product_id: l.product_id,
              variant_id: l.variant_id,
              direction: 'in',
              quantity: l.quantity,
              reason: 'return',
              reference: `RMA-${id.slice(0, 8)}`,
              created_by: request.auth.user_id,
            },
          });
      }
    }

    await (prisma as unknown as { returnAuthorization?: { update?: Function } })
      .returnAuthorization?.update?.({
        where: { id },
        data: { status: 'received', received_at: new Date() },
      });
    return { received: true, restocked_lines: lines.filter((l) => l.restock).length };
  });

  // W2 : generer avoir (credit note) depuis RMA
  app.post('/api/sav/returns/:id/credit-note', { preHandler: [...preHandlers, requirePermission('invoice', 'create')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prisma } = await import('@zenadmin/db');
    const rma = await (prisma as unknown as { returnAuthorization?: { findFirst?: Function } })
      .returnAuthorization?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id } }) as
      { id: string; number: string; status: string; client_id: string; invoice_id: string | null; total_refund_cents: number; credit_note_id: string | null } | null;
    if (!rma) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'RMA introuvable.' } });
    if (rma.credit_note_id) {
      return reply.status(409).send({ error: { code: 'ALREADY_ISSUED', message: 'Avoir deja emis pour ce RMA.' } });
    }
    if (rma.status !== 'received' && rma.status !== 'approved') {
      return reply.status(409).send({ error: { code: 'INVALID_STATE', message: 'Seul un RMA approuve ou recu peut generer un avoir.' } });
    }

    const lines = await (prisma as unknown as { returnLine?: { findMany?: Function } })
      .returnLine?.findMany?.({ where: { return_id: id } }) as
      Array<{ label: string; quantity: number; unit_price_cents: number; tva_rate: number; refund_ht_cents: number }> ?? [];
    if (lines.length === 0) {
      return reply.status(400).send({ error: { code: 'NO_LINES', message: 'Aucune ligne a rembourser.' } });
    }

    const totalHt = lines.reduce((acc, l) => acc + l.refund_ht_cents, 0);
    const totalTva = lines.reduce((acc, l) => acc + Math.round((l.refund_ht_cents * l.tva_rate) / 10_000), 0);
    const totalTtc = totalHt + totalTva;

    // Numero facture avoir
    const year = new Date().getFullYear();
    const lastInv = await prisma.invoice.findFirst({
      where: { tenant_id: request.auth.tenant_id, number: { startsWith: `AV-${year}-` } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const invNext = lastInv ? parseInt(lastInv.number.split('-')[2] ?? '0', 10) + 1 : 1;
    const number = `AV-${year}-${String(invNext).padStart(5, '0')}`;

    const issueDate = new Date();
    const creditNote = await prisma.invoice.create({
      data: {
        tenant_id: request.auth.tenant_id,
        client_id: rma.client_id,
        number,
        type: 'credit_note',
        status: 'finalized',
        issue_date: issueDate,
        due_date: issueDate,
        payment_terms: 0,
        notes: `Avoir suite au RMA ${rma.number}`,
        total_ht_cents: -Math.abs(totalHt),
        total_tva_cents: -Math.abs(totalTva),
        total_ttc_cents: -Math.abs(totalTtc),
        remaining_cents: -Math.abs(totalTtc),
        finalized_at: issueDate,
        lines: {
          create: lines.map((l, idx) => ({
            position: idx + 1,
            label: l.label,
            quantity: l.quantity as unknown as number,
            unit: 'unit',
            unit_price_cents: -Math.abs(l.unit_price_cents),
            tva_rate: l.tva_rate,
            total_ht_cents: -Math.abs(l.refund_ht_cents),
          })),
        },
      },
    });

    await (prisma as unknown as { returnAuthorization?: { update?: Function } })
      .returnAuthorization?.update?.({
        where: { id },
        data: {
          status: 'refunded',
          refunded_at: issueDate,
          credit_note_id: creditNote.id,
        },
      });

    return { credit_note_id: creditNote.id, credit_note_number: number, total_ttc_cents: -Math.abs(totalTtc) };
  });

  // W3 : Garanties
  app.get('/api/sav/warranties', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const q = request.query as { client_id?: string; active?: string; expiring_days?: string };
    const { prisma } = await import('@zenadmin/db');
    const where: Record<string, unknown> = {
      tenant_id: request.auth.tenant_id,
      ...(q.client_id ? { client_id: q.client_id } : {}),
    };
    if (q.active === 'true') where['is_active'] = true;
    if (q.expiring_days) {
      const days = parseInt(q.expiring_days, 10) || 30;
      const until = new Date();
      until.setDate(until.getDate() + days);
      where['ends_at'] = { lte: until, gte: new Date() };
    }
    const items = await (prisma as unknown as { warranty?: { findMany?: Function } })
      .warranty?.findMany?.({ where, orderBy: { ends_at: 'asc' }, take: 200 }) ?? [];
    return { items };
  });

  app.post('/api/sav/warranties', { preHandler: preHandlers }, async (request, reply) => {
    const parsed = warrantySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const endsAt = new Date(parsed.data.starts_at);
    endsAt.setMonth(endsAt.getMonth() + parsed.data.duration_months);
    const { prisma } = await import('@zenadmin/db');
    const created = await (prisma as unknown as { warranty?: { create?: Function } })
      .warranty?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          ...parsed.data,
          ends_at: endsAt,
        },
      });
    return reply.status(201).send(created);
  });

  app.post('/api/sav/warranties/:id/extend', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { additional_months?: number };
    const additional = body.additional_months ?? 12;
    const { prisma } = await import('@zenadmin/db');
    const existing = await (prisma as unknown as { warranty?: { findFirst?: Function } })
      .warranty?.findFirst?.({ where: { id, tenant_id: request.auth.tenant_id } }) as
      { id: string; ends_at: Date; duration_months: number } | null;
    if (!existing) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Garantie introuvable.' } });
    const newEnds = new Date(existing.ends_at);
    newEnds.setMonth(newEnds.getMonth() + additional);
    const updated = await (prisma as unknown as { warranty?: { update?: Function } })
      .warranty?.update?.({
        where: { id },
        data: {
          ends_at: newEnds,
          duration_months: existing.duration_months + additional,
          kind: 'extended',
        },
      });
    return updated;
  });

  // Check par numero de serie (public-ish mais requiert tenant context)
  app.get('/api/sav/warranties/check', { preHandler: preHandlers }, async (request, reply) => {
    const q = request.query as { serial_number?: string };
    if (!q.serial_number) {
      return reply.status(400).send({ error: { code: 'MISSING_SERIAL', message: 'serial_number requis.' } });
    }
    const { prisma } = await import('@zenadmin/db');
    const warranty = await (prisma as unknown as { warranty?: { findFirst?: Function } })
      .warranty?.findFirst?.({
        where: { tenant_id: request.auth.tenant_id, serial_number: q.serial_number, is_active: true },
      }) as { id: string; ends_at: Date; starts_at: Date; duration_months: number; kind: string } | null;
    if (!warranty) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Aucune garantie active pour ce numero de serie.' } });
    const now = new Date();
    const active = warranty.ends_at > now;
    const daysLeft = Math.ceil((warranty.ends_at.getTime() - now.getTime()) / 86_400_000);
    return { warranty, active, days_left: daysLeft };
  });
}
