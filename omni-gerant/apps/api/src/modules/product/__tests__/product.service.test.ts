import { describe, it, expect, vi } from 'vitest';
import { createProductService, type Product, type ProductRepository } from '../product.service.js';
import { tvaAmount, money } from '@zenadmin/shared';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

const mockProduct: Product = {
  id: '770e8400-e29b-41d4-a716-446655440001',
  tenant_id: TENANT_ID,
  type: 'service',
  reference: 'SRV-001',
  name: 'Pose de carrelage',
  description: 'Pose de carrelage au m2',
  unit: 'm2',
  unit_price_cents: 4500, // 45.00 EUR
  tva_rate: 1000, // 10%
  category: 'Carrelage',
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
};

function createMockRepo(overrides?: Partial<ProductRepository>): ProductRepository {
  return {
    create: vi.fn().mockResolvedValue(mockProduct),
    findById: vi.fn().mockResolvedValue(mockProduct),
    findByReference: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(mockProduct),
    softDelete: vi.fn().mockResolvedValue(true),
    list: vi.fn().mockResolvedValue({ items: [mockProduct], total: 1 }),
    createMany: vi.fn().mockResolvedValue(3),
    ...overrides,
  };
}

describe('ProductService', () => {
  describe('createProduct', () => {
    it('creates a product', async () => {
      const repo = createMockRepo();
      const service = createProductService(repo);

      const result = await service.createProduct(TENANT_ID, {
        name: 'Pose de carrelage',
        unit: 'm2',
        unit_price_cents: 4500,
        tva_rate: 1000,
      });

      expect(result.ok).toBe(true);
    });

    it('rejects duplicate reference', async () => {
      const repo = createMockRepo({
        findByReference: vi.fn().mockResolvedValue(mockProduct),
      });
      const service = createProductService(repo);

      const result = await service.createProduct(TENANT_ID, {
        name: 'New product',
        reference: 'SRV-001',
        unit_price_cents: 1000,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CONFLICT');
      }
    });
  });

  describe('updateProduct', () => {
    it('updates product price', async () => {
      const updated = { ...mockProduct, unit_price_cents: 5000 };
      const repo = createMockRepo({ update: vi.fn().mockResolvedValue(updated) });
      const service = createProductService(repo);

      const result = await service.updateProduct(mockProduct.id, TENANT_ID, { unit_price_cents: 5000 });

      expect(result.ok).toBe(true);
    });

    it('returns NOT_FOUND for nonexistent product', async () => {
      const repo = createMockRepo({ findById: vi.fn().mockResolvedValue(null) });
      const service = createProductService(repo);

      const result = await service.updateProduct('nonexistent', TENANT_ID, { name: 'New' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('importFromCsv', () => {
    it('imports valid CSV rows', async () => {
      const repo = createMockRepo();
      const service = createProductService(repo);

      const result = await service.importFromCsv(TENANT_ID, [
        { name: 'Product 1', unit_price: 45.00, tva_rate: 20 },
        { name: 'Product 2', unit_price: 80.50, tva_rate: 10 },
        { name: 'Product 3', unit_price: 100.00, tva_rate: 5.5 },
      ]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.imported).toBe(3);
        expect(result.value.errors).toHaveLength(0);
      }
    });

    it('converts prices from euros to centimes', async () => {
      const repo = createMockRepo();
      const service = createProductService(repo);

      await service.importFromCsv(TENANT_ID, [
        { name: 'Test', unit_price: 45.50 },
      ]);

      expect(repo.createMany).toHaveBeenCalledWith([
        expect.objectContaining({ unit_price_cents: 4550 }),
      ]);
    });

    it('reports invalid TVA rates', async () => {
      const repo = createMockRepo({
        createMany: vi.fn().mockResolvedValue(1),
      });
      const service = createProductService(repo);

      const result = await service.importFromCsv(TENANT_ID, [
        { name: 'Valid', unit_price: 10.00, tva_rate: 20 },
        { name: 'Invalid rate', unit_price: 10.00, tva_rate: 15 },
      ]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.imported).toBe(1);
        expect(result.value.errors).toHaveLength(1);
        expect(result.value.errors[0]?.error).toContain('Invalid TVA rate');
      }
      // Verify only 1 product was sent to createMany
      expect(repo.createMany).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'Valid', unit_price_cents: 1000, tva_rate: 2000 }),
      ]);
    });

    it('returns error when no valid rows', async () => {
      const repo = createMockRepo();
      const service = createProductService(repo);

      const result = await service.importFromCsv(TENANT_ID, [
        { name: 'Bad rate', unit_price: 10.00, tva_rate: 99 },
      ]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('TVA calculations with product prices', () => {
    it('calculates TVA at 20% correctly', () => {
      // Product at 100.00 EUR HT → TVA 20.00 EUR
      const ht = money(10000);
      const tva = tvaAmount(ht, 2000);
      expect(tva.amount_cents).toBe(2000);
    });

    it('calculates TVA at 10% correctly', () => {
      // Product at 45.00 EUR HT → TVA 4.50 EUR
      const ht = money(4500);
      const tva = tvaAmount(ht, 1000);
      expect(tva.amount_cents).toBe(450);
    });

    it('calculates TVA at 5.5% correctly', () => {
      // Product at 200.00 EUR HT → TVA 11.00 EUR
      const ht = money(20000);
      const tva = tvaAmount(ht, 550);
      expect(tva.amount_cents).toBe(1100);
    });

    it('calculates TVA at 2.1% correctly', () => {
      // Product at 50.00 EUR HT → TVA 1.05 EUR
      const ht = money(5000);
      const tva = tvaAmount(ht, 210);
      expect(tva.amount_cents).toBe(105);
    });

    it('handles zero TVA', () => {
      const ht = money(10000);
      const tva = tvaAmount(ht, 0);
      expect(tva.amount_cents).toBe(0);
    });
  });

  describe('listProducts', () => {
    it('returns paginated results', async () => {
      const repo = createMockRepo();
      const service = createProductService(repo);

      const result = await service.listProducts(TENANT_ID, { limit: 20, sort_by: 'name', sort_dir: 'asc' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.items).toHaveLength(1);
      }
    });
  });

  describe('deleteProduct', () => {
    it('soft deletes product', async () => {
      const repo = createMockRepo();
      const service = createProductService(repo);

      const result = await service.deleteProduct(mockProduct.id, TENANT_ID);

      expect(result.ok).toBe(true);
    });
  });
});
