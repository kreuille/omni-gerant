import { describe, it, expect, vi } from 'vitest';
import { createInvoiceService, type InvoiceRepository, type Invoice } from '../invoice.service.js';
import { ok } from '@omni-gerant/shared';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const CLIENT_ID = '660e8400-e29b-41d4-a716-446655440001';

function createMockInvoice(overrides?: Partial<Invoice>): Invoice {
  const id = crypto.randomUUID();
  return {
    id,
    tenant_id: TENANT_ID,
    client_id: CLIENT_ID,
    quote_id: null,
    number: 'FAC-2026-00001',
    type: 'standard',
    status: 'draft',
    issue_date: new Date(),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    deposit_percent: null,
    situation_percent: null,
    previous_situation_cents: null,
    payment_terms: 30,
    notes: null,
    total_ht_cents: 10000,
    total_tva_cents: 2000,
    total_ttc_cents: 12000,
    paid_cents: 0,
    remaining_cents: 12000,
    finalized_at: null,
    paid_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    lines: [{
      id: crypto.randomUUID(),
      invoice_id: id,
      position: 1,
      label: 'Service',
      description: null,
      quantity: 1,
      unit: 'unit',
      unit_price_cents: 10000,
      tva_rate: 20,
      total_ht_cents: 10000,
    }],
    ...overrides,
  };
}

function createMockRepo(existingInvoice?: Invoice | null): InvoiceRepository {
  return {
    create: vi.fn().mockImplementation(async (data) => ({
      id: crypto.randomUUID(),
      ...data,
      status: 'draft',
      issue_date: new Date(),
      paid_cents: 0,
      finalized_at: null,
      paid_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      quote_id: data.quote_id ?? null,
      deposit_percent: data.deposit_percent ?? null,
      situation_percent: data.situation_percent ?? null,
      previous_situation_cents: data.previous_situation_cents ?? null,
      notes: data.notes ?? null,
      lines: data.lines.map((l: Record<string, unknown>) => ({
        id: crypto.randomUUID(),
        invoice_id: 'inv-id',
        description: l['description'] ?? null,
        ...l,
      })),
    })),
    findById: vi.fn().mockResolvedValue(existingInvoice ?? null),
    findMany: vi.fn().mockResolvedValue({
      items: existingInvoice ? [existingInvoice] : [],
      next_cursor: null,
      has_more: false,
    }),
    updateStatus: vi.fn().mockImplementation(async (_id, _tenantId, status, extra) => {
      if (!existingInvoice) return null;
      return { ...existingInvoice, status, ...(extra ?? {}), updated_at: new Date() };
    }),
    updatePayment: vi.fn().mockImplementation(async (_id, _tenantId, paidCents, remainingCents, status, paidAt) => {
      if (!existingInvoice) return null;
      return {
        ...existingInvoice,
        paid_cents: paidCents,
        remaining_cents: remainingCents,
        status,
        paid_at: paidAt ?? null,
        updated_at: new Date(),
      };
    }),
    delete: vi.fn().mockResolvedValue(true),
  };
}

const mockNumberGen = {
  generate: vi.fn().mockResolvedValue(ok('FAC-2026-00001')),
};

