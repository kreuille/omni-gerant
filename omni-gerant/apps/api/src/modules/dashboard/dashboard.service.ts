import { ok } from '@zenadmin/shared';
import type { Result, AppError } from '@zenadmin/shared';

// BUSINESS RULE [CDC-4]: Dashboard principal avec KPIs actionnables
// BUSINESS RULE [CDC-4]: Trois indicateurs : "Ce qu'on me doit", "Ce que je dois", "Mon reste a vivre reel"

export interface DashboardKpis {
  receivables_cents: number;       // Ce qu'on me doit
  payables_cents: number;          // Ce que je dois
  bank_balance_cents: number;      // Solde bancaire
  real_cash_cents: number;         // Reste a vivre reel
  revenue_month_cents: number;     // CA du mois
  revenue_prev_month_cents: number; // CA mois precedent
  revenue_trend_pct: number;       // Tendance en %
}

export interface UpcomingPayment {
  id: string;
  type: 'receivable' | 'payable';
  entity_name: string;
  amount_cents: number;
  due_date: Date;
  document_number: string;
}

export interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
}

export interface MonthlyRevenue {
  month: string;       // 'YYYY-MM'
  revenue_cents: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  upcoming_payments: UpcomingPayment[];
  recent_activity: RecentActivity[];
  monthly_revenue: MonthlyRevenue[];
}

export interface DashboardDataSource {
  getReceivables(tenantId: string): Promise<number>;
  getPayables(tenantId: string): Promise<number>;
  getBankBalance(tenantId: string): Promise<number>;
  getRevenueCurrentMonth(tenantId: string): Promise<number>;
  getRevenuePreviousMonth(tenantId: string): Promise<number>;
  getUpcomingPayments(tenantId: string, days: number): Promise<UpcomingPayment[]>;
  getRecentActivity(tenantId: string, limit: number): Promise<RecentActivity[]>;
  getMonthlyRevenue(tenantId: string, months: number): Promise<MonthlyRevenue[]>;
}

// BUSINESS RULE [CDC-4]: Reste a vivre reel = Solde bancaire - Ce que je dois + Ce qu'on me doit
// (pondere par probabilite d'encaissement, ici 100% simplifie)
export function calculateRealCash(
  bankBalance: number,
  receivables: number,
  payables: number,
): number {
  return bankBalance - payables + receivables;
}

export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function createDashboardService(dataSource: DashboardDataSource) {
  return {
    async getDashboard(
      tenantId: string,
    ): Promise<Result<DashboardData, AppError>> {
      // Fetch all data in parallel for performance
      const [
        receivables,
        payables,
        bankBalance,
        revenueMonth,
        revenuePrevMonth,
        upcomingPayments,
        recentActivity,
        monthlyRevenue,
      ] = await Promise.all([
        dataSource.getReceivables(tenantId),
        dataSource.getPayables(tenantId),
        dataSource.getBankBalance(tenantId),
        dataSource.getRevenueCurrentMonth(tenantId),
        dataSource.getRevenuePreviousMonth(tenantId),
        dataSource.getUpcomingPayments(tenantId, 7),
        dataSource.getRecentActivity(tenantId, 5),
        dataSource.getMonthlyRevenue(tenantId, 6),
      ]);

      const realCash = calculateRealCash(bankBalance, receivables, payables);
      const trend = calculateTrend(revenueMonth, revenuePrevMonth);

      return ok({
        kpis: {
          receivables_cents: receivables,
          payables_cents: payables,
          bank_balance_cents: bankBalance,
          real_cash_cents: realCash,
          revenue_month_cents: revenueMonth,
          revenue_prev_month_cents: revenuePrevMonth,
          revenue_trend_pct: trend,
        },
        upcoming_payments: upcomingPayments,
        recent_activity: recentActivity,
        monthly_revenue: monthlyRevenue,
      });
    },
  };
}
