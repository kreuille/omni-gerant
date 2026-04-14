import type { FastifyInstance } from 'fastify';
import { createAccountingService, type AccountingDataSource } from './accounting.service.js';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// BUSINESS RULE [CDC-3.2]: Routes export comptable

export async function accountingRoutes(app: FastifyInstance) {
  // Placeholder data source
  const dataSource: AccountingDataSource = {
    async getSaleInvoices() { return []; },
    async getPurchaseInvoices() { return []; },
    async getPayments() { return []; },
    async getTenantSiret() { return '00000000000000'; },
  };

  const accountingService = createAccountingService(dataSource);
  const preHandlers = [authenticate, injectTenant];

  // GET /api/accounting/fec — Export FEC
  app.get(
    '/api/accounting/fec',
    { preHandler: [...preHandlers, requirePermission('accounting', 'read')] },
    async (request, reply) => {
      const { from, to } = request.query as { from?: string; to?: string };
      if (!from || !to) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'from and to query params are required (YYYY-MM-DD)' },
        });
      }

      const fromDate = new Date(from);
      const toDate = new Date(to);

      const result = await accountingService.generateFec(request.auth.tenant_id, fromDate, toDate);
      if (!result.ok) return reply.status(500).send({ error: result.error });

      return reply
        .type('text/tab-separated-values')
        .header('Content-Disposition', `attachment; filename="${result.value.filename}"`)
        .send(result.value.content);
    },
  );

  // GET /api/accounting/fec/validate — Validate FEC
  app.get(
    '/api/accounting/fec/validate',
    { preHandler: [...preHandlers, requirePermission('accounting', 'read')] },
    async (request, reply) => {
      const { from, to } = request.query as { from?: string; to?: string };
      if (!from || !to) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'from and to query params are required (YYYY-MM-DD)' },
        });
      }

      const fromDate = new Date(from);
      const toDate = new Date(to);

      const result = await accountingService.validateFec(request.auth.tenant_id, fromDate, toDate);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );
}
