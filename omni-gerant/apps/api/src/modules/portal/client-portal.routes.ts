import type { FastifyInstance } from 'fastify';
import { randomBytes, createHash } from 'node:crypto';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// Vague I2 : portail client public (acces par lien magique).
// Le client recoit un lien /portal/client/:token -> voit ses factures,
// devis, peut telecharger PDF + payer via Stripe link.

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function clientPortalRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // --- Cote interne (tenant) : generer / revoquer les liens ---

  // POST /api/clients/:id/portal/link — cree un lien magique pour un client
  app.post(
    '/api/clients/:id/portal/link',
    { preHandler: [...preHandlers, requirePermission('client', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { validity_days?: number };
      const days = Math.max(1, Math.min(180, body.validity_days ?? 30));

      if (!process.env['DATABASE_URL']) {
        return reply.status(503).send({ error: { code: 'SERVICE_UNAVAILABLE', message: 'DB indisponible' } });
      }
      const { prisma } = await import('@zenadmin/db');

      const client = await prisma.client.findFirst({
        where: { id, tenant_id: request.auth.tenant_id, deleted_at: null },
      });
      if (!client) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Client introuvable' } });

      const token = generateToken();
      const expiresAt = new Date(Date.now() + days * 86400_000);

      await (prisma as unknown as { clientPortalToken?: { create?: Function } })
        .clientPortalToken?.create?.({
          data: {
            tenant_id: request.auth.tenant_id,
            client_id: id,
            token_hash: hashToken(token),
            expires_at: expiresAt,
          },
        });

      const appUrl = process.env['APP_URL'] ?? 'https://omni-gerant.vercel.app';
      return {
        portal_url: `${appUrl}/portal/client/${token}`,
        token,
        expires_at: expiresAt.toISOString(),
      };
    },
  );

  // GET /api/clients/:id/portal/links — liste des liens actifs
  app.get(
    '/api/clients/:id/portal/links',
    { preHandler: [...preHandlers, requirePermission('client', 'read')] },
    async (request) => {
      const { id } = request.params as { id: string };
      if (!process.env['DATABASE_URL']) return { items: [] };
      const { prisma } = await import('@zenadmin/db');
      const items = await (prisma as unknown as { clientPortalToken?: { findMany?: Function } })
        .clientPortalToken?.findMany?.({
          where: { client_id: id, tenant_id: request.auth.tenant_id, revoked_at: null },
          select: { id: true, expires_at: true, last_accessed_at: true, created_at: true },
          orderBy: { created_at: 'desc' },
        }) ?? [];
      return { items };
    },
  );

  // DELETE /api/clients/portal/links/:id — revoquer
  app.delete(
    '/api/clients/portal/links/:id',
    { preHandler: [...preHandlers, requirePermission('client', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { prisma } = await import('@zenadmin/db');
      await (prisma as unknown as { clientPortalToken?: { updateMany?: Function } })
        .clientPortalToken?.updateMany?.({
          where: { id, tenant_id: request.auth.tenant_id },
          data: { revoked_at: new Date() },
        });
      return reply.status(204).send();
    },
  );

  // --- Cote public (client avec token, pas d'auth) ---

  async function resolveToken(token: string): Promise<
    | { ok: true; client_id: string; tenant_id: string; tokenId: string }
    | { ok: false; status: number; message: string }
  > {
    if (!process.env['DATABASE_URL']) return { ok: false, status: 503, message: 'DB indisponible' };
    const { prisma } = await import('@zenadmin/db');
    const record = await (prisma as unknown as { clientPortalToken?: { findFirst?: Function; update?: Function } })
      .clientPortalToken?.findFirst?.({
        where: {
          token_hash: hashToken(token),
          expires_at: { gte: new Date() },
          revoked_at: null,
        },
      });
    if (!record) return { ok: false, status: 401, message: 'Lien invalide ou expiré.' };
    const r = record as { id: string; client_id: string; tenant_id: string };
    // last_accessed_at best-effort
    await (prisma as unknown as { clientPortalToken?: { update?: Function } })
      .clientPortalToken?.update?.({
        where: { id: r.id },
        data: { last_accessed_at: new Date() },
      }).catch(() => null);
    return { ok: true, client_id: r.client_id, tenant_id: r.tenant_id, tokenId: r.id };
  }

  // GET /api/portal/client/:token — landing : infos client + resume
  app.get('/api/portal/client/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const resolved = await resolveToken(token);
    if (!resolved.ok) return reply.status(resolved.status).send({ error: { code: 'INVALID_TOKEN', message: resolved.message } });

    const { prisma } = await import('@zenadmin/db');
    const [client, tenant, invoices, quotes] = await Promise.all([
      prisma.client.findUnique({ where: { id: resolved.client_id } }),
      prisma.tenant.findUnique({ where: { id: resolved.tenant_id } }),
      prisma.invoice.findMany({
        where: { tenant_id: resolved.tenant_id, client_id: resolved.client_id, deleted_at: null },
        orderBy: { issue_date: 'desc' },
        select: { id: true, number: true, issue_date: true, due_date: true, total_ttc_cents: true, paid_cents: true, remaining_cents: true, status: true },
        take: 50,
      }),
      prisma.quote.findMany({
        where: { tenant_id: resolved.tenant_id, client_id: resolved.client_id, deleted_at: null },
        orderBy: { created_at: 'desc' },
        select: { id: true, number: true, title: true, status: true, total_ttc_cents: true, validity_date: true, created_at: true },
        take: 50,
      }),
    ]);

    const settings = ((tenant?.settings ?? {}) as Record<string, string | undefined>);
    return {
      client: client ? {
        name: client.company_name ?? [client.first_name, client.last_name].filter(Boolean).join(' '),
        email: client.email,
      } : null,
      company: tenant ? {
        name: settings['company_name'] ?? tenant.name,
        siret: tenant.siret,
        email: settings['email'],
        phone: settings['phone'],
      } : null,
      invoices,
      quotes,
      counts: {
        total_invoices: invoices.length,
        unpaid_invoices: invoices.filter((i) => i.remaining_cents > 0).length,
        total_remaining_cents: invoices.reduce((s, i) => s + i.remaining_cents, 0),
        total_quotes: quotes.length,
      },
    };
  });

  // GET /api/portal/client/:token/invoice/:id/pdf
  app.get('/api/portal/client/:token/invoice/:id/pdf', async (request, reply) => {
    const { token, id } = request.params as { token: string; id: string };
    const resolved = await resolveToken(token);
    if (!resolved.ok) return reply.status(resolved.status).send({ error: { code: 'INVALID_TOKEN', message: resolved.message } });

    const { prisma } = await import('@zenadmin/db');
    const inv = await prisma.invoice.findFirst({
      where: { id, tenant_id: resolved.tenant_id, client_id: resolved.client_id, deleted_at: null },
    });
    if (!inv) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Facture introuvable' } });

    // Redirige vers facturx.pdf (sans auth — on est entre dans le portail)
    return reply.redirect(307, `/api/invoices/${id}/facturx.pdf?__portal=1`);
  });

  // GET /api/portal/client/:token/quote/:id/pdf
  app.get('/api/portal/client/:token/quote/:id/pdf', async (request, reply) => {
    const { token, id } = request.params as { token: string; id: string };
    const resolved = await resolveToken(token);
    if (!resolved.ok) return reply.status(resolved.status).send({ error: { code: 'INVALID_TOKEN', message: resolved.message } });

    const { prisma } = await import('@zenadmin/db');
    const q = await prisma.quote.findFirst({
      where: { id, tenant_id: resolved.tenant_id, client_id: resolved.client_id, deleted_at: null },
      include: { lines: true },
    });
    if (!q) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Devis introuvable' } });

    const { generateQuotePdfBinary } = await import('../quote/quote-pdf-binary.js');
    const tenant = await prisma.tenant.findUnique({ where: { id: resolved.tenant_id } });
    const pdf = await generateQuotePdfBinary(q as unknown as Parameters<typeof generateQuotePdfBinary>[0], tenant as unknown as Parameters<typeof generateQuotePdfBinary>[1]);
    return reply
      .type('application/pdf')
      .header('content-disposition', `attachment; filename="${q.number}.pdf"`)
      .send(pdf);
  });

  // POST /api/portal/client/:token/invoice/:id/pay — demande un Stripe checkout
  app.post('/api/portal/client/:token/invoice/:id/pay', async (request, reply) => {
    const { token, id } = request.params as { token: string; id: string };
    const resolved = await resolveToken(token);
    if (!resolved.ok) return reply.status(resolved.status).send({ error: { code: 'INVALID_TOKEN', message: resolved.message } });

    const stripeKey = process.env['STRIPE_SECRET_KEY'];
    if (!stripeKey) {
      return reply.status(503).send({ error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Paiement en ligne indisponible.' } });
    }

    const { prisma } = await import('@zenadmin/db');
    const inv = await prisma.invoice.findFirst({
      where: { id, tenant_id: resolved.tenant_id, client_id: resolved.client_id, deleted_at: null },
    });
    if (!inv) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Facture introuvable' } });
    if (inv.remaining_cents <= 0) {
      return reply.status(400).send({ error: { code: 'ALREADY_PAID', message: 'Facture déjà réglée.' } });
    }

    const { createStripeClient } = await import('../payment/stripe/stripe-client.js');
    const { createCheckoutService } = await import('../payment/stripe/checkout.service.js');
    const stripeClient = createStripeClient({
      secret_key: stripeKey,
      webhook_secret: process.env['STRIPE_WEBHOOK_SECRET'] ?? '',
      connect_client_id: process.env['STRIPE_CONNECT_CLIENT_ID'] ?? '',
    });
    const tenant = await prisma.tenant.findUnique({ where: { id: resolved.tenant_id }, select: { settings: true } });
    const tenantSettings = (tenant?.settings ?? {}) as Record<string, string | undefined>;

    const svc = createCheckoutService(stripeClient, process.env['APP_BASE_URL'] ?? 'https://omni-gerant.vercel.app');
    const r = await svc.createPaymentLink({
      invoice_id: inv.id,
      invoice_number: inv.number,
      amount_cents: inv.remaining_cents,
      currency: 'eur',
      tenant_stripe_account_id: tenantSettings['stripe_account_id'],
    });
    if (!r.ok) return reply.status(502).send({ error: r.error });
    return r.value;
  });
}
