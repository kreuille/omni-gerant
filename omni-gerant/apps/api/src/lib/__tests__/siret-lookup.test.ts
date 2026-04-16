import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSiretLookup } from '../siret-lookup.js';
import type { PappersClient } from '../pappers-client.js';
import type { SireneClient } from '../sirene-client.js';
import { ok, err, appError } from '@zenadmin/shared';

// BUSINESS RULE [CDC-4]: Tests du lookup SIRET enrichi avec fallback 3 couches

const SIRET = '12345678901234';

function createMockPappers(shouldFail = false): PappersClient {
  return {
    lookupBySiret: vi.fn().mockImplementation(async () => {
      if (shouldFail) return err(appError('SERVICE_UNAVAILABLE', 'Pappers unavailable'));
      return ok({
        siren: '123456789',
        denomination: 'Test Company SARL',
        forme_juridique: 'SARL',
        code_naf: '4399C',
        libelle_code_naf: 'Travaux de couverture',
        numero_tva: 'FR12345678901',
        date_creation: '2020-01-15',
        effectifs: 12,
        convention_collective: 'Convention BTP',
        code_idcc: '1596',
        siege: {
          adresse_ligne_1: '12 Rue de la Paix',
          code_postal: '75002',
          ville: 'Paris',
        },
        etablissements: [
          { siret: '12345678901234', nom_commercial: 'Siege', adresse_ligne_1: '12 Rue de la Paix', code_postal: '75002', ville: 'Paris', statut: 'A' },
        ],
        dirigeants: [
          { nom: 'Martin', prenom: 'Jean', qualite: 'Gerant' },
        ],
      });
    }),
  };
}

function createMockSirene(shouldFail = false): SireneClient {
  return {
    lookupBySiret: vi.fn().mockImplementation(async () => {
      if (shouldFail) return err(appError('SERVICE_UNAVAILABLE', 'SIRENE unavailable'));
      return ok({
        siret: SIRET,
        siren: '123456789',
        denomination: 'Test Company',
        categorie_juridique: '5710',
        activite_principale: '4399C',
        libelle_activite_principale: 'Travaux de couverture',
        adresse: {
          numero_voie: '12',
          type_voie: 'Rue',
          libelle_voie: 'de la Paix',
          code_postal: '75002',
          libelle_commune: 'Paris',
        },
        date_creation: '2020-01-15',
        etat_administratif: 'A',
        tranche_effectifs: '11',
      });
    }),
  };
}

describe('SIRET Lookup (3-layer cascade)', () => {
  beforeEach(() => {
    // Clear in-memory cache between tests by creating fresh instances
  });

  it('returns enriched data from Pappers (layer 1)', async () => {
    const lookup = createSiretLookup({
      pappersClient: createMockPappers(),
      sireneClient: createMockSirene(),
    });
    lookup.clearCache();

    const result = await lookup.lookup(SIRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.source).toBe('pappers');
      expect(result.value.company_name).toBe('Test Company SARL');
      expect(result.value.effectif_reel).toBe(12);
      expect(result.value.convention_collective).toBe('Convention BTP');
      expect(result.value.code_idcc).toBe('1596');
      expect(result.value.dirigeants).toHaveLength(1);
      expect(result.value.dirigeants[0]!.nom).toBe('Martin');
      expect(result.value.etablissements).toHaveLength(1);
    }
  });

  it('falls back to SIRENE (layer 2) when Pappers fails', async () => {
    const lookup = createSiretLookup({
      pappersClient: createMockPappers(true),
      sireneClient: createMockSirene(),
    });
    lookup.clearCache();

    const result = await lookup.lookup(SIRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.source).toBe('sirene');
      expect(result.value.company_name).toBe('Test Company');
      expect(result.value.convention_collective).toBeNull();
      expect(result.value.dirigeants).toHaveLength(0);
    }
  });

  it('falls back to data.gouv.fr (layer 3) when both Pappers and SIRENE fail', async () => {
    // Mock recherche-entreprises.api.gouv.fr response format
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        results: [{
          siren: '123456789',
          nom_complet: 'Test From DataGouv',
          nom_raison_sociale: 'Test From DataGouv',
          nature_juridique: '5710',
          activite_principale: '4399C',
          siege: {
            siret: SIRET,
            activite_principale: '4399C',
            adresse: '12 Rue de la Paix',
            code_postal: '75002',
            commune: 'Paris',
            libelle_commune: 'Paris',
            date_creation: '2020-01-15',
            etat_administratif: 'A',
            tranche_effectif_salarie: null,
          },
          dirigeants: [],
          matching_etablissements: [],
          tranche_effectif_salarie: null,
        }],
        total_results: 1,
      }),
    });

    const lookup = createSiretLookup({
      pappersClient: createMockPappers(true),
      sireneClient: createMockSirene(true),
      httpFetch: mockFetch,
    });
    lookup.clearCache();

    const result = await lookup.lookup(SIRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.source).toBe('datagouv');
      expect(result.value.company_name).toBe('Test From DataGouv');
      expect(result.value.effectif_reel).toBeNull();
    }
  });

  it('returns error when all 3 layers fail', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const lookup = createSiretLookup({
      pappersClient: createMockPappers(true),
      sireneClient: createMockSirene(true),
      httpFetch: mockFetch,
    });
    lookup.clearCache();

    const result = await lookup.lookup(SIRET);
    expect(result.ok).toBe(false);
  });

  it('caches successful results', async () => {
    const pappers = createMockPappers();
    const lookup = createSiretLookup({ pappersClient: pappers });
    lookup.clearCache();

    await lookup.lookup(SIRET);
    await lookup.lookup(SIRET);

    // Pappers should only be called once (second call uses cache)
    expect(pappers.lookupBySiret).toHaveBeenCalledTimes(1);
  });

  it('lookupBasic strips enriched fields', async () => {
    const lookup = createSiretLookup({ pappersClient: createMockPappers() });
    lookup.clearCache();

    const result = await lookup.lookupBasic(SIRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.company_name).toBe('Test Company SARL');
      // Enriched fields should not be present
      expect('effectif_reel' in result.value).toBe(false);
      expect('dirigeants' in result.value).toBe(false);
      expect('source' in result.value).toBe(false);
    }
  });
});
