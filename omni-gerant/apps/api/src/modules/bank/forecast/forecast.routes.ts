import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { calculateForecast } from './forecast.service.js';
import { detectRecurringCharges } from './recurrence-detector.js';
import type { DueDocument } from './forecast.service.js';
import type { HistoricalTransaction } from './recurrence-detector.js';
import { authenticate, requirePermission } from '../../../plugins/auth.js';
import { injectTenant } from '../../../plugins/tenant.js';

// BUSINESS RULE [CDC-2.3]: Routes previsionnel de tresorerie

const forecastQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).default(90),
});

export async function forecastRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // GET /api/bank/forecast
  app.get(
    '/api/bank/forecast',
    { preHandler: [...preHandlers, requirePermission('bank', 'read')] },
    async (request, reply) => {
      const parsed = forecastQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: { issues: parsed.error.issues } },
        });
      }

      // TODO: In production, fetch real data from repos
      // For now, return demo forecast
      const currentBalance = 1542300; // 15,423.00 EUR
      const dueInvoices: DueDocument[] = [];
      const duePurchases: DueDocument[] = [];
      const history: HistoricalTransaction[] = [];

      const recurring = detectRecurringCharges(history);
      const forecast = calculateForecast(
        currentBalance,
        dueInvoices,
        duePurchases,
        recurring,
        parsed.data.days,
      );

      return forecast;
    },
  );

  // GET /api/bank/forecast/recurring
  app.get(
    '/api/bank/forecast/recurring',
    { preHandler: [...preHandlers, requirePermission('bank', 'read')] },
    async (_request, reply) => {
      // TODO: Fetch real transaction history
      const history: HistoricalTransaction[] = [];
      const charges = detectRecurringCharges(history);
      return { charges };
    },
  );
}
