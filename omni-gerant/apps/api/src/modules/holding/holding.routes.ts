import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague T : multi-societes (holding, consolidation, transferts inter-societes)
// Note : holding est cross-tenant, donc on n'injecte pas toujours tenant_id — on
// verifie plutot que l'utilisateur a acces au holding via HoldingAdminAccess.

const holdingSchema = z.object({
  name: z.string().min(1).max(200),
  siren: z.string().regex(/^\d{9}$/).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  parent_tenant_id: z.string().uuid().optional().nullable(),
});

const membershipSchema = z.object({
  tenant_id: z.string().uuid(),
  role: z.enum(['parent', 'subsidiary', 'joint_venture']).default('subsidiary'),
  ownership_bp: z.number().int().min(0).max(10_000).default(10_000),
});

const transferSchema = z.object({
  from_tenant_id: z.string().uuid(),
  to_tenant_id: z.string().uuid(),
  description: z.string().min(1).max(500),
  amount_ht_cents: z.number().int().min(0),
  tva_rate: z.number().int().refine((v) => [0, 210, 550, 1000, 2000].includes(v)).default(2000),
});

async function userHoldingAccess(userId: string, holdingId: string, requireAdmin = false): Promise<boolean> {
  const { prisma } = await import('@zenadmin/db');
  const access = await (prisma as unknown as { holdingAdminAccess?: { findFirst?: Function } })
    .holdingAdminAccess?.findFirst?.({
      where: { user_id: userId, holding_id: holdingId },
    }) as { role: string } | null;
  if (!access) return false;
  if (requireAdmin && access.role !== 'holding_admin') return false;
  return true;
}

