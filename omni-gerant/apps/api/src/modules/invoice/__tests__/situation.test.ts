import { describe, it, expect, vi } from 'vitest';
import {
  createSituationService,
  calculateSituationAmounts,
  type SituationRepository,
  type Situation,
  type QuoteLookup,
  type QuoteForSituation,
} from '../situation.service.js';

const TENANT_ID = 'tenant-1';
const QUOTE_ID = 'quote-1';

function createMockQuote(overrides?: Partial<QuoteForSituation>): QuoteForSituation {
  return {
    id: QUOTE_ID,
    tenant_id: TENANT_ID,
    status: 'signed',
    total_ht_cents: 1000000, // 10 000 EUR
    total_tva_cents: 200000,
    total_ttc_cents: 1200000,
    lines: [
      { position: 1, type: 'line', label: 'Lot 1 - Gros oeuvre', quantity: 1, unit: 'forfait', unit_price_cents: 600000, tva_rate: 20, total_ht_cents: 600000 },
      { position: 2, type: 'line', label: 'Lot 2 - Second oeuvre', quantity: 1, unit: 'forfait', unit_price_cents: 400000, tva_rate: 10, total_ht_cents: 400000 },
    ],
    ...overrides,
  };
}

function createMockSituation(overrides?: Partial<Situation>): Situation {
  return {
    id: crypto.randomUUID(),
    quote_id: QUOTE_ID,
    tenant_id: TENANT_ID,
    situation_number: 1,
    global_percent: 3000,
    previous_percent: 0,
    lines: [],
    invoice_ht_cents: 300000,
    invoice_tva_cents: 0,
    invoice_ttc_cents: 300000,
    cumulative_ht_cents: 300000,
    remaining_ht_cents: 700000,
    status: 'draft',
    invoice_id: null,
    created_at: new Date(),
    ...overrides,
  };
}

function createMockRepo(existingSituations: Situation[] = []): SituationRepository {
  return {
    findByQuote: vi.fn().mockResolvedValue(existingSituations),
    create: vi.fn().mockImplementation(async (data) => ({
      id: crypto.randomUUID(),
      ...data,
      status: 'draft',
      invoice_id: null,
      created_at: new Date(),
    })),
    findById: vi.fn().mockImplementation(async (id) => {
      return existingSituations.find((s) => s.id === id) ?? null;
    }),
    update: vi.fn().mockImplementation(async (_id, _tenantId, data) => {
      const existing = existingSituations[0];
      if (!existing) return null;
      return { ...existing, ...data };
    }),
  };
}

function createMockQuoteLookup(quote: QuoteForSituation | null): QuoteLookup {
  return {
    findById: vi.fn().mockResolvedValue(quote),
  };
}

describe('calculateSituationAmounts', () => {
  const quoteLines: QuoteForSituation['lines'] = [
    { position: 1, type: 'line', label: 'Lot 1', quantity: 1, unit: 'forfait', unit_price_cents: 600000, tva_rate: 20, total_ht_cents: 600000 },
    { position: 2, type: 'line', label: 'Lot 2', quantity: 1, unit: 'forfait', unit_price_cents: 400000, tva_rate: 10, total_ht_cents: 400000 },
  ];

  // BUSINESS RULE: Situation 1 : 30%
  it('calculates 30% first situation', () => {
    const result = calculateSituationAmounts(quoteLines, 3000, 0);

    // Lot 1: 600000 * 30% = 180000
    // Lot 2: 400000 * 30% = 120000
    // Invoice HT = 300000
    expect(result.invoice_ht_cents).toBe(300000);
    expect(result.cumulative_ht_cents).toBe(300000);
    expect(result.remaining_ht_cents).toBe(700000);
  });

  // BUSINESS RULE: Situation 2 : 60% cumule (30% incremental)
  it('calculates 60% cumulative (30% incremental)', () => {
    const result = calculateSituationAmounts(quoteLines, 6000, 3000);

    // Incremental = 30%
    // Lot 1: 600000 * 30% = 180000
    // Lot 2: 400000 * 30% = 120000
    expect(result.invoice_ht_cents).toBe(300000);
    expect(result.cumulative_ht_cents).toBe(600000);
    expect(result.remaining_ht_cents).toBe(400000);
  });

  // BUSINESS RULE: Situation 3 : 100% (40% incremental)
  it('calculates 100% final situation', () => {
    const result = calculateSituationAmounts(quoteLines, 10000, 6000);

    // Incremental = 40%
    // Lot 1: 600000 * 40% = 240000
    // Lot 2: 400000 * 40% = 160000
    expect(result.invoice_ht_cents).toBe(400000);
    expect(result.cumulative_ht_cents).toBe(1000000);
    expect(result.remaining_ht_cents).toBe(0);
  });

  it('calculates TVA correctly with multi-rate', () => {
    const result = calculateSituationAmounts(quoteLines, 3000, 0);

    // Lot 1: 180000 * 20% = 36000
    // Lot 2: 120000 * 10% = 12000
    // Total TVA = 48000
    expect(result.invoice_tva_cents).toBe(48000);
    expect(result.invoice_ttc_cents).toBe(348000);
  });

  it('ignores non-line types', () => {
    const linesWithSection = [
      { position: 1, type: 'section', label: 'Section', quantity: 0, unit: 'unit', unit_price_cents: 0, tva_rate: 0, total_ht_cents: 0 },
      ...quoteLines,
    ];
    const result = calculateSituationAmounts(linesWithSection, 3000, 0);
    expect(result.invoice_ht_cents).toBe(300000);
  });
});

