// BUSINESS RULE [CDC-7 / S4]: Service abonnement Stripe

import { prisma } from '@zenadmin/db';
import type { Result, AppError } from '@zenadmin/shared';
import { ok, err, notFound, validationError } from '@zenadmin/shared';
import { PLANS, type PlanCode, getPlan } from './plans.js';

const STRIPE_API = 'https://api.stripe.com/v1';

function stripeHeaders(): Record<string, string> {
  const key = process.env['STRIPE_SECRET_KEY'];
  if (!key) throw new Error('STRIPE_SECRET_KEY non configure');
  return {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
}

function toFormData(data: Record<string, string | number | boolean | undefined>): string {
  return Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

/**
 * Recupere l'abonnement en DB (cree un trial si aucun).
 */
export async function getOrCreateSubscription(tenantId: string): Promise<{
  id: string; tenantId: string; planCode: PlanCode; status: string;
  trialEndsAt: Date | null; currentPeriodEnd: Date | null;
  maxUsers: number; maxInvoicesPerMonth: number; maxEmployees: number;
  features: Record<string, unknown>;
}> {
  let sub = await prisma.tenantSubscription.findUnique({ where: { tenant_id: tenantId } });
  if (!sub) {
    const trial = PLANS.trial;
    sub = await prisma.tenantSubscription.create({
      data: {
        tenant_id: tenantId,
        plan_code: 'trial',
        status: 'trialing',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 3600 * 1000),
        max_users: trial.maxUsers,
        max_invoices_per_month: trial.maxInvoicesPerMonth,
        max_employees: trial.maxEmployees,
        features: trial.features as unknown as import('@zenadmin/db').Prisma.InputJsonValue,
      },
    });
  }
  return {
    id: sub.id,
    tenantId: sub.tenant_id,
    planCode: sub.plan_code as PlanCode,
    status: sub.status,
    trialEndsAt: sub.trial_ends_at,
    currentPeriodEnd: sub.current_period_end,
    maxUsers: sub.max_users,
    maxInvoicesPerMonth: sub.max_invoices_per_month,
    maxEmployees: sub.max_employees,
    features: sub.features as Record<string, unknown>,
  };
}

/**
 * Cree une session Stripe Checkout pour souscrire / upgrader.
 */
export async function createCheckoutSession(tenantId: string, planCode: PlanCode, billingCycle: 'monthly' | 'yearly' = 'monthly'): Promise<Result<{ sessionId: string; url: string }, AppError>> {
  const plan = getPlan(planCode);
  if (!plan) return err(validationError('Plan invalide'));
  if (planCode === 'trial') return err(validationError('Impossible de souscrire a un trial'));

  const priceId = billingCycle === 'yearly' ? plan.stripeYearlyPriceId : plan.stripeMonthlyPriceId;
  if (!priceId) return err(validationError(`Plan ${planCode} ${billingCycle} non configure (STRIPE_PRICE_* manquant)`));

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return err(notFound('Tenant', tenantId));

  const sub = await getOrCreateSubscription(tenantId);
  const baseUrl = process.env['APP_URL'] ?? 'https://omni-gerant.vercel.app';

  const form: Record<string, string | number | boolean | undefined> = {
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': 1,
    success_url: `${baseUrl}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/settings/billing?canceled=true`,
    'subscription_data[metadata][tenant_id]': tenantId,
    'subscription_data[metadata][plan_code]': planCode,
    'metadata[tenant_id]': tenantId,
    client_reference_id: tenantId,
    allow_promotion_codes: true,
    'automatic_tax[enabled]': 'true',
  };
  // Reutiliser customer si existe
  if (sub.id && (await prisma.tenantSubscription.findUnique({ where: { id: sub.id } }))?.stripe_customer_id) {
    const existing = await prisma.tenantSubscription.findUnique({ where: { id: sub.id } });
    if (existing?.stripe_customer_id) form.customer = existing.stripe_customer_id;
  } else {
    form.customer_email = tenant.siret ? undefined : undefined;
  }

  try {
    const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: 'POST',
      headers: stripeHeaders(),
      body: toFormData(form),
    });
    const body = await res.json() as { id?: string; url?: string; error?: { message?: string } };
    if (!res.ok || !body.id) {
      return err(validationError('Stripe error : ' + (body.error?.message ?? 'inconnu')));
    }
    return ok({ sessionId: body.id, url: body.url ?? '' });
  } catch (e) {
    return err(validationError('Erreur Stripe : ' + String((e as Error).message)));
  }
}

/**
 * Portal Stripe Billing (self-service customer portal).
 */
