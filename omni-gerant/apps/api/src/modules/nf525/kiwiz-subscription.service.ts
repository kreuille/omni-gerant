// BUSINESS RULE [CDC-6]: Gestion souscriptions Kiwiz par tenant
// Mode revendeur : zenAdmin gere les souscriptions Kiwiz pour ses tenants.

import { ok, err, notFound, appError, conflict } from '@zenadmin/shared';
import type { Result, AppError } from '@zenadmin/shared';
import type { KiwizClient } from './kiwiz-client.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KiwizSubscription {
  subscription_id: string;
  plan_id: string;
  company_name: string;
  status: 'active' | 'cancelled' | 'suspended';
  created_at: Date;
}

// BUSINESS RULE [NF525-K5]: Repository pour stocker les souscriptions par tenant
export interface SubscriptionRepository {
  findByTenantId(tenantId: string): Promise<KiwizSubscription | null>;
  save(tenantId: string, subscription: KiwizSubscription): Promise<void>;
  update(tenantId: string, updates: Partial<KiwizSubscription>): Promise<void>;
  delete(tenantId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

export interface KiwizSubscriptionService {
  createSubscription(tenant: { id: string; name: string; siret?: string }): Promise<Result<{ subscriptionId: string }, AppError>>;
  getSubscription(tenantId: string): Promise<Result<KiwizSubscription, AppError>>;
  cancelSubscription(tenantId: string): Promise<Result<void, AppError>>;
  reactivateSubscription(tenantId: string): Promise<Result<void, AppError>>;
}

// ---------------------------------------------------------------------------
// In-memory repository (for now)
// ---------------------------------------------------------------------------

export function createInMemorySubscriptionRepository(): SubscriptionRepository {
  const store = new Map<string, KiwizSubscription>();

  return {
    async findByTenantId(tenantId: string) {
      return store.get(tenantId) ?? null;
    },
    async save(tenantId: string, subscription: KiwizSubscription) {
      store.set(tenantId, subscription);
    },
    async update(tenantId: string, updates: Partial<KiwizSubscription>) {
      const existing = store.get(tenantId);
      if (existing) {
        store.set(tenantId, { ...existing, ...updates });
      }
    },
    async delete(tenantId: string) {
      store.delete(tenantId);
    },
  };
}

// ---------------------------------------------------------------------------
// Kiwiz subscription client interface (subset of KiwizClient for subscriptions)
// ---------------------------------------------------------------------------

export interface KiwizSubscriptionClient {
  createSubscription(data: { company_name: string; siret?: string }): Promise<Result<{ subscription_id: string; plan_id: string }, AppError>>;
  cancelSubscription(subscriptionId: string): Promise<Result<void, AppError>>;
  reactivateSubscription(subscriptionId: string): Promise<Result<void, AppError>>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface KiwizSubscriptionDeps {
  subscriptionClient: KiwizSubscriptionClient;
  subscriptionRepo: SubscriptionRepository;
}

// BUSINESS RULE [NF525-K5]: Factory pour le service de souscription Kiwiz
export function createKiwizSubscriptionService(deps: KiwizSubscriptionDeps): KiwizSubscriptionService {
  const { subscriptionClient, subscriptionRepo } = deps;

  async function createSubscription(
    tenant: { id: string; name: string; siret?: string },
  ): Promise<Result<{ subscriptionId: string }, AppError>> {
    // Check if already subscribed
    const existing = await subscriptionRepo.findByTenantId(tenant.id);
    if (existing && existing.status === 'active') {
      return err(conflict(`Tenant ${tenant.id} already has an active Kiwiz subscription`));
    }

    // Call Kiwiz API
    const result = await subscriptionClient.createSubscription({
      company_name: tenant.name,
      siret: tenant.siret,
    });

    if (!result.ok) {
      return result as Result<never, AppError>;
    }

    // Store locally
    const subscription: KiwizSubscription = {
      subscription_id: result.value.subscription_id,
      plan_id: result.value.plan_id,
      company_name: tenant.name,
      status: 'active',
      created_at: new Date(),
    };

    await subscriptionRepo.save(tenant.id, subscription);

    return ok({ subscriptionId: result.value.subscription_id });
  }

  async function getSubscription(tenantId: string): Promise<Result<KiwizSubscription, AppError>> {
    const subscription = await subscriptionRepo.findByTenantId(tenantId);
    if (!subscription) {
      return err(notFound('KiwizSubscription', tenantId));
    }
    return ok(subscription);
  }

  async function cancelSubscription(tenantId: string): Promise<Result<void, AppError>> {
    const subscription = await subscriptionRepo.findByTenantId(tenantId);
    if (!subscription) {
      return err(notFound('KiwizSubscription', tenantId));
    }

    const result = await subscriptionClient.cancelSubscription(subscription.subscription_id);
    if (!result.ok) {
      return result;
    }

    await subscriptionRepo.update(tenantId, { status: 'cancelled' });
    return ok(undefined);
  }

  async function reactivateSubscription(tenantId: string): Promise<Result<void, AppError>> {
    const subscription = await subscriptionRepo.findByTenantId(tenantId);
    if (!subscription) {
      return err(notFound('KiwizSubscription', tenantId));
    }

    // BUSINESS RULE [NF525-K5]: Cannot reactivate an already active subscription
    if (subscription.status === 'active') {
      return err(conflict('Subscription is already active'));
    }

    const result = await subscriptionClient.reactivateSubscription(subscription.subscription_id);
    if (!result.ok) {
      return result;
    }

    await subscriptionRepo.update(tenantId, { status: 'active' });
    return ok(undefined);
  }

  return {
    createSubscription,
    getSubscription,
    cancelSubscription,
    reactivateSubscription,
  };
}
