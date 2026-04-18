import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createNF525Service,
  type NF525Repository,
  type NF525InvoiceRepository,
  type InvoiceHashChain,
} from '../nf525-service.js';
import type { Invoice, InvoiceLine } from '../invoice.service.js';

// --- Test helpers ---

const TENANT_ID = 'tenant-nf525';

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv-001',
    tenant_id: TENANT_ID,
    client_id: 'cli-001',
    quote_id: null,
    number: 'FAC-2026-001',
    type: 'standard',
    status: 'finalized',
    issue_date: new Date('2026-01-15T00:00:00Z'),
    due_date: new Date('2026-02-15T00:00:00Z'),
    deposit_percent: null,
    situation_percent: null,
    previous_situation_cents: null,
    payment_terms: 30,
    notes: null,
    total_ht_cents: 100000,
    total_tva_cents: 20000,
    total_ttc_cents: 120000,
    paid_cents: 0,
    remaining_cents: 120000,
    finalized_at: new Date('2026-01-15T10:00:00Z'),
    paid_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    lines: [
      {
        id: 'line-001',
        invoice_id: 'inv-001',
        position: 1,
        label: 'Prestation',
        description: null,
        quantity: 10,
        unit: 'unit',
        unit_price_cents: 10000,
        tva_rate: 2000,
        total_ht_cents: 100000,
      },
    ],
    ...overrides,
  };
}

function makeChainEntry(overrides: Partial<InvoiceHashChain> = {}): InvoiceHashChain {
  return {
    invoiceId: 'inv-001',
    invoiceNumber: 'FAC-2026-001',
    sequenceNumber: 1,
    currentHash: 'abc123def456',
    previousHash: 'GENESIS',
    timestamp: new Date(),
    signedFields: [],
    ...overrides,
  };
}

// --- Mocks ---

function createMockNF525Repo(): NF525Repository {
  const entries: InvoiceHashChain[] = [];
  return {
    getLastChainEntry: vi.fn(async () => entries.length > 0 ? entries[entries.length - 1]! : null),
    saveChainEntry: vi.fn(async (_tenantId, entry) => { entries.push(entry); }),
    getChainEntry: vi.fn(async (invoiceId) => entries.find(e => e.invoiceId === invoiceId) ?? null),
    getAllChainEntries: vi.fn(async () => [...entries]),
  };
}

function createMockInvoiceRepo(): NF525InvoiceRepository {
  const invoices = new Map<string, Invoice>();
  return {
    findById: vi.fn(async (id) => invoices.get(id) ?? null),
    updateNF525Hash: vi.fn(async (id, _tenantId, hash, seq) => {
      const inv = invoices.get(id);
      if (!inv) return null;
      return inv;
    }),
    // Test helper
    _addInvoice(inv: Invoice) { invoices.set(inv.id, inv); },
  } as NF525InvoiceRepository & { _addInvoice: (inv: Invoice) => void };
}

// --- Tests ---

