import { prisma } from '@zenadmin/db';
import type { Prisma } from '@prisma/client';
import type { SupplierRepository, Supplier } from './supplier.service.js';

// BUSINESS RULE [CDC-2.2]: Supplier CRUD with Prisma

export function createPrismaSupplierRepository(): SupplierRepository {
  return {
    async create(data) {
      const row = await prisma.supplier.create({
        data: {
          tenant_id: data.tenant_id,
          name: data.name,
          siret: data.siret ?? null,
          email: data.email ?? null,
          phone: data.phone ?? null,
          address: data.address ? (data.address as Prisma.InputJsonValue) : undefined,
          iban: data.iban ?? null,
          bic: data.bic ?? null,
          payment_terms: data.payment_terms ?? 30,
          category: data.category ?? null,
        },
      });
      return mapSupplier(row);
    },

    async findById(id, tenantId) {
      const row = await prisma.supplier.findFirst({
        where: { id, tenant_id: tenantId },
      });
      return row ? mapSupplier(row) : null;
    },

    async update(id, tenantId, data) {
      const existing = await prisma.supplier.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!existing) return null;
      const updateData: Record<string, unknown> = { ...data };
      if (data.address) updateData.address = data.address as Prisma.InputJsonValue;
      const row = await prisma.supplier.update({
        where: { id },
        data: updateData as Prisma.SupplierUpdateInput,
      });
      return mapSupplier(row);
    },

    async softDelete(id, tenantId) {
      const existing = await prisma.supplier.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!existing) return false;
      await prisma.supplier.delete({ where: { id } });
      return true;
    },

    async list(tenantId, query) {
      const where: Prisma.SupplierWhereInput = { tenant_id: tenantId };
      if (query.search) {
        where.name = { contains: query.search, mode: 'insensitive' };
      }
      if (query.category) where.category = query.category;

      const [items, total] = await Promise.all([
        prisma.supplier.findMany({
          where,
          take: query.limit ?? 20,
          orderBy: { created_at: 'desc' },
        }),
        prisma.supplier.count({ where }),
      ]);

      return { items: items.map(mapSupplier), total };
    },
  };
}

function mapSupplier(row: {
  id: string;
  tenant_id: string;
  name: string;
  siret: string | null;
  email: string | null;
  phone: string | null;
  address: unknown;
  iban: string | null;
  bic: string | null;
  payment_terms: number;
  category: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): Supplier {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    siret: row.siret,
    email: row.email,
    phone: row.phone,
    address: row.address as Record<string, unknown> | null,
    iban: row.iban,
    bic: row.bic,
    payment_terms: row.payment_terms,
    category: row.category,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}
