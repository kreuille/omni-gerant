import { describe, it, expect, vi } from 'vitest';
import { createTenantService, type TenantRepository } from '../tenant.service.js';

const mockTenant = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Test SARL',
  siret: '12345678901234',
  siren: '123456789',
  naf_code: '4399C',
  legal_form: 'SARL',
  address: { line1: '12 Rue de la Paix', zip_code: '75002', city: 'Paris', country: 'FR' },
  settings: {},
  plan: 'starter',
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
};

function createMockRepo(overrides?: Partial<TenantRepository>): TenantRepository {
  return {
    findById: vi.fn().mockResolvedValue(mockTenant),
    update: vi.fn().mockResolvedValue(mockTenant),
    ...overrides,
  };
}

describe('TenantService', () => {
  describe('getTenant', () => {
    it('returns tenant when found', async () => {
      const repo = createMockRepo();
      const service = createTenantService(repo);

      const result = await service.getTenant(mockTenant.id);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('Test SARL');
      }
    });

    it('returns NOT_FOUND when tenant does not exist', async () => {
      const repo = createMockRepo({ findById: vi.fn().mockResolvedValue(null) });
      const service = createTenantService(repo);

      const result = await service.getTenant('nonexistent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('updateTenant', () => {
    it('updates tenant successfully', async () => {
      const updatedTenant = { ...mockTenant, name: 'Updated SARL' };
      const repo = createMockRepo({
        update: vi.fn().mockResolvedValue(updatedTenant),
      });
      const service = createTenantService(repo);

      const result = await service.updateTenant(mockTenant.id, { name: 'Updated SARL' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('Updated SARL');
      }
    });

    it('returns NOT_FOUND when tenant does not exist', async () => {
      const repo = createMockRepo({ findById: vi.fn().mockResolvedValue(null) });
      const service = createTenantService(repo);

      const result = await service.updateTenant('nonexistent', { name: 'New Name' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });
});
