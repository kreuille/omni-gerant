import { describe, it, expect } from 'vitest';
import {
  computeTerminationFromSnapshot,
  type EmployeeSnapshot,
} from '../termination/termination.service.js';

// BUSINESS RULE [CDC-RH-V4]: tests indemnites rupture 5 scenarios

const cdi5ans: EmployeeSnapshot = {
  contract_type: 'cdi',
  start_date: new Date('2021-01-15T00:00:00.000Z'),
  monthly_gross_cents: 250000, // 2500 EUR brut
};

const cdd18mois: EmployeeSnapshot = {
  contract_type: 'cdd',
  start_date: new Date('2024-10-01T00:00:00.000Z'),
  monthly_gross_cents: 200000,
};

const apprenti: EmployeeSnapshot = {
  contract_type: 'apprentice',
  start_date: new Date('2024-09-01T00:00:00.000Z'),
  monthly_gross_cents: 90000,
};

describe('Scenario 1 — CDI licenciement 5 ans d\'anciennete', () => {
  const result = computeTerminationFromSnapshot(cdi5ans, {
    employeeId: 'e1',
    reason: 'licenciement',
    terminationDate: new Date('2026-01-15T00:00:00.000Z'),
  });

  it('renvoie OK', () => {
    expect(result.ok).toBe(true);
  });

  it('anciennete = ~5 ans', () => {
    if (!result.ok) return;
    expect(result.value.seniorityYears).toBeGreaterThanOrEqual(4);
    expect(result.value.seniorityYears).toBeLessThanOrEqual(5);
  });

  it('indemnite legale licenciement = 5 * 2500 * 0.25 = 3125 EUR', () => {
    if (!result.ok) return;
    // Approx (le calcul exact utilise years decimal)
    expect(result.value.indemniteLegaleLicenciementCents).toBeGreaterThan(312000);
    expect(result.value.indemniteLegaleLicenciementCents).toBeLessThan(315000);
  });

  it('attestation Pole Emploi dans les documents requis', () => {
    if (!result.ok) return;
    expect(result.value.documentsRequis).toContain('attestation_pole_emploi');
  });
});

describe('Scenario 2 — CDI demission', () => {
  const result = computeTerminationFromSnapshot(cdi5ans, {
    employeeId: 'e2',
    reason: 'demission',
    terminationDate: new Date('2026-01-15T00:00:00.000Z'),
    cpDaysRemaining: 10,
  });

  it('pas d\'indemnite legale', () => {
    if (!result.ok) return;
    expect(result.value.indemniteLegaleLicenciementCents).toBe(0);
    expect(result.value.indemniteRuptureConventionnelleCents).toBe(0);
    expect(result.value.indemnitePrecariteCents).toBe(0);
  });

  it('indemnite compensatrice CP presente', () => {
    if (!result.ok) return;
    // 10 jours * (250000/21.67) = 10 * 11537 = ~115370
    expect(result.value.indemniteCompensatriceCongesCents).toBeGreaterThan(100000);
    expect(result.value.indemniteCompensatriceCongesCents).toBeLessThan(130000);
  });
});

describe('Scenario 3 — CDI rupture conventionnelle', () => {
  const result = computeTerminationFromSnapshot(cdi5ans, {
    employeeId: 'e3',
    reason: 'rupture_conventionnelle',
    terminationDate: new Date('2026-01-15T00:00:00.000Z'),
  });

  it('indemnite rupture conv = indemnite legale minimum', () => {
    if (!result.ok) return;
    expect(result.value.indemniteRuptureConventionnelleCents).toBeGreaterThan(312000);
  });

  it('pas d\'indemnite de licenciement (remplacee par ISRC)', () => {
    if (!result.ok) return;
    expect(result.value.indemniteLegaleLicenciementCents).toBe(0);
  });
});

describe('Scenario 4 — Fin CDD avec indemnite precarite 10%', () => {
  const result = computeTerminationFromSnapshot(cdd18mois, {
    employeeId: 'e4',
    reason: 'fin_cdd',
    terminationDate: new Date('2026-04-01T00:00:00.000Z'),
    totalGrossPaidCents: 3000000, // 30 000 EUR brut total
  });

  it('indemnite precarite = 10% du brut total = 3000 EUR', () => {
    if (!result.ok) return;
    expect(result.value.indemnitePrecariteCents).toBe(300000);
  });

  it('pas d\'indemnite legale licenciement (CDD)', () => {
    if (!result.ok) return;
    expect(result.value.indemniteLegaleLicenciementCents).toBe(0);
  });
});

describe('Scenario 5 — Fin apprentissage (pas d\'indemnite precarite)', () => {
  const result = computeTerminationFromSnapshot(apprenti, {
    employeeId: 'e5',
    reason: 'fin_apprentissage',
    terminationDate: new Date('2026-06-30T00:00:00.000Z'),
  });

  it('aucune indemnite precarite (Art. L6243-1-1)', () => {
    if (!result.ok) return;
    expect(result.value.indemnitePrecariteCents).toBe(0);
  });

  it('notes mentionnent la regle apprentissage', () => {
    if (!result.ok) return;
    expect(result.value.notes.some((n) => n.includes('L6243-1-1'))).toBe(true);
  });
});

describe('Anciennete insuffisante (<8 mois) pour indemnite legale', () => {
  it('CDI 6 mois licencie -> pas d\'indemnite legale', () => {
    const shortCdi: EmployeeSnapshot = {
      contract_type: 'cdi',
      start_date: new Date('2025-10-01T00:00:00.000Z'),
      monthly_gross_cents: 200000,
    };
    const result = computeTerminationFromSnapshot(shortCdi, {
      employeeId: 'e6',
      reason: 'licenciement',
      terminationDate: new Date('2026-04-01T00:00:00.000Z'),
    });
    if (!result.ok) return;
    expect(result.value.indemniteLegaleLicenciementCents).toBe(0);
  });
});

describe('Indemnite licenciement >10 ans (1/3 au-dela)', () => {
  it('CDI 15 ans : 10 * 0.25 + 5 * 0.333 = 2.5 + 1.67 = 4.17 mois', () => {
    const long: EmployeeSnapshot = {
      contract_type: 'cdi',
      start_date: new Date('2011-01-01T00:00:00.000Z'),
      monthly_gross_cents: 300000,
    };
    const result = computeTerminationFromSnapshot(long, {
      employeeId: 'e7',
      reason: 'licenciement',
      terminationDate: new Date('2026-01-01T00:00:00.000Z'),
    });
    if (!result.ok) return;
    // Environ 4.17 mois x 3000 EUR = 12500 EUR
    expect(result.value.indemniteLegaleLicenciementCents).toBeGreaterThan(1200000);
    expect(result.value.indemniteLegaleLicenciementCents).toBeLessThan(1300000);
  });
});

describe('Preavis paye non effectue', () => {
  it('30 jours a 100 EUR = 3000 EUR', () => {
    const result = computeTerminationFromSnapshot(cdi5ans, {
      employeeId: 'e8',
      reason: 'licenciement',
      terminationDate: new Date('2026-01-15T00:00:00.000Z'),
      noticeDaysPaid: 30,
      noticeDailyCents: 10000,
    });
    if (!result.ok) return;
    expect(result.value.indemniteCompensatricePreavisCents).toBe(300000);
  });
});

describe('Date de sortie invalide', () => {
  it('date avant embauche -> erreur', () => {
    const result = computeTerminationFromSnapshot(cdi5ans, {
      employeeId: 'e9',
      reason: 'licenciement',
      terminationDate: new Date('2020-01-01T00:00:00.000Z'),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_ERROR');
  });
});
