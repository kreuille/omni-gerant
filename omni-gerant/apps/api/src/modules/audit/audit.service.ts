import type { Result, PaginatedResult } from '@omni-gerant/shared';
import { ok, err, notFound } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';

// BUSINESS RULE [CDC-6]: Audit trail immutable - chaque mutation est tracee

export interface AuditEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

export interface CreateAuditInput {
  tenant_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export interface AuditListParams {
  tenant_id: string;
  cursor?: string;
  limit?: number;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  action?: string;
  from?: Date;
  to?: Date;
}

export interface AuditRepository {
  create(data: CreateAuditInput): Promise<AuditEntry>;
  findByTenant(params: AuditListParams): Promise<{ items: AuditEntry[]; next_cursor: string | null; has_more: boolean }>;
  findById(id: string, tenantId: string): Promise<AuditEntry | null>;
}

export function createAuditService(repo: AuditRepository) {
  return {
    // BUSINESS RULE [CDC-6]: Log an audit event (fire-and-forget, never fails the parent operation)
    async log(input: CreateAuditInput): Promise<Result<AuditEntry, AppError>> {
      const entry = await repo.create(input);
      return ok(entry);
    },

    async list(params: AuditListParams): Promise<Result<PaginatedResult<AuditEntry>, AppError>> {
      const result = await repo.findByTenant({
        ...params,
        limit: params.limit ?? 50,
      });
      return ok({
        items: result.items,
        next_cursor: result.next_cursor,
        has_more: result.has_more,
      });
    },

    async getById(id: string, tenantId: string): Promise<Result<AuditEntry, AppError>> {
      const entry = await repo.findById(id, tenantId);
      if (!entry) {
        return err(notFound('AuditEntry', id));
      }
      return ok(entry);
    },
  };
}
