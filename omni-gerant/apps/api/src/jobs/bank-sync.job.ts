// BUSINESS RULE [CDC-2.3 / Vague B] : Synchronisation bancaire quotidienne
// Utilise le registry jobs (Vague A2). Ne depend pas de BullMQ.

import type { JobDefinition } from './registry.js';

export const bankSyncJob: JobDefinition = {
  name: 'bank-sync',
  description: 'Synchronise les comptes bancaires et transactions de tous les tenants via Bridge API',
  minIntervalMs: 23 * 60 * 60 * 1000, // 1x/jour
  allowedHoursUtc: [5, 6, 7], // tot le matin UTC
  async run() {
    if (!process.env['BRIDGE_CLIENT_ID'] || !process.env['BRIDGE_CLIENT_SECRET']) {
      return { ok: false, error: 'Bridge API non configuree (BRIDGE_CLIENT_ID/SECRET manquants)' };
    }
    try {
      const { prisma } = await import('@zenadmin/db');
      const { createBridgeClient } = await import('../modules/bank/bridge-client.js');
      const { createPrismaBankAccountRepository, createPrismaBankTransactionRepository } = await import('../modules/bank/bank.repository.js');
      const { createSyncService } = await import('../modules/bank/sync.service.js');

      const bridgeClient = createBridgeClient({
        clientId: process.env['BRIDGE_CLIENT_ID']!,
        clientSecret: process.env['BRIDGE_CLIENT_SECRET']!,
        baseUrl: process.env['BRIDGE_API_URL'] || 'https://api.bridgeapi.io',
        webhookSecret: process.env['BRIDGE_WEBHOOK_SECRET'],
      });
      const accountRepo = createPrismaBankAccountRepository();
      const transactionRepo = createPrismaBankTransactionRepository();
      const syncService = createSyncService(bridgeClient, accountRepo, transactionRepo);

      // Liste les tenants ayant au moins 1 compte bancaire actif
      const tenantsWithAccounts = await (prisma as unknown as { bankAccount?: { findMany?: Function } })
        .bankAccount?.findMany?.({
          where: { deleted_at: null },
          select: { tenant_id: true },
          distinct: ['tenant_id'],
        }) ?? [];

      let synced = 0;
      for (const { tenant_id } of tenantsWithAccounts as Array<{ tenant_id: string }>) {
        // user_uuid = premier owner du tenant (le user qui a initie la connexion)
        const owner = await prisma.user.findFirst({
          where: { tenant_id, role: 'owner', deleted_at: null },
          select: { id: true },
        });
        if (!owner) continue;
        const r = await syncService.syncAllAccounts(tenant_id, owner.id);
        if (r.ok) synced++;
      }

      return { ok: true, affected: synced };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};

// Pour compat BullMQ si utilise ailleurs
export const BANK_SYNC_QUEUE_NAME = 'bank-sync';
