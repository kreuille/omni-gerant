import { describe, it, expect, vi } from 'vitest';
import { createDuerpAutoFill, type AutoFillDeps, type TenantProfile } from '../duerp-autofill.js';
import { ok, err, appError } from '@zenadmin/shared';
import type { EnrichedSiretInfo } from '../../../../lib/siret-lookup.js';

// BUSINESS RULE [CDC-2.4]: Tests de l'orchestrateur auto-fill DUERP

const TENANT_ID = 'tenant-test-001';

function baseTenantProfile(overrides: Partial<TenantProfile> = {}): TenantProfile {
  return {
    id: TENANT_ID,
    name: 'BTP Martin SARL',
    siret: '12345678901234',
    siren: '123456789',
    naf_code: '43.21A',
    address: '12 Rue de la Paix, 75002 Paris',
    employee_count: 5,
    dirigeant_name: 'Jean Martin',
    ...overrides,
  };
}

function baseSiretInfo(): EnrichedSiretInfo {
  return {
    siret: '12345678901234',
    siren: '123456789',
    company_name: 'BTP Martin SARL (Pappers)',
    legal_form: 'SARL',
    naf_code: '43.21A',
    naf_label: 'Travaux de maconnerie',
    address: { line1: '12 Rue de la Paix', zip_code: '75002', city: 'Paris', country: 'FR' },
    tva_number: 'FR12345',
    creation_date: '2020-01-15',
    is_active: true,
    effectif_reel: 8,
    convention_collective: 'Convention BTP Ouvriers',
    code_idcc: '1596',
    etablissements: [
      { siret: '12345678901234', nom: 'Siege', adresse: '12 Rue de la Paix, Paris', is_active: true },
      { siret: '12345678905678', nom: 'Depot Ivry', adresse: '5 Rue du Depot, Ivry', is_active: true },
    ],
    dirigeants: [
      { nom: 'Martin', prenom: 'Jean', fonction: 'Gerant' },
    ],
    source: 'pappers',
  };
}

