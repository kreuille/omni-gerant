import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EnrichedSiretInfo } from '../../../lib/siret-lookup.js';
import type { TenantProfile } from '../tenant.service.js';

// Mock the tenant repository so tests run without a database
const mockStore = new Map<string, TenantProfile>();

vi.mock('../tenant.repository.js', () => ({
  createTenantRepository: () => ({
    async findById(tenantId: string) {
      return mockStore.get(tenantId) ?? null;
    },
    async upsertProfile(tenantId: string, profile: TenantProfile) {
      const updated = { ...profile, id: tenantId, updated_at: new Date() };
      mockStore.set(tenantId, updated);
      return updated;
    },
  }),
}));

// Import after mock setup
const { createTenantService } = await import('../tenant.service.js');

describe('tenant.service — profile', () => {
  const service = createTenantService();

  beforeEach(() => {
    mockStore.clear();
  });

  describe('getProfile', () => {
    it('returns default profile for unknown tenant', async () => {
      const result = await service.getProfile('tenant-1');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.company_name).toBe('Mon Entreprise');
      expect(result.value.legal_form).toBe('ei');
      expect(result.value.tva_regime).toBe('reel_simplifie');
    });
  });

  describe('updateProfile', () => {
    it('updates company name and legal form', async () => {
      const result = await service.updateProfile('tenant-1', {
        company_name: 'YOKTO',
        legal_form: 'sas',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.company_name).toBe('YOKTO');
      expect(result.value.legal_form).toBe('sas');
    });

    it('updates address', async () => {
      const result = await service.updateProfile('tenant-1', {
        address: { line1: '10 Rue de Paris', zip_code: '75001', city: 'Paris', country: 'FR' },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.address?.city).toBe('Paris');
    });

    it('updates qualifications', async () => {
      const result = await service.updateProfile('tenant-1', {
        qualifications: [
          { type: 'rge', number: 'RGE-001', label: 'RGE Qualibat' },
        ],
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.qualifications.length).toBe(1);
      expect(result.value.qualifications[0]!.type).toBe('rge');
    });

    it('updates insurance fields', async () => {
      const result = await service.updateProfile('tenant-1', {
        insurance_decennale_number: 'DEC-123',
        insurance_decennale_insurer: 'AXA',
        insurance_rc_pro_number: 'RC-456',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.insurance_decennale_number).toBe('DEC-123');
      expect(result.value.insurance_rc_pro_number).toBe('RC-456');
    });

    it('preserves existing fields on partial update', async () => {
      await service.updateProfile('tenant-1', { company_name: 'YOKTO', email: 'test@yokto.fr' });
      const result = await service.updateProfile('tenant-1', { phone: '0600000000' });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.company_name).toBe('YOKTO');
      expect(result.value.email).toBe('test@yokto.fr');
      expect(result.value.phone).toBe('0600000000');
    });
  });

  describe('autoFillFromSiret', () => {
    const siretInfo: EnrichedSiretInfo = {
      siret: '89024639000029',
      siren: '890246390',
      company_name: 'YOKTO',
      legal_form: '5720', // SASU INSEE code
      naf_code: '62.02A',
      naf_label: 'Conseil en systemes informatiques',
      address: { line1: '10 Rue Test', zip_code: '75001', city: 'Paris', country: 'FR' },
      tva_number: 'FR12890246390',
      creation_date: '2020-01-15',
      is_active: true,
      effectif_reel: 5,
      convention_collective: 'Convention Syntec',
      code_idcc: '1486',
      etablissements: [],
      dirigeants: [{ nom: 'Dupont', prenom: 'Jean', fonction: 'President' }],
      source: 'datagouv',
    };

    it('fills all auto-fill fields from SIRET info', async () => {
      const result = await service.autoFillFromSiret('tenant-2', siretInfo);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const p = result.value;
      expect(p.siret).toBe('89024639000029');
      expect(p.siren).toBe('890246390');
      expect(p.company_name).toBe('YOKTO');
      expect(p.naf_code).toBe('62.02A');
      expect(p.naf_label).toBe('Conseil en systemes informatiques');
      expect(p.address?.city).toBe('Paris');
      expect(p.effectif).toBe(5);
      expect(p.convention_collective).toBe('Convention Syntec');
      expect(p.code_idcc).toBe('1486');
      expect(p.dirigeants.length).toBe(1);
      expect(p.dirigeants[0]!.nom).toBe('Dupont');
    });

    it('detects legal form from INSEE code', async () => {
      const result = await service.autoFillFromSiret('tenant-3', siretInfo);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.legal_form).toBe('sasu');
    });

    it('detects TVA regime from legal form', async () => {
      const result = await service.autoFillFromSiret('tenant-4', siretInfo);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.tva_regime).toBe('reel_normal');
    });

    it('detects auto_entrepreneur from EI label', async () => {
      const microInfo: EnrichedSiretInfo = {
        ...siretInfo,
        legal_form: 'Micro-entreprise',
      };
      const result = await service.autoFillFromSiret('tenant-5', microInfo);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.legal_form).toBe('auto_entrepreneur');
      expect(result.value.tva_regime).toBe('franchise_base');
    });

    it('computes TVA number from SIREN when not provided', async () => {
      const noTva: EnrichedSiretInfo = { ...siretInfo, tva_number: null };
      const result = await service.autoFillFromSiret('tenant-6', noTva);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.tva_number).toMatch(/^FR\d{2}890246390$/);
    });
  });

  describe('getFranchiseCheck', () => {
    it('returns null for non-franchise regime', async () => {
      await service.updateProfile('tenant-7', { tva_regime: 'reel_normal' });
      const profile = (await service.getProfile('tenant-7')).value!;
      expect(service.getFranchiseCheck(profile)).toBeNull();
    });

    it('returns check for franchise_base', async () => {
      await service.updateProfile('tenant-8', {
        tva_regime: 'franchise_base',
        naf_code: '62.01Z',
        current_year_revenue_cents: 30_000_00,
      });
      const profile = (await service.getProfile('tenant-8')).value!;
      const check = service.getFranchiseCheck(profile);
      expect(check).not.toBeNull();
      expect(check!.alertLevel).toBe('warning'); // 30000/36800 = 81%
    });
  });

  describe('getLegalMentions', () => {
    it('returns franchise mention for auto_entrepreneur', async () => {
      await service.updateProfile('tenant-9', {
        legal_form: 'auto_entrepreneur',
        tva_regime: 'franchise_base',
        siret: '12345678901234',
      });
      const profile = (await service.getProfile('tenant-9')).value!;
      const mentions = service.getLegalMentions(profile);
      expect(mentions.some((m) => m.includes('293 B'))).toBe(true);
      expect(mentions.some((m) => m.includes('SIRET'))).toBe(true);
    });

    it('returns capital + RCS for SARL', async () => {
      await service.updateProfile('tenant-10', {
        legal_form: 'sarl',
        capital_cents: 500_000,
        rcs_city: 'Lyon',
        siret: '12345678901234',
        tva_number: 'FR12345678901',
      });
      const profile = (await service.getProfile('tenant-10')).value!;
      const mentions = service.getLegalMentions(profile);
      expect(mentions.some((m) => m.includes('SARL au capital de 5000'))).toBe(true);
      expect(mentions.some((m) => m.includes('RCS Lyon'))).toBe(true);
    });
  });
});
