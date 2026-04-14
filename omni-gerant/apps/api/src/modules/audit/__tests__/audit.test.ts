import { describe, it, expect, vi } from 'vitest';
import { createAuditService, type AuditRepository, type AuditEntry } from '../audit.service.js';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID = '660e8400-e29b-41d4-a716-446655440001';

function createMockEntry(overrides?: Partial<AuditEntry>): AuditEntry {
  return {
    id: crypto.randomUUID(),
    tenant_id: TENANT_ID,
    user_id: USER_ID,
    action: 'CREATE',
    entity_type: 'Client',
    entity_id: crypto.randomUUID(),
    old_values: null,
    new_values: { name: 'Test Client' },
    ip_address: '127.0.0.1',
    user_agent: 'test-agent',
    created_at: new Date(),
    ...overrides,
  };
}

function createMockRepo(entries: AuditEntry[] = []): AuditRepository {
  return {
    create: vi.fn().mockImplementation(async (data) => ({
      id: crypto.randomUUID(),
      ...data,
      entity_id: data.entity_id ?? null,
      old_values: data.old_values ?? null,
      new_values: data.new_values ?? null,
      ip_address: data.ip_address ?? null,
      user_agent: data.user_agent ?? null,
      created_at: new Date(),
    })),
    findByTenant: vi.fn().mockResolvedValue({
      items: entries,
      next_cursor: null,
      has_more: false,
    }),
    findById: vi.fn().mockImplementation(async (id, tenantId) => {
      return entries.find((e) => e.id === id && e.tenant_id === tenantId) ?? null;
    }),
  };
}

describe('AuditService', () => {
  describe('log', () => {
    it('creates an audit entry', async () => {
      const repo = createMockRepo();
      const service = createAuditService(repo);

      const result = await service.log({
        tenant_id: TENANT_ID,
        user_id: USER_ID,
        action: 'CREATE',
        entity_type: 'Client',
        entity_id: '123',
        new_values: { name: 'ACME' },
        ip_address: '192.168.1.1',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.action).toBe('CREATE');
        expect(result.value.entity_type).toBe('Client');
        expect(result.value.tenant_id).toBe(TENANT_ID);
      }
      expect(repo.create).toHaveBeenCalledOnce();
    });

    it('records old and new values for updates', async () => {
      const repo = createMockRepo();
      const service = createAuditService(repo);

      const result = await service.log({
        tenant_id: TENANT_ID,
        user_id: USER_ID,
        action: 'UPDATE',
        entity_type: 'Product',
        entity_id: '456',
        old_values: { name: 'Old Name' },
        new_values: { name: 'New Name' },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.old_values).toEqual({ name: 'Old Name' });
        expect(result.value.new_values).toEqual({ name: 'New Name' });
      }
    });
  });

  describe('list', () => {
    it('returns paginated audit entries', async () => {
      const entries = [createMockEntry(), createMockEntry({ action: 'UPDATE' })];
      const repo = createMockRepo(entries);
      const service = createAuditService(repo);

      const result = await service.list({ tenant_id: TENANT_ID });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.has_more).toBe(false);
      }
    });

    it('passes filters to repository', async () => {
      const repo = createMockRepo();
      const service = createAuditService(repo);

      await service.list({
        tenant_id: TENANT_ID,
        entity_type: 'Invoice',
        action: 'DELETE',
        limit: 10,
      });

      expect(repo.findByTenant).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: TENANT_ID,
          entity_type: 'Invoice',
          action: 'DELETE',
          limit: 10,
        }),
      );
    });

    it('defaults limit to 50', async () => {
      const repo = createMockRepo();
      const service = createAuditService(repo);

      await service.list({ tenant_id: TENANT_ID });

      expect(repo.findByTenant).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 }),
      );
    });
  });

  describe('getById', () => {
    it('returns entry when found', async () => {
      const entry = createMockEntry();
      const repo = createMockRepo([entry]);
      const service = createAuditService(repo);

      const result = await service.getById(entry.id, TENANT_ID);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(entry.id);
      }
    });

    it('returns NOT_FOUND when entry does not exist', async () => {
      const repo = createMockRepo();
      const service = createAuditService(repo);

      const result = await service.getById('nonexistent-id', TENANT_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    // BUSINESS RULE [R03]: tenant isolation - a tenant cannot see another tenant's audit logs
    it('does not return entry from different tenant', async () => {
      const entry = createMockEntry({ tenant_id: 'other-tenant-id' });
      const repo = createMockRepo([entry]);
      const service = createAuditService(repo);

      const result = await service.getById(entry.id, TENANT_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });
});
