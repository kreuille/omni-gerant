import { describe, it, expect, vi, type Mock } from 'vitest';
import { searchCompanies, parseCompanyResult, type RechercheEntreprisesRawResult } from '../company-search.js';

const mockRawResult: RechercheEntreprisesRawResult = {
  siren: '123456789',
  nom_complet: 'DURAND BATIMENT',
  nom_raison_sociale: 'DURAND BATIMENT SARL',
  nature_juridique: '5710',
  nombre_etablissements_ouverts: 1,
  siege: {
    siret: '12345678900010',
    activite_principale: '43.21A',
    adresse: '12 rue des Lilas',
    code_postal: '75011',
    commune: '75111',
    libelle_commune: 'Paris',
    date_creation: '2018-03-15',
    etat_administratif: 'A',
    tranche_effectif_salarie: '03',
  },
  activite_principale: '43.21A',
  categorie_entreprise: 'PME',
  dirigeants: [{ nom: 'DURAND', prenoms: 'Jean', qualite: 'Gerant' }],
  matching_etablissements: [],
  tranche_effectif_salarie: '03',
};

function createMockFetch(data: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
  }) as unknown as typeof fetch;
}

describe('company-search', () => {
  describe('parseCompanyResult', () => {
    it('parses raw API result into CompanySearchResult', () => {
      const result = parseCompanyResult(mockRawResult);

      expect(result.siren).toBe('123456789');
      expect(result.siret).toBe('12345678900010');
      expect(result.company_name).toBe('DURAND BATIMENT');
      expect(result.naf_code).toBe('43.21A');
      expect(result.address.zip_code).toBe('75011');
      expect(result.address.city).toBe('Paris');
      expect(result.address.country).toBe('FR');
      expect(result.is_active).toBe(true);
      expect(result.creation_date).toBe('2018-03-15');
    });
  });

  describe('searchCompanies', () => {
    it('returns results for a valid query', async () => {
      const mockFetch = createMockFetch({
        results: [mockRawResult],
        total_results: 1,
      });

      const result = await searchCompanies({ query: 'Durand Batiment' }, mockFetch);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.results).toHaveLength(1);
        expect(result.value.results[0]!.company_name).toBe('DURAND BATIMENT');
        expect(result.value.total).toBe(1);
      }

      expect(mockFetch).toHaveBeenCalledOnce();
      const calledUrl = (mockFetch as unknown as Mock).mock.calls[0]![0] as string;
      expect(calledUrl).toContain('q=Durand+Batiment');
      expect(calledUrl).toContain('mtm_campaign=zenadmin');
    });

    it('returns validation error for query shorter than 2 chars', async () => {
      const result = await searchCompanies({ query: 'D' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('returns error when API returns non-ok status', async () => {
      const mockFetch = createMockFetch({}, false, 503);

      const result = await searchCompanies({ query: 'test query' }, mockFetch);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
      }
    });

    it('returns empty results on network error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;

      const result = await searchCompanies({ query: 'test query' }, mockFetch);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.results).toHaveLength(0);
      }
    });

    it('clamps perPage to max 25', async () => {
      const mockFetch = createMockFetch({ results: [], total_results: 0 });

      await searchCompanies({ query: 'test', perPage: 100 }, mockFetch);

      const calledUrl = (mockFetch as unknown as Mock).mock.calls[0]![0] as string;
      expect(calledUrl).toContain('per_page=25');
    });

    it('passes departement filter when provided', async () => {
      const mockFetch = createMockFetch({ results: [], total_results: 0 });

      await searchCompanies({ query: 'test', departement: '75' }, mockFetch);

      const calledUrl = (mockFetch as unknown as Mock).mock.calls[0]![0] as string;
      expect(calledUrl).toContain('departement=75');
    });

    it('filters active companies by default', async () => {
      const mockFetch = createMockFetch({ results: [], total_results: 0 });

      await searchCompanies({ query: 'test' }, mockFetch);

      const calledUrl = (mockFetch as unknown as Mock).mock.calls[0]![0] as string;
      expect(calledUrl).toContain('etat_administratif=A');
    });

    it('returns empty on abort/timeout', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      const mockFetch = vi.fn().mockRejectedValue(abortError) as unknown as typeof fetch;

      const result = await searchCompanies({ query: 'test' }, mockFetch);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.results).toHaveLength(0);
      }
    });
  });
});
