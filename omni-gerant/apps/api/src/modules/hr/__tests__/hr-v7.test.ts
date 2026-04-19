import { describe, it, expect } from 'vitest';
import { computePayroll, AVANTAGE_NATURE_REPAS_CENTS_2026, PPV_CEILING_GROSS_CENTS } from '../payroll/payroll-calculator.js';

const base = {
  grossBaseCents: 250000,
  hoursWorked: 151.67,
  weeklyHours: 35,
  headcountUnder50: true,
};

describe('V7 — Heures supp majorees', () => {
  it('5h a +25% = majoration 25% sur taux horaire', () => {
    const r = computePayroll({ ...base, overtime25Hours: 5 });
    const hourly = 250000 / 151.67;
    const expected = Math.round(5 * hourly * 1.25);
    expect(r.overtime25Cents).toBe(expected);
    expect(r.overtime25Hours).toBe(5);
  });

  it('3h a +50% = majoration 50%', () => {
    const r = computePayroll({ ...base, overtime50Hours: 3 });
    const hourly = 250000 / 151.67;
    const expected = Math.round(3 * hourly * 1.50);
    expect(r.overtime50Cents).toBe(expected);
  });

  it('heures sup ajoutees au brut total', () => {
    const r0 = computePayroll({ ...base });
    const r = computePayroll({ ...base, overtime25Hours: 5, overtime50Hours: 2 });
    expect(r.grossTotalCents).toBe(r0.grossTotalCents + r.overtime25Cents + r.overtime50Cents);
  });
});

describe('V7 — Avantages en nature', () => {
  it('5.45 EUR par repas (barème URSSAF 2026)', () => {
    expect(AVANTAGE_NATURE_REPAS_CENTS_2026).toBe(545);
  });

  it('avantage nature soumis a cotisations (inclus brut)', () => {
    const r = computePayroll({ ...base, benefitsInKindCents: 5000 });
    expect(r.grossTotalCents).toBe(255000);
    expect(r.benefitsInKindCents).toBe(5000);
  });

  it('avantage nature re-deduit du net a payer (pas verse cash)', () => {
    const r0 = computePayroll({ ...base });
    const rav = computePayroll({ ...base, benefitsInKindCents: 5000 });
    // cotisations plus elevees + deduction = net inferieur
    expect(rav.netToPayCents).toBeLessThan(r0.netToPayCents);
  });
});

describe('V7 — Prime de Partage de la Valeur', () => {
  it('plafond PPV = 3000 EUR ou 6000 EUR (accord interessement) — ici 9000 simplifie', () => {
    expect(PPV_CEILING_GROSS_CENTS).toBe(900000);
  });

  it('PPV ajoutee au net (exoneree dans cette simplification)', () => {
    const r0 = computePayroll({ ...base });
    const rppv = computePayroll({ ...base, ppvCents: 50000 });
    expect(rppv.netToPayCents).toBe(r0.netToPayCents + 50000);
    expect(rppv.ppvCents).toBe(50000);
  });
});

describe('V7 — Soldes CP/RTT', () => {
  it('soldes stockes dans le breakdown', () => {
    const r = computePayroll({ ...base, cpBalance: 12.5, rttBalance: 5 });
    expect(r.cpBalance).toBe(12.5);
    expect(r.rttBalance).toBe(5);
  });

  it('soldes par defaut 0', () => {
    const r = computePayroll({ ...base });
    expect(r.cpBalance).toBe(0);
    expect(r.rttBalance).toBe(0);
  });
});

describe('V7 — Cumul heures sup + PPV + avantages nature', () => {
  it('tous les elements coherents dans le meme bulletin', () => {
    const r = computePayroll({
      ...base,
      overtime25Hours: 4,
      overtime50Hours: 2,
      benefitsInKindCents: 3000,
      ppvCents: 20000,
      cpBalance: 10,
    });
    expect(r.overtime25Cents).toBeGreaterThan(0);
    expect(r.overtime50Cents).toBeGreaterThan(0);
    expect(r.benefitsInKindCents).toBe(3000);
    expect(r.ppvCents).toBe(20000);
    expect(r.cpBalance).toBe(10);
    // Brut = base + 25% + 50% + avantage nature
    expect(r.grossTotalCents).toBe(250000 + r.overtime25Cents + r.overtime50Cents + 3000);
  });
});
