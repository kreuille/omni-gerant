import { prisma } from '@omni-gerant/db';
import type { ClientRepository, Client } from './client.service.js';
import type { CreateClientInput, UpdateClientInput, ClientListQuery } from './client.schemas.js';

// BUSINESS RULE [R03]: Multi-tenant — tenant_id in every query
// BUSINESS RULE [R04]: Soft delete via Prisma middleware

export function createPrismaClientRepository(): ClientRepository {
  return {
    async create(data: CreateClientInput & { tenant_id: string }): Promise<Client> {
      const row = await prisma.client.create({ data });
      return mapClient(row);
    },

    async findById(id: string, tenantId: string): Promise<Client | null> {
      const row = await prisma.client.findFirst({
        where: { id, tenant_id: tenantId },
      });
      return row ? mapClient(row) : null;
    },

    async update(id: string, tenantId: string, data: UpdateClientInput): Promise<Client | null> {
      try {
        const row = await prisma.client.update({
          where: { id },
          data: { ...data, tenant_id: tenantId },
        });
        return mapClient(row);
      } catch {
        return null;
      }
    },

    async softDelete(id: string, tenantId: string): Promise<boolean> {
      try {
        await prisma.client.delete({ where: { id } });
        return true;
      } catch {
        return false;
      }
    },

    async list(tenantId: string, query: ClientListQuery): Promise<{ items: Client[]; total: number }> {
      const where: Record<string, unknown> = { tenant_id: tenantId };
      if (query.search) {
        where['OR'] = [
          { company_name: { contains: query.search, mode: 'insensitive' } },
          { last_name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ];
      }
      if (query.type) where['type'] = query.type;

      const [items, total] = await Promise.all([
        prisma.client.findMany({
          where,
          take: query.limit ?? 20,
          skip: query.cursor ? 1 : 0,
          cursor: query.cursor ? { id: query.cursor } : undefined,
          orderBy: { created_at: 'desc' },
        }),
        prisma.client.count({ where }),
      ]);

      return { items: items.map(mapClient), total };
    },
  };
}

function mapClient(row: {
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
}): Client {
  return { ...row };
}
