import { prisma } from '@zenadmin/db';
import type { Decimal } from '@prisma/client/runtime/library';
import type { ProductRepository, Product } from './product.service.js';
import type { CreateProductInput, UpdateProductInput, ProductListQuery } from './product.schemas.js';

// BUSINESS RULE [R02]: Prix en centimes
// BUSINESS RULE [R03]: Multi-tenant

export function createPrismaProductRepository(): ProductRepository {
  return {
    async create(data: CreateProductInput & { tenant_id: string }): Promise<Product> {
      const row = await prisma.product.create({ data });
      return mapProduct(row);
    },

    async findById(id: string, tenantId: string): Promise<Product | null> {
      const row = await prisma.product.findFirst({
        where: { id, tenant_id: tenantId },
      });
      return row ? mapProduct(row) : null;
    },

    async findByReference(reference: string, tenantId: string): Promise<Product | null> {
      const row = await prisma.product.findFirst({
        where: { reference, tenant_id: tenantId },
      });
      return row ? mapProduct(row) : null;
    },

    async update(id: string, tenantId: string, data: UpdateProductInput): Promise<Product | null> {
      try {
        const row = await prisma.product.update({
          where: { id },
          data,
        });
        return mapProduct(row);
      } catch {
        return null;
      }
    },

    async softDelete(id: string, tenantId: string): Promise<boolean> {
      try {
        await prisma.product.delete({ where: { id } });
        return true;
      } catch {
        return false;
      }
    },

    async list(tenantId: string, query: ProductListQuery): Promise<{ items: Product[]; total: number }> {
      const where: Record<string, unknown> = { tenant_id: tenantId };
      if (query.search) {
        where['OR'] = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { reference: { contains: query.search, mode: 'insensitive' } },
        ];
      }
      if (query.category) where['category'] = query.category;
      if (query.type) where['type'] = query.type;

      const [items, total] = await Promise.all([
        prisma.product.findMany({
          where,
          take: query.limit ?? 20,
          skip: query.cursor ? 1 : 0,
          cursor: query.cursor ? { id: query.cursor } : undefined,
          orderBy: { created_at: 'desc' },
        }),
        prisma.product.count({ where }),
      ]);

      return { items: items.map(mapProduct), total };
    },

    async createMany(data: Array<CreateProductInput & { tenant_id: string }>): Promise<number> {
      const result = await prisma.product.createMany({ data });
      return result.count;
    },
  };
}

function mapProduct(row: {
  id: string;
  tenant_id: string;
  type: string;
  reference: string | null;
  name: string;
  description: string | null;
  unit: string;
  unit_price_cents: number;
  tva_rate: number;
  category: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): Product {
  return { ...row };
}
