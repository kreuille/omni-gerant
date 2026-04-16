import type { Result, PaginatedResult } from '@omni-gerant/shared';
import { ok, err, notFound, validationError, conflict } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';
import type { CreateProductInput, UpdateProductInput, ProductListQuery, CsvProductRow } from './product.schemas.js';

// BUSINESS RULE [R02]: Prix en centimes
// BUSINESS RULE [CDC-2.1]: Bibliotheque d'ouvrages avec mise a jour prix

export interface Product {
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
}

export interface ProductRepository {
  create(data: CreateProductInput & { tenant_id: string }): Promise<Product>;
  findById(id: string, tenantId: string): Promise<Product | null>;
  findByReference(reference: string, tenantId: string): Promise<Product | null>;
  update(id: string, tenantId: string, data: UpdateProductInput): Promise<Product | null>;
  softDelete(id: string, tenantId: string): Promise<boolean>;
  list(tenantId: string, query: ProductListQuery): Promise<{ items: Product[]; total: number }>;
  createMany(data: Array<CreateProductInput & { tenant_id: string }>): Promise<number>;
}

export function createProductService(repo: ProductRepository) {
  return {
    async createProduct(
      tenantId: string,
      input: CreateProductInput,
    ): Promise<Result<Product, AppError>> {
      // Check for duplicate reference
      if (input.reference) {
        const existing = await repo.findByReference(input.reference, tenantId);
        if (existing) {
          return err(conflict(`Product with reference "${input.reference}" already exists`));
        }
      }

      const product = await repo.create({ ...input, tenant_id: tenantId });
      return ok(product);
    },

    async getProduct(id: string, tenantId: string): Promise<Result<Product, AppError>> {
      const product = await repo.findById(id, tenantId);
      if (!product) {
        return err(notFound('Product', id));
      }
      return ok(product);
    },

    async updateProduct(
      id: string,
      tenantId: string,
      input: UpdateProductInput,
    ): Promise<Result<Product, AppError>> {
      const existing = await repo.findById(id, tenantId);
      if (!existing) {
        return err(notFound('Product', id));
      }

      // Check reference uniqueness if changing
      if (input.reference && input.reference !== existing.reference) {
        const duplicate = await repo.findByReference(input.reference, tenantId);
        if (duplicate && duplicate.id !== id) {
          return err(conflict(`Product with reference "${input.reference}" already exists`));
        }
      }

      const updated = await repo.update(id, tenantId, input);
      if (!updated) {
        return err(notFound('Product', id));
      }
      return ok(updated);
    },

    async deleteProduct(id: string, tenantId: string): Promise<Result<void, AppError>> {
      const existing = await repo.findById(id, tenantId);
      if (!existing) {
        return err(notFound('Product', id));
      }
      await repo.softDelete(id, tenantId);
      return ok(undefined);
    },

    async listProducts(
      tenantId: string,
      query: ProductListQuery,
    ): Promise<Result<PaginatedResult<Product>, AppError>> {
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

    // BUSINESS RULE [CDC-2.1]: Importation de catalogues fournisseurs
    async importFromCsv(
      tenantId: string,
      rows: CsvProductRow[],
    ): Promise<Result<{ imported: number; errors: Array<{ row: number; error: string }> }, AppError>> {
      const errors: Array<{ row: number; error: string }> = [];
      const validProducts: Array<CreateProductInput & { tenant_id: string }> = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;

        // Convert price from euros to centimes
        const priceCents = Math.round(row.unit_price * 100);
        if (priceCents < 0) {
          errors.push({ row: i + 1, error: 'Price must be positive' });
          continue;
        }

        // Validate TVA rate (percentage)
        const validRates = [20, 10, 5.5, 2.1, 0];
        let tvaRate = 20; // default 20%
        if (row.tva_rate !== undefined) {
          if (!validRates.includes(row.tva_rate)) {
            errors.push({ row: i + 1, error: `Invalid TVA rate: ${row.tva_rate}` });
            continue;
          }
          tvaRate = row.tva_rate;
        }

        validProducts.push({
          tenant_id: tenantId,
          name: row.name,
          reference: row.reference,
          description: row.description,
          unit: (row.unit as CreateProductInput['unit']) ?? 'unit',
          unit_price_cents: priceCents,
          tva_rate: tvaRate,
          category: row.category,
          type: 'product',
          is_active: true,
        });
      }

      if (validProducts.length === 0) {
        return err(validationError('No valid products to import', { errors }));
      }

      const imported = await repo.createMany(validProducts);
      return ok({ imported, errors });
    },
  };
}
