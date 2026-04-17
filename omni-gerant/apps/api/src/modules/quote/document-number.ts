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

// BUSINESS RULE [CDC-2.1]: Numerotation sequentielle sans trou via PostgreSQL
// Uses advisory lock to prevent concurrent duplicates
export function createPrismaNumberRepo(): DocumentNumberRepository {
  const { prisma } = require('@zenadmin/db') as { prisma: import('@prisma/client').PrismaClient };

  return {
    async getNextSequence(tenantId: string, prefix: string, year: number): Promise<number> {
      // Use a transaction with advisory lock for atomicity
      const result = await prisma.$transaction(async (tx: import('@prisma/client').Prisma.TransactionClient) => {
        // Advisory lock keyed on tenant+prefix+year
        const lockKey = `${tenantId}:${prefix}:${year}`;
        const lockId = hashCode(lockKey);
        await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${lockId})`);

        // Find current max sequence
        const tableName = prefix === 'FAC' ? 'invoices' : 'quotes';
        const pattern = `${prefix}-${year}-%`;
        const rows = await tx.$queryRawUnsafe<Array<{ number: string }>>(
          `SELECT number FROM ${tableName} WHERE tenant_id = $1::uuid AND number LIKE $2 ORDER BY number DESC LIMIT 1`,
          tenantId,
          pattern,
        );

        if (rows.length === 0) return 1;

        const lastNumber = rows[0]!.number;
        const parts = lastNumber.split('-');
        const lastSeq = parseInt(parts[2] ?? '0', 10);
        return lastSeq + 1;
      });

      return result;
    },
  };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
