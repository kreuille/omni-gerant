import { describe, it, expect } from 'vitest';
import { createDuerpSchema } from '../duerp.schemas.js';

// BUSINESS RULE [DUERP-020]: evaluator_name is optional with default

describe('DUERP schema validation', () => {
  it('accepts creation without evaluator_name (uses default)', () => {
    const result = createDuerpSchema.safeParse({
      company_name: 'Test SARL',
      employee_count: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.evaluator_name).toBe('Responsable');
    }
  });

  it('accepts creation with evaluator_name', () => {
    const result = createDuerpSchema.safeParse({
      company_name: 'Test SARL',
      employee_count: 5,
      evaluator_name: 'Jean Martin',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.evaluator_name).toBe('Jean Martin');
    }
  });

  it('accepts creation with full data', () => {
    const result = createDuerpSchema.safeParse({
      company_name: 'Test SARL',
      siret: '89024639000029',
      naf_code: '43.21A',
      employee_count: 10,
      evaluator_name: 'Pierre Dupont',
      risks: [],
      work_units: [],
    });
    expect(result.success).toBe(true);
  });
});
