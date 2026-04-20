import { createHmac, randomBytes } from 'node:crypto';

// Vague I3 : Webhooks sortants — outbox pattern
// Evenement -> insertion WebhookDelivery -> cron delivrance async -> retry exp backoff.

export type WebhookEventType =
  | 'invoice.created' | 'invoice.finalized' | 'invoice.paid' | 'invoice.overdue'
  | 'quote.created' | 'quote.sent' | 'quote.viewed' | 'quote.accepted' | 'quote.signed' | 'quote.invoiced'
  | 'client.created' | 'client.updated'
  | 'payment.received'
  | 'purchase.created';

export interface WebhookEventPayload {
  id: string;                // delivery id
  event_type: WebhookEventType;
  created_at: string;
  tenant_id: string;
  data: Record<string, unknown>;
}

export function signPayload(secret: string, payload: string, timestamp: number): string {
  const signed = `${timestamp}.${payload}`;
  return createHmac('sha256', secret).update(signed).digest('hex');
}

export function generateWebhookSecret(): string {
  return 'whsec_' + randomBytes(24).toString('hex');
}

/**
 * Emet un event metier : insere une WebhookDelivery par endpoint interesse.
 * Non-bloquant : les erreurs sont ignorees (best-effort).
 */
export async function emitWebhookEvent(
  tenantId: string,
  eventType: WebhookEventType,
  data: Record<string, unknown>,
): Promise<void> {
  if (!process.env['DATABASE_URL']) return;
  try {
    const { prisma } = await import('@zenadmin/db');
    const p = prisma as unknown as {
      webhookEndpoint?: { findMany?: Function };
      webhookDelivery?: { create?: Function };
    };
    const endpoints = await p.webhookEndpoint?.findMany?.({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        is_active: true,
      },
    }) ?? [];

    for (const ep of endpoints as Array<{ id: string; events: string[] }>) {
      const subscribes = ep.events.includes('*') || ep.events.includes(eventType);
      if (!subscribes) continue;
      try {
        await p.webhookDelivery?.create?.({
          data: {
            tenant_id: tenantId,
            endpoint_id: ep.id,
            event_type: eventType,
            payload: data as Record<string, unknown>,
            status: 'pending',
            next_retry_at: new Date(),
          },
        });
      } catch { /* noop */ }
    }
  } catch { /* noop */ }
}

/**
 * Traite les deliveries en attente. Appele par le cron.
 */
export async function processPendingDeliveries(maxBatch = 50): Promise<{ delivered: number; failed: number; dropped: number }> {
  if (!process.env['DATABASE_URL']) return { delivered: 0, failed: 0, dropped: 0 };
  const { prisma } = await import('@zenadmin/db');
  const p = prisma as unknown as {
    webhookDelivery?: { findMany?: Function; update?: Function };
    webhookEndpoint?: { findUnique?: Function };
  };

  const now = new Date();
  const pending = await p.webhookDelivery?.findMany?.({
    where: {
      status: 'pending',
      next_retry_at: { lte: now },
    },
    orderBy: { created_at: 'asc' },
    take: maxBatch,
  }) ?? [];

  let delivered = 0;
  let failed = 0;
  let dropped = 0;

  for (const delivery of pending as Array<{ id: string; endpoint_id: string; event_type: string; payload: Record<string, unknown>; attempt_count: number; tenant_id: string }>) {
    const endpoint = await p.webhookEndpoint?.findUnique?.({
      where: { id: delivery.endpoint_id },
    }) as { url: string; secret: string; is_active: boolean; deleted_at: Date | null } | null;

    if (!endpoint || !endpoint.is_active || endpoint.deleted_at) {
      await p.webhookDelivery?.update?.({
        where: { id: delivery.id },
        data: { status: 'dropped', last_error: 'endpoint inactive' },
      });
      dropped++;
      continue;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const payloadStr = JSON.stringify({
      id: delivery.id,
      event_type: delivery.event_type as WebhookEventType,
      created_at: new Date().toISOString(),
      tenant_id: delivery.tenant_id,
      data: delivery.payload,
    } as WebhookEventPayload);
    const signature = signPayload(endpoint.secret, payloadStr, timestamp);

    try {
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zenadmin-Event': delivery.event_type,
          'X-Zenadmin-Signature': `t=${timestamp},v1=${signature}`,
          'X-Zenadmin-Delivery-Id': delivery.id,
          'User-Agent': 'zenAdmin-Webhook/1.0',
        },
        body: payloadStr,
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        await p.webhookDelivery?.update?.({
          where: { id: delivery.id },
          data: {
            status: 'delivered',
            last_status_code: res.status,
            delivered_at: new Date(),
            attempt_count: { increment: 1 },
          },
        });
        delivered++;
      } else {
        const text = await res.text().catch(() => '');
        await handleFailure(p, delivery, res.status, text.slice(0, 500));
        failed++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      await handleFailure(p, delivery, 0, msg);
      failed++;
    }
  }

  return { delivered, failed, dropped };
}

async function handleFailure(
  p: { webhookDelivery?: { update?: Function } },
  delivery: { id: string; attempt_count: number },
  status: number,
  error: string,
): Promise<void> {
  const nextAttempt = delivery.attempt_count + 1;
  // Exp backoff : 30s, 2min, 10min, 1h, 6h, 24h
  const delays = [30, 120, 600, 3600, 21600, 86400];
  const delaySec = delays[Math.min(nextAttempt - 1, delays.length - 1)]!;
  const giveUp = nextAttempt >= delays.length + 1;

  await p.webhookDelivery?.update?.({
    where: { id: delivery.id },
    data: {
      status: giveUp ? 'failed' : 'pending',
      last_status_code: status || null,
      last_error: error,
      attempt_count: { increment: 1 },
      next_retry_at: giveUp ? null : new Date(Date.now() + delaySec * 1000),
    },
  });
}
