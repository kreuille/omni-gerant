import { describe, it, expect, vi } from 'vitest';
import {
  createPurchaseService,
  calculatePurchaseLineTotals,
  type Purchase,
  type PurchaseRepository,
} from '../purchase.service.js';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

const mockPurchase: Purchase = {
  id: '770e8400-e29b-41d4-a716-446655440001',
  tenant_id: TENANT_ID,
  supplier_id: '660e8400-e29b-41d4-a716-446655440001',
  number: 'FOURNISSEUR-001',
  status: 'pending',
  source: 'manual',
  issue_date: new Date('2026-04-01'),
  due_date: new Date('2026-05-01'),
  total_ht_cents: 100000,
  total_tva_cents: 20000,
  total_ttc_cents: 120000,
  paid_cents: 0,
  category: 'materiaux',
  notes: null,
  document_url: null,
  ocr_data: null,
  ocr_confidence: null,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
  lines: [
    {
      id: 'line-1',
      purchase_id: '770e8400-e29b-41d4-a716-446655440001',
      position: 1,
      label: 'Ciment Portland',
      quantity: 100,
      unit_price_cents: 1000,
      tva_rate: 20,
      total_ht_cents: 100000,
    },
  ],
};

function createMockRepo(overrides?: Partial<PurchaseRepository>): PurchaseRepository {
  return {
    create: vi.fn().mockResolvedValue(mockPurchase),
    findById: vi.fn().mockResolvedValue(mockPurchase),
    update: vi.fn().mockResolvedValue(mockPurchase),
    updateStatus: vi.fn().mockResolvedValue({ ...mockPurchase, status: 'validated' }),
    updatePayment: vi.fn().mockResolvedValue({ ...mockPurchase, paid_cents: 50000 }),
    softDelete: vi.fn().mockResolvedValue(true),
    list: vi.fn().mockResolvedValue({ items: [mockPurchase], next_cursor: null, has_more: false }),
    ...overrides,
  };
}

describe('calculatePurchaseLineTotals', () => {
  it('calculates single line with 20% TVA', () => {
    const result = calculatePurchaseLineTotals([
      { position: 1, label: 'Ciment', quantity: 10, unit_price_cents: 1500, tva_rate: 20 },
    ]);

    expect(result.total_ht_cents).toBe(15000);
    expect(result.total_tva_cents).toBe(3000);
    expect(result.total_ttc_cents).toBe(18000);
  });

  it('calculates multiple lines with different TVA rates', () => {
    const result = calculatePurchaseLineTotals([
      { position: 1, label: 'Ciment', quantity: 10, unit_price_cents: 1000, tva_rate: 20 },
      { position: 2, label: 'Sable', quantity: 5, unit_price_cents: 500, tva_rate: 10 },
      { position: 3, label: 'Gravier', quantity: 20, unit_price_cents: 300, tva_rate: 5.5 },
    ]);

    // Line 1: 10 * 1000 = 10000 HT, TVA = 2000
    // Line 2: 5 * 500 = 2500 HT, TVA = 250
    // Line 3: 20 * 300 = 6000 HT, TVA = 330
    expect(result.total_ht_cents).toBe(18500);
    expect(result.total_tva_cents).toBe(2580);
    expect(result.total_ttc_cents).toBe(21080);
    expect(result.computed_lines).toHaveLength(3);
  });

  it('handles zero TVA rate', () => {
    const result = calculatePurchaseLineTotals([
      { position: 1, label: 'Exempt', quantity: 1, unit_price_cents: 10000, tva_rate: 0 },
    ]);

    expect(result.total_ht_cents).toBe(10000);
    expect(result.total_tva_cents).toBe(0);
    expect(result.total_ttc_cents).toBe(10000);
  });

  it('handles fractional quantities with rounding', () => {
    const result = calculatePurchaseLineTotals([
      { position: 1, label: 'Bois', quantity: 2.5, unit_price_cents: 1333, tva_rate: 20 },
    ]);

    // 2.5 * 1333 = 3332.5 -> rounds to 3333
    expect(result.total_ht_cents).toBe(3333);
    expect(result.total_tva_cents).toBe(667); // 3333 * 20 / 100 = 666.6 -> 667
    expect(result.total_ttc_cents).toBe(4000);
  });
});

