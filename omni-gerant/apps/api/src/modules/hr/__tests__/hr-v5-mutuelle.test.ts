import { describe, it, expect } from 'vitest';
import { computePayroll } from '../payroll/payroll-calculator.js';

// BUSINESS RULE [CDC-RH-V5]: tests mutuelle + prevoyance + TR

const base = {
  grossBaseCents: 250000,
  hoursWorked: 151.67,
  weeklyHours: 35,
  headcountUnder50: true,
};

describe('Mutuelle — taux salarial', () => {
  it('taux 1% salarial prelevé sur brut', () => {
    const r = computePayroll({ ...base, mutuelleEmployeeRateBp: 100 });
    expect(r.mutualEmployeeCents).toBe(2500); // 1% de 2500 EUR
  });

  it('taux 0 -> pas de prelevement', () => {
    const r = computePayroll({ ...base });
    expect(r.mutualEmployeeCents).toBe(0);
  });

  it('forfait 30€ sans taux', () => {
    const r = computePayroll({ ...base, mutuelleFlatEmployeeCents: 3000 });
    expect(r.mutualEmployeeCents).toBe(3000);
  });

  it('taux prioritaire sur forfait si > 0', () => {
    const r = computePayroll({ ...base, mutuelleEmployeeRateBp: 100, mutuelleFlatEmployeeCents: 5000 });
    expect(r.mutualEmployeeCents).toBe(2500); // taux gagne
  });
});

describe('Mutuelle — part patronale', () => {
  it('taux 1,5% patronal', () => {
    const r = computePayroll({ ...base, mutuelleEmployerRateBp: 150 });
    expect(r.mutualEmployerCents).toBe(3750);
    expect(r.totalEmployerChargesCents).toBeGreaterThan(3750);
  });
});

describe('Prevoyance', () => {
  it('taux 1,5% salarial + 1,5% patronal', () => {
    const r = computePayroll({ ...base, prevoyanceEmployeeRateBp: 150, prevoyanceEmployerRateBp: 150 });
    expect(r.prevoyanceEmployeeCents).toBe(3750);
    expect(r.prevoyanceEmployerCents).toBe(3750);
  });

  it('prevoyance salariale deduite du net', () => {
    const without = computePayroll({ ...base });
    const withPrev = computePayroll({ ...base, prevoyanceEmployeeRateBp: 150 });
    expect(withPrev.netToPayCents).toBe(without.netToPayCents - 3750);
  });
});

describe('Titres restaurants', () => {
  it('20 titres x 9€ a 50% = 90€ salarie + 90€ patron', () => {
    const r = computePayroll({ ...base, trCount: 20, trFaceValueCents: 900, trEmployerShareBp: 5000 });
    expect(r.trCount).toBe(20);
    expect(r.trEmployerCents).toBe(9000);
    expect(r.trEmployeeCents).toBe(9000);
  });

  it('60% patronal = limite haute exoneration', () => {
    const r = computePayroll({ ...base, trCount: 20, trFaceValueCents: 900, trEmployerShareBp: 6000 });
    expect(r.trEmployerCents).toBe(10800);
    expect(r.trEmployeeCents).toBe(7200);
  });

  it('part salariale TR deduite du net a payer', () => {
    const without = computePayroll({ ...base });
    const withTr = computePayroll({ ...base, trCount: 20, trFaceValueCents: 900, trEmployerShareBp: 5000 });
    expect(withTr.netToPayCents).toBe(without.netToPayCents - 9000);
  });

  it('TR 0 -> aucun impact', () => {
    const r = computePayroll({ ...base });
    expect(r.trCount).toBe(0);
    expect(r.trEmployeeCents).toBe(0);
  });
});

describe('Cumul mutuelle + prevoyance', () => {
  it('mutuelle 1% + prevoyance 1,5% = 2,5% deduit du brut en plus', () => {
    const base2500 = base.grossBaseCents;
    const without = computePayroll({ ...base });
    const withBoth = computePayroll({ ...base, mutuelleEmployeeRateBp: 100, prevoyanceEmployeeRateBp: 150 });
    // Net a payer reduit de 62.50€ (2500 * 2.5%)
    const expected = Math.round(base2500 * 0.025);
    expect(without.netToPayCents - withBoth.netToPayCents).toBe(expected);
  });
});
