import type { Result, PaginatedResult } from '@zenadmin/shared';
import { ok, err, notFound } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';
import type { CreateSupplierInput, UpdateSupplierInput, SupplierListQuery } from './supplier.schemas.js';

// BUSINESS RULE [CDC-2.2]: CRUD Fournisseurs avec IBAN/BIC
// BUSINESS RULE [R03]: Multi-tenant avec tenant_id
// BUSINESS RULE [R04]: Soft delete

export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  siret: string | null;
  email: string | null;
  phone: string | null;
  address: Record<string, unknown> | null;
  iban: string | null;
  bic: string | null;
  payment_terms: number;
  category: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface SupplierRepository {
  create(data: CreateSupplierInput & { tenant_id: string }): Promise<Supplier>;
  findById(id: string, tenantId: string): Promise<Supplier | null>;
  update(id: string, tenantId: string, data: UpdateSupplierInput): Promise<Supplier | null>;
  softDelete(id: string, tenantId: string): Promise<boolean>;
  list(tenantId: string, query: SupplierListQuery): Promise<{ items: Supplier[]; total: number }>;
}

export function createSupplierService(repo: SupplierRepository) {
  return {
    async createSupplier(
      tenantId: string,
      input: CreateSupplierInput,
    ): Promise<Result<Supplier, AppError>> {
      const supplier = await repo.create({ ...input, tenant_id: tenantId });
      return ok(supplier);
    },

    async getSupplier(id: string, tenantId: string): Promise<Result<Supplier, AppError>> {
      const supplier = await repo.findById(id, tenantId);
      if (!supplier) {
        return err(notFound('Supplier', id));
      }
      return ok(supplier);
    },

    async updateSupplier(
      id: string,
      tenantId: string,
      input: UpdateSupplierInput,
    ): Promise<Result<Supplier, AppError>> {
      const existing = await repo.findById(id, tenantId);
      if (!existing) {
        return err(notFound('Supplier', id));
      }

      const updated = await repo.update(id, tenantId, input);
      if (!updated) {
        return err(notFound('Supplier', id));
      }
      return ok(updated);
    },

    async deleteSupplier(id: string, tenantId: string): Promise<Result<void, AppError>> {
      const existing = await repo.findById(id, tenantId);
      if (!existing) {
        return err(notFound('Supplier', id));
      }
      await repo.softDelete(id, tenantId);
      return ok(undefined);
    },

    async listSuppliers(
      tenantId: string,
      query: SupplierListQuery,
    ): Promise<Result<PaginatedResult<Supplier>, AppError>> {
      const { items, total } = await repo.list(tenantId, query);
      const hasMore = items.length === query.limit;
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!.id : null;

      return ok({
        items,
        next_cursor: nextCursor,
        has_more: hasMore,
        total,
      });
    },
  };
}