export async function createBillingPortalSession(tenantId: string): Promise<Result<{ url: string }, AppError>> {
  const sub = await prisma.tenantSubscription.findUnique({ where: { tenant_id: tenantId } });
  if (!sub?.stripe_customer_id) return err(validationError('Pas de compte client Stripe associe. Souscrivez d\'abord un plan.'));
  const baseUrl = process.env['APP_URL'] ?? 'https://omni-gerant.vercel.app';

  try {
    const res = await fetch(`${STRIPE_API}/billing_portal/sessions`, {
      method: 'POST',
      headers: stripeHeaders(),
      body: toFormData({
        customer: sub.stripe_customer_id,
        return_url: `${baseUrl}/settings/billing`,
      }),
    });
    const body = await res.json() as { url?: string; error?: { message?: string } };
    if (!res.ok || !body.url) return err(validationError('Stripe portal error : ' + (body.error?.message ?? 'inconnu')));
    return ok({ url: body.url });
  } catch (e) {
    return err(validationError('Erreur Stripe portal : ' + String((e as Error).message)));
  }
}

/**
 * Webhook handler : met a jour l'abonnement local depuis Stripe.
 * A connecter a POST /api/billing/webhook avec verification signature.
 */
export async function handleStripeSubscriptionEvent(event: {
  type: string;
  data: { object: Record<string, unknown> };
}): Promise<Result<void, AppError>> {
  const obj = event.data.object as Record<string, unknown>;

  switch (event.type) {
    case 'checkout.session.completed': {
      const tenantId = (obj['client_reference_id'] as string | undefined) ?? (obj['metadata'] as { tenant_id?: string } | undefined)?.tenant_id;
      if (!tenantId) return ok(undefined);
      const stripeCustomerId = obj['customer'] as string | undefined;
      const stripeSubId = obj['subscription'] as string | undefined;
      if (!stripeCustomerId || !stripeSubId) return ok(undefined);
      // Pull full subscription pour status
      const subRes = await fetch(`${STRIPE_API}/subscriptions/${stripeSubId}`, { headers: { Authorization: `Bearer ${process.env['STRIPE_SECRET_KEY']}` } });
      const subObj = await subRes.json() as { status?: string; current_period_start?: number; current_period_end?: number; metadata?: { plan_code?: string } };
      const planCode = (subObj.metadata?.plan_code ?? 'starter') as PlanCode;
      const plan = getPlan(planCode) ?? PLANS.starter;
      await prisma.tenantSubscription.upsert({
        where: { tenant_id: tenantId },
        create: {
          tenant_id: tenantId,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubId,
          plan_code: planCode,
          status: subObj.status ?? 'active',
          current_period_start: subObj.current_period_start ? new Date(subObj.current_period_start * 1000) : null,
          current_period_end: subObj.current_period_end ? new Date(subObj.current_period_end * 1000) : null,
          max_users: plan.maxUsers,
          max_invoices_per_month: plan.maxInvoicesPerMonth,
          max_employees: plan.maxEmployees,
          features: plan.features as unknown as import('@zenadmin/db').Prisma.InputJsonValue,
        },
        update: {
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubId,
          plan_code: planCode,
          status: subObj.status ?? 'active',
          current_period_start: subObj.current_period_start ? new Date(subObj.current_period_start * 1000) : null,
          current_period_end: subObj.current_period_end ? new Date(subObj.current_period_end * 1000) : null,
          max_users: plan.maxUsers,
          max_invoices_per_month: plan.maxInvoicesPerMonth,
          max_employees: plan.maxEmployees,
          features: plan.features as unknown as import('@zenadmin/db').Prisma.InputJsonValue,
          canceled_at: null,
          cancel_at_period_end: false,
        },
      });
      // Update Tenant.plan en miroir
      await prisma.tenant.update({ where: { id: tenantId }, data: { plan: planCode } });
      return ok(undefined);
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const stripeSubId = obj['id'] as string;
      const status = obj['status'] as string;
      const cancelAtPeriodEnd = obj['cancel_at_period_end'] as boolean;
      const currentPeriodEnd = obj['current_period_end'] as number | undefined;
      await prisma.tenantSubscription.updateMany({
        where: { stripe_subscription_id: stripeSubId },
        data: {
          status,
          cancel_at_period_end: cancelAtPeriodEnd ?? false,
          canceled_at: status === 'canceled' ? new Date() : null,
          current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
        },
      });
      return ok(undefined);
    }
    case 'invoice.payment_failed': {
      const stripeSubId = obj['subscription'] as string;
      await prisma.tenantSubscription.updateMany({
        where: { stripe_subscription_id: stripeSubId },
        data: { status: 'past_due' },
      });
      return ok(undefined);
    }
    default:
      return ok(undefined);
  }
}