function createDeps(overrides: Partial<AutoFillDeps> = {}): AutoFillDeps {
  return {
    lookupSiret: vi.fn().mockResolvedValue(ok(baseSiretInfo())),
    getTenantProfile: vi.fn().mockResolvedValue(baseTenantProfile()),
    getRecentPurchases: vi.fn().mockResolvedValue([]),
    getInsurances: vi.fn().mockResolvedValue([]),
    getLatestDuerp: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe('DuerpAutoFill', () => {
  it('generates auto-fill data from tenant profile + SIRET', async () => {
    const deps = createDeps();
    const autoFill = createDuerpAutoFill(deps);

    const result = await autoFill.generateAutoFill(TENANT_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // External data takes priority
    expect(result.value.company_name).toBe('BTP Martin SARL (Pappers)');
    expect(result.value.naf_code).toBe('43.21A');
    expect(result.value.employee_count).toBe(8); // Pappers effectif > tenant
    expect(result.value.convention_collective).toBe('Convention BTP Ouvriers');
    expect(result.value.code_idcc).toBe('1596');
    expect(result.value.dirigeants).toHaveLength(1);
    expect(result.value.evaluator_name).toBe('Jean Martin');
  });

  it('returns NAF-based risks for BTP', async () => {
    const deps = createDeps();
    const autoFill = createDuerpAutoFill(deps);

    const result = await autoFill.generateAutoFill(TENANT_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Should have BTP risks
    expect(result.value.risks.length).toBeGreaterThan(3);
    // Should have risk sources
    expect(result.value.risk_sources.length).toBeGreaterThan(0);
    expect(result.value.risk_sources.some((s) => s.source === 'naf')).toBe(true);
    // Sources used should include tenant and siret
    expect(result.value.sources_used).toContain('tenant_profile');
    expect(result.value.sources_used).toContain('siret_pappers');
  });

  it('adds IDCC-specific risks for convention 1596 (BTP ouvriers)', async () => {
    const deps = createDeps();
    const autoFill = createDuerpAutoFill(deps);

    const result = await autoFill.generateAutoFill(TENANT_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // IDCC 1596 adds amiante risk
    const idccSources = result.value.risk_sources.filter((s) => s.source === 'idcc');
    expect(idccSources.length).toBeGreaterThan(0);
    expect(result.value.risks.some((r) => r.id === 'idcc-btp-amiante')).toBe(true);
  });

  it('generates work units from NAF code + etablissements', async () => {
    const deps = createDeps();
    const autoFill = createDuerpAutoFill(deps);

    const result = await autoFill.generateAutoFill(TENANT_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Should have BTP work units + etablissement units
    expect(result.value.work_units.length).toBeGreaterThan(2);
    // Should have etablissement-based units from Pappers
    const etabUnits = result.value.work_units.filter((u) => u.source === 'etablissement');
    expect(etabUnits.length).toBe(2); // 2 active etablissements
  });

  it('works without SIRET (tenant-only data)', async () => {
    const deps = createDeps({
      getTenantProfile: vi.fn().mockResolvedValue(baseTenantProfile({ siret: null })),
    });
    const autoFill = createDuerpAutoFill(deps);

    const result = await autoFill.generateAutoFill(TENANT_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Should still have NAF-based risks (from tenant naf_code)
    expect(result.value.risks.length).toBeGreaterThan(0);
    expect(result.value.confidence_score).toBeGreaterThan(0);
    // No SIRET source
    expect(result.value.sources_used).not.toContain('siret_pappers');
    expect(deps.lookupSiret).not.toHaveBeenCalled();
  });

  it('detects risks from recent purchases', async () => {
    const deps = createDeps({
      getRecentPurchases: vi.fn().mockResolvedValue([
        { id: 'p1', description: 'Achat de peinture solvantee et diluant', supplier_name: 'Leroy Merlin', date: '2026-04-01' },
      ]),
    });
    const autoFill = createDuerpAutoFill(deps);

    const result = await autoFill.generateAutoFill(TENANT_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.purchase_risks.length).toBeGreaterThan(0);
    expect(result.value.sources_used).toContain('purchases');
  });

  it('includes insurance indicators', async () => {
    const deps = createDeps({
      getInsurances: vi.fn().mockResolvedValue([
        { id: 'i1', type: 'decennale', provider: 'AXA', description: 'Garantie decennale' },
        { id: 'i2', type: 'rc_pro', provider: 'MAAF', description: null },
      ]),
    });
    const autoFill = createDuerpAutoFill(deps);

    const result = await autoFill.generateAutoFill(TENANT_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.existing_insurances).toHaveLength(2);
    expect(result.value.sources_used).toContain('insurances');
    expect(result.value.risk_sources.some((s) => s.source === 'insurance')).toBe(true);
  });

  it('references previous DUERP when available', async () => {
    const deps = createDeps({
      getLatestDuerp: vi.fn().mockResolvedValue({
        id: 'duerp-prev-001',
        tenant_id: TENANT_ID,
        risks: [],
        work_units: [],
      }),
    });
    const autoFill = createDuerpAutoFill(deps);

    const result = await autoFill.generateAutoFill(TENANT_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.previous_duerp_id).toBe('duerp-prev-001');
    expect(result.value.sources_used).toContain('previous_duerp');
  });

  it('returns error when tenant profile not found', async () => {
    const deps = createDeps({
      getTenantProfile: vi.fn().mockResolvedValue(null),
    });
    const autoFill = createDuerpAutoFill(deps);

    const result = await autoFill.generateAutoFill(TENANT_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('confidence score increases with more data sources', async () => {
    // Minimal: just tenant
    const depsMinimal = createDeps({
      getTenantProfile: vi.fn().mockResolvedValue(baseTenantProfile({ siret: null, naf_code: null })),
    });
    const resultMinimal = await createDuerpAutoFill(depsMinimal).generateAutoFill(TENANT_ID);

    // Full: tenant + SIRET + purchases + insurance + previous DUERP
    const depsFull = createDeps({
      getRecentPurchases: vi.fn().mockResolvedValue([
        { id: 'p1', description: 'Achat ciment et beton', supplier_name: 'Point P', date: '2026-04-01' },
      ]),
      getInsurances: vi.fn().mockResolvedValue([
        { id: 'i1', type: 'decennale', provider: 'AXA', description: null },
      ]),
      getLatestDuerp: vi.fn().mockResolvedValue({ id: 'prev', tenant_id: TENANT_ID }),
    });
    const resultFull = await createDuerpAutoFill(depsFull).generateAutoFill(TENANT_ID);

    expect(resultMinimal.ok).toBe(true);
    expect(resultFull.ok).toBe(true);
    if (resultMinimal.ok && resultFull.ok) {
      expect(resultFull.value.confidence_score).toBeGreaterThan(resultMinimal.value.confidence_score);
    }
  });

  it('caps confidence score at 100', async () => {
    const depsFull = createDeps({
      getRecentPurchases: vi.fn().mockResolvedValue([
        { id: 'p1', description: 'Achat produits chimiques dangereux', supplier_name: 'Chimie Pro', date: '2026-04-01' },
      ]),
      getInsurances: vi.fn().mockResolvedValue([
        { id: 'i1', type: 'decennale', provider: 'AXA', description: null },
      ]),
      getLatestDuerp: vi.fn().mockResolvedValue({ id: 'prev', tenant_id: TENANT_ID }),
    });
    const result = await createDuerpAutoFill(depsFull).generateAutoFill(TENANT_ID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.confidence_score).toBeLessThanOrEqual(100);
    }
  });
});
