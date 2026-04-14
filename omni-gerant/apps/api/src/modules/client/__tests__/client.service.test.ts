import { describe, it, expect, vi } from 'vitest';
import {
  createClientService,
  getClientDisplayName,
  type Client,
  type ClientRepository,
} from '../client.service.js';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

const mockClient: Client = {
  id: '660e8400-e29b-41d4-a716-446655440001',
  tenant_id: TENANT_ID,
  type: 'company',
  company_name: 'Acme Corp',
  siret: '12345678901234',
  first_name: null,
  last_name: null,
  email: 'contact@acme.fr',
  phone: '0123456789',
  address_line1: '12 Rue de la Paix',
  address_line2: null,
  zip_code: '75002',
  city: 'Paris',
  country: 'FR',
  notes: null,
  payment_terms: 30,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
};

function createMockRepo(overrides?: Partial<ClientRepository>): ClientRepository {
  return {
    create: vi.fn().mockResolvedValue(mockClient),
    findById: vi.fn().mockResolvedValue(mockClient),
    update: vi.fn().mockResolvedValue(mockClient),
    softDelete: vi.fn().mockResolvedValue(true),
    list: vi.fn().mockResolvedValue({ items: [mockClient], total: 1 }),
    ...overrides,
  };
}

describe('ClientService', () => {
  describe('createClient', () => {
    it('creates a company client', async () => {
      const repo = createMockRepo();
      const service = createClientService(repo);

      const result = await service.createClient(TENANT_ID, {
        type: 'company',
        company_name: 'Acme Corp',
        email: 'contact@acme.fr',
      });

      expect(result.ok).toBe(true);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenant_id: TENANT_ID, company_name: 'Acme Corp' }),
      );
    });

    it('creates an individual client', async () => {
      const individualClient = { ...mockClient, type: 'individual', first_name: 'Jean', last_name: 'Dupont' };
      const repo = createMockRepo({ create: vi.fn().mockResolvedValue(individualClient) });
      const service = createClientService(repo);

      const result = await service.createClient(TENANT_ID, {
        type: 'individual',
        first_name: 'Jean',
        last_name: 'Dupont',
      });

      expect(result.ok).toBe(true);
    });
  });

  describe('getClient', () => {
    it('returns client when found', async () => {
      const repo = createMockRepo();
      const service = createClientService(repo);

      const result = await service.getClient(mockClient.id, TENANT_ID);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.company_name).toBe('Acme Corp');
      }
    });

    it('returns NOT_FOUND when client does not exist', async () => {
      const repo = createMockRepo({ findById: vi.fn().mockResolvedValue(null) });
      const service = createClientService(repo);

      const result = await service.getClient('nonexistent', TENANT_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('updateClient', () => {
    it('updates client successfully', async () => {
      const updated = { ...mockClient, company_name: 'New Name' };
      const repo = createMockRepo({ update: vi.fn().mockResolvedValue(updated) });
      const service = createClientService(repo);

      const result = await service.updateClient(mockClient.id, TENANT_ID, { company_name: 'New Name' });

      expect(result.ok).toBe(true);
    });

    it('returns validation error when company type has no name', async () => {
      const clientNoName = { ...mockClient, company_name: null };
      const repo = createMockRepo({ findById: vi.fn().mockResolvedValue(clientNoName) });
      const service = createClientService(repo);

      const result = await service.updateClient(mockClient.id, TENANT_ID, { type: 'company' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('deleteClient', () => {
    it('soft deletes client', async () => {
      const repo = createMockRepo();
      const service = createClientService(repo);

      const result = await service.deleteClient(mockClient.id, TENANT_ID);

      expect(result.ok).toBe(true);
      expect(repo.softDelete).toHaveBeenCalledWith(mockClient.id, TENANT_ID);
    });

    it('returns NOT_FOUND for nonexistent client', async () => {
      const repo = createMockRepo({ findById: vi.fn().mockResolvedValue(null) });
      const service = createClientService(repo);

      const result = await service.deleteClient('nonexistent', TENANT_ID);

      expect(result.ok).toBe(false);
    });
  });

  describe('listClients', () => {
    it('returns paginated results', async () => {
      const repo = createMockRepo();
      const service = createClientService(repo);

      const result = await service.listClients(TENANT_ID, { limit: 20, sort_by: 'name', sort_dir: 'asc' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.has_more).toBe(false);
        expect(result.value.total).toBe(1);
      }
    });

    it('indicates has_more when items equal limit', async () => {
      const items = Array.from({ length: 20 }, (_, i) => ({
        ...mockClient,
        id: `id-${i}`,
      }));
      const repo = createMockRepo({
        list: vi.fn().mockResolvedValue({ items, total: 50 }),
      });
      const service = createClientService(repo);

      const result = await service.listClients(TENANT_ID, { limit: 20, sort_by: 'name', sort_dir: 'asc' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.has_more).toBe(true);
        expect(result.value.next_cursor).toBe('id-19');
      }
    });
  });

  describe('getClientDisplayName', () => {
    it('returns company name for company type', () => {
      expect(getClientDisplayName(mockClient)).toBe('Acme Corp');
    });

    it('returns full name for individual type', () => {
      const individual = { ...mockClient, type: 'individual', first_name: 'Jean', last_name: 'Dupont' };
      expect(getClientDisplayName(individual)).toBe('Jean Dupont');
    });

    it('returns "Sans nom" when no name', () => {
      const noName = { ...mockClient, type: 'individual', company_name: null, first_name: null, last_name: null };
      expect(getClientDisplayName(noName)).toBe('Sans nom');
    });
  });
});
