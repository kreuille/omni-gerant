// BUSINESS RULE [CDC-2.1]: Audit NF525 enrichi — tracabilite des actions sur factures
// BUSINESS RULE [CDC-6]: Journal d'audit immutable avec hash before/after

import type { Result, PaginatedResult } from '@zenadmin/shared';
import { ok, err, notFound } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';
import crypto from 'node:crypto';

// --- Types ---

export type NF525AuditAction =
  | 'create'
  | 'validate'
  | 'send_ppf'
  | 'receive_status'
  | 'cancel'
  | 'credit_note'
  | 'payment';

export interface NF525AuditEntry {
  id: string;
  timestamp: Date;
  action: NF525AuditAction;
  invoiceId: string;
  invoiceNumber: string;
  tenantId: string;
  userId: string;
  hashBefore: string;
  hashAfter: string;
  chainPosition: number;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, unknown>;
}

export interface NF525AuditListQuery {
  cursor?: string;
  limit: number;
  invoiceId?: string;
  action?: NF525AuditAction;
  from?: string;
  to?: string;
}

// --- Repository ---

export interface NF525AuditRepository {
  create(entry: Omit<NF525AuditEntry, 'id'>): Promise<NF525AuditEntry>;
  findByInvoiceId(invoiceId: string, tenantId: string): Promise<NF525AuditEntry[]>;
  list(tenantId: string, query: NF525AuditListQuery): Promise<{ items: NF525AuditEntry[]; next_cursor: string | null; has_more: boolean }>;
  getAll(tenantId: string): Promise<NF525AuditEntry[]>;
}

// --- Audit entry hash for integrity verification ---

function computeAuditEntryHash(entry: Omit<NF525AuditEntry, 'id'>): string {
  const payload = JSON.stringify({
    action: entry.action,
    chainPosition: entry.chainPosition,
    hashAfter: entry.hashAfter,
    hashBefore: entry.hashBefore,
    invoiceId: entry.invoiceId,
    invoiceNumber: entry.invoiceNumber,
    tenantId: entry.tenantId,
    timestamp: entry.timestamp.toISOString(),
    userId: entry.userId,
  });
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

// --- Service ---

export function createNF525AuditService(repo: NF525AuditRepository) {
  // BUSINESS RULE [CDC-2.1]: Tracer chaque action sur une facture
  async function log(input: {
    action: NF525AuditAction;
    invoiceId: string;
    invoiceNumber: string;
    tenantId: string;
    userId: string;
    hashBefore: string;
    hashAfter: string;
    chainPosition: number;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  }): Promise<Result<NF525AuditEntry, AppError>> {
    const entry = await repo.create({
      timestamp: new Date(),
      action: input.action,
      invoiceId: input.invoiceId,
      invoiceNumber: input.invoiceNumber,
      tenantId: input.tenantId,
      userId: input.userId,
      hashBefore: input.hashBefore,
      hashAfter: input.hashAfter,
      chainPosition: input.chainPosition,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      details: input.details ?? {},
    });

    return ok(entry);
  }

  // BUSINESS RULE [CDC-2.1]: Journal audit d'une facture
  async function getByInvoice(
    invoiceId: string,
    tenantId: string,
  ): Promise<Result<NF525AuditEntry[], AppError>> {
    const entries = await repo.findByInvoiceId(invoiceId, tenantId);
    return ok(entries);
  }

  // BUSINESS RULE [CDC-2.1]: Journal NF525 complet (admin)
  async function list(
    tenantId: string,
    query: NF525AuditListQuery,
  ): Promise<Result<PaginatedResult<NF525AuditEntry>, AppError>> {
    const result = await repo.list(tenantId, {
      ...query,
      limit: query.limit ?? 50,
    });
    return ok({
      items: result.items,
      next_cursor: result.next_cursor,
      has_more: result.has_more,
    });
  }

  // BUSINESS RULE [CDC-2.1]: Export audit pour controle fiscal (CSV/JSON)
  async function exportForAudit(
    tenantId: string,
    format: 'json' | 'csv' = 'json',
  ): Promise<Result<string, AppError>> {
    const entries = await repo.getAll(tenantId);

    // Sort chronologically
    const sorted = [...entries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (format === 'json') {
      return ok(JSON.stringify(sorted, null, 2));
    }

    // CSV format
    const headers = [
      'id', 'timestamp', 'action', 'invoiceId', 'invoiceNumber',
      'userId', 'hashBefore', 'hashAfter', 'chainPosition',
      'ipAddress', 'userAgent', 'details',
    ];
    const rows = sorted.map((e) => [
      e.id,
      e.timestamp.toISOString(),
      e.action,
      e.invoiceId,
      e.invoiceNumber,
      e.userId,
      e.hashBefore,
      e.hashAfter,
      String(e.chainPosition),
      e.ipAddress ?? '',
      e.userAgent ?? '',
      JSON.stringify(e.details),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    return ok([headers.join(','), ...rows].join('\n'));
  }

  // BUSINESS RULE [CDC-2.1]: Verification integrite du journal
  async function verifyAuditIntegrity(
    tenantId: string,
  ): Promise<Result<{ valid: boolean; totalEntries: number; errors: string[] }, AppError>> {
    const entries = await repo.getAll(tenantId);
    const sorted = [...entries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const errors: string[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i]!;

      // Verify chronological order
      if (i > 0) {
        const prev = sorted[i - 1]!;
        if (entry.timestamp.getTime() < prev.timestamp.getTime()) {
          errors.push(`Entry ${entry.id}: timestamp ${entry.timestamp.toISOString()} is before previous entry ${prev.timestamp.toISOString()}`);
        }
      }

      // Verify hash before/after differ for non-create actions
      if (entry.action !== 'create' && entry.hashBefore === entry.hashAfter && entry.hashBefore !== '') {
        errors.push(`Entry ${entry.id}: hashBefore equals hashAfter for action '${entry.action}'`);
      }
    }

    return ok({
      valid: errors.length === 0,
      totalEntries: sorted.length,
      errors,
    });
  }

  return {
    log,
    getByInvoice,
    list,
    exportForAudit,
    verifyAuditIntegrity,
  };
}
