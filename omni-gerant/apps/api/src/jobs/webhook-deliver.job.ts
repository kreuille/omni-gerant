// Vague I3 : cron qui depile la file des webhook deliveries.

import type { JobDefinition } from './registry.js';

export const webhookDeliverJob: JobDefinition = {
  name: 'webhook-deliver',
  description: 'Traite la file des webhooks sortants (retry exp backoff)',
  minIntervalMs: 60 * 1000, // 1x/min
  async run() {
    try {
      const { processPendingDeliveries } = await import('../modules/webhooks/webhook.service.js');
      const { delivered, failed, dropped } = await processPendingDeliveries(100);
      return { ok: true, affected: delivered + failed + dropped };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};
