import type { Result } from '@zenadmin/shared';
import { ok } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';

// BUSINESS RULE [CDC-2.1]: Module de relance automatique intelligent
// Sequence: J-3, J+1, J+7, J+15, J+30

export type ReminderLevel = 1 | 2 | 3 | 4 | 5;

export interface ReminderConfig {
  level: ReminderLevel;
  days_offset: number; // relative to due_date (negative = before)
  label: string;
  tone: 'friendly' | 'neutral' | 'firm' | 'final';
}

export const REMINDER_SEQUENCE: ReminderConfig[] = [
  { level: 1, days_offset: -3, label: 'Rappel amical (J-3)', tone: 'friendly' },
  { level: 2, days_offset: 1, label: 'Echeance passee (J+1)', tone: 'neutral' },
  { level: 3, days_offset: 7, label: 'Relance formelle (J+7)', tone: 'neutral' },
  { level: 4, days_offset: 15, label: 'Relance ferme (J+15)', tone: 'firm' },
  { level: 5, days_offset: 30, label: 'Derniere relance (J+30)', tone: 'final' },
];

export interface OverdueInvoice {
  id: string;
  tenant_id: string;
  client_id: string;
  number: string;
  due_date: Date;
  total_ttc_cents: number;
  remaining_cents: number;
  status: string;
  client_email: string;
  client_name: string;
}

export interface ReminderRecord {
  id: string;
  invoice_id: string;
  tenant_id: string;
  level: ReminderLevel;
  sent_at: Date;
  email_sent_to: string;
}

export interface ReminderRepository {
  getOverdueInvoices(tenantId?: string): Promise<OverdueInvoice[]>;
  getLastReminder(invoiceId: string): Promise<ReminderRecord | null>;
  createReminder(data: {
    invoice_id: string;
    tenant_id: string;
    level: ReminderLevel;
    email_sent_to: string;
  }): Promise<ReminderRecord>;
  getRemindersByInvoice(invoiceId: string, tenantId: string): Promise<ReminderRecord[]>;
}

// BUSINESS RULE [CDC-2.1]: Penalites de retard
// Taux BCE + 10 points (ou 3x taux legal si superieur)
// Indemnite forfaitaire de 40 EUR
export function calculateLatePenalties(
  remainingCents: number,
  daysOverdue: number,
  annualRatePercent: number = 13.25, // Taux legal 2026 approx
): { penalty_cents: number; fixed_indemnity_cents: number; total_cents: number } {
  if (daysOverdue <= 0) {
    return { penalty_cents: 0, fixed_indemnity_cents: 0, total_cents: 0 };
  }

  // Interest: remaining * rate * days / 365
  const penaltyCents = Math.round(
    (remainingCents * annualRatePercent * daysOverdue) / (100 * 365),
  );

  // Fixed indemnity: 40 EUR = 4000 cents
  const fixedIndemnityCents = 4000;

  return {
    penalty_cents: penaltyCents,
    fixed_indemnity_cents: fixedIndemnityCents,
    total_cents: penaltyCents + fixedIndemnityCents,
  };
}

// Determine which reminder level should be sent based on current date
export function determineReminderLevel(dueDate: Date, now: Date = new Date()): ReminderLevel | null {
  const diffMs = now.getTime() - dueDate.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  // Find the highest applicable level
  let applicableLevel: ReminderLevel | null = null;
  for (const config of REMINDER_SEQUENCE) {
    if (diffDays >= config.days_offset) {
      applicableLevel = config.level;
    }
  }
  return applicableLevel;
}

// Check if a reminder should be sent (not already sent at this level)
export function shouldSendReminder(
  dueDate: Date,
  lastReminder: ReminderRecord | null,
  now: Date = new Date(),
): { should_send: boolean; level: ReminderLevel | null } {
  const level = determineReminderLevel(dueDate, now);
  if (!level) return { should_send: false, level: null };

  // Already sent at this level or higher
  if (lastReminder && lastReminder.level >= level) {
    return { should_send: false, level };
  }

  return { should_send: true, level };
}

export function createReminderService(repo: ReminderRepository) {
  return {
    async getOverdueInvoices(tenantId?: string): Promise<Result<OverdueInvoice[], AppError>> {
      const invoices = await repo.getOverdueInvoices(tenantId);
      return ok(invoices);
    },

    async processReminders(tenantId?: string): Promise<Result<ReminderRecord[], AppError>> {
      const invoices = await repo.getOverdueInvoices(tenantId);
      const sent: ReminderRecord[] = [];

      for (const invoice of invoices) {
        // Skip paid invoices
        if (invoice.status === 'paid') continue;

        const lastReminder = await repo.getLastReminder(invoice.id);
        const { should_send, level } = shouldSendReminder(invoice.due_date, lastReminder);

        if (should_send && level) {
          const reminder = await repo.createReminder({
            invoice_id: invoice.id,
            tenant_id: invoice.tenant_id,
            level,
            email_sent_to: invoice.client_email,
          });
          sent.push(reminder);
        }
      }

      return ok(sent);
    },

    async getReminderHistory(invoiceId: string, tenantId: string): Promise<Result<ReminderRecord[], AppError>> {
      const reminders = await repo.getRemindersByInvoice(invoiceId, tenantId);
      return ok(reminders);
    },
  };
}
