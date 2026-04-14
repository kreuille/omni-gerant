import type { Result } from '@omni-gerant/shared';
import { ok, err, notFound } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';
import type { UpdateTenantInput } from './tenant.schemas.js';

// In-memory tenant store for now (will be replaced with Prisma when DB is connected)
interface Tenant {
  id: string;
  name: string;
  siret: string | null;
  siren: string | null;
  naf_code: string | null;
  legal_form: string | null;
  address: Record<string, unknown> | null;
  settings: Record<string, unknown>;
  plan: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface TenantRepository {
  findById(id: string): Promise<Tenant | null>;
  update(id: string, data: Partial<Tenant>): Promise<Tenant | null>;
}

export function createTenantService(repo: TenantRepository) {
  return {
    async getTenant(tenantId: string): Promise<Result<Tenant, AppError>> {
      const tenant = await repo.findById(tenantId);
      if (!tenant) {
        return err(notFound('Tenant', tenantId));
      }
      return ok(tenant);
    },

    async updateTenant(
      tenantId: string,
      input: UpdateTenantInput,
    ): Promise<Result<Tenant, AppError>> {
      const tenant = await repo.findById(tenantId);
      if (!tenant) {
        return err(notFound('Tenant', tenantId));
      }

      const updated = await repo.update(tenantId, {
        ...input,
        address: input.address as Record<string, unknown> | undefined,
        updated_at: new Date(),
      });

      if (!updated) {
        return err(notFound('Tenant', tenantId));
      }

      return ok(updated);
    },
  };
}
