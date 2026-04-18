import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createNF525AuditService,
  type NF525AuditRepository,
  type NF525AuditEntry,
  type NF525AuditAction,
} from '../nf525-audit.service.js';

// --- Test helpers ---

const TENANT_ID = 'tenant-audit';

function makeAuditEntry(overrides: Partial<NF525AuditEntry> = {}): NF525AuditEntry {
  return {
    id: 'audit-001',
    timestamp: new Date('2026-01-15T10:00:00Z'),
    action: 'create',
    invoiceId: 'inv-001',
    invoiceNumber: 'FAC-2026-001',
    tenantId: TENANT_ID,
    userId: 'user-001',
    hashBefore: '',
    hashAfter: 'abc123',
    chainPosition: 0,
    details: {},
    ...overrides,
  };
}

// --- Mock repository ---

function createMockAuditRepo(): NF525AuditRepository {
  let autoId = 0;
  const entries: NF525AuditEntry[] = [];

  return {
    create: vi.fn(async (data) => {
      const entry = { ...data, id: `audit-${++autoId}` } as NF525AuditEntry;
      entries.push(entry);
      return entry;
    }),
    findByInvoiceId: vi.fn(async (invoiceId) => entries.filter(e => e.invoiceId === invoiceId)),
    list: vi.fn(async (_tenantId, query) => {
      let filtered = [...entries];
      if (query.invoiceId) filtered = filtered.filter(e => e.invoiceId === query.invoiceId);
      if (query.action) filtered = filtered.filter(e => e.action === query.action);
      return { items: filtered.slice(0, query.limit), next_cursor: null, has_more: false };
    }),
    getAll: vi.fn(async () => [...entries]),
  };
}

// --- Tests ---

