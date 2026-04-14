import { describe, it, expect } from 'vitest';
import { calculateForecast, type DueDocument } from '../forecast.service.js';
import type { RecurringCharge } from '../recurrence-detector.js';

// BUSINESS RULE [CDC-2.3]: Tests previsionnel de tresorerie

const START_DATE = new Date('2026-04-14');

describe('calculateForecast', () => {
  it('calculates simple forecast with no events', () => {
    const result = calculateForecast(1000000, [], [], [], 30, START_DATE);

    expect(result.current_balance_cents).toBe(1000000);
    expect(result.entries).toHaveLength(31); // day 0 to day 30
    expect(result.entries[0]!.balance_cents).toBe(1000000);
    expect(result.entries[30]!.balance_cents).toBe(1000000);
    expect(result.summary.end_balance_cents).toBe(1000000);
    expect(result.alerts).toHaveLength(0);
  });

  it('adds incoming invoices on due date', () => {
    const invoices: DueDocument[] = [
      {
        id: 'inv-1',
        type: 'invoice',
        due_date: new Date('2026-04-19'), // day 5
        remaining_cents: 250000,
      },
    ];

    const result = calculateForecast(1000000, invoices, [], [], 30, START_DATE);

    // Balance should increase on day 5
    expect(result.entries[5]!.incoming_cents).toBe(250000);
    expect(result.entries[5]!.balance_cents).toBe(1250000);
    expect(result.summary.total_incoming_cents).toBe(250000);
    expect(result.summary.end_balance_cents).toBe(1250000);
  });

  it('subtracts outgoing purchases on due date', () => {
    const purchases: DueDocument[] = [
      {
        id: 'pur-1',
        type: 'purchase',
        due_date: new Date('2026-04-24'), // day 10
        remaining_cents: 85000,
      },
    ];

    const result = calculateForecast(1000000, [], purchases, [], 30, START_DATE);

    expect(result.entries[10]!.outgoing_cents).toBe(85000);
    expect(result.entries[10]!.balance_cents).toBe(915000);
    expect(result.summary.total_outgoing_cents).toBe(85000);
  });

  it('subtracts recurring charges on projected dates', () => {
    const recurring: RecurringCharge[] = [
      {
        label: 'Loyer',
        amount_cents: -120000, // negative (debit)
        frequency: 'monthly',
        category: 'loyer',
        confidence: 0.95,
        last_occurrence: new Date('2026-03-14'),
        next_occurrences: [new Date('2026-04-14')], // day 0
      },
    ];

    const result = calculateForecast(1000000, [], [], recurring, 30, START_DATE);

    expect(result.entries[0]!.recurring_cents).toBe(120000);
    expect(result.entries[0]!.balance_cents).toBe(880000);
    expect(result.summary.total_recurring_cents).toBe(120000);
  });

  it('handles multiple events on same day', () => {
    const invoices: DueDocument[] = [
      { id: 'inv-1', type: 'invoice', due_date: new Date('2026-04-19'), remaining_cents: 300000 },
    ];
    const purchases: DueDocument[] = [
      { id: 'pur-1', type: 'purchase', due_date: new Date('2026-04-19'), remaining_cents: 50000 },
    ];

    const result = calculateForecast(1000000, invoices, purchases, [], 30, START_DATE);

    expect(result.entries[5]!.incoming_cents).toBe(300000);
    expect(result.entries[5]!.outgoing_cents).toBe(50000);
    expect(result.entries[5]!.balance_cents).toBe(1250000); // +300k -50k
  });

  it('handles multi-echeance invoices', () => {
    const invoices: DueDocument[] = [
      { id: 'inv-1', type: 'invoice', due_date: new Date('2026-04-19'), remaining_cents: 100000 },
      { id: 'inv-2', type: 'invoice', due_date: new Date('2026-04-29'), remaining_cents: 200000 },
      { id: 'inv-3', type: 'invoice', due_date: new Date('2026-05-14'), remaining_cents: 150000 },
    ];

    const result = calculateForecast(500000, invoices, [], [], 90, START_DATE);

    expect(result.summary.total_incoming_cents).toBe(450000);
    expect(result.summary.end_balance_cents).toBe(950000);
  });

  it('generates danger alert when balance goes negative within 7 days', () => {
    // BUSINESS RULE [CDC-2.3]: Alerte rouge si negatif a J+7
    const purchases: DueDocument[] = [
      { id: 'pur-1', type: 'purchase', due_date: new Date('2026-04-17'), remaining_cents: 200000 }, // day 3
    ];

    const result = calculateForecast(100000, [], purchases, [], 30, START_DATE);

    expect(result.alerts.length).toBeGreaterThanOrEqual(1);
    expect(result.alerts[0]!.type).toBe('danger');
    expect(result.alerts[0]!.projected_balance_cents).toBeLessThan(0);
  });

  it('generates warning alert when balance goes negative within 30 days', () => {
    // BUSINESS RULE [CDC-2.3]: Alerte orange si negatif a J+30
    const purchases: DueDocument[] = [
      { id: 'pur-1', type: 'purchase', due_date: new Date('2026-05-04'), remaining_cents: 200000 }, // day 20
    ];

    const result = calculateForecast(100000, [], purchases, [], 30, START_DATE);

    expect(result.alerts.length).toBeGreaterThanOrEqual(1);
    const alert = result.alerts[0]!;
    expect(alert.type === 'warning' || alert.type === 'danger').toBe(true);
  });

  it('no alert when balance stays positive', () => {
    const result = calculateForecast(1000000, [], [], [], 90, START_DATE);
    expect(result.alerts).toHaveLength(0);
  });

  it('calculates full 90-day forecast correctly', () => {
    const invoices: DueDocument[] = [
      { id: 'inv-1', type: 'invoice', due_date: new Date('2026-04-24'), remaining_cents: 350000 },
      { id: 'inv-2', type: 'invoice', due_date: new Date('2026-05-24'), remaining_cents: 250000 },
      { id: 'inv-3', type: 'invoice', due_date: new Date('2026-06-24'), remaining_cents: 180000 },
    ];

    const purchases: DueDocument[] = [
      { id: 'pur-1', type: 'purchase', due_date: new Date('2026-04-30'), remaining_cents: 85000 },
      { id: 'pur-2', type: 'purchase', due_date: new Date('2026-05-15'), remaining_cents: 45000 },
    ];

    const recurring: RecurringCharge[] = [
      {
        label: 'Loyer',
        amount_cents: -120000,
        frequency: 'monthly',
        category: 'loyer',
        confidence: 0.95,
        last_occurrence: new Date('2026-03-14'),
        next_occurrences: [
          new Date('2026-04-14'),
          new Date('2026-05-14'),
          new Date('2026-06-14'),
        ],
      },
    ];

    const result = calculateForecast(1542300, invoices, purchases, recurring, 90, START_DATE);

    expect(result.entries).toHaveLength(91);
    expect(result.summary.total_incoming_cents).toBe(780000);
    expect(result.summary.total_outgoing_cents).toBe(130000);
    expect(result.summary.total_recurring_cents).toBe(360000);
    // 1542300 + 780000 - 130000 - 360000 = 1832300
    expect(result.summary.end_balance_cents).toBe(1832300);
  });

  it('returns recurring charges in result', () => {
    const recurring: RecurringCharge[] = [
      {
        label: 'Loyer',
        amount_cents: -120000,
        frequency: 'monthly',
        category: 'loyer',
        confidence: 0.95,
        last_occurrence: new Date('2026-03-14'),
        next_occurrences: [],
      },
    ];

    const result = calculateForecast(1000000, [], [], recurring, 30, START_DATE);
    expect(result.recurring_charges).toHaveLength(1);
    expect(result.recurring_charges[0]!.label).toBe('Loyer');
  });
});
