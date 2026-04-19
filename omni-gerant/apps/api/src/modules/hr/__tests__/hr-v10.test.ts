import { describe, it, expect } from 'vitest';

// BUSINESS RULE [CDC-RH-V10]: analytics — pyramid + counts
// Tests pur helpers (pas de DB needed)

function yearsSince(d: Date | null): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

describe('V10 — Analytics helpers', () => {
  it('yearsSince null -> null', () => {
    expect(yearsSince(null)).toBeNull();
  });

  it('yearsSince date d\'hier -> 0', () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    expect(yearsSince(y)).toBe(0);
  });

  it('yearsSince date il y a 5 ans -> 4 ou 5', () => {
    const y = new Date();
    y.setFullYear(y.getFullYear() - 5);
    const result = yearsSince(y);
    expect([4, 5]).toContain(result);
  });

  it('pyramid ranges coherents', () => {
    const ages = [22, 28, 35, 42, 55, 60];
    const p = {
      under25: ages.filter((a) => a < 25).length,
      r25to34: ages.filter((a) => a >= 25 && a < 35).length,
      r35to44: ages.filter((a) => a >= 35 && a < 45).length,
      r45to54: ages.filter((a) => a >= 45 && a < 55).length,
      over55: ages.filter((a) => a >= 55).length,
    };
    expect(p.under25).toBe(1);
    expect(p.r25to34).toBe(1);
    expect(p.r35to44).toBe(2);
    expect(p.r45to54).toBe(0);
    expect(p.over55).toBe(2);
    expect(p.under25 + p.r25to34 + p.r35to44 + p.r45to54 + p.over55).toBe(6);
  });

  it('taux turnover = exits / avg headcount * 100', () => {
    const rate = (exits: number, avgHeadcount: number) => avgHeadcount > 0 ? Math.round((exits / avgHeadcount) * 1000) / 10 : 0;
    expect(rate(2, 10)).toBe(20.0);
    expect(rate(0, 5)).toBe(0);
    expect(rate(1, 8)).toBe(12.5);
  });

  it('moyenne anciennete = round(sum / n, 1dec)', () => {
    const avg = (xs: number[]) => xs.length > 0 ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null;
    expect(avg([1, 2, 3])).toBe(2);
    expect(avg([1.3, 2.7, 4.9])).toBe(3);
    expect(avg([])).toBeNull();
  });
});