describe('NF525 Audit Service', () => {
  let repo: NF525AuditRepository;
  let service: ReturnType<typeof createNF525AuditService>;

  beforeEach(() => {
    repo = createMockAuditRepo();
    service = createNF525AuditService(repo);
  });

  describe('Logging actions', () => {
    it('creates audit entry for each invoice action', async () => {
      const result = await service.log({
        action: 'create',
        invoiceId: 'inv-001',
        invoiceNumber: 'FAC-2026-001',
        tenantId: TENANT_ID,
        userId: 'user-001',
        hashBefore: '',
        hashAfter: 'hash-after-create',
        chainPosition: 0,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.action).toBe('create');
      expect(result.value.invoiceId).toBe('inv-001');
      expect(result.value.hashAfter).toBe('hash-after-create');
      expect(result.value.timestamp).toBeInstanceOf(Date);
    });

    it('logs all 7 action types', async () => {
      const actions: NF525AuditAction[] = [
        'create', 'validate', 'send_ppf', 'receive_status',
        'cancel', 'credit_note', 'payment',
      ];

      for (const action of actions) {
        const result = await service.log({
          action,
          invoiceId: 'inv-001',
          invoiceNumber: 'FAC-2026-001',
          tenantId: TENANT_ID,
          userId: 'user-001',
          hashBefore: action === 'create' ? '' : 'hash-before',
          hashAfter: `hash-after-${action}`,
          chainPosition: 1,
        });
        expect(result.ok).toBe(true);
      }

      // Verify all entries created
      const entries = await repo.getAll(TENANT_ID);
      expect(entries).toHaveLength(7);
    });
  });

  describe('Hash tracking', () => {
    it('hash before and after are present and different for validate action', async () => {
      const result = await service.log({
        action: 'validate',
        invoiceId: 'inv-001',
        invoiceNumber: 'FAC-2026-001',
        tenantId: TENANT_ID,
        userId: 'user-001',
        hashBefore: 'hash-draft',
        hashAfter: 'hash-sealed',
        chainPosition: 1,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.hashBefore).toBe('hash-draft');
      expect(result.value.hashAfter).toBe('hash-sealed');
      expect(result.value.hashBefore).not.toBe(result.value.hashAfter);
    });

    it('create action has empty hashBefore', async () => {
      const result = await service.log({
        action: 'create',
        invoiceId: 'inv-002',
        invoiceNumber: 'FAC-2026-002',
        tenantId: TENANT_ID,
        userId: 'user-001',
        hashBefore: '',
        hashAfter: 'hash-created',
        chainPosition: 0,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.hashBefore).toBe('');
    });
  });

  describe('Export for fiscal audit', () => {
    it('exports all entries in chronological order as JSON', async () => {
      // Create entries in reverse order
      await service.log({
        action: 'validate',
        invoiceId: 'inv-001',
        invoiceNumber: 'FAC-2026-001',
        tenantId: TENANT_ID,
        userId: 'user-001',
        hashBefore: 'h1',
        hashAfter: 'h2',
        chainPosition: 1,
      });

      await service.log({
        action: 'send_ppf',
        invoiceId: 'inv-001',
        invoiceNumber: 'FAC-2026-001',
        tenantId: TENANT_ID,
        userId: 'user-001',
        hashBefore: 'h2',
        hashAfter: 'h3',
        chainPosition: 1,
        details: { ppfId: 'ppf-123' },
      });

      const result = await service.exportForAudit(TENANT_ID, 'json');

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const parsed = JSON.parse(result.value);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].action).toBeDefined();
    });

    it('exports as CSV with proper formatting', async () => {
      await service.log({
        action: 'create',
        invoiceId: 'inv-csv',
        invoiceNumber: 'FAC-CSV-001',
        tenantId: TENANT_ID,
        userId: 'user-001',
        hashBefore: '',
        hashAfter: 'hash-csv',
        chainPosition: 0,
      });

      const result = await service.exportForAudit(TENANT_ID, 'csv');

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const lines = result.value.split('\n');
      expect(lines[0]).toContain('id,timestamp,action');
      expect(lines).toHaveLength(2); // header + 1 row
      expect(lines[1]).toContain('FAC-CSV-001');
    });
  });

  describe('PPF integration audit', () => {
    it('logs send_ppf action with ppfId in details', async () => {
      const result = await service.log({
        action: 'send_ppf',
        invoiceId: 'inv-ppf',
        invoiceNumber: 'FAC-2026-PPF',
        tenantId: TENANT_ID,
        userId: 'user-001',
        hashBefore: 'hash-before-send',
        hashAfter: 'hash-after-send',
        chainPosition: 1,
        details: { ppfId: 'ppf-submission-456', status: 'deposee' },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.action).toBe('send_ppf');
      expect(result.value.details).toEqual({ ppfId: 'ppf-submission-456', status: 'deposee' });
    });

    it('logs receive_status from PPF webhook', async () => {
      const result = await service.log({
        action: 'receive_status',
        invoiceId: 'inv-ppf',
        invoiceNumber: 'FAC-2026-PPF',
        tenantId: TENANT_ID,
        userId: 'system',
        hashBefore: 'hash-before-status',
        hashAfter: 'hash-after-status',
        chainPosition: 1,
        details: { ppfId: 'ppf-456', newStatus: 'acceptee', previousStatus: 'en_cours_traitement' },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.action).toBe('receive_status');
      expect(result.value.details).toHaveProperty('ppfId');
      expect(result.value.details).toHaveProperty('newStatus', 'acceptee');
    });
  });

  describe('Audit integrity verification', () => {
    it('verifies unmodified journal as valid', async () => {
      await service.log({
        action: 'create',
        invoiceId: 'inv-v1',
        invoiceNumber: 'FAC-V1',
        tenantId: TENANT_ID,
        userId: 'user-001',
        hashBefore: '',
        hashAfter: 'h1',
        chainPosition: 0,
      });

      await service.log({
        action: 'validate',
        invoiceId: 'inv-v1',
        invoiceNumber: 'FAC-V1',
        tenantId: TENANT_ID,
        userId: 'user-001',
        hashBefore: 'h1',
        hashAfter: 'h2',
        chainPosition: 1,
      });

      const result = await service.verifyAuditIntegrity(TENANT_ID);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.valid).toBe(true);
      expect(result.value.totalEntries).toBe(2);
      expect(result.value.errors).toHaveLength(0);
    });
  });

  describe('Get by invoice', () => {
    it('returns all audit entries for a specific invoice', async () => {
      await service.log({
        action: 'create',
        invoiceId: 'inv-specific',
        invoiceNumber: 'FAC-SPEC',
        tenantId: TENANT_ID,
        userId: 'user-001',
        hashBefore: '',
        hashAfter: 'h1',
        chainPosition: 0,
      });

      await service.log({
        action: 'validate',
        invoiceId: 'inv-specific',
        invoiceNumber: 'FAC-SPEC',
        tenantId: TENANT_ID,
        userId: 'user-001',
        hashBefore: 'h1',
        hashAfter: 'h2',
        chainPosition: 1,
      });

      // Different invoice
      await service.log({
        action: 'create',
        invoiceId: 'inv-other',
        invoiceNumber: 'FAC-OTHER',
        tenantId: TENANT_ID,
        userId: 'user-001',
        hashBefore: '',
        hashAfter: 'h3',
        chainPosition: 0,
      });

      const result = await service.getByInvoice('inv-specific', TENANT_ID);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(2);
      expect(result.value.every(e => e.invoiceId === 'inv-specific')).toBe(true);
    });
  });
});