describe('PurchaseService', () => {
  describe('create', () => {
    it('creates a purchase with calculated totals', async () => {
      const repo = createMockRepo();
      const service = createPurchaseService(repo);

      const result = await service.create(TENANT_ID, {
        supplier_id: '660e8400-e29b-41d4-a716-446655440001',
        number: 'FOURNISSEUR-001',
        lines: [
          { position: 1, label: 'Ciment', quantity: 100, unit_price_cents: 1000, tva_rate: 20 },
        ],
      });

      expect(result.ok).toBe(true);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: TENANT_ID,
          total_ht_cents: 100000,
          total_tva_cents: 20000,
          total_ttc_cents: 120000,
        }),
      );
    });
  });

  describe('getById', () => {
    it('returns purchase when found', async () => {
      const repo = createMockRepo();
      const service = createPurchaseService(repo);

      const result = await service.getById(mockPurchase.id, TENANT_ID);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.number).toBe('FOURNISSEUR-001');
      }
    });

    it('returns NOT_FOUND when purchase does not exist', async () => {
      const repo = createMockRepo({ findById: vi.fn().mockResolvedValue(null) });
      const service = createPurchaseService(repo);

      const result = await service.getById('nonexistent', TENANT_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('validate', () => {
    it('transitions from pending to validated', async () => {
      const repo = createMockRepo();
      const service = createPurchaseService(repo);

      const result = await service.validate(mockPurchase.id, TENANT_ID, 'validated');

      expect(result.ok).toBe(true);
      expect(repo.updateStatus).toHaveBeenCalledWith(mockPurchase.id, TENANT_ID, 'validated');
    });

    it('rejects invalid transition from pending to paid', async () => {
      const repo = createMockRepo();
      const service = createPurchaseService(repo);

      const result = await service.validate(mockPurchase.id, TENANT_ID, 'paid');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('rejects transition from paid', async () => {
      const paidPurchase = { ...mockPurchase, status: 'paid' };
      const repo = createMockRepo({ findById: vi.fn().mockResolvedValue(paidPurchase) });
      const service = createPurchaseService(repo);

      const result = await service.validate(mockPurchase.id, TENANT_ID, 'pending');

      expect(result.ok).toBe(false);
    });
  });

  describe('markPaid', () => {
    it('records partial payment', async () => {
      const validatedPurchase = { ...mockPurchase, status: 'validated' };
      const repo = createMockRepo({ findById: vi.fn().mockResolvedValue(validatedPurchase) });
      const service = createPurchaseService(repo);

      const result = await service.markPaid(mockPurchase.id, TENANT_ID, 50000);

      expect(result.ok).toBe(true);
      expect(repo.updatePayment).toHaveBeenCalledWith(mockPurchase.id, TENANT_ID, 50000);
    });

    it('auto-transitions to paid when fully paid', async () => {
      const validatedPurchase = { ...mockPurchase, status: 'validated', total_ttc_cents: 50000, paid_cents: 0 };
      const repo = createMockRepo({
        findById: vi.fn().mockResolvedValue(validatedPurchase),
        updatePayment: vi.fn().mockResolvedValue({ ...validatedPurchase, paid_cents: 50000 }),
        updateStatus: vi.fn().mockResolvedValue({ ...validatedPurchase, status: 'paid', paid_cents: 50000 }),
      });
      const service = createPurchaseService(repo);

      const result = await service.markPaid(mockPurchase.id, TENANT_ID, 50000);

      expect(result.ok).toBe(true);
      expect(repo.updateStatus).toHaveBeenCalledWith(mockPurchase.id, TENANT_ID, 'paid');
    });

    it('rejects payment on non-validated purchase', async () => {
      const repo = createMockRepo();
      const service = createPurchaseService(repo);

      const result = await service.markPaid(mockPurchase.id, TENANT_ID, 50000);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('rejects payment exceeding total', async () => {
      const validatedPurchase = { ...mockPurchase, status: 'validated', total_ttc_cents: 120000, paid_cents: 100000 };
      const repo = createMockRepo({ findById: vi.fn().mockResolvedValue(validatedPurchase) });
      const service = createPurchaseService(repo);

      const result = await service.markPaid(mockPurchase.id, TENANT_ID, 50000);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('update', () => {
    it('updates purchase data', async () => {
      const updated = { ...mockPurchase, notes: 'Updated notes' };
      const repo = createMockRepo({ update: vi.fn().mockResolvedValue(updated) });
      const service = createPurchaseService(repo);

      const result = await service.update(mockPurchase.id, TENANT_ID, { notes: 'Updated notes' });

      expect(result.ok).toBe(true);
    });

    it('rejects update on paid purchase', async () => {
      const paidPurchase = { ...mockPurchase, status: 'paid' };
      const repo = createMockRepo({ findById: vi.fn().mockResolvedValue(paidPurchase) });
      const service = createPurchaseService(repo);

      const result = await service.update(mockPurchase.id, TENANT_ID, { notes: 'try update' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('delete', () => {
    it('soft deletes a pending purchase', async () => {
      const repo = createMockRepo();
      const service = createPurchaseService(repo);

      const result = await service.delete(mockPurchase.id, TENANT_ID);

      expect(result.ok).toBe(true);
      expect(repo.softDelete).toHaveBeenCalledWith(mockPurchase.id, TENANT_ID);
    });

    it('rejects deletion of paid purchase', async () => {
      const paidPurchase = { ...mockPurchase, status: 'paid' };
      const repo = createMockRepo({ findById: vi.fn().mockResolvedValue(paidPurchase) });
      const service = createPurchaseService(repo);

      const result = await service.delete(mockPurchase.id, TENANT_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('list', () => {
    it('returns paginated results', async () => {
      const repo = createMockRepo();
      const service = createPurchaseService(repo);

      const result = await service.list(TENANT_ID, { limit: 20, sort_by: 'created_at', sort_dir: 'desc' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.items).toHaveLength(1);
      }
    });
  });
});