describe('NF525 Service', () => {
  let nf525Repo: NF525Repository;
  let invoiceRepo: NF525InvoiceRepository & { _addInvoice: (inv: Invoice) => void };
  let service: ReturnType<typeof createNF525Service>;

  beforeEach(() => {
    nf525Repo = createMockNF525Repo();
    invoiceRepo = createMockInvoiceRepo() as NF525InvoiceRepository & { _addInvoice: (inv: Invoice) => void };
    service = createNF525Service(nf525Repo, invoiceRepo);
  });

  describe('Hash chain', () => {
    it('first invoice has previousHash = GENESIS', async () => {
      const invoice = makeInvoice({ id: 'inv-first' });
      invoiceRepo._addInvoice(invoice);

      const result = await service.sealInvoice('inv-first', TENANT_ID);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.previousHash).toBe('GENESIS');
      expect(result.value.sequenceNumber).toBe(1);
      expect(result.value.currentHash).toBeTruthy();
      expect(result.value.currentHash.length).toBe(64); // SHA-256 hex
    });

    it('second invoice references hash of first invoice', async () => {
      // Seal first invoice
      const inv1 = makeInvoice({ id: 'inv-1', number: 'FAC-2026-001' });
      invoiceRepo._addInvoice(inv1);
      const result1 = await service.sealInvoice('inv-1', TENANT_ID);
      expect(result1.ok).toBe(true);
      if (!result1.ok) return;

      // Seal second invoice
      const inv2 = makeInvoice({ id: 'inv-2', number: 'FAC-2026-002' });
      invoiceRepo._addInvoice(inv2);
      const result2 = await service.sealInvoice('inv-2', TENANT_ID);
      expect(result2.ok).toBe(true);
      if (!result2.ok) return;

      expect(result2.value.previousHash).toBe(result1.value.currentHash);
      expect(result2.value.sequenceNumber).toBe(2);
    });

    it('sequence numbers are sequential without gaps', async () => {
      for (let i = 1; i <= 5; i++) {
        const inv = makeInvoice({ id: `inv-${i}`, number: `FAC-2026-${String(i).padStart(3, '0')}` });
        invoiceRepo._addInvoice(inv);
        const result = await service.sealInvoice(`inv-${i}`, TENANT_ID);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.sequenceNumber).toBe(i);
      }
    });
  });

  describe('Immutability', () => {
    it('rejects modification of finalized invoice', () => {
      const invoice = makeInvoice({ finalized_at: new Date() });
      const result = service.checkImmutability(invoice);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain('INVOICE_IMMUTABLE');
    });

    it('allows modification of draft invoice', () => {
      const invoice = makeInvoice({ finalized_at: null });
      const result = service.checkImmutability(invoice);
      expect(result.ok).toBe(true);
    });
  });

  describe('Credit note (avoir)', () => {
    it('credit note can reference original invoice and be sealed', async () => {
      // Seal original invoice
      const original = makeInvoice({ id: 'inv-orig', number: 'FAC-2026-010' });
      invoiceRepo._addInvoice(original);
      await service.sealInvoice('inv-orig', TENANT_ID);

      // Seal credit note
      const creditNote = makeInvoice({
        id: 'inv-cn',
        number: 'AVO-2026-001',
        type: 'credit_note',
        total_ht_cents: -100000,
        total_tva_cents: -20000,
        total_ttc_cents: -120000,
      });
      invoiceRepo._addInvoice(creditNote);
      const result = await service.sealInvoice('inv-cn', TENANT_ID);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.sequenceNumber).toBe(2);
    });
  });

  describe('Integrity verification', () => {
    it('verifies valid chain as ok', async () => {
      // Seal 3 invoices
      for (let i = 1; i <= 3; i++) {
        const inv = makeInvoice({ id: `inv-v${i}`, number: `FAC-2026-V${i}` });
        invoiceRepo._addInvoice(inv);
        await service.sealInvoice(`inv-v${i}`, TENANT_ID);
      }

      const result = await service.verifyChainIntegrity(TENANT_ID);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.isChainValid).toBe(true);
      expect(result.value.totalInvoices).toBe(3);
      expect(result.value.verifiedOk).toBe(3);
      expect(result.value.errors).toHaveLength(0);
    });

    it('detects hash_mismatch when invoice data was modified', async () => {
      const inv = makeInvoice({ id: 'inv-tamper', number: 'FAC-2026-T01' });
      invoiceRepo._addInvoice(inv);
      await service.sealInvoice('inv-tamper', TENANT_ID);

      // Tamper with the invoice data
      const tamperedInv = makeInvoice({
        id: 'inv-tamper',
        number: 'FAC-2026-T01',
        total_ht_cents: 999999, // Modified!
      });
      (invoiceRepo as unknown as { _addInvoice: (inv: Invoice) => void })._addInvoice(tamperedInv);

      const result = await service.verifyChainIntegrity(TENANT_ID);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.isChainValid).toBe(false);
      const mismatchErrors = result.value.errors.filter(e => e.errorType === 'hash_mismatch');
      expect(mismatchErrors.length).toBeGreaterThan(0);
    });

    it('detects sequence_gap when invoice is deleted from chain', async () => {
      // Seal 3 invoices
      for (let i = 1; i <= 3; i++) {
        const inv = makeInvoice({ id: `inv-g${i}`, number: `FAC-2026-G${i}` });
        invoiceRepo._addInvoice(inv);
        await service.sealInvoice(`inv-g${i}`, TENANT_ID);
      }

      // Remove the second entry from chain (simulate deletion)
      const allEntries = await nf525Repo.getAllChainEntries(TENANT_ID);
      const filtered = allEntries.filter(e => e.sequenceNumber !== 2);
      vi.mocked(nf525Repo.getAllChainEntries).mockResolvedValue(filtered);

      const result = await service.verifyChainIntegrity(TENANT_ID);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.isChainValid).toBe(false);
      const gapErrors = result.value.errors.filter(e => e.errorType === 'sequence_gap');
      expect(gapErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Soft delete protection', () => {
    it('prevents soft delete on finalized invoice', () => {
      const invoice = makeInvoice({ finalized_at: new Date() });
      const result = service.checkDeletable(invoice);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain('INVOICE_IMMUTABLE');
    });

    it('allows soft delete on draft invoice', () => {
      const invoice = makeInvoice({ finalized_at: null });
      const result = service.checkDeletable(invoice);
      expect(result.ok).toBe(true);
    });
  });

  describe('Hash determinism', () => {
    it('same data produces same hash', async () => {
      const inv1 = makeInvoice({ id: 'inv-det1', number: 'FAC-DET-001' });
      const inv2 = makeInvoice({ id: 'inv-det1', number: 'FAC-DET-001' }); // Same data

      const payload1 = service._buildHashPayload(inv1, inv1.lines, 'GENESIS');
      const payload2 = service._buildHashPayload(inv2, inv2.lines, 'GENESIS');

      expect(payload1).toBe(payload2);

      const hash1 = service._computeHash(payload1);
      const hash2 = service._computeHash(payload2);

      expect(hash1).toBe(hash2);
    });

    it('different data produces different hash', () => {
      const inv1 = makeInvoice({ id: 'inv-d1', total_ht_cents: 100000 });
      const inv2 = makeInvoice({ id: 'inv-d2', total_ht_cents: 200000 });

      const payload1 = service._buildHashPayload(inv1, inv1.lines, 'GENESIS');
      const payload2 = service._buildHashPayload(inv2, inv2.lines, 'GENESIS');

      const hash1 = service._computeHash(payload1);
      const hash2 = service._computeHash(payload2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Individual invoice integrity', () => {
    it('returns true for unmodified sealed invoice', async () => {
      const inv = makeInvoice({ id: 'inv-verify' });
      invoiceRepo._addInvoice(inv);
      await service.sealInvoice('inv-verify', TENANT_ID);

      const result = await service.verifyInvoiceIntegrity('inv-verify', TENANT_ID);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toBe(true);
    });
  });

  describe('Duplicate sealing', () => {
    it('rejects sealing an already sealed invoice', async () => {
      const inv = makeInvoice({ id: 'inv-dup-seal' });
      invoiceRepo._addInvoice(inv);
      await service.sealInvoice('inv-dup-seal', TENANT_ID);

      const result = await service.sealInvoice('inv-dup-seal', TENANT_ID);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('CONFLICT');
    });
  });
});
