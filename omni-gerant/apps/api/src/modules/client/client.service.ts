import type { Result, PaginatedResult } from '@zenadmin/shared';
import { ok, err, notFound, validationError } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';
import type { CreateClientInput, UpdateClientInput, ClientListQuery } from './client.schemas.js';

// BUSINESS RULE [R07]: Cursor-based pagination par defaut
// BUSINESS RULE [R03]: Multi-tenant avec tenant_id

export interface Client {
  id: string;
  tenant_id: string;
  type: string;
  company_name: string | null;
  siret: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  zip_code: string | null;
  city: string | null;
  country: string;
  notes: string | null;
  payment_terms: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface ClientRepository {
  create(data: CreateClientInput & { tenant_id: string }): Promise<Client>;
  findById(id: string, tenantId: string): Promise<Client | null>;
  update(id: string, tenantId: string, data: UpdateClientInput): Promise<Client | null>;
  softDelete(id: string, tenantId: string): Promise<boolean>;
  list(tenantId: string, query: ClientListQuery): Promise<{ items: Client[]; total: number }>;
}

export function getClientDisplayName(client: Client): string {
  if (client.type === 'company' && client.company_name) {
    return client.company_name;
  }
  return [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Sans nom';
}

export function createClientService(repo: ClientRepository) {
  return {
    async createClient(
      tenantId: string,
      input: CreateClientInput,
    ): Promise<Result<Client, AppError>> {
      const client = await repo.create({ ...input, tenant_id: tenantId });
      return ok(client);
    },

    async getClient(id: string, tenantId: string): Promise<Result<Client, AppError>> {
      const client = await repo.findById(id, tenantId);
      if (!client) {
        return err(notFound('Client', id));
      }
      return ok(client);
    },

    async updateClient(
      id: string,
      tenantId: string,
      input: UpdateClientInput,
    ): Promise<Result<Client, AppError>> {
      const existing = await repo.findById(id, tenantId);
      if (!existing) {
        return err(notFound('Client', id));
      }

      // Validate type consistency
      const newType = input.type ?? existing.type;
      if (newType === 'company') {
        const name = input.company_name ?? existing.company_name;
        if (!name) {
          return err(validationError('Company name is required for company type'));
        }
      }

      const updated = await repo.update(id, tenantId, input);
      if (!updated) {
        return err(notFound('Client', id));
      }
      return ok(updated);
    },

    async deleteClient(id: string, tenantId: string): Promise<Result<void, AppError>> {
      const existing = await repo.findById(id, tenantId);
      if (!existing) {
        return err(notFound('Client', id));
      }
      await repo.softDelete(id, tenantId);
      return ok(undefined);
    },

    async listClients(
      tenantId: string,
      query: ClientListQuery,
    ): Promise<Result<PaginatedResult<Client>, AppError>> {
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
