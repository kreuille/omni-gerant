import { ok } from '@zenadmin/shared';
import type { Result, AppError } from '@zenadmin/shared';
import type { RecurringCharge, HistoricalTransaction } from './recurrence-detector.js';
import { detectRecurringCharges } from './recurrence-detector.js';

// BUSINESS RULE [CDC-2.3]: Previsionnel de tresorerie
// Formule : Solde actuel + Encaissements prevus - Decaissements prevus
// Alerte si solde previsionnel negatif a 30 jours

export interface ForecastEntry {
  date: string; // YYYY-MM-DD
  balance_cents: number;
  incoming_cents: number; // Factures emises dues ce jour
  outgoing_cents: number; // Factures fournisseurs dues ce jour
  recurring_cents: number; // Charges recurrentes ce jour
}

export interface ForecastAlert {
  type: 'warning' | 'danger';
  message: string;
  date: string;
  projected_balance_cents: number;
}

export interface ForecastResult {
  current_balance_cents: number;
  entries: ForecastEntry[];
  alerts: ForecastAlert[];
  recurring_charges: RecurringCharge[];
  summary: {
    total_incoming_cents: number;
    total_outgoing_cents: number;
    total_recurring_cents: number;
    end_balance_cents: number;
  };
}

export interface DueDocument {
  id: string;
  type: 'invoice' | 'purchase';
  due_date: Date;
  remaining_cents: number;
}

export interface ForecastDataProvider {
  /** Get current bank balance for tenant */
  getCurrentBalance(tenantId: string): Promise<number>;
  /** Get unpaid invoices with due dates */
  getDueInvoices(tenantId: string): Promise<DueDocument[]>;
  /** Get unpaid purchases with due dates */
  getDuePurchases(tenantId: string): Promise<DueDocument[]>;
  /** Get last 6 months of transactions for recurrence detection */
  getTransactionHistory(tenantId: string, months: number): Promise<HistoricalTransaction[]>;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isSameDay(a: Date, b: Date): boolean {
  return formatDate(a) === formatDate(b);
}

/**
 * Calculate cash flow forecast for the next N days
 */
export function calculateForecast(
  currentBalanceCents: number,
  dueInvoices: DueDocument[],
  duePurchases: DueDocument[],
  recurringCharges: RecurringCharge[],
  days = 90,
  startDate = new Date(),
): ForecastResult {
  const entries: ForecastEntry[] = [];
  const alerts: ForecastAlert[] = [];
  let runningBalance = currentBalanceCents;
  let totalIncoming = 0;
  let totalOutgoing = 0;
  let totalRecurring = 0;

  for (let d = 0; d <= days; d++) {
    const currentDate = addDays(startDate, d);
    const dateStr = formatDate(currentDate);

    // Incoming: invoices due on this date
    let dayIncoming = 0;
    for (const inv of dueInvoices) {
      if (inv.due_date && isSameDay(inv.due_date, currentDate)) {
        dayIncoming += inv.remaining_cents;
      }
    }

    // Outgoing: purchases due on this date
    let dayOutgoing = 0;
    for (const pur of duePurchases) {
      if (pur.due_date && isSameDay(pur.due_date, currentDate)) {
        dayOutgoing += pur.remaining_cents;
      }
    }

    // Recurring charges due on this date
    let dayRecurring = 0;
    for (const charge of recurringCharges) {
      for (const occDate of charge.next_occurrences) {
        if (isSameDay(occDate, currentDate)) {
          dayRecurring += Math.abs(charge.amount_cents); // amount_cents is negative
        }
      }
    }

    runningBalance = runningBalance + dayIncoming - dayOutgoing - dayRecurring;
    totalIncoming += dayIncoming;
    totalOutgoing += dayOutgoing;
    totalRecurring += dayRecurring;

    entries.push({
      date: dateStr,
      balance_cents: runningBalance,
      incoming_cents: dayIncoming,
      outgoing_cents: dayOutgoing,
      recurring_cents: dayRecurring,
    });

    // BUSINESS RULE [CDC-2.3]: Alertes solde previsionnel negatif
    if (runningBalance < 0) {
      if (d <= 7 && !alerts.some((a) => a.type === 'danger')) {
        alerts.push({
          type: 'danger',
          message: `Solde previsionnel negatif a J+${d} (${dateStr})`,
          date: dateStr,
          projected_balance_cents: runningBalance,
        });
      } else if (d <= 30 && !alerts.some((a) => a.type === 'warning' || a.type === 'danger')) {
        alerts.push({
          type: 'warning',
          message: `Solde previsionnel negatif a J+${d} (${dateStr})`,
          date: dateStr,
          projected_balance_cents: runningBalance,
        });
      }
    }
  }

  return {
    current_balance_cents: currentBalanceCents,
    entries,
    alerts,
    recurring_charges: recurringCharges,
    summary: {
      total_incoming_cents: totalIncoming,
      total_outgoing_cents: totalOutgoing,
      total_recurring_cents: totalRecurring,
      end_balance_cents: runningBalance,
    },
  };
}

/**
 * Full forecast service with data fetching
 */
export function createForecastService(provider: ForecastDataProvider) {
  return {
    async getForecast(
      tenantId: string,
      days = 90,
    ): Promise<Result<ForecastResult, AppError>> {
      const [balance, invoices, purchases, history] = await Promise.all([
        provider.getCurrentBalance(tenantId),
        provider.getDueInvoices(tenantId),
        provider.getDuePurchases(tenantId),
        provider.getTransactionHistory(tenantId, 6),
      ]);

      const recurringCharges = detectRecurringCharges(history);

      const result = calculateForecast(
        balance,
        invoices,
        purchases,
        recurringCharges,
        days,
      );

      return ok(result);
    },
  };
}
