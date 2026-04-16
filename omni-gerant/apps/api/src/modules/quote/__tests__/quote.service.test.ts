import { describe, it, expect, vi } from 'vitest';
import { createQuoteService, type QuoteRepository, type Quote, type QuoteLine } from '../quote.service.js';
import { ok } from '@omni-gerant/shared';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const CLIENT_ID = '660e8400-e29b-41d4-a716-446655440001';

function createMockQuote(overrides?: Partial<Quote>): Quote {
  const id = crypto.randomUUID();
  return {
    id,
    tenant_id: TENANT_ID,
    client_id: CLIENT_ID,
    number: 'DEV-2026-00001',
    status: 'draft',
    title: 'Test devis',
    description: null,
    issue_date: new Date(),
    validity_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    deposit_rate: null,
    discount_type: null,
    discount_value: null,
    notes: null,
    total_ht_cents: 10000,
    total_tva_cents: 2000,
    total_ttc_cents: 12000,
    signed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    lines: [
      {
        id: crypto.randomUUID(),
        quote_id: id,
        product_id: null,
        position: 1,
        type: 'line',
        label: 'Prestation',
        description: null,
        quantity: 1,
        unit: 'unit',
        unit_price_cents: 10000,
        tva_rate: 20,
        discount_type: null,
        discount_value: null,
        total_ht_cents: 10000,
      },
    ],
    ...overrides,
  };
}

function createMockRepo(existingQuote?: Quote | null): QuoteRepository {
  return {
    create: vi.fn().mockImplementation(async (data) => ({
      id: crypto.randomUUID(),
      ...data,
      status: 'draft',
      issue_date: new Date(),
      signed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      title: data.title ?? null,
      description: data.description ?? null,
      deposit_rate: data.deposit_rate ?? null,
      discount_type: data.discount_type ?? null,
      discount_value: data.discount_value ?? null,
      notes: data.notes ?? null,
      lines: data.lines.map((l: Record<string, unknown>, i: number) => ({
        id: crypto.randomUUID(),
        quote_id: 'q-id',
        product_id: l['product_id'] ?? null,
        description: l['description'] ?? null,
        discount_type: l['discount_type'] ?? null,
        discount_value: l['discount_value'] ?? null,
        ...l,
      })),
    })),
    findById: vi.fn().mockResolvedValue(existingQuote ?? null),
    findMany: vi.fn().mockResolvedValue({ items: existingQuote ? [existingQuote] : [], next_cursor: null, has_more: false }),
    update: vi.fn().mockImplementation(async (_id, _tenantId, data) => {
      if (!existingQuote) return null;
      return { ...existingQuote, ...data, updated_at: new Date() };
    }),
    delete: vi.fn().mockResolvedValue(true),
  };
}

const mockNumberGen = {
  generate: vi.fn().mockResolvedValue(ok('DEV-2026-00001')),
};

describe('QuoteService', () => {
  describe('create', () => {
    it('creates a quote with calculated totals', async () => {
      const repo = createMockRepo();
      const service = createQuoteService(repo, mockNumberGen);

      const result = await service.create(TENANT_ID, {
        client_id: CLIENT_ID,
        lines: [
          { position: 1, type: 'line', label: 'Service A', quantity: 2, unit: 'h', unit_price_cents: 5000, tva_rate: 20 },
          { position: 2, type: 'line', label: 'Service B', quantity: 1, unit: 'unit', unit_price_cents: 3000, tva_rate: 10 },
        ],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.number).toBe('DEV-2026-00001');
        // Line 1: 2 * 5000 = 10000
        // Line 2: 1 * 3000 = 3000
        // Total HT = 13000
        expect(result.value.total_ht_cents).toBe(13000);
      }
      expect(repo.create).toHaveBeenCalledOnce();
    });

    it('creates a quote with sections and comments', async () => {
      const repo = createMockRepo();
      const service = createQuoteService(repo, mockNumberGen);

      const result = await service.create(TENANT_ID, {
        client_id: CLIENT_ID,
        lines: [
          { position: 1, type: 'section', label: 'Phase 1', quantity: 0, unit: 'unit', unit_price_cents: 0, tva_rate: 0 },
          { position: 2, type: 'line', label: 'Travaux', quantity: 1, unit: 'unit', unit_price_cents: 10000, tva_rate: 20 },
          { position: 3, type: 'comment', label: 'Delai: 2 semaines', quantity: 0, unit: 'unit', unit_price_cents: 0, tva_rate: 0 },
        ],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.total_ht_cents).toBe(10000);
      }
    });

    it('applies line discounts correctly', async () => {
      const repo = createMockRepo();
      const service = createQuoteService(repo, mockNumberGen);

      const result = await service.create(TENANT_ID, {
        client_id: CLIENT_ID,
        lines: [
          {
            position: 1,
            type: 'line',
            label: 'Service',
            quantity: 1,
            unit: 'unit',
            unit_price_cents: 10000,
            tva_rate: 20,
            discount_type: 'percentage',
            discount_value: 1000, // 10%
          },
        ],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.total_ht_cents).toBe(9000); // 100 - 10% = 90
      }
    });
  });

  describe('getById', () => {
    it('returns quote when found', async () => {
      const quote = createMockQuote();
      const repo = createMockRepo(quote);
      const service = createQuoteService(repo, mockNumberGen);

      const result = await service.getById(quote.id, TENANT_ID);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(quote.id);
      }
    });

    it('returns NOT_FOUND when not found', async () => {
      const repo = createMockRepo(null);
      const service = createQuoteService(repo, mockNumberGen);

      const result = await service.getById('nonexistent', TENANT_ID);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('list', () => {
    it('returns paginated list', async () => {
      const quote = createMockQuote();
      const repo = createMockRepo(quote);
      const service = createQuoteService(repo, mockNumberGen);

      const result = await service.list(TENANT_ID, { limit: 20 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.items).toHaveLength(1);
      }
    });
  });

  describe('update', () => {
    it('updates a draft quote', async () => {
      const quote = createMockQuote();
      const repo = createMockRepo(quote);
      const service = createQuoteService(repo, mockNumberGen);

      const result = await service.update(quote.id, TENANT_ID, {
        title: 'Updated title',
      });
      expect(result.ok).toBe(true);
    });

    it('rejects update on non-draft quote', async () => {
      const quote = createMockQuote({ status: 'sent' });
      const repo = createMockRepo(quote);
      const service = createQuoteService(repo, mockNumberGen);

      const result = await service.update(quote.id, TENANT_ID, { title: 'New title' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });

    it('returns NOT_FOUND for nonexistent quote', async () => {
      const repo = createMockRepo(null);
      const service = createQuoteService(repo, mockNumberGen);

      const result = await service.update('nonexistent', TENANT_ID, { title: 'Test' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('delete', () => {
    it('deletes a draft quote', async () => {
      const quote = createMockQuote();
      const repo = createMockRepo(quote);
      const service = createQuoteService(repo, mockNumberGen);

      const result = await service.delete(quote.id, TENANT_ID);
      expect(result.ok).toBe(true);
      expect(repo.delete).toHaveBeenCalledOnce();
    });

    it('rejects deletion of non-draft quote', async () => {
      const quote = createMockQuote({ status: 'signed' });
      const repo = createMockRepo(quote);
      const service = createQuoteService(repo, mockNumberGen);

      const result = await service.delete(quote.id, TENANT_ID);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });

    it('returns NOT_FOUND for nonexistent quote', async () => {
      const repo = createMockRepo(null);
      const service = createQuoteService(repo, mockNumberGen);

      const result = await service.delete('nonexistent', TENANT_ID);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });
});
