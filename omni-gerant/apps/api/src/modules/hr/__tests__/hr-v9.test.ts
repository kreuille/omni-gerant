import { describe, it, expect } from 'vitest';
import { computePayroll } from '../payroll/payroll-calculator.js';

const base = {
  grossBaseCents: 250000,
  hoursWorked: 151.67,
  weeklyHours: 35,
  headcountUnder50: true,
};

describe('V9 — Arret maladie', () => {
  it('5 jours maladie non couverts -> brut reduit', () => {
    const r0 = computePayroll({ ...base });
    const r = computePayroll({ ...base, sickDaysUnpaidBrut: 5 });
    expect(r.sickDeductionCents).toBeGreaterThan(0);
    expect(r.grossTotalCents).toBeLessThan(r0.grossTotalCents);
  });

  it('deduction = 5 * (brut/21.67)', () => {
    const r = computePayroll({ ...base, sickDaysUnpaidBrut: 5 });
    const expected = Math.round(5 * (250000 / 21.67));
    expect(r.sickDeductionCents).toBe(expected);
  });

  it('IJSS subrogee versee non soumise cotisations', () => {
    const r = computePayroll({ ...base, ijssCents: 12000 });
    expect(r.ijssCents).toBe(12000);
    // IJSS s'ajoute au net sans impact cotisations
    const r0 = computePayroll({ ...base });
    expect(r.netToPayCents).toBe(r0.netToPayCents + 12000);
  });

  it('maladie 3j + IJSS 6000 cents', () => {
    const r = computePayroll({ ...base, sickDaysUnpaidBrut: 3, ijssCents: 6000 });
    expect(r.sickDeductionCents).toBeGreaterThan(0);
    expect(r.ijssCents).toBe(6000);
  });
});

describe('V9 — Indemnite transport', () => {
  it('75 EUR transport non soumis', () => {
    const r0 = computePayroll({ ...base });
    const r = computePayroll({ ...base, transportAllowanceCents: 7500 });
    expect(r.transportAllowanceCents).toBe(7500);
    expect(r.netToPayCents).toBe(r0.netToPayCents + 7500);
  });

  it('transport 0 par defaut', () => {
    const r = computePayroll({ ...base });
    expect(r.transportAllowanceCents).toBe(0);
  });
});

describe('V9 — Cumul arret + IJSS + transport', () => {
  it('scenario complet', () => {
    const r = computePayroll({
      ...base,
      sickDaysUnpaidBrut: 2,
      ijssCents: 4000,
      transportAllowanceCents: 6000,
    });
    expect(r.sickDeductionCents).toBeGreaterThan(0);
    expect(r.ijssCents).toBe(4000);
    expect(r.transportAllowanceCents).toBe(6000);
    // Le net reflete les 3 impacts
    expect(r.grossTotalCents).toBeLessThan(250000); // maladie deduit
  });
});
