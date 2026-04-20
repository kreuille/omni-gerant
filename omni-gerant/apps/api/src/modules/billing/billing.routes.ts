import type { FastifyInstance } from 'fastify';
import { createHmac, timingSafeEqual } from 'crypto';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';
import { PLANS } from './plans.js';
import { getOrCreateSubscription, createCheckoutSession, createBillingPortalSession, handleStripeSubscriptionEvent } from './subscription.service.js';
import { createInvitation, listInvitations, revokeInvitation, listTenantUsers, changeUserRole, removeUser } from '../auth/invitation.service.js';

export async function billingRoutes(app: FastifyInstance) {
  // S3 — OAuth Google public endpoints
  app.get('/api/auth/oauth/google/url', async (request, reply) => {
    const { getGoogleAuthUrl } = await import('../auth/oauth-google.service.js');
    const { state, redirect } = request.query as { state?: string; redirect?: string };
    const baseUrl = process.env['APP_URL'] ?? 'https://omni-gerant.vercel.app';
    const redirectUri = redirect ?? `${baseUrl}/auth/google/callback`;
    const url = getGoogleAuthUrl(state ?? 'zenadmin', redirectUri);
    if (!url) return reply.status(501).send({ error: { code: 'NOT_CONFIGURED', message: 'Google OAuth non configuré (GOOGLE_OAUTH_CLIENT_ID manquant)' } });
    return { url };
  });

  app.post('/api/auth/oauth/google/callback', async (request, reply) => {
    const body = request.body as { code?: string; redirectUri?: string };
    if (!body?.code) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'code requis' } });
    const { handleGoogleCallback } = await import('../auth/oauth-google.service.js');
    const baseUrl = process.env['APP_URL'] ?? 'https://omni-gerant.vercel.app';
    const redirectUri = body.redirectUri ?? `${baseUrl}/auth/google/callback`;
    const r = await handleGoogleCallback(body.code, redirectUri);
    if (!r.ok) return reply.status(400).send({ error: r.error });

    // Generer tokens JWT zenAdmin
    const { generateAccessToken, generateRefreshToken } = await import('../auth/jwt.js');
    const { prisma } = await import('@zenadmin/db');
    const user = await prisma.user.findUnique({ where: { id: r.value.userId } });
    if (!user) return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'User non trouve apres OAuth' } });
    const accessToken = generateAccessToken({ user_id: user.id, tenant_id: user.tenant_id, role: user.role });
    const refreshToken = generateRefreshToken();
    // Persist refresh token
    const { createHash } = await import('crypto');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshToken.create({
      data: { user_id: user.id, token_hash: tokenHash, expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000) },
    });
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role, tenantId: user.tenant_id },
      isNewUser: r.value.isNewUser,
    };
  });

  const preHandlers = [authenticate, injectTenant];

  // GET /api/billing/plans — public : liste des plans
  app.get('/api/billing/plans', async () => ({ plans: Object.values(PLANS) }));

  // GET /api/billing/subscription — abonnement courant
  app.get('/api/billing/subscription', { preHandler: preHandlers }, async (request) => {
    return await getOrCreateSubscription(request.auth.tenant_id);
  });

  // POST /api/billing/checkout — cree session Stripe Checkout
  app.post(
    '/api/billing/checkout',
    { preHandler: [...preHandlers, requirePermission('billing', 'create')] },
    async (request, reply) => {
      const body = request.body as { planCode?: string; billingCycle?: 'monthly' | 'yearly' };
      if (!body?.planCode) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'planCode requis' } });
      const r = await createCheckoutSession(request.auth.tenant_id, body.planCode as 'starter' | 'pro' | 'business', body.billingCycle ?? 'monthly');
      if (!r.ok) return reply.status(400).send({ error: r.error });
      return r.value;
    },
  );

  // POST /api/billing/portal — customer portal Stripe
  app.post(
    '/api/billing/portal',
    { preHandler: [...preHandlers, requirePermission('billing', 'update')] },
    async (request, reply) => {
      const r = await createBillingPortalSession(request.auth.tenant_id);
      if (!r.ok) return reply.status(400).send({ error: r.error });
      return r.value;
    },
  );

  // POST /api/billing/webhook — Stripe webhook (public, signature verification)
  app.post('/api/billing/webhook', async (request, reply) => {
    const signature = request.headers['stripe-signature'] as string | undefined;
    const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];
    if (!signature || !webhookSecret) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Signature manquante' } });
    }

    // Body raw : fastify donne JSON parse par defaut, besoin du raw
    const raw = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);

    // Verifier signature Stripe (format "t=timestamp,v1=sig")
    const parts = signature.split(',').reduce((acc: Record<string, string>, p) => {
      const [k, v] = p.split('=');
      if (k && v) acc[k] = v;
      return acc;
    }, {});
    const ts = parts['t'];
    const sig = parts['v1'];
    if (!ts || !sig) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Signature invalide' } });

    const payload = `${ts}.${raw}`;
    const expected = createHmac('sha256', webhookSecret).update(payload).digest('hex');
    try {
      if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Signature invalide' } });
      }
    } catch {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Signature invalide' } });
    }

    const event = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const r = await handleStripeSubscriptionEvent(event as { type: string; data: { object: Record<string, unknown> } });
    if (!r.ok) return reply.status(500).send({ error: r.error });
    return { received: true };
  });

  // ── S2 : Multi-user ───────────────────────────────────────────

  // GET /api/users — liste users du tenant
  app.get('/api/users', { preHandler: [...preHandlers, requirePermission('user', 'read')] }, async (request) => {
    const items = await listTenantUsers(request.auth.tenant_id);
    return { items, total: items.length };
  });

  // POST /api/users/invite — creer invitation
  app.post(
    '/api/users/invite',
    { preHandler: [...preHandlers, requirePermission('user', 'create')] },
    async (request, reply) => {
      const body = request.body as { email?: string; role?: string };
      if (!body?.email || !body?.role) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'email + role requis' } });
      const r = await createInvitation({
        tenantId: request.auth.tenant_id,
        email: body.email,
        role: body.role,
        invitedByUserId: request.auth.user_id,
      });
      if (!r.ok) return reply.status(r.error.code === 'CONFLICT' ? 409 : 400).send({ error: r.error });
      return r.value;
    },
  );

  // GET /api/users/invitations
  app.get('/api/users/invitations', { preHandler: [...preHandlers, requirePermission('user', 'read')] }, async (request) => {
    const items = await listInvitations(request.auth.tenant_id);
    return { items, total: items.length };
  });

  // DELETE /api/users/invitations/:id
  app.delete(
    '/api/users/invitations/:id',
    { preHandler: [...preHandlers, requirePermission('user', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const r = await revokeInvitation(request.auth.tenant_id, id);
      if (!r.ok) return reply.status(404).send({ error: r.error });
      return { revoked: true };
    },
  );

  // PATCH /api/users/:id/role — changer role
  app.patch(
    '/api/users/:id/role',
    { preHandler: [...preHandlers, requirePermission('user', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { role?: string };
      if (!body?.role) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'role requis' } });
      const r = await changeUserRole(request.auth.tenant_id, id, body.role, request.auth.user_id);
      if (!r.ok) return reply.status(400).send({ error: r.error });
      return { updated: true };
    },
  );

  // DELETE /api/users/:id — soft-delete + revoke tokens
  app.delete(
    '/api/users/:id',
    { preHandler: [...preHandlers, requirePermission('user', 'delete')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const r = await removeUser(request.auth.tenant_id, id, request.auth.user_id);
      if (!r.ok) return reply.status(400).send({ error: r.error });
      return { removed: true };
    },
  );

  // POST /api/users/accept-invite — accepter invitation (public)
  app.post('/api/users/accept-invite', async (request, reply) => {
    const body = request.body as { token?: string; firstName?: string; lastName?: string; password?: string };
    if (!body?.token) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'token requis' } });
    const { acceptInvitation } = await import('../auth/invitation.service.js');
    const r = await acceptInvitation({
      token: body.token,
      firstName: body.firstName,
      lastName: body.lastName,
      password: body.password,
    });
    if (!r.ok) return reply.status(400).send({ error: r.error });
    return r.value;
  });

  // GET /api/users/invitation-info/:token — check info invitation (public)
  app.get('/api/users/invitation-info/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const { createHash } = await import('crypto');
    const { prisma } = await import('@zenadmin/db');
    const hash = createHash('sha256').update(token).digest('hex');
    const inv = await prisma.userInvitation.findUnique({ where: { token_hash: hash } });
    if (!inv) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Invitation introuvable' } });
    if (inv.accepted_at) return reply.status(400).send({ error: { code: 'ALREADY_ACCEPTED', message: 'Invitation déjà acceptée' } });
    if (inv.revoked_at) return reply.status(400).send({ error: { code: 'REVOKED', message: 'Invitation révoquée' } });
    if (inv.expires_at < new Date()) return reply.status(400).send({ error: { code: 'EXPIRED', message: 'Invitation expirée' } });
    const tenant = await prisma.tenant.findUnique({ where: { id: inv.tenant_id } });
    return { email: inv.email, role: inv.role, tenantName: tenant?.name ?? 'Organisation', expiresAt: inv.expires_at };
  });
}
