import { describe, it, expect } from 'vitest';
import { detectRecurringCharges, type HistoricalTransaction } from '../recurrence-detector.js';

// BUSINESS RULE [CDC-2.3]: Tests detection charges recurrentes

function monthlyTransaction(
  label: string,
  amountCents: number,
  startMonth: number,
  count: number,
  category: string | null = null,
): HistoricalTransaction[] {
  const txs: HistoricalTransaction[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(2026, startMonth + i, 15); // 15th of each month
    txs.push({ amount_cents: amountCents, label, date, category });
  }
  return txs;
}

function quarterlyTransaction(
  label: string,
  amountCents: number,
  startMonth: number,
  count: number,
): HistoricalTransaction[] {
  const txs: HistoricalTransaction[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(2026, startMonth + i * 3, 1);
    txs.push({ amount_cents: amountCents, label, date, category: null });
  }
  return txs;
}

describe('detectRecurringCharges', () => {
  it('detects monthly recurring charge', () => {
    const transactions = monthlyTransaction(
      'PRELEVEMENT LOYER BUREAU',
      -120000,
      0, // January
      6, // 6 months
      'loyer',
    );

    const charges = detectRecurringCharges(transactions);

    expect(charges).toHaveLength(1);
    expect(charges[0]!.frequency).toBe('monthly');
    expect(charges[0]!.amount_cents).toBe(-120000);
    expect(charges[0]!.confidence).toBeGreaterThanOrEqual(0.5);
    expect(charges[0]!.next_occurrences.length).toBeGreaterThan(0);
  });

  it('detects multiple monthly charges', () => {
    const transactions = [
      ...monthlyTransaction('LOYER', -120000, 0, 6, 'loyer'),
      ...monthlyTransaction('EDF ELECTRICITE', -18500, 0, 6, 'energie'),
      ...monthlyTransaction('ORANGE FORFAIT', -3999, 0, 6, 'telecom'),
    ];

    const charges = detectRecurringCharges(transactions);
    expect(charges.length).toBeGreaterThanOrEqual(3);
  });

  it('detects quarterly recurring charge', () => {
    const transactions = quarterlyTransaction(
      'ASSURANCE MAIF TRIMESTRE',
      -45000,
      0, // Start January
      3, // 3 quarters
    );

    const charges = detectRecurringCharges(transactions);

    expect(charges).toHaveLength(1);
    expect(charges[0]!.frequency).toBe('quarterly');
    expect(charges[0]!.amount_cents).toBe(-45000);
  });

  it('projects next occurrences for monthly charges', () => {
    const transactions = monthlyTransaction('LOYER', -120000, 0, 6);
    const charges = detectRecurringCharges(transactions, 3);

    expect(charges).toHaveLength(1);
    expect(charges[0]!.next_occurrences).toHaveLength(3); // 3 months projection
  });

  it('ignores credit transactions (income)', () => {
    const transactions = monthlyTransaction('VIR CLIENT REGULIER', 50000, 0, 6);
    const charges = detectRecurringCharges(transactions);

    expect(charges).toHaveLength(0);
  });

  it('ignores irregular transactions', () => {
    const transactions: HistoricalTransaction[] = [
      { amount_cents: -10000, label: 'ACHAT 1', date: new Date(2026, 0, 5), category: null },
      { amount_cents: -10000, label: 'ACHAT 2', date: new Date(2026, 0, 20), category: null },
      { amount_cents: -10000, label: 'ACHAT 3', date: new Date(2026, 2, 8), category: null },
      { amount_cents: -10000, label: 'ACHAT 4', date: new Date(2026, 5, 1), category: null },
    ];

    const charges = detectRecurringCharges(transactions);
    // Gaps are irregular (15, 47, 85 days), not monthly/quarterly
    expect(charges).toHaveLength(0);
  });

  it('requires minimum 2 occurrences', () => {
    const transactions: HistoricalTransaction[] = [
      { amount_cents: -50000, label: 'UNIQUE CHARGE', date: new Date(2026, 0, 15), category: null },
    ];

    const charges = detectRecurringCharges(transactions);
    expect(charges).toHaveLength(0);
  });

  it('filters by minimum confidence', () => {
    // Slightly irregular monthly pattern
    const transactions: HistoricalTransaction[] = [
      { amount_cents: -10000, label: 'CHARGE', date: new Date(2026, 0, 15), category: null },
      { amount_cents: -10000, label: 'CHARGE', date: new Date(2026, 1, 18), category: null }, // ~34 days
    ];

    const highConfidence = detectRecurringCharges(transactions, 3, 0.9);
    const lowConfidence = detectRecurringCharges(transactions, 3, 0.1);

    // With only 2 data points, confidence should be lower
    expect(highConfidence.length).toBeLessThanOrEqual(lowConfidence.length);
  });

  it('sorts charges by confidence descending', () => {
    const transactions = [
      ...monthlyTransaction('LOYER', -120000, 0, 6), // high confidence (6 points)
      ...monthlyTransaction('ABONNEMENT', -2999, 0, 3), // lower confidence (3 points)
    ];

    const charges = detectRecurringCharges(transactions);
    if (charges.length >= 2) {
      expect(charges[0]!.confidence).toBeGreaterThanOrEqual(charges[1]!.confidence);
    }
  });

  it('preserves category from transactions', () => {
    const transactions = monthlyTransaction('EDF', -18500, 0, 4, 'energie');
    const charges = detectRecurringCharges(transactions);

    expect(charges).toHaveLength(1);
    expect(charges[0]!.category).toBe('energie');
  });
});
