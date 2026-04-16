import { describe, it, expect } from 'vitest';
import { calculateLineTotal, calculateQuoteTotals, type LineInput } from '../quote-calculator.js';

// BUSINESS RULE [CDC-2.1]: Tests calcul TVA multi-taux
// tva_rate is in percentage (20 = 20%, 5.5 = 5.5%)

describe('calculateLineTotal', () => {
  it('calculates simple line total', () => {
    const line: LineInput = {
      type: 'line',
      quantity: 2,
      unit_price_cents: 1500, // 15.00 EUR
      tva_rate: 20,
    };
    const result = calculateLineTotal(line);
    expect(result.total_ht_cents).toBe(3000); // 30.00 EUR
  });

  it('handles decimal quantities', () => {
    const line: LineInput = {
      type: 'line',
      quantity: 2.5,
      unit_price_cents: 1000,
      tva_rate: 20,
    };
    expect(calculateLineTotal(line).total_ht_cents).toBe(2500);
  });

  it('returns 0 for non-line types', () => {
    expect(calculateLineTotal({ type: 'section', quantity: 1, unit_price_cents: 1000, tva_rate: 20 }).total_ht_cents).toBe(0);
    expect(calculateLineTotal({ type: 'comment', quantity: 1, unit_price_cents: 1000, tva_rate: 20 }).total_ht_cents).toBe(0);
    expect(calculateLineTotal({ type: 'subtotal', quantity: 1, unit_price_cents: 1000, tva_rate: 20 }).total_ht_cents).toBe(0);
  });

  it('applies percentage discount', () => {
    const line: LineInput = {
      type: 'line',
      quantity: 1,
      unit_price_cents: 10000, // 100.00 EUR
      tva_rate: 20,
      discount_type: 'percentage',
      discount_value: 1000, // 10% in basis points
    };
    expect(calculateLineTotal(line).total_ht_cents).toBe(9000); // 90.00 EUR
  });

  it('applies fixed discount', () => {
    const line: LineInput = {
      type: 'line',
      quantity: 1,
      unit_price_cents: 10000,
      tva_rate: 20,
      discount_type: 'fixed',
      discount_value: 2500, // 25.00 EUR
    };
    expect(calculateLineTotal(line).total_ht_cents).toBe(7500); // 75.00 EUR
  });

  it('never returns negative total', () => {
    const line: LineInput = {
      type: 'line',
      quantity: 1,
      unit_price_cents: 1000,
      tva_rate: 20,
      discount_type: 'fixed',
      discount_value: 5000, // discount > price
    };
    expect(calculateLineTotal(line).total_ht_cents).toBe(0);
  });

  it('handles zero quantity', () => {
    const line: LineInput = {
      type: 'line',
      quantity: 0,
      unit_price_cents: 1000,
      tva_rate: 20,
    };
    expect(calculateLineTotal(line).total_ht_cents).toBe(0);
  });
});

