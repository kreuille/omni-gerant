import type { FastifyInstance } from 'fastify';
import {
  createDashboardService,
  type DashboardDataSource,
  type UpcomingPayment,
  type RecentActivity,
  type MonthlyRevenue,
} from './dashboard.service.js';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// BUSINESS RULE [CDC-4]: Routes Dashboard

export async function dashboardRoutes(app: FastifyInstance) {
  // Placeholder data source returning demo data
  const dataSource: DashboardDataSource = {
    async getReceivables() { return 0; },
    async getPayables() { return 0; },
    async getBankBalance() { return 0; },
    async getRevenueCurrentMonth() { return 0; },
    async getRevenuePreviousMonth() { return 0; },
    async getUpcomingPayments() { return []; },
    async getRecentActivity() { return []; },
    async getMonthlyRevenue() { return []; },
  };

  const dashboardService = createDashboardService(dataSource);
  const preHandlers = [authenticate, injectTenant];

  // GET /api/dashboard — Get all dashboard data in one query
  app.get(
    '/api/dashboard',
    { preHandler: [...preHandlers, requirePermission('dashboard', 'read')] },
    async (request, reply) => {
      const result = await dashboardService.getDashboard(request.auth.tenant_id);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // H1 : GET /api/dashboard/analytics — P&L + cash-flow previsionnel + top clients/fournisseurs + DSO/DPO
  app.get(
    '/api/dashboard/analytics',
    { preHandler: [...preHandlers, requirePermission('dashboard', 'read')] },
    async (request, reply) => {
      try {
        const { pnl_months, forecast_days } = request.query as { pnl_months?: string; forecast_days?: string };
        const { computeAnalytics } = await import('./analytics.service.js');
        const data = await computeAnalytics(
          request.auth.tenant_id,
          new Date(),
          Math.max(3, Math.min(24, Number(pnl_months ?? 12))),
          Math.max(30, Math.min(180, Number(forecast_days ?? 90))),
        );
        return data;
      } catch (e) {
        return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: e instanceof Error ? e.message : 'unknown' } });
      }
    },
  );
}