describe('SituationService', () => {
  describe('create', () => {
    it('creates first situation at 30%', async () => {
      const quote = createMockQuote();
      const repo = createMockRepo();
      const service = createSituationService(repo, createMockQuoteLookup(quote));

      const result = await service.create(QUOTE_ID, TENANT_ID, 3000);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.situation_number).toBe(1);
        expect(result.value.global_percent).toBe(3000);
        expect(result.value.previous_percent).toBe(0);
      }
    });

    it('creates second situation building on first', async () => {
      const quote = createMockQuote();
      const firstSituation = createMockSituation({ global_percent: 3000 });
      const repo = createMockRepo([firstSituation]);
      const service = createSituationService(repo, createMockQuoteLookup(quote));

      const result = await service.create(QUOTE_ID, TENANT_ID, 6000);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.situation_number).toBe(2);
        expect(result.value.previous_percent).toBe(3000);
      }
    });

    it('rejects if quote not signed', async () => {
      const quote = createMockQuote({ status: 'draft' });
      const repo = createMockRepo();
      const service = createSituationService(repo, createMockQuoteLookup(quote));

      const result = await service.create(QUOTE_ID, TENANT_ID, 3000);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
    });

    it('rejects percentage > 100%', async () => {
      const quote = createMockQuote();
      const repo = createMockRepo();
      const service = createSituationService(repo, createMockQuoteLookup(quote));

      const result = await service.create(QUOTE_ID, TENANT_ID, 10001);
      expect(result.ok).toBe(false);
    });

    it('rejects percentage <= previous', async () => {
      const quote = createMockQuote();
      const firstSituation = createMockSituation({ global_percent: 6000 });
      const repo = createMockRepo([firstSituation]);
      const service = createSituationService(repo, createMockQuoteLookup(quote));

      const result = await service.create(QUOTE_ID, TENANT_ID, 5000);
      expect(result.ok).toBe(false);
    });

    it('rejects nonexistent quote', async () => {
      const repo = createMockRepo();
      const service = createSituationService(repo, createMockQuoteLookup(null));

      const result = await service.create(QUOTE_ID, TENANT_ID, 3000);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    });
  });

  describe('update', () => {
    it('updates a draft situation', async () => {
      const quote = createMockQuote();
      const situation = createMockSituation();
      const repo = createMockRepo([situation]);
      const service = createSituationService(repo, createMockQuoteLookup(quote));

      const result = await service.update(situation.id, TENANT_ID, 5000);
      expect(result.ok).toBe(true);
    });

    it('rejects updating finalized situation', async () => {
      const quote = createMockQuote();
      const situation = createMockSituation({ status: 'finalized' });
      const repo = createMockRepo([situation]);
      const service = createSituationService(repo, createMockQuoteLookup(quote));

      const result = await service.update(situation.id, TENANT_ID, 5000);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
    });
  });
});
