import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague U : fidelisation
// U1 : comptes de points (LoyaltyAccount) + transactions (earn/redeem)
// U2 : niveaux (LoyaltyTier) bronze/silver/gold/platinum + reduction auto
// U3 : coupons (Coupon) duree/usage limites + CouponRedemption

const DEFAULT_TIERS = [
  { name: 'bronze',   min_points: 0,     discount_bp: 0,   earn_multiplier_bp: 10_000, order: 0 },
  { name: 'silver',   min_points: 500,   discount_bp: 300, earn_multiplier_bp: 12_500, order: 1 }, // 3% + x1.25
  { name: 'gold',     min_points: 2000,  discount_bp: 600, earn_multiplier_bp: 15_000, order: 2 }, // 6% + x1.5
  { name: 'platinum', min_points: 5000,  discount_bp: 1000, earn_multiplier_bp: 20_000, order: 3 }, // 10% + x2
];

const adjustSchema = z.object({
  points: z.number().int(),
  reason: z.string().min(1).max(200),
});

const couponSchema = z.object({
  code: z.string().min(3).max(32).optional(),
  description: z.string().max(200).optional().nullable(),
  kind: z.enum(['percent', 'amount', 'free_shipping']).default('percent'),
  discount_bp: z.number().int().min(0).max(10_000).default(0),
  discount_amount_cents: z.number().int().min(0).default(0),
  min_order_cents: z.number().int().min(0).default(0),
  max_uses: z.number().int().min(1).optional().nullable(),
  max_uses_per_client: z.number().int().min(1).optional().nullable(),
  valid_from: z.coerce.date().optional().nullable(),
  valid_until: z.coerce.date().optional().nullable(),
  applies_to: z.enum(['all', 'product', 'category']).default('all'),
  applies_to_ids: z.array(z.string().uuid()).default([]),
});

const redeemSchema = z.object({
  code: z.string().min(1).max(64),
  client_id: z.string().uuid().optional().nullable(),
  invoice_id: z.string().uuid().optional().nullable(),
  subtotal_cents: z.number().int().min(0).default(0),
});

async function resolveTier(tenantId: string, points: number): Promise<{ name: string; discount_bp: number; earn_multiplier_bp: number }> {
  const { prisma } = await import('@zenadmin/db');
  const tiers = await (prisma as unknown as { loyaltyTier?: { findMany?: Function } })
    .loyaltyTier?.findMany?.({
      where: { tenant_id: tenantId },
      orderBy: { min_points: 'desc' },
    }) as Array<{ name: string; min_points: number; discount_bp: number; earn_multiplier_bp: number }> ?? [];
  const match = tiers.find((t) => points >= t.min_points);
  if (match) return match;
  // Fallback bronze if no tiers configured
  return { name: 'bronze', discount_bp: 0, earn_multiplier_bp: 10_000 };
}

