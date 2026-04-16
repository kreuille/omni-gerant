import type { FastifyInstance } from 'fastify';
import { createBankService } from './bank.service.js';
import { createPrismaBankAccountRepository, createPrismaBankTransactionRepository } from './bank.repository.js';
import { createSyncService } from './sync.service.js';
import { createBridgeClient, type BridgeClient } from './bridge-client.js';
import {
  connectBankSchema,
  bankAccountListQuerySchema,
  transactionListQuerySchema,
  webhookPayloadSchema,
} from './bank.schemas.js';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// BUSINESS RULE [CDC-2.3]: Endpoints module bancaire

export async function bankRoutes(app: FastifyInstance) {
  const accountRepo = createPrismaBankAccountRepository();
  const transactionRepo = createPrismaBankTransactionRepository();
  const bankService = createBankService(accountRepo, transactionRepo);

  // Bridge client (configured from env)
  const bridgeClient = createBridgeClient({
    clientId: process.env['BRIDGE_CLIENT_ID'] || '',
    clientSecret: process.env['BRIDGE_CLIENT_SECRET'] || '',
    baseUrl: process.env['BRIDGE_API_URL'] || 'https://api.bridgeapi.io',
    webhookSecret: process.env['BRIDGE_WEBHOOK_SECRET'],
  });

  const syncService = createSyncService(bridgeClient, accountRepo, transactionRepo);

  const preHandlers = [authenticate, injectTenant];

  // POST /api/bank/connect — Initiate bank connection
  app.post(
    '/api/bank/connect',
    { preHandler: [...preHandlers, requirePermission('bank', 'create')] },
    async (request, reply) => {
      const parsed = connectBankSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await bridgeClient.getConnectUrl(
        request.auth.user_id,
        parsed.data.callback_url,
      );
      if (!result.ok) return reply.status(502).send({ error: result.error });
      return result.value;
    },
  );

  // POST /api/bank/callback — After user connects bank, import accounts
  app.post(
    '/api/bank/callback',
    { preHandler: [...preHandlers, requirePermission('bank', 'create')] },
    async (request, reply) => {
      const result = await syncService.importAccounts(
        request.auth.tenant_id,
        request.auth.user_id,
      );
      if (!result.ok) return reply.status(502).send({ error: result.error });
      return reply.status(201).send(result.value);
    },
  );

  // GET /api/bank/accounts
  app.get(
    '/api/bank/accounts',
    { preHandler: [...preHandlers, requirePermission('bank', 'read')] },
    async (request, reply) => {
      const parsed = bankAccountListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: { issues: parsed.error.issues } },
        });
      }
      const result = await bankService.listAccounts(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // GET /api/bank/accounts/:id
  app.get(
    '/api/bank/accounts/:id',
    { preHandler: [...preHandlers, requirePermission('bank', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await bankService.getAccount(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // POST /api/bank/accounts/:id/sync — Manual sync trigger
  app.post(
    '/api/bank/accounts/:id/sync',
    { preHandler: [...preHandlers, requirePermission('bank', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const accountResult = await bankService.getAccount(id, request.auth.tenant_id);
      if (!accountResult.ok) return reply.status(404).send({ error: accountResult.error });

      const result = await syncService.syncAccount(
        request.auth.tenant_id,
        accountResult.value,
        request.auth.user_id,
      );
      if (!result.ok) return reply.status(502).send({ error: result.error });
      return result.value;
    },
  );

  // POST /api/bank/accounts/:id/disconnect
  app.post(
    '/api/bank/accounts/:id/disconnect',
    { preHandler: [...preHandlers, requirePermission('bank', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await bankService.disconnectAccount(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // DELETE /api/bank/accounts/:id
  app.delete(
    '/api/bank/accounts/:id',
    { preHandler: [...preHandlers, requirePermission('bank', 'delete')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await bankService.deleteAccount(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return reply.status(204).send();
    },
  );

  // GET /api/bank/transactions
  app.get(
    '/api/bank/transactions',
    { preHandler: [...preHandlers, requirePermission('bank', 'read')] },
    async (request, reply) => {
      const parsed = transactionListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: { issues: parsed.error.issues } },
        });
      }
      const result = await bankService.listTransactions(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // GET /api/bank/transactions/:id
  app.get(
    '/api/bank/transactions/:id',
    { preHandler: [...preHandlers, requirePermission('bank', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await bankService.getTransaction(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // POST /api/bank/webhook — Bridge webhook endpoint
  app.post('/api/bank/webhook', async (request, reply) => {
    const signature = (request.headers['bridge-signature'] as string) || '';
    const rawBody = JSON.stringify(request.body);

    const parsed = webhookPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid webhook payload' } });
    }

    const result = await syncService.handleWebhook(rawBody, signature);
    if (!result.ok) {
      return reply.status(result.error.code === 'UNAUTHORIZED' ? 401 : 500).send({ error: result.error });
    }

    return reply.status(200).send({ received: true });
  });

  // POST /api/bank/sync-all — Sync all accounts (called by job)
  app.post(
    '/api/bank/sync-all',
    { preHandler: [...preHandlers, requirePermission('bank', 'update')] },
    async (request, reply) => {
      const result = await syncService.syncAllAccounts(
        request.auth.tenant_id,
        request.auth.user_id,
      );
      if (!result.ok) return reply.status(502).send({ error: result.error });
      return result.value;
    },
  );
}
