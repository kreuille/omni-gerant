import { describe, it, expect, vi } from 'vitest';
import {
  createReminderService,
  calculateLatePenalties,
  determineReminderLevel,
  shouldSendReminder,
  type ReminderRepository,
  type OverdueInvoice,
  type ReminderRecord,
} from '../reminder.service.js';

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function createMockInvoice(overrides?: Partial<OverdueInvoice>): OverdueInvoice {
  return {
    id: crypto.randomUUID(),
    tenant_id: 'tenant-1',
    client_id: 'client-1',
    number: 'FAC-2026-00001',
    due_date: daysFromNow(-10), // 10 days overdue
    total_ttc_cents: 120000,
    remaining_cents: 120000,
    status: 'overdue',
    client_email: 'client@test.com',
    client_name: 'Client Test',
    ...overrides,
  };
}

function createMockRepo(invoices: OverdueInvoice[] = [], lastReminder: ReminderRecord | null = null): ReminderRepository {
  return {
    getOverdueInvoices: vi.fn().mockResolvedValue(invoices),
    getLastReminder: vi.fn().mockResolvedValue(lastReminder),
    createReminder: vi.fn().mockImplementation(async (data) => ({
      id: crypto.randomUUID(),
      ...data,
      sent_at: new Date(),
    })),
    getRemindersByInvoice: vi.fn().mockResolvedValue([]),
  };
}

describe('calculateLatePenalties', () => {
  it('returns zero for non-overdue invoices', () => {
    const result = calculateLatePenalties(120000, 0);
    expect(result.penalty_cents).toBe(0);
    expect(result.fixed_indemnity_cents).toBe(0);
    expect(result.total_cents).toBe(0);
  });

  it('calculates penalties for overdue invoices', () => {
    // 1200 EUR, 30 days overdue, 13.25% rate
    const result = calculateLatePenalties(120000, 30, 13.25);
    // 120000 * 13.25 * 30 / (100 * 365) = 1306.8... → 1307
    expect(result.penalty_cents).toBe(1307);
    expect(result.fixed_indemnity_cents).toBe(4000); // 40 EUR
    expect(result.total_cents).toBe(5307);
  });

  it('handles small amounts', () => {
    const result = calculateLatePenalties(1000, 7, 13.25);
    // 1000 * 13.25 * 7 / 36500 = 2.54... → 3
    expect(result.penalty_cents).toBe(3);
    expect(result.fixed_indemnity_cents).toBe(4000);
  });
});

describe('determineReminderLevel', () => {
  it('returns level 1 at J-3', () => {
    const dueDate = daysFromNow(2); // Due in 2 days (past J-3)
    const level = determineReminderLevel(dueDate);
    expect(level).toBe(1);
  });

  it('returns null before J-3', () => {
    const dueDate = daysFromNow(5); // Due in 5 days
    const level = determineReminderLevel(dueDate);
    expect(level).toBeNull();
  });

  it('returns level 2 at J+1', () => {
    const dueDate = daysFromNow(-2); // 2 days overdue
    const level = determineReminderLevel(dueDate);
    expect(level).toBe(2);
  });

  it('returns level 3 at J+7', () => {
    const dueDate = daysFromNow(-8); // 8 days overdue
    const level = determineReminderLevel(dueDate);
    expect(level).toBe(3);
  });

  it('returns level 4 at J+15', () => {
    const dueDate = daysFromNow(-16); // 16 days overdue
    const level = determineReminderLevel(dueDate);
    expect(level).toBe(4);
  });

  it('returns level 5 at J+30', () => {
    const dueDate = daysFromNow(-31); // 31 days overdue
    const level = determineReminderLevel(dueDate);
    expect(level).toBe(5);
  });
});

describe('shouldSendReminder', () => {
  it('should send when no previous reminder', () => {
    const dueDate = daysFromNow(-2);
    const result = shouldSendReminder(dueDate, null);
    expect(result.should_send).toBe(true);
    expect(result.level).toBe(2);
  });

  it('should not send when already sent at current level', () => {
    const dueDate = daysFromNow(-2);
    const lastReminder: ReminderRecord = {
      id: '1', invoice_id: '1', tenant_id: '1', level: 2,
      sent_at: new Date(), email_sent_to: 'test@test.com',
    };
    const result = shouldSendReminder(dueDate, lastReminder);
    expect(result.should_send).toBe(false);
  });

  it('should send when level has increased', () => {
    const dueDate = daysFromNow(-8); // J+8 → level 3
    const lastReminder: ReminderRecord = {
      id: '1', invoice_id: '1', tenant_id: '1', level: 2,
      sent_at: new Date(), email_sent_to: 'test@test.com',
    };
    const result = shouldSendReminder(dueDate, lastReminder);
    expect(result.should_send).toBe(true);
    expect(result.level).toBe(3);
  });

  it('should not send before J-3', () => {
    const dueDate = daysFromNow(5);
    const result = shouldSendReminder(dueDate, null);
    expect(result.should_send).toBe(false);
  });
});

describe('ReminderService', () => {
  describe('processReminders', () => {
    it('sends reminders for overdue invoices', async () => {
      const invoice = createMockInvoice();
      const repo = createMockRepo([invoice]);
      const service = createReminderService(repo);

      const result = await service.processReminders();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(repo.createReminder).toHaveBeenCalledOnce();
      }
    });

    it('skips paid invoices', async () => {
      const invoice = createMockInvoice({ status: 'paid' });
      const repo = createMockRepo([invoice]);
      const service = createReminderService(repo);

      const result = await service.processReminders();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('skips already reminded invoices at same level', async () => {
      const invoice = createMockInvoice();
      const lastReminder: ReminderRecord = {
        id: '1', invoice_id: invoice.id, tenant_id: 'tenant-1', level: 3,
        sent_at: new Date(), email_sent_to: 'client@test.com',
      };
      const repo = createMockRepo([invoice], lastReminder);
      const service = createReminderService(repo);

      const result = await service.processReminders();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });
  });
});
