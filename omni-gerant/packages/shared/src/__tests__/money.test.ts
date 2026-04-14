import { describe, it, expect } from 'vitest';
import {
  money,
  addMoney,
  subtractMoney,
  multiplyMoney,
  formatMoney,
  tvaAmount,
  ttcFromHt,
  htFromTtc,
  isZero,
  isPositive,
  isNegative,
} from '../money.js';

describe('Money helpers', () => {
  describe('money()', () => {
    it('creates a money object', () => {
      const m = money(1500);
      expect(m).toEqual({ amount_cents: 1500, currency: 'EUR' });
    });

    it('rejects non-integer amounts', () => {
      expect(() => money(15.5)).toThrow('amount_cents must be an integer');
    });

    it('allows zero', () => {
      expect(money(0)).toEqual({ amount_cents: 0, currency: 'EUR' });
    });

    it('allows negative amounts', () => {
      expect(money(-500)).toEqual({ amount_cents: -500, currency: 'EUR' });
    });
  });

  describe('addMoney()', () => {
    it('adds two amounts', () => {
      const result = addMoney(money(1500), money(2500));
      expect(result.amount_cents).toBe(4000);
    });

    it('adds multiple amounts', () => {
      const result = addMoney(money(100), money(200), money(300));
      expect(result.amount_cents).toBe(600);
    });

    it('returns zero for empty input', () => {
      expect(addMoney().amount_cents).toBe(0);
    });

    it('handles negative amounts', () => {
      const result = addMoney(money(1000), money(-500));
      expect(result.amount_cents).toBe(500);
    });
  });

  describe('subtractMoney()', () => {
    it('subtracts amounts', () => {
      const result = subtractMoney(money(5000), money(2000));
      expect(result.amount_cents).toBe(3000);
    });

    it('can produce negative result', () => {
      const result = subtractMoney(money(1000), money(3000));
      expect(result.amount_cents).toBe(-2000);
    });
  });

  describe('multiplyMoney()', () => {
    it('multiplies by integer', () => {
      const result = multiplyMoney(money(1000), 3);
      expect(result.amount_cents).toBe(3000);
    });

    it('rounds to nearest centime', () => {
      // 1000 * 0.333 = 333.0 → 333
      const result = multiplyMoney(money(1000), 0.333);
      expect(result.amount_cents).toBe(333);
    });

    it('rounds 0.5 up (standard rounding)', () => {
      // 1001 * 0.5 = 500.5 → 501
      const result = multiplyMoney(money(1001), 0.5);
      expect(result.amount_cents).toBe(501);
    });

    it('handles zero factor', () => {
      expect(multiplyMoney(money(5000), 0).amount_cents).toBe(0);
    });
  });

  describe('formatMoney()', () => {
    it('formats positive amount', () => {
      expect(formatMoney(money(1500))).toBe('15,00 EUR');
    });

    it('formats zero', () => {
      expect(formatMoney(money(0))).toBe('0,00 EUR');
    });

    it('formats negative amount', () => {
      expect(formatMoney(money(-2550))).toBe('-25,50 EUR');
    });

    it('formats large amount', () => {
      expect(formatMoney(money(1234567))).toBe('12345,67 EUR');
    });

    it('formats single centime', () => {
      expect(formatMoney(money(1))).toBe('0,01 EUR');
    });
  });

  describe('TVA calculations', () => {
    describe('tvaAmount()', () => {
      it('calculates 20% TVA', () => {
        // 10000 cents * 2000 / 10000 = 2000 cents
        const tva = tvaAmount(money(10000), 2000);
        expect(tva.amount_cents).toBe(2000);
      });

      it('calculates 10% TVA', () => {
        const tva = tvaAmount(money(10000), 1000);
        expect(tva.amount_cents).toBe(1000);
      });

      it('calculates 5.5% TVA', () => {
        // 10000 * 550 / 10000 = 550
        const tva = tvaAmount(money(10000), 550);
        expect(tva.amount_cents).toBe(550);
      });

      it('calculates 2.1% TVA', () => {
        // 10000 * 210 / 10000 = 210
        const tva = tvaAmount(money(10000), 210);
        expect(tva.amount_cents).toBe(210);
      });

      it('rounds correctly for odd amounts', () => {
        // 1999 * 2000 / 10000 = 399.8 → 400
        const tva = tvaAmount(money(1999), 2000);
        expect(tva.amount_cents).toBe(400);
      });

      it('handles 5.5% with rounding', () => {
        // 333 * 550 / 10000 = 18.315 → 18
        const tva = tvaAmount(money(333), 550);
        expect(tva.amount_cents).toBe(18);
      });

      it('handles zero amount', () => {
        expect(tvaAmount(money(0), 2000).amount_cents).toBe(0);
      });

      it('rejects negative rate', () => {
        expect(() => tvaAmount(money(1000), -100)).toThrow('non-negative integer');
      });

      it('rejects non-integer rate', () => {
        expect(() => tvaAmount(money(1000), 20.5)).toThrow('non-negative integer');
      });
    });

    describe('ttcFromHt()', () => {
      it('calculates TTC from HT at 20%', () => {
        const ttc = ttcFromHt(money(10000), 2000);
        expect(ttc.amount_cents).toBe(12000);
      });

      it('calculates TTC from HT at 5.5%', () => {
        const ttc = ttcFromHt(money(10000), 550);
        expect(ttc.amount_cents).toBe(10550);
      });
    });

    describe('htFromTtc()', () => {
      it('reverse-calculates HT from TTC at 20%', () => {
        const ht = htFromTtc(money(12000), 2000);
        expect(ht.amount_cents).toBe(10000);
      });

      it('reverse-calculates HT from TTC at 5.5%', () => {
        // 10550 * 10000 / 10550 = 10000
        const ht = htFromTtc(money(10550), 550);
        expect(ht.amount_cents).toBe(10000);
      });
    });

    describe('TVA multi-taux coherence', () => {
      it('verifies no centimes are lost on a multi-taux invoice', () => {
        // Simulate a quote with lines at different TVA rates
        const line1_ht = money(15000); // 150.00 EUR at 20%
        const line2_ht = money(8000); // 80.00 EUR at 10%
        const line3_ht = money(5000); // 50.00 EUR at 5.5%

        const tva1 = tvaAmount(line1_ht, 2000); // 3000
        const tva2 = tvaAmount(line2_ht, 1000); // 800
        const tva3 = tvaAmount(line3_ht, 550); // 275

        const total_ht = addMoney(line1_ht, line2_ht, line3_ht);
        const total_tva = addMoney(tva1, tva2, tva3);
        const total_ttc = addMoney(total_ht, total_tva);

        expect(total_ht.amount_cents).toBe(28000);
        expect(total_tva.amount_cents).toBe(4075);
        expect(total_ttc.amount_cents).toBe(32075);
      });
    });
  });

  describe('predicates', () => {
    it('isZero', () => {
      expect(isZero(money(0))).toBe(true);
      expect(isZero(money(1))).toBe(false);
    });

    it('isPositive', () => {
      expect(isPositive(money(100))).toBe(true);
      expect(isPositive(money(0))).toBe(false);
      expect(isPositive(money(-1))).toBe(false);
    });

    it('isNegative', () => {
      expect(isNegative(money(-1))).toBe(true);
      expect(isNegative(money(0))).toBe(false);
      expect(isNegative(money(1))).toBe(false);
    });
  });
});
