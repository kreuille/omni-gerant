import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSiretLookup } from '../siret-lookup.js';
import { ok, err, appError } from '@zenadmin/shared';

// BUSINESS RULE [SIRET-001]: 3-layer cascade with timeout

describe('SIRET Lookup Cascade', () => {
  it('falls back to layer 2 when layer 1 fails', async () => {
    const lookup = createSiretLookup({
      pappersClient: {
        lookupBySiret: vi.fn().mockResolvedValue(err(appError('SERVICE_UNAVAILABLE', 'Pappers down'))),
      } as any,
      sireneClient: {
        lookupBySiret: vi.fn().mockResolvedValue(ok({
          siret: '11111111100001',
          siren: '111111111',
          denomination: 'Test SARL',
          categorie_juridique: '5710',
          activite_principale: '43.21A',
          libelle_activite_principale: 'Travaux de plomberie',
          adresse: { numero_voie: '1', type_voie: 'RUE', libelle_voie: 'Test', code_postal: '75001', libelle_commune: 'Paris' },
          date_creation: '2020-01-01',
          etat_administratif: 'A',
          tranche_effectifs: '03',
        })),
      } as any,
      httpFetch: vi.fn(),
    });
    lookup.clearCache();

    const result = await lookup.lookup('11111111100001');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.source).toBe('sirene');
      expect(result.value.company_name).toBe('Test SARL');
    }
  });

  it('returns SIRET_LOOKUP_UNAVAILABLE when all sources fail', async () => {
    const lookup = createSiretLookup({
      pappersClient: {
        lookupBySiret: vi.fn().mockResolvedValue(err(appError('SERVICE_UNAVAILABLE', 'Pappers down'))),
      } as any,
      sireneClient: {
        lookupBySiret: vi.fn().mockResolvedValue(err(appError('SERVICE_UNAVAILABLE', 'SIRENE down'))),
      } as any,
      httpFetch: vi.fn().mockRejectedValue(new Error('Network error')),
    });
    lookup.clearCache();

    const result = await lookup.lookup('22222222200002');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SIRET_LOOKUP_UNAVAILABLE');
    }
  });

  it('uses cache when available', async () => {
    const pappersLookup = vi.fn().mockResolvedValue(ok({
      siren: '333333333',
      denomination: 'Cached SARL',
      forme_juridique: 'SARL',
      code_naf: '43.21A',
      libelle_code_naf: 'Plomberie',
      siege: { adresse_ligne_1: '1 rue Test', code_postal: '75001', ville: 'Paris' },
      numero_tva: 'FR12345678901',
      date_creation: '2020-01-01',
      effectifs: 5,
      convention_collective: null,
      code_idcc: null,
      etablissements: [],
      dirigeants: [],
    }));

    const lookup = createSiretLookup({
      pappersClient: { lookupBySiret: pappersLookup } as any,
      sireneClient: { lookupBySiret: vi.fn() } as any,
      httpFetch: vi.fn(),
    });
    lookup.clearCache();

    // First call - populates cache
    const result1 = await lookup.lookup('33333333300003');
    expect(result1.ok).toBe(true);
    expect(pappersLookup).toHaveBeenCalledTimes(1);

    // Second call - should use cache
    const result2 = await lookup.lookup('33333333300003');
    expect(result2.ok).toBe(true);
    expect(pappersLookup).toHaveBeenCalledTimes(1); // Not called again
  });
});