describe('calculateQuoteTotals', () => {
  it('calculates single rate quote', () => {
    const lines: LineInput[] = [
      { type: 'line', quantity: 2, unit_price_cents: 5000, tva_rate: 20 },
      { type: 'line', quantity: 1, unit_price_cents: 3000, tva_rate: 20 },
    ];
    const totals = calculateQuoteTotals(lines);

    expect(totals.total_ht_cents).toBe(13000); // 130.00
    expect(totals.total_tva_cents).toBe(2600); // 130 * 20%
    expect(totals.total_ttc_cents).toBe(15600);
    expect(totals.tva_breakdown).toHaveLength(1);
    expect(totals.tva_breakdown[0]!.tva_rate).toBe(20);
  });

  // BUSINESS RULE [CDC-2.1]: TVA multi-taux sur un meme document
  it('calculates multi-rate quote (20%, 10%, 5.5%)', () => {
    const lines: LineInput[] = [
      { type: 'line', quantity: 1, unit_price_cents: 10000, tva_rate: 20 },  // 100 EUR HT, 20 TVA
      { type: 'line', quantity: 1, unit_price_cents: 5000, tva_rate: 10 },   // 50 EUR HT, 5 TVA
      { type: 'line', quantity: 1, unit_price_cents: 2000, tva_rate: 5.5 },  // 20 EUR HT, 1.10 TVA
    ];
    const totals = calculateQuoteTotals(lines);

    expect(totals.total_ht_cents).toBe(17000); // 170.00
    expect(totals.tva_breakdown).toHaveLength(3);

    // Check 20% group
    const tva20 = totals.tva_breakdown.find((g) => g.tva_rate === 20);
    expect(tva20).toBeDefined();
    expect(tva20!.base_ht_cents).toBe(10000);
    expect(tva20!.tva_cents).toBe(2000);

    // Check 10% group
    const tva10 = totals.tva_breakdown.find((g) => g.tva_rate === 10);
    expect(tva10).toBeDefined();
    expect(tva10!.base_ht_cents).toBe(5000);
    expect(tva10!.tva_cents).toBe(500);

    // Check 5.5% group
    const tva55 = totals.tva_breakdown.find((g) => g.tva_rate === 5.5);
    expect(tva55).toBeDefined();
    expect(tva55!.base_ht_cents).toBe(2000);
    expect(tva55!.tva_cents).toBe(110);

    // Total TVA = 2000 + 500 + 110 = 2610
    expect(totals.total_tva_cents).toBe(2610);
    expect(totals.total_ttc_cents).toBe(19610);
  });

  it('ignores non-line types in calculations', () => {
    const lines: LineInput[] = [
      { type: 'section', quantity: 0, unit_price_cents: 0, tva_rate: 0 },
      { type: 'line', quantity: 1, unit_price_cents: 10000, tva_rate: 20 },
      { type: 'comment', quantity: 0, unit_price_cents: 0, tva_rate: 0 },
    ];
    const totals = calculateQuoteTotals(lines);
    expect(totals.total_ht_cents).toBe(10000);
    expect(totals.total_tva_cents).toBe(2000);
  });

  it('applies global percentage discount proportionally', () => {
    const lines: LineInput[] = [
      { type: 'line', quantity: 1, unit_price_cents: 10000, tva_rate: 20 },
      { type: 'line', quantity: 1, unit_price_cents: 5000, tva_rate: 10 },
    ];
    // 10% global discount (in basis points)
    const totals = calculateQuoteTotals(lines, { type: 'percentage', value: 1000 });

    // HT before discount: 15000, after 10% discount: ~13500
    const tva20 = totals.tva_breakdown.find((g) => g.tva_rate === 20);
    expect(tva20!.base_ht_cents).toBe(9000); // 10000 * 0.9

    const tva10 = totals.tva_breakdown.find((g) => g.tva_rate === 10);
    expect(tva10!.base_ht_cents).toBe(4500); // 5000 * 0.9

    expect(totals.total_ht_cents).toBe(13500);
  });

  it('applies global fixed discount proportionally', () => {
    const lines: LineInput[] = [
      { type: 'line', quantity: 1, unit_price_cents: 10000, tva_rate: 20 }, // 66.67% of total
      { type: 'line', quantity: 1, unit_price_cents: 5000, tva_rate: 10 },  // 33.33% of total
    ];
    // 3000 centimes (30 EUR) fixed discount
    const totals = calculateQuoteTotals(lines, { type: 'fixed', value: 3000 });

    // Total HT = 15000 - 3000 = 12000
    expect(totals.total_ht_cents).toBe(12000);
  });

  it('handles empty lines', () => {
    const totals = calculateQuoteTotals([]);
    expect(totals.total_ht_cents).toBe(0);
    expect(totals.total_tva_cents).toBe(0);
    expect(totals.total_ttc_cents).toBe(0);
    expect(totals.tva_breakdown).toHaveLength(0);
  });

  // BUSINESS RULE [R02]: Test arrondi - pas de centimes perdus
  it('rounds correctly without losing centimes', () => {
    const lines: LineInput[] = [
      { type: 'line', quantity: 3, unit_price_cents: 333, tva_rate: 20 }, // 9.99 EUR
    ];
    const totals = calculateQuoteTotals(lines);
    // 3 * 333 = 999
    expect(totals.total_ht_cents).toBe(999);
    // TVA = round(999 * 20 / 100) = round(199.8) = 200
    expect(totals.total_tva_cents).toBe(200);
    expect(totals.total_ttc_cents).toBe(1199);
  });

  it('sorts TVA breakdown by rate descending', () => {
    const lines: LineInput[] = [
      { type: 'line', quantity: 1, unit_price_cents: 1000, tva_rate: 5.5 },
      { type: 'line', quantity: 1, unit_price_cents: 1000, tva_rate: 20 },
      { type: 'line', quantity: 1, unit_price_cents: 1000, tva_rate: 10 },
    ];
    const totals = calculateQuoteTotals(lines);
    expect(totals.tva_breakdown[0]!.tva_rate).toBe(20);
    expect(totals.tva_breakdown[1]!.tva_rate).toBe(10);
    expect(totals.tva_breakdown[2]!.tva_rate).toBe(5.5);
  });

  // BUSINESS RULE [CALC-002]: Guard against basis points
  it('rejects tva_rate > 100 (basis points by mistake)', () => {
    const lines: LineInput[] = [
      { type: 'line', quantity: 1, unit_price_cents: 10000, tva_rate: 2000 },
    ];
    expect(() => calculateQuoteTotals(lines)).toThrow('TVA rate seems in basis points');
  });

  // BUSINESS RULE [CALC-003]: TVA 20% on 45000 centimes = 9000 centimes
  it('calculates TVA 20% on 450 EUR correctly', () => {
    const lines: LineInput[] = [
      { type: 'line', quantity: 1, unit_price_cents: 45000, tva_rate: 20 },
    ];
    const totals = calculateQuoteTotals(lines);
    expect(totals.total_ht_cents).toBe(45000);
    expect(totals.total_tva_cents).toBe(9000); // 450 * 20% = 90 EUR
    expect(totals.total_ttc_cents).toBe(54000);
  });

  it('calculates TVA 5.5% on 100 EUR correctly', () => {
    const lines: LineInput[] = [
      { type: 'line', quantity: 1, unit_price_cents: 10000, tva_rate: 5.5 },
    ];
    const totals = calculateQuoteTotals(lines);
    expect(totals.total_ht_cents).toBe(10000);
    expect(totals.total_tva_cents).toBe(550); // 100 * 5.5% = 5.50 EUR
    expect(totals.total_ttc_cents).toBe(10550);
  });
});