describe('InvoiceService', () => {
  describe('create', () => {
    it('creates a standard invoice with calculated totals', async () => {
      const repo = createMockRepo();
      const service = createInvoiceService(repo, mockNumberGen);

      const result = await service.create(TENANT_ID, {
        client_id: CLIENT_ID,
        lines: [
          { position: 1, label: 'Service A', quantity: 2, unit: 'h', unit_price_cents: 5000, tva_rate: 20 },
        ],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.number).toBe('FAC-2026-00001');
        expect(result.value.total_ht_cents).toBe(10000);
        expect(result.value.total_tva_cents).toBe(2000);
        expect(result.value.total_ttc_cents).toBe(12000);
        expect(result.value.remaining_cents).toBe(12000);
      }
    });

    // BUSINESS RULE [CDC-2.1]: Facture d'acompte
    it('creates a deposit invoice (30%)', async () => {
      const repo = createMockRepo();
      const service = createInvoiceService(repo, mockNumberGen);

      const result = await service.create(TENANT_ID, {
        client_id: CLIENT_ID,
        type: 'deposit',
        deposit_percent: 3000, // 30%
        lines: [
          { position: 1, label: 'Service complet', quantity: 1, unit: 'forfait', unit_price_cents: 100000, tva_rate: 20 },
        ],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // 30% of 100000 = 30000
        expect(result.value.total_ht_cents).toBe(30000);
        expect(result.value.total_tva_cents).toBe(6000);
        expect(result.value.total_ttc_cents).toBe(36000);
      }
    });

    it('creates invoice linked to a quote', async () => {
      const repo = createMockRepo();
      const service = createInvoiceService(repo, mockNumberGen);

      const result = await service.create(TENANT_ID, {
        client_id: CLIENT_ID,
        quote_id: 'quote-123',
        lines: [
          { position: 1, label: 'Prestation', quantity: 1, unit: 'unit', unit_price_cents: 10000, tva_rate: 20 },
        ],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.quote_id).toBe('quote-123');
      }
    });
  });

  describe('finalize', () => {
    it('finalizes a draft invoice', async () => {
      const invoice = createMockInvoice();
      const repo = createMockRepo(invoice);
      const service = createInvoiceService(repo, mockNumberGen);

      const result = await service.finalize(invoice.id, TENANT_ID);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('finalized');
        expect(result.value.finalized_at).toBeDefined();
      }
    });

    it('rejects finalizing non-draft invoice', async () => {
      const invoice = createMockInvoice({ status: 'finalized' });
      const repo = createMockRepo(invoice);
      const service = createInvoiceService(repo, mockNumberGen);

      const result = await service.finalize(invoice.id, TENANT_ID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
    });
  });

  describe('recordPayment', () => {
    it('records a partial payment', async () => {
      const invoice = createMockInvoice({ status: 'finalized' });
      const repo = createMockRepo(invoice);
      const service = createInvoiceService(repo, mockNumberGen);

      const result = await service.recordPayment(invoice.id, TENANT_ID, 5000);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.paid_cents).toBe(5000);
        expect(result.value.remaining_cents).toBe(7000);
        expect(result.value.status).toBe('partially_paid');
      }
    });

    it('marks as paid when fully paid', async () => {
      const invoice = createMockInvoice({ status: 'finalized' });
      const repo = createMockRepo(invoice);
      const service = createInvoiceService(repo, mockNumberGen);

      const result = await service.recordPayment(invoice.id, TENANT_ID, 12000);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.paid_cents).toBe(12000);
        expect(result.value.remaining_cents).toBe(0);
        expect(result.value.status).toBe('paid');
        expect(result.value.paid_at).toBeDefined();
      }
    });

    it('rejects payment on draft invoice', async () => {
      const invoice = createMockInvoice({ status: 'draft' });
      const repo = createMockRepo(invoice);
      const service = createInvoiceService(repo, mockNumberGen);

      const result = await service.recordPayment(invoice.id, TENANT_ID, 5000);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
    });

    it('rejects payment on cancelled invoice', async () => {
      const invoice = createMockInvoice({ status: 'cancelled' });
      const repo = createMockRepo(invoice);
      const service = createInvoiceService(repo, mockNumberGen);

      const result = await service.recordPayment(invoice.id, TENANT_ID, 5000);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
    });
  });

  describe('delete', () => {
    it('deletes a draft invoice', async () => {
      const invoice = createMockInvoice();
      const repo = createMockRepo(invoice);
      const service = createInvoiceService(repo, mockNumberGen);

      const result = await service.delete(invoice.id, TENANT_ID);
      expect(result.ok).toBe(true);
    });

    it('rejects deleting finalized invoice', async () => {
      const invoice = createMockInvoice({ status: 'finalized' });
      const repo = createMockRepo(invoice);
      const service = createInvoiceService(repo, mockNumberGen);

      const result = await service.delete(invoice.id, TENANT_ID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
    });
  });
});