export async function holdingRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // Lister les holdings auxquels j'ai acces
  app.get('/api/holding', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const accesses = await (prisma as unknown as { holdingAdminAccess?: { findMany?: Function } })
      .holdingAdminAccess?.findMany?.({
        where: { user_id: request.auth.user_id },
      }) as Array<{ holding_id: string; role: string }> ?? [];
    if (accesses.length === 0) return { items: [] };
    const holdingIds = accesses.map((a) => a.holding_id);
    const holdings = await (prisma as unknown as { holdingGroup?: { findMany?: Function } })
      .holdingGroup?.findMany?.({
        where: { id: { in: holdingIds }, deleted_at: null },
        orderBy: { created_at: 'desc' },
      }) ?? [];
    return { items: holdings, accesses };
  });

  app.post('/api/holding', { preHandler: preHandlers }, async (request, reply) => {
    const parsed = holdingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const { prisma } = await import('@zenadmin/db');
    const created = await (prisma as unknown as { holdingGroup?: { create?: Function } })
      .holdingGroup?.create?.({
        data: { ...parsed.data, parent_tenant_id: parsed.data.parent_tenant_id ?? request.auth.tenant_id },
      }) as { id: string };
    // L'utilisateur createur devient holding_admin
    await (prisma as unknown as { holdingAdminAccess?: { create?: Function } })
      .holdingAdminAccess?.create?.({
        data: { holding_id: created.id, user_id: request.auth.user_id, role: 'holding_admin' },
      });
    // Le tenant courant est ajoute comme parent (ou subsidiary si un parent_tenant_id different fourni)
    await (prisma as unknown as { holdingMembership?: { create?: Function } })
      .holdingMembership?.create?.({
        data: {
          holding_id: created.id,
          tenant_id: request.auth.tenant_id,
          role: parsed.data.parent_tenant_id && parsed.data.parent_tenant_id !== request.auth.tenant_id ? 'subsidiary' : 'parent',
        },
      });
    return reply.status(201).send(created);
  });

  app.get('/api/holding/:id', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await userHoldingAccess(request.auth.user_id, id))) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Acces holding refuse.' } });
    }
    const { prisma } = await import('@zenadmin/db');
    const holding = await (prisma as unknown as { holdingGroup?: { findFirst?: Function } })
      .holdingGroup?.findFirst?.({ where: { id, deleted_at: null } });
    if (!holding) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Holding introuvable.' } });
    const memberships = await (prisma as unknown as { holdingMembership?: { findMany?: Function } })
      .holdingMembership?.findMany?.({ where: { holding_id: id, left_at: null } }) ?? [];
    return { holding, memberships };
  });

  // T1 : ajouter un tenant filiale au holding
  app.post('/api/holding/:id/members', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await userHoldingAccess(request.auth.user_id, id, true))) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Acces holding_admin requis.' } });
    }
    const parsed = membershipSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const { prisma } = await import('@zenadmin/db');
    const existing = await (prisma as unknown as { holdingMembership?: { findFirst?: Function } })
      .holdingMembership?.findFirst?.({ where: { holding_id: id, tenant_id: parsed.data.tenant_id, left_at: null } });
    if (existing) {
      return reply.status(409).send({ error: { code: 'ALREADY_MEMBER', message: 'Ce tenant est deja membre du holding.' } });
    }
    const created = await (prisma as unknown as { holdingMembership?: { create?: Function } })
      .holdingMembership?.create?.({
        data: { holding_id: id, ...parsed.data },
      });
    return reply.status(201).send(created);
  });

  app.delete('/api/holding/:id/members/:memberId', { preHandler: preHandlers }, async (request, reply) => {
    const { id, memberId } = request.params as { id: string; memberId: string };
    if (!(await userHoldingAccess(request.auth.user_id, id, true))) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Acces holding_admin requis.' } });
    }
    const { prisma } = await import('@zenadmin/db');
    await (prisma as unknown as { holdingMembership?: { update?: Function } })
      .holdingMembership?.update?.({ where: { id: memberId }, data: { left_at: new Date() } });
    return reply.status(204).send();
  });

  // T2 : Consolidation — analytics cross-tenant
  app.get('/api/holding/:id/consolidation', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await userHoldingAccess(request.auth.user_id, id))) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Acces holding refuse.' } });
    }
    const q = request.query as { from?: string; to?: string };
    const from = q.from ? new Date(q.from) : new Date(new Date().getFullYear(), 0, 1);
    const to = q.to ? new Date(q.to) : new Date();

    const { prisma } = await import('@zenadmin/db');
    const memberships = await (prisma as unknown as { holdingMembership?: { findMany?: Function } })
      .holdingMembership?.findMany?.({ where: { holding_id: id, left_at: null } }) as
      Array<{ tenant_id: string; role: string; ownership_bp: number }> ?? [];
    const tenantIds = memberships.map((m) => m.tenant_id);
    if (tenantIds.length === 0) return { members: [], total: null };

    // CA consolide : somme des total_ht des factures finalized/paid par tenant
    const revenueStats = await prisma.invoice.groupBy({
      by: ['tenant_id'],
      where: {
        tenant_id: { in: tenantIds },
        deleted_at: null,
        status: { in: ['finalized', 'sent', 'paid', 'partially_paid'] },
        issue_date: { gte: from, lte: to },
      },
      _sum: { total_ht_cents: true, total_ttc_cents: true, paid_cents: true },
      _count: true,
    });

    // Depenses consolidees : purchases
    const expenseStats = await prisma.purchase.groupBy({
      by: ['tenant_id'],
      where: {
        tenant_id: { in: tenantIds },
        deleted_at: null,
        purchase_date: { gte: from, lte: to },
      },
      _sum: { total_ht_cents: true, total_ttc_cents: true },
      _count: true,
    });

    // Tenants info
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true, siret: true },
    });

    type RevStat = { tenant_id: string; _sum: { total_ht_cents: number | null; total_ttc_cents: number | null; paid_cents: number | null }; _count: number };
    type ExpStat = { tenant_id: string; _sum: { total_ht_cents: number | null; total_ttc_cents: number | null }; _count: number };
    type TenantInfo = { id: string; name: string; siret: string | null };
    const tenantById = new Map<string, TenantInfo>((tenants as TenantInfo[]).map((t) => [t.id, t]));
    const revById = new Map<string, RevStat>((revenueStats as unknown as RevStat[]).map((r) => [r.tenant_id, r]));
    const expById = new Map<string, ExpStat>((expenseStats as unknown as ExpStat[]).map((e) => [e.tenant_id, e]));

    const members = memberships.map((m) => {
      const rev = revById.get(m.tenant_id);
      const exp = expById.get(m.tenant_id);
      return {
        tenant_id: m.tenant_id,
        tenant_name: tenantById.get(m.tenant_id)?.name ?? 'N/A',
        role: m.role,
        ownership_bp: m.ownership_bp,
        revenue_ht_cents: rev?._sum.total_ht_cents ?? 0,
        revenue_ttc_cents: rev?._sum.total_ttc_cents ?? 0,
        paid_cents: rev?._sum.paid_cents ?? 0,
        invoices_count: rev?._count ?? 0,
        expense_ht_cents: exp?._sum.total_ht_cents ?? 0,
        expense_ttc_cents: exp?._sum.total_ttc_cents ?? 0,
        purchases_count: exp?._count ?? 0,
      };
    });

    const total = members.reduce(
      (acc, m) => {
        const share = m.ownership_bp / 10_000;
        acc.revenue_ht_cents += m.revenue_ht_cents;
        acc.revenue_ttc_cents += m.revenue_ttc_cents;
        acc.expense_ht_cents += m.expense_ht_cents;
        acc.expense_ttc_cents += m.expense_ttc_cents;
        acc.weighted_revenue_cents += Math.round(m.revenue_ht_cents * share);
        acc.weighted_expense_cents += Math.round(m.expense_ht_cents * share);
        return acc;
      },
      { revenue_ht_cents: 0, revenue_ttc_cents: 0, expense_ht_cents: 0, expense_ttc_cents: 0, weighted_revenue_cents: 0, weighted_expense_cents: 0 },
    );

    return {
      period: { from, to },
      members,
      total: {
        ...total,
        margin_ht_cents: total.revenue_ht_cents - total.expense_ht_cents,
        weighted_margin_cents: total.weighted_revenue_cents - total.weighted_expense_cents,
      },
    };
  });

  // T3 : Transferts inter-societes — creer un transfert
  app.post('/api/holding/:id/transfers', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await userHoldingAccess(request.auth.user_id, id, true))) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Acces holding_admin requis.' } });
    }
    const parsed = transferSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    if (parsed.data.from_tenant_id === parsed.data.to_tenant_id) {
      return reply.status(400).send({ error: { code: 'SAME_TENANT', message: 'La societe emettrice et receptrice doivent differer.' } });
    }

    const { prisma } = await import('@zenadmin/db');
    const memberships = await (prisma as unknown as { holdingMembership?: { findMany?: Function } })
      .holdingMembership?.findMany?.({
        where: { holding_id: id, left_at: null, tenant_id: { in: [parsed.data.from_tenant_id, parsed.data.to_tenant_id] } },
      }) as Array<{ tenant_id: string }> ?? [];
    if (memberships.length !== 2) {
      return reply.status(400).send({ error: { code: 'NOT_MEMBERS', message: 'Les deux societes doivent etre membres du holding.' } });
    }

    const tvaCents = Math.round((parsed.data.amount_ht_cents * parsed.data.tva_rate) / 10_000);
    const ttcCents = parsed.data.amount_ht_cents + tvaCents;

    const created = await (prisma as unknown as { intercompanyTransfer?: { create?: Function } })
      .intercompanyTransfer?.create?.({
        data: {
          holding_id: id,
          from_tenant_id: parsed.data.from_tenant_id,
          to_tenant_id: parsed.data.to_tenant_id,
          description: parsed.data.description,
          amount_ht_cents: parsed.data.amount_ht_cents,
          amount_tva_cents: tvaCents,
          amount_ttc_cents: ttcCents,
          tva_rate: parsed.data.tva_rate,
          status: 'draft',
        },
      });
    return reply.status(201).send(created);
  });

  app.get('/api/holding/:id/transfers', { preHandler: preHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await userHoldingAccess(request.auth.user_id, id))) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Acces holding refuse.' } });
    }
    const { prisma } = await import('@zenadmin/db');
    const items = await (prisma as unknown as { intercompanyTransfer?: { findMany?: Function } })
      .intercompanyTransfer?.findMany?.({
        where: { holding_id: id },
        orderBy: { created_at: 'desc' },
      }) ?? [];
    return { items };
  });

  // Executer un transfert : cree facture cote emetteur + purchase cote recepteur
  app.post('/api/holding/:id/transfers/:transferId/execute', { preHandler: preHandlers }, async (request, reply) => {
    const { id, transferId } = request.params as { id: string; transferId: string };
    if (!(await userHoldingAccess(request.auth.user_id, id, true))) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Acces holding_admin requis.' } });
    }
    const { prisma } = await import('@zenadmin/db');
    const transfer = await (prisma as unknown as { intercompanyTransfer?: { findFirst?: Function } })
      .intercompanyTransfer?.findFirst?.({ where: { id: transferId, holding_id: id } }) as
      { id: string; from_tenant_id: string; to_tenant_id: string; description: string | null; amount_ht_cents: number; amount_tva_cents: number; amount_ttc_cents: number; tva_rate: number; status: string } | null;
    if (!transfer) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Transfert introuvable.' } });
    if (transfer.status !== 'draft') {
      return reply.status(409).send({ error: { code: 'INVALID_STATE', message: `Transfert deja ${transfer.status}.` } });
    }

    // Trouver ou creer un client "interco" pour le tenant receveur dans le tenant emetteur
    const recipientTenant = await prisma.tenant.findUnique({ where: { id: transfer.to_tenant_id } });
    if (!recipientTenant) {
      return reply.status(404).send({ error: { code: 'RECIPIENT_NOT_FOUND', message: 'Societe receptrice introuvable.' } });
    }
    let client = await prisma.client.findFirst({
      where: {
        tenant_id: transfer.from_tenant_id,
        company_name: recipientTenant.name,
        deleted_at: null,
      },
    });
    if (!client) {
      client = await prisma.client.create({
        data: {
          tenant_id: transfer.from_tenant_id,
          type: 'company',
          company_name: recipientTenant.name,
          siret: recipientTenant.siret ?? null,
        },
      });
    }

    // Numero de facture cote emetteur
    const year = new Date().getFullYear();
    const lastInv = await prisma.invoice.findFirst({
      where: { tenant_id: transfer.from_tenant_id, number: { startsWith: `FAC-${year}-` } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const invNext = lastInv ? parseInt(lastInv.number.split('-')[2] ?? '0', 10) + 1 : 1;
    const number = `FAC-${year}-${String(invNext).padStart(5, '0')}`;

    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await prisma.invoice.create({
      data: {
        tenant_id: transfer.from_tenant_id,
        client_id: client.id,
        number,
        type: 'standard',
        status: 'finalized',
        issue_date: issueDate,
        due_date: dueDate,
        payment_terms: 30,
        notes: `Refacturation interco — ${transfer.description ?? ''}`,
        total_ht_cents: transfer.amount_ht_cents,
        total_tva_cents: transfer.amount_tva_cents,
        total_ttc_cents: transfer.amount_ttc_cents,
        remaining_cents: transfer.amount_ttc_cents,
        finalized_at: issueDate,
        lines: {
          create: [{
            position: 1,
            label: transfer.description ?? 'Refacturation intercompany',
            quantity: 1 as unknown as number,
            unit: 'unit',
            unit_price_cents: transfer.amount_ht_cents,
            tva_rate: transfer.tva_rate,
            total_ht_cents: transfer.amount_ht_cents,
          }],
        },
      },
    });

    // Creer le purchase cote recepteur
    // Trouver ou creer un supplier correspondant a l'emetteur
    const emitterTenant = await prisma.tenant.findUnique({ where: { id: transfer.from_tenant_id } });
    if (!emitterTenant) {
      return reply.status(404).send({ error: { code: 'EMITTER_NOT_FOUND', message: 'Societe emettrice introuvable.' } });
    }
    let supplier = await prisma.supplier.findFirst({
      where: { tenant_id: transfer.to_tenant_id, name: emitterTenant.name, deleted_at: null },
    });
    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: {
          tenant_id: transfer.to_tenant_id,
          name: emitterTenant.name,
          siret: emitterTenant.siret ?? null,
        },
      });
    }

    const purchase = await prisma.purchase.create({
      data: {
        tenant_id: transfer.to_tenant_id,
        supplier_id: supplier.id,
        issue_date: issueDate,
        number,
        status: 'validated',
        source: 'manual',
        total_ht_cents: transfer.amount_ht_cents,
        total_tva_cents: transfer.amount_tva_cents,
        total_ttc_cents: transfer.amount_ttc_cents,
        notes: `Refacturation interco — ${transfer.description ?? ''}`,
      },
    });

    await (prisma as unknown as { intercompanyTransfer?: { update?: Function } })
      .intercompanyTransfer?.update?.({
        where: { id: transferId },
        data: {
          invoice_id: invoice.id,
          mirror_invoice_id: null,
          purchase_id: purchase.id,
          status: 'mirrored',
          transferred_at: issueDate,
        },
      });

    return { transfer_id: transferId, invoice_id: invoice.id, purchase_id: purchase.id, invoice_number: number };
  });
}
