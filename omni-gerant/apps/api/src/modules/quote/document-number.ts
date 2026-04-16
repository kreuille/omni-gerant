import type { Result } from '@zenadmin/shared';
import { ok } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';

// BUSINESS RULE [CDC-2.1]: Numerotation sequentielle
// Format: DEV-{ANNEE}-{SEQUENCE:5} (ex: DEV-2026-00001)
// Sequence par tenant, par annee, sans trou

export interface DocumentNumberRepository {
  getNextSequence(tenantId: string, prefix: string, year: number): Promise<number>;
}

export type DocumentPrefix = 'DEV' | 'FAC' | 'AV';

export function formatDocumentNumber(prefix: DocumentPrefix, year: number, sequence: number): string {
  const paddedSeq = String(sequence).padStart(5, '0');
  return `${prefix}-${year}-${paddedSeq}`;
}

export function createDocumentNumberGenerator(repo: DocumentNumberRepository) {
  return {
    async generate(tenantId: string, prefix: DocumentPrefix, date?: Date): Promise<Result<string, AppError>> {
      const year = (date ?? new Date()).getFullYear();
      const sequence = await repo.getNextSequence(tenantId, prefix, year);
      return ok(formatDocumentNumber(prefix, year, sequence));
    },
  };
}

// In-memory counter for testing / placeholder
export function createInMemoryNumberRepo(): DocumentNumberRepository {
  const counters = new Map<string, number>();

  return {
    async getNextSequence(tenantId: string, prefix: string, year: number): Promise<number> {
      const key = `${tenantId}:${prefix}:${year}`;
      const current = counters.get(key) ?? 0;
      const next = current + 1;
      counters.set(key, next);
      return next;
    },
  };
}
