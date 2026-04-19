import { describe, it, expect } from 'vitest';
import {
  validateSmic,
  SMIC_MONTHLY_CENTS_2026,
  LEGAL_WEEKLY_HOURS,
} from '../hr-compliance.js';

// BUSINESS RULE [CDC-RH-V1]: validation conformite droit du travail FR

describe('validateSmic — CDI temps plein', () => {
  it('accepts SMIC exact', () => {
    const r = validateSmic({
      monthlyGrossCents: SMIC_MONTHLY_CENTS_2026,
      weeklyHours: 35,
      contractType: 'cdi',
    });
    expect(r.valid).toBe(true);
    expect(r.minimumCents).toBe(SMIC_MONTHLY_CENTS_2026);
  });

  it('rejects salary < SMIC', () => {
    const r = validateSmic({
      monthlyGrossCents: SMIC_MONTHLY_CENTS_2026 - 1,
      weeklyHours: 35,
      contractType: 'cdi',
    });
    expect(r.valid).toBe(false);
    expect(r.messageKey).toBe('below_smic');
  });

  it('accepts salary > SMIC', () => {
    const r = validateSmic({
      monthlyGrossCents: 250000,
      weeklyHours: 35,
      contractType: 'cdi',
    });
    expect(r.valid).toBe(true);
  });
});

describe('validateSmic — temps partiel', () => {
  it('prorate SMIC sur heures', () => {
    const halfTime = Math.round(SMIC_MONTHLY_CENTS_2026 * (17.5 / LEGAL_WEEKLY_HOURS));
    const r = validateSmic({
      monthlyGrossCents: halfTime,
      weeklyHours: 17.5,
      contractType: 'cdi',
    });
    expect(r.valid).toBe(true);
  });

  it('rejects temps partiel sous prorata', () => {
    const r = validateSmic({
      monthlyGrossCents: 50000,
      weeklyHours: 17.5,
      contractType: 'cdi',
    });
    expect(r.valid).toBe(false);
    expect(r.messageKey).toBe('below_part_time_pro_rata');
  });
});

describe('validateSmic — apprenti', () => {
  it('applique le taux reduit 27% pour <18 ans annee 1', () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 17);
    const startDate = new Date();
    const minApp = Math.round(SMIC_MONTHLY_CENTS_2026 * 0.27);
    const r = validateSmic({
      monthlyGrossCents: minApp,
      weeklyHours: 35,
      contractType: 'apprentice',
      birthDate: birthDate.toISOString(),
      startDate: startDate.toISOString(),
    });
    expect(r.valid).toBe(true);
    expect(r.minimumCents).toBe(minApp);
  });

  it('rejects apprenti sous taux legal', () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 17);
    const startDate = new Date();
    const r = validateSmic({
      monthlyGrossCents: 10000,
      weeklyHours: 35,
      contractType: 'apprentice',
      birthDate: birthDate.toISOString(),
      startDate: startDate.toISOString(),
    });
    expect(r.valid).toBe(false);
    expect(r.messageKey).toBe('below_apprentice_min');
  });

  it('applique 100% SMIC pour apprenti >=26 ans', () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 27);
    const startDate = new Date();
    const r = validateSmic({
      monthlyGrossCents: SMIC_MONTHLY_CENTS_2026,
      weeklyHours: 35,
      contractType: 'apprentice',
      birthDate: birthDate.toISOString(),
      startDate: startDate.toISOString(),
    });
    expect(r.valid).toBe(true);
    expect(r.minimumCents).toBe(SMIC_MONTHLY_CENTS_2026);
  });
});

describe('validateSmic — stagiaire', () => {
  it('always valid (pas de SMIC pour stagiaire en V1)', () => {
    const r = validateSmic({
      monthlyGrossCents: 0,
      weeklyHours: 35,
      contractType: 'intern',
    });
    expect(r.valid).toBe(true);
    expect(r.minimumCents).toBe(0);
  });
});
