import { describe, it, expect, vi } from 'vitest';
import { searchCompanies } from '../company-search.js';

const mockApiResult = {
  siren: '123456789',
  nom_complet: 'DURAND BATIMENT',
  nom_raison_sociale: 'DURAND BATIMENT SARL',
  nature_juridique: '5710',
  activite_principale: '43.21A',
  siege: {
    siret: '12345678900010',
    activite_principale: '43.21A',
    adresse: '12 rue des Lilas',
    code_postal: '75011',
    libelle_commune: 'Paris',
    date_creation: '2018-03-15',
    etat_administratif: 'A',
    tranche_effectif_salarie: '03',
  },
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
  describe('searchCompanies', () => {
    it('returns results for a valid query', async () => {
      const mockFetch = createMockFetch({
        results: [mockApiResult],
        total_results: 1,
      });

      const result = await searchCompanies({ query: 'Durand Batiment' }, mockFetch);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.results).toHaveLength(1);
        expect(result.value.results[0]!.company_name).toBe('DURAND BATIMENT');
        expect(result.value.results[0]!.siret).toBe('12345678900010');
        expect(result.value.results[0]!.address.zip_code).toBe('75011');
        expect(result.value.total).toBe(1);
      }
    });

    it('returns validation error for query shorter than 2 chars', async () => {
      const result = await searchCompanies({ query: 'D' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('returns empty results when API returns non-ok status (graceful degradation)', async () => {
      const mockFetch = createMockFetch({}, false, 503);

      const result = await searchCompanies({ query: 'test query' }, mockFetch);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.results).toHaveLength(0);
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

    it('passes onlyActive filter by default', async () => {
      const mockFetch = createMockFetch({ results: [], total_results: 0 });

      await searchCompanies({ query: 'test' }, mockFetch);

      const calledUrl = (mockFetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
      expect(calledUrl).toContain('etat_administratif=A');
    });
  });
});