export async function loyaltyRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // Lister comptes de fidelite
  app.get('/api/loyalty/accounts', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const items = await (prisma as unknown as { loyaltyAccount?: { findMany?: Function } })
      .loyaltyAccount?.findMany?.({
        where: { tenant_id: request.auth.tenant_id },
        orderBy: { points_balance: 'desc' },
        take: 200,
      }) ?? [];
    return { items };
  });

  // Recuperer / creer un compte pour un client
  app.get('/api/loyalty/accounts/:clientId', { preHandler: preHandlers }, async (request, reply) => {
    const { clientId } = request.params as { clientId: string };
    const { prisma } = await import('@zenadmin/db');
    let account = await (prisma as unknown as { loyaltyAccount?: { findFirst?: Function } })
      .loyaltyAccount?.findFirst?.({
        where: { tenant_id: request.auth.tenant_id, client_id: clientId },
      }) as { id: string; client_id: string; points_balance: number; points_total: number; points_spent: number; tier: string } | null;
    if (!account) {
      account = await (prisma as unknown as { loyaltyAccount?: { create?: Function } })
        .loyaltyAccount?.create?.({
          data: { tenant_id: request.auth.tenant_id, client_id: clientId },
        });
    }
    if (!account) return reply.status(500).send({ error: { code: 'CREATE_FAILED', message: 'Impossible de creer le compte fidelite.' } });

    const transactions = await (prisma as unknown as { loyaltyTransaction?: { findMany?: Function } })
      .loyaltyTransaction?.findMany?.({
        where: { tenant_id: request.auth.tenant_id, account_id: account.id },
        orderBy: { created_at: 'desc' },
        take: 50,
      }) ?? [];
    return { account, transactions };
  });

  // U1 : ajout/retrait manuel de points
  app.post('/api/loyalty/accounts/:clientId/adjust', { preHandler: [...preHandlers, requirePermission('client', 'update')] }, async (request, reply) => {
    const { clientId } = request.params as { clientId: string };
    const parsed = adjustSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const { prisma } = await import('@zenadmin/db');
    let account = await (prisma as unknown as { loyaltyAccount?: { findFirst?: Function } })
      .loyaltyAccount?.findFirst?.({ where: { tenant_id: request.auth.tenant_id, client_id: clientId } }) as
      { id: string; points_balance: number; points_total: number; points_spent: number } | null;
    if (!account) {
      account = await (prisma as unknown as { loyaltyAccount?: { create?: Function } })
        .loyaltyAccount?.create?.({ data: { tenant_id: request.auth.tenant_id, client_id: clientId } });
    }
    if (!account) return reply.status(500).send({ error: { code: 'CREATE_FAILED', message: 'Compte fidelite indisponible.' } });

    const delta = parsed.data.points;
    const newBalance = account.points_balance + delta;
    if (newBalance < 0) {
      return reply.status(409).send({ error: { code: 'INSUFFICIENT_POINTS', message: 'Solde de points insuffisant.' } });
    }
    const newTotal = delta > 0 ? account.points_total + delta : account.points_total;
    const newSpent = delta < 0 ? account.points_spent + Math.abs(delta) : account.points_spent;
    const tier = await resolveTier(request.auth.tenant_id, newTotal);

    await (prisma as unknown as { loyaltyAccount?: { update?: Function } })
      .loyaltyAccount?.update?.({
        where: { id: account.id },
        data: {
          points_balance: newBalance,
          points_total: newTotal,
          points_spent: newSpent,
          tier: tier.name,
          tier_since: new Date(),
          last_activity_at: new Date(),
        },
      });
    await (prisma as unknown as { loyaltyTransaction?: { create?: Function } })
      .loyaltyTransaction?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          account_id: account.id,
          kind: delta >= 0 ? 'adjust' : 'redeem',
          points: delta,
          reason: parsed.data.reason,
        },
      });
    return { balance: newBalance, tier: tier.name };
  });

  // U1 : earn points depuis une facture payee
  app.post('/api/loyalty/earn/invoice/:invoiceId', { preHandler: preHandlers }, async (request, reply) => {
    const { invoiceId } = request.params as { invoiceId: string };
    const { prisma } = await import('@zenadmin/db');
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenant_id: request.auth.tenant_id, deleted_at: null },
    });
    if (!invoice) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Facture introuvable.' } });
    if (!invoice.client_id) return reply.status(400).send({ error: { code: 'NO_CLIENT', message: 'Facture sans client.' } });
    if (invoice.status !== 'paid') return reply.status(409).send({ error: { code: 'NOT_PAID', message: 'Facture non payee.' } });

    // Verifier qu'on n'a pas deja credite
    const existing = await (prisma as unknown as { loyaltyTransaction?: { findFirst?: Function } })
      .loyaltyTransaction?.findFirst?.({
        where: { tenant_id: request.auth.tenant_id, invoice_id: invoiceId, kind: 'earn' },
      });
    if (existing) return reply.status(409).send({ error: { code: 'ALREADY_EARNED', message: 'Points deja credites pour cette facture.' } });

    let account = await (prisma as unknown as { loyaltyAccount?: { findFirst?: Function } })
      .loyaltyAccount?.findFirst?.({ where: { tenant_id: request.auth.tenant_id, client_id: invoice.client_id } }) as
      { id: string; points_balance: number; points_total: number; tier: string } | null;
    if (!account) {
      account = await (prisma as unknown as { loyaltyAccount?: { create?: Function } })
        .loyaltyAccount?.create?.({ data: { tenant_id: request.auth.tenant_id, client_id: invoice.client_id } });
    }
    if (!account) return reply.status(500).send({ error: { code: 'CREATE_FAILED', message: 'Compte fidelite indisponible.' } });

    // 1 point par euro HT depense, applique le multiplicateur du tier actuel
    const tier = await resolveTier(request.auth.tenant_id, account.points_total);
    const basePoints = Math.floor(invoice.total_ht_cents / 100);
    const points = Math.floor((basePoints * tier.earn_multiplier_bp) / 10_000);

    const newBalance = account.points_balance + points;
    const newTotal = account.points_total + points;
    const newTier = await resolveTier(request.auth.tenant_id, newTotal);

    await (prisma as unknown as { loyaltyAccount?: { update?: Function } })
      .loyaltyAccount?.update?.({
        where: { id: account.id },
        data: {
          points_balance: newBalance,
          points_total: newTotal,
          tier: newTier.name,
          tier_since: newTier.name === account.tier ? undefined : new Date(),
          last_activity_at: new Date(),
        },
      });
    await (prisma as unknown as { loyaltyTransaction?: { create?: Function } })
      .loyaltyTransaction?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          account_id: account.id,
          kind: 'earn',
          points,
          reason: `Facture ${invoice.number}`,
          invoice_id: invoiceId,
        },
      });
    return { points_earned: points, new_balance: newBalance, tier: newTier.name };
  });

  // U2 : niveaux
  app.get('/api/loyalty/tiers', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    let items = await (prisma as unknown as { loyaltyTier?: { findMany?: Function } })
      .loyaltyTier?.findMany?.({
        where: { tenant_id: request.auth.tenant_id },
        orderBy: { order: 'asc' },
      }) as Array<Record<string, unknown>> ?? [];
    if (items.length === 0) {
      // Seed les tiers par defaut
      for (const t of DEFAULT_TIERS) {
        await (prisma as unknown as { loyaltyTier?: { create?: Function } })
          .loyaltyTier?.create?.({ data: { tenant_id: request.auth.tenant_id, ...t } });
      }
      items = await (prisma as unknown as { loyaltyTier?: { findMany?: Function } })
        .loyaltyTier?.findMany?.({
          where: { tenant_id: request.auth.tenant_id },
          orderBy: { order: 'asc' },
        }) ?? [];
    }
    return { items };
  });

  // U3 : coupons
  app.get('/api/loyalty/coupons', { preHandler: preHandlers }, async (request) => {
    if (!process.env['DATABASE_URL']) return { items: [] };
    const { prisma } = await import('@zenadmin/db');
    const items = await (prisma as unknown as { coupon?: { findMany?: Function } })
      .coupon?.findMany?.({
        where: { tenant_id: request.auth.tenant_id },
        orderBy: { created_at: 'desc' },
      }) ?? [];
    return { items };
  });

  app.post('/api/loyalty/coupons', { preHandler: preHandlers }, async (request, reply) => {
    const parsed = couponSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const code = parsed.data.code ?? randomBytes(4).toString('hex').toUpperCase();
    const { prisma } = await import('@zenadmin/db');
    try {
      const created = await (prisma as unknown as { coupon?: { create?: Function } })
        .coupon?.create?.({
          data: {
            tenant_id: request.auth.tenant_id,
            ...parsed.data,
            code,
            applies_to_ids: parsed.data.applies_to_ids as unknown as Record<string, unknown>,
          },
        });
      return reply.status(201).send(created);
    } catch (err) {
      const error = err as { code?: string };
      if (error.code === 'P2002') {
        return reply.status(409).send({ error: { code: 'CODE_EXISTS', message: 'Ce code existe deja.' } });
      }
      throw err;
    }
  });

  // Verification publique (avant application panier)
  app.get('/api/public/coupons/:code', async (request, reply) => {
    const { code } = request.params as { code: string };
    const { prisma } = await import('@zenadmin/db');
    const coupon = await (prisma as unknown as { coupon?: { findFirst?: Function } })
      .coupon?.findFirst?.({ where: { code: code.toUpperCase() } }) as
      { id: string; tenant_id: string; is_active: boolean; uses_count: number; max_uses: number | null; valid_from: Date | null; valid_until: Date | null; kind: string; discount_bp: number; discount_amount_cents: number; min_order_cents: number } | null;
    if (!coupon || !coupon.is_active) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Code inconnu.' } });
    const now = new Date();
    if (coupon.valid_from && coupon.valid_from > now) return reply.status(410).send({ error: { code: 'NOT_YET', message: 'Code pas encore valable.' } });
    if (coupon.valid_until && coupon.valid_until < now) return reply.status(410).send({ error: { code: 'EXPIRED', message: 'Code expire.' } });
    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) return reply.status(410).send({ error: { code: 'MAX_USES', message: 'Code epuise.' } });
    return {
      valid: true,
      kind: coupon.kind,
      discount_bp: coupon.discount_bp,
      discount_amount_cents: coupon.discount_amount_cents,
      min_order_cents: coupon.min_order_cents,
    };
  });

  // Consommation (par une facture) — decremente uses_count et cree CouponRedemption
  app.post('/api/loyalty/coupons/redeem', { preHandler: preHandlers }, async (request, reply) => {
    const parsed = redeemSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Données invalides.', details: { issues: parsed.error.issues } } });
    }
    const { prisma } = await import('@zenadmin/db');
    const coupon = await (prisma as unknown as { coupon?: { findFirst?: Function } })
      .coupon?.findFirst?.({
        where: { code: parsed.data.code.toUpperCase(), tenant_id: request.auth.tenant_id, is_active: true },
      }) as { id: string; uses_count: number; max_uses: number | null; max_uses_per_client: number | null; kind: string; discount_bp: number; discount_amount_cents: number; min_order_cents: number; valid_from: Date | null; valid_until: Date | null } | null;
    if (!coupon) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Coupon introuvable.' } });
    const now = new Date();
    if (coupon.valid_until && coupon.valid_until < now) return reply.status(410).send({ error: { code: 'EXPIRED', message: 'Coupon expire.' } });
    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) return reply.status(410).send({ error: { code: 'MAX_USES', message: 'Coupon epuise.' } });
    if (parsed.data.subtotal_cents < coupon.min_order_cents) {
      return reply.status(400).send({ error: { code: 'MIN_ORDER', message: `Montant minimum ${coupon.min_order_cents / 100}€ non atteint.` } });
    }
    if (parsed.data.client_id && coupon.max_uses_per_client) {
      const past = await (prisma as unknown as { couponRedemption?: { count?: Function } })
        .couponRedemption?.count?.({
          where: { tenant_id: request.auth.tenant_id, coupon_id: coupon.id, client_id: parsed.data.client_id },
        });
      if ((past as number ?? 0) >= coupon.max_uses_per_client) {
        return reply.status(410).send({ error: { code: 'CLIENT_LIMIT', message: 'Limite atteinte pour ce client.' } });
      }
    }

    const discount = coupon.kind === 'percent'
      ? Math.round((parsed.data.subtotal_cents * coupon.discount_bp) / 10_000)
      : coupon.discount_amount_cents;

    await (prisma as unknown as { coupon?: { update?: Function } })
      .coupon?.update?.({ where: { id: coupon.id }, data: { uses_count: { increment: 1 } } });
    await (prisma as unknown as { couponRedemption?: { create?: Function } })
      .couponRedemption?.create?.({
        data: {
          tenant_id: request.auth.tenant_id,
          coupon_id: coupon.id,
          client_id: parsed.data.client_id ?? null,
          invoice_id: parsed.data.invoice_id ?? null,
          amount_applied_cents: discount,
        },
      });

    return { discount_cents: discount, kind: coupon.kind };
  });
}
