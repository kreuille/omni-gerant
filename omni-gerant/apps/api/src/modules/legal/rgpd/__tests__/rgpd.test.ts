import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRgpdService,
  exportCnilFormat,
  type RgpdRepository,
  type RgpdRegistry,
  type RgpdTreatment,
} from '../rgpd.service.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

function createMockRepo(): RgpdRepository {
  const registries = new Map<string, RgpdRegistry>();

  return {
    async createRegistry(tenantId, data) {
      const id = crypto.randomUUID();
      const registry: RgpdRegistry = {
        ...data,
        id,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      registries.set(tenantId, registry);
      return registry;
    },
    async findRegistry(tenantId) {
      const r = registries.get(tenantId);
      if (!r || r.deleted_at) return null;
      return r;
    },
    async updateRegistry(tenantId, data) {
      const r = registries.get(tenantId);
      if (!r || r.deleted_at) return null;
      const updated = { ...r, ...data, updated_at: new Date() } as RgpdRegistry;
      registries.set(tenantId, updated);
      return updated;
    },
    async deleteRegistry(tenantId) {
      const r = registries.get(tenantId);
      if (!r || r.deleted_at) return false;
      r.deleted_at = new Date();
      return true;
    },
    async addTreatment(registryId, data) {
      const registry = [...registries.values()].find((r) => r.id === registryId);
      if (!registry) throw new Error('Registry not found');
      const treatment: RgpdTreatment = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      registry.treatments.push(treatment);
      return treatment;
    },
    async updateTreatment(registryId, treatmentId, data) {
      const registry = [...registries.values()].find((r) => r.id === registryId);
      if (!registry) return null;
      const idx = registry.treatments.findIndex((t) => t.id === treatmentId);
      if (idx === -1) return null;
      registry.treatments[idx] = { ...registry.treatments[idx]!, ...data, updated_at: new Date() } as RgpdTreatment;
      return registry.treatments[idx]!;
    },
    async deleteTreatment(registryId, treatmentId) {
      const registry = [...registries.values()].find((r) => r.id === registryId);
      if (!registry) return false;
      const idx = registry.treatments.findIndex((t) => t.id === treatmentId);
      if (idx === -1) return false;
      registry.treatments.splice(idx, 1);
      return true;
    },
  };
}

describe('RgpdService', () => {
  let repo: RgpdRepository;
  let service: ReturnType<typeof createRgpdService>;

  beforeEach(() => {
    repo = createMockRepo();
    service = createRgpdService(repo);
  });

  describe('createRegistry', () => {
    it('creates registry with 5 pre-filled treatments', async () => {
      const result = await service.createRegistry(TENANT_ID, {
        company_name: 'BTP Martin SARL',
        siret: '12345678901234',
        prefill: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.company_name).toBe('BTP Martin SARL');
        expect(result.value.siret).toBe('12345678901234');
        expect(result.value.treatments).toHaveLength(5);

        // Check the 5 default treatments
        const names = result.value.treatments.map((t) => t.name);
        expect(names).toContain('Gestion de la relation client');
        expect(names).toContain('Facturation et comptabilite');
        expect(names).toContain('Gestion des fournisseurs');
        expect(names).toContain('Gestion du personnel');
        expect(names).toContain('Prospection commerciale');
      }
    });

    it('creates registry without pre-fill when prefill=false', async () => {
      const result = await service.createRegistry(TENANT_ID, {
        company_name: 'Test Co',
        prefill: false,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.treatments).toHaveLength(0);
      }
    });

    it('rejects duplicate registry for same tenant', async () => {
      await service.createRegistry(TENANT_ID, {
        company_name: 'Test',
        prefill: false,
      });

      const result = await service.createRegistry(TENANT_ID, {
        company_name: 'Test 2',
        prefill: false,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CONFLICT');
      }
    });

    it('pre-filled treatments have correct legal bases', async () => {
      const result = await service.createRegistry(TENANT_ID, {
        company_name: 'Test',
        prefill: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const clientTreatment = result.value.treatments.find((t) => t.name.includes('relation client'));
        expect(clientTreatment?.legal_basis).toBe('contrat');

        const facturaTreatment = result.value.treatments.find((t) => t.name.includes('Facturation'));
        expect(facturaTreatment?.legal_basis).toBe('obligation_legale');

        const prospectionTreatment = result.value.treatments.find((t) => t.name.includes('Prospection'));
        expect(prospectionTreatment?.legal_basis).toBe('interet_legitime');
      }
    });

    it('pre-filled treatments have security measures', async () => {
      const result = await service.createRegistry(TENANT_ID, {
        company_name: 'Test',
        prefill: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        for (const treatment of result.value.treatments) {
          expect(treatment.security_measures.length).toBeGreaterThan(0);
          expect(treatment.retention_period.length).toBeGreaterThan(0);
          expect(treatment.data_categories.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('getRegistry', () => {
    it('returns registry for tenant', async () => {
      await service.createRegistry(TENANT_ID, {
        company_name: 'Test',
        prefill: false,
      });

      const result = await service.getRegistry(TENANT_ID);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value?.company_name).toBe('Test');
      }
    });

    it('returns null for non-existent tenant', async () => {
      const result = await service.getRegistry('unknown-tenant');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('updateRegistry', () => {
    it('updates registry fields', async () => {
      await service.createRegistry(TENANT_ID, {
        company_name: 'Old Name',
        prefill: false,
      });

      const result = await service.updateRegistry(TENANT_ID, {
        company_name: 'New Name',
        dpo_name: 'Jean Dupont',
        dpo_email: 'dpo@test.fr',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.company_name).toBe('New Name');
        expect(result.value.dpo_name).toBe('Jean Dupont');
        expect(result.value.dpo_email).toBe('dpo@test.fr');
      }
    });

    it('returns NOT_FOUND for non-existent registry', async () => {
      const result = await service.updateRegistry('unknown', { company_name: 'Test' });
      expect(result.ok).toBe(false);
    });
  });

  describe('deleteRegistry', () => {
    it('soft deletes registry', async () => {
      await service.createRegistry(TENANT_ID, {
        company_name: 'Test',
        prefill: false,
      });

      const deleteResult = await service.deleteRegistry(TENANT_ID);
      expect(deleteResult.ok).toBe(true);

      const getResult = await service.getRegistry(TENANT_ID);
      expect(getResult.ok).toBe(true);
      if (getResult.ok) {
        expect(getResult.value).toBeNull();
      }
    });
  });

  describe('CRUD treatments', () => {
    it('adds a treatment to registry', async () => {
      await service.createRegistry(TENANT_ID, {
        company_name: 'Test',
        prefill: false,
      });

      const result = await service.addTreatment(TENANT_ID, {
        name: 'Videoprotection',
        purpose: 'Securite des locaux',
        legal_basis: 'interet_legitime',
        data_categories: ['Images video'],
        data_subjects: 'Visiteurs et salaries',
        recipients: ['Service securite'],
        retention_period: '30 jours',
        security_measures: ['Acces restreint', 'Suppression automatique'],
        transfer_outside_eu: false,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('Videoprotection');
        expect(result.value.legal_basis).toBe('interet_legitime');
      }
    });

    it('updates a treatment', async () => {
      await service.createRegistry(TENANT_ID, {
        company_name: 'Test',
        prefill: true,
      });

      const registry = await service.getRegistry(TENANT_ID);
      if (!registry.ok || !registry.value) throw new Error('Failed');

      const treatmentId = registry.value.treatments[0]!.id;
      const result = await service.updateTreatment(TENANT_ID, treatmentId, {
        retention_period: '5 ans',
        notes: 'Mise a jour suite audit',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.retention_period).toBe('5 ans');
        expect(result.value.notes).toBe('Mise a jour suite audit');
      }
    });

    it('deletes a treatment', async () => {
      await service.createRegistry(TENANT_ID, {
        company_name: 'Test',
        prefill: true,
      });

      const registry = await service.getRegistry(TENANT_ID);
      if (!registry.ok || !registry.value) throw new Error('Failed');

      const treatmentId = registry.value.treatments[0]!.id;
      const deleteResult = await service.deleteTreatment(TENANT_ID, treatmentId);
      expect(deleteResult.ok).toBe(true);

      const updated = await service.getRegistry(TENANT_ID);
      if (!updated.ok || !updated.value) throw new Error('Failed');
      expect(updated.value.treatments).toHaveLength(4);
    });

    it('returns NOT_FOUND for treatment on non-existent registry', async () => {
      const result = await service.addTreatment('unknown', {
        name: 'Test',
        purpose: 'Test',
        legal_basis: 'contrat',
        data_categories: ['Test'],
        data_subjects: 'Test',
        recipients: [],
        retention_period: '1 an',
        security_measures: [],
        transfer_outside_eu: false,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });
});

describe('exportCnilFormat', () => {
  it('exports registry in TSV format', () => {
    const registry: RgpdRegistry = {
      id: 'test-id',
      tenant_id: TENANT_ID,
      company_name: 'BTP Martin SARL',
      siret: '12345678901234',
      dpo_name: 'Jean Dupont',
      dpo_email: 'dpo@btpmartin.fr',
      treatments: [
        {
          id: 't1',
          registry_id: 'test-id',
          name: 'Gestion clients',
          purpose: 'Suivi relation client',
          legal_basis: 'contrat',
          data_categories: ['Identite', 'Coordonnees'],
          data_subjects: 'Clients',
          recipients: ['Personnel'],
          retention_period: '3 ans',
          security_measures: ['Mot de passe', 'Chiffrement'],
          transfer_outside_eu: false,
          transfer_details: null,
          notes: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };

    const tsv = exportCnilFormat(registry);

    expect(tsv).toContain('BTP Martin SARL');
    expect(tsv).toContain('12345678901234');
    expect(tsv).toContain('Jean Dupont');
    expect(tsv).toContain('dpo@btpmartin.fr');
    expect(tsv).toContain('Activite de traitement');
    expect(tsv).toContain('Gestion clients');
    expect(tsv).toContain('contrat');
    expect(tsv).toContain('Identite, Coordonnees');
    expect(tsv).toContain('Non'); // transfer_outside_eu = false
  });

  it('exports with transfer outside EU', () => {
    const registry: RgpdRegistry = {
      id: 'test-id',
      tenant_id: TENANT_ID,
      company_name: 'Test',
      siret: null,
      dpo_name: null,
      dpo_email: null,
      treatments: [
        {
          id: 't1',
          registry_id: 'test-id',
          name: 'Cloud storage',
          purpose: 'Stockage documents',
          legal_basis: 'contrat',
          data_categories: ['Documents'],
          data_subjects: 'Clients',
          recipients: ['AWS'],
          retention_period: '5 ans',
          security_measures: ['Chiffrement'],
          transfer_outside_eu: true,
          transfer_details: 'AWS US - Clauses contractuelles types',
          notes: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };

    const tsv = exportCnilFormat(registry);

    expect(tsv).toContain('Oui');
    expect(tsv).toContain('AWS US - Clauses contractuelles types');
  });

  it('exports empty registry with headers', () => {
    const registry: RgpdRegistry = {
      id: 'test-id',
      tenant_id: TENANT_ID,
      company_name: 'Test',
      siret: null,
      dpo_name: null,
      dpo_email: null,
      treatments: [],
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };

    const tsv = exportCnilFormat(registry);

    expect(tsv).toContain('Responsable de traitement\tTest');
    expect(tsv).toContain('Activite de traitement');
    expect(tsv).toContain('Finalite');
    expect(tsv).toContain('Base legale');
  });

  it('handles multiple treatments', () => {
    const registry: RgpdRegistry = {
      id: 'test-id',
      tenant_id: TENANT_ID,
      company_name: 'Multi',
      siret: null,
      dpo_name: null,
      dpo_email: null,
      treatments: [
        {
          id: 't1',
          registry_id: 'test-id',
          name: 'Traitement 1',
          purpose: 'But 1',
          legal_basis: 'contrat',
          data_categories: ['Cat1'],
          data_subjects: 'Sujets 1',
          recipients: ['Dest1'],
          retention_period: '1 an',
          security_measures: ['Mesure1'],
          transfer_outside_eu: false,
          transfer_details: null,
          notes: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 't2',
          registry_id: 'test-id',
          name: 'Traitement 2',
          purpose: 'But 2',
          legal_basis: 'obligation_legale',
          data_categories: ['Cat2'],
          data_subjects: 'Sujets 2',
          recipients: ['Dest2'],
          retention_period: '10 ans',
          security_measures: ['Mesure2'],
          transfer_outside_eu: false,
          transfer_details: null,
          notes: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };

    const tsv = exportCnilFormat(registry);
    const lines = tsv.split('\n');
    // Meta (5 lines) + empty line + header + 2 data rows = 9 lines
    expect(lines.filter((l) => l.includes('Traitement'))).toHaveLength(2);
  });
});
