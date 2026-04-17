import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchCompanies } from '../../../lib/company-search.js';

// BUSINESS RULE [CDC-4]: Tests recherche entreprise par nom

function createMockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  }) as unknown as typeof fetch;
}

const MOCK_API_RESPONSE = {
  results: [
    {
      siren: '123456789',
      nom_complet: 'BOULANGERIE DUPONT',
      nom_raison_sociale: 'DUPONT',
      nature_juridique: '5710',
      activite_principale: '10.71C',
      siege: {
        siret: '12345678900010',
        adresse: '12 RUE DES LILAS',
        code_postal: '75011',
        libelle_commune: 'PARIS',
        date_creation: '2018-03-15',
        etat_administratif: 'A',
        tranche_effectif_salarie: '03',
        activite_principale: '10.71C',
      },
      nombre_etablissements_ouverts: 1,
      tranche_effectif_salarie: '03',
      date_creation: '2018-03-15',
      etat_administratif: 'A',
    },
    {
      siren: '987654321',
      nom_complet: 'BOULANGERIE MARTIN',
      siege: {
        siret: '98765432100015',
        adresse: '5 AVENUE FOCH',
        code_postal: '69001',
        libelle_commune: 'LYON',
        etat_administratif: 'A',
        tranche_effectif_salarie: '11',
      },
      etat_administratif: 'A',
      tranche_effectif_salarie: '11',
    },
  ],
  total_results: 42,
};

describe('searchCompanies', () => {
  it('parses valid API response into CompanySearchResult[]', async () => {
    const mockFetch = createMockFetch(MOCK_API_RESPONSE);
    const result = await searchCompanies({ query: 'boulangerie' }, mockFetch);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.results).toHaveLength(2);
    expect(result.value.total).toBe(42);
    expect(result.value.results[0]).toEqual(
      expect.objectContaining({
        siren: '123456789',
        siret: '12345678900010',
        company_name: 'BOULANGERIE DUPONT',
        naf_code: '10.71C',
        is_active: true,
      }),
    );
  });

  it('returns validation error for empty query', async () => {
    const mockFetch = createMockFetch({});
    const result = await searchCompanies({ query: '' }, mockFetch);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for query shorter than 2 chars', async () => {
    const mockFetch = createMockFetch({});
    const result = await searchCompanies({ query: 'a' }, mockFetch);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns empty results when API returns non-200', async () => {
    const mockFetch = createMockFetch({}, 500);
    const result = await searchCompanies({ query: 'boulangerie' }, mockFetch);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.results).toEqual([]);
    expect(result.value.total).toBe(0);
  });

  it('returns empty results when fetch throws (API down)', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;
    const result = await searchCompanies({ query: 'boulangerie' }, mockFetch);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.results).toEqual([]);
    expect(result.value.total).toBe(0);
  });

  it('parses address correctly from siege', async () => {
    const mockFetch = createMockFetch(MOCK_API_RESPONSE);
    const result = await searchCompanies({ query: 'boulangerie' }, mockFetch);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const first = result.value.results[0]!;
    expect(first.address).toEqual({
      line1: '12 RUE DES LILAS',
      zip_code: '75011',
      city: 'PARIS',
      country: 'FR',
    });
  });

  it('estimates employee count from tranche code', async () => {
    const mockFetch = createMockFetch(MOCK_API_RESPONSE);
    const result = await searchCompanies({ query: 'boulangerie' }, mockFetch);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // tranche '03' -> 6 employees
    expect(result.value.results[0]!.employee_count).toBe(6);
    // tranche '11' -> 10 employees
    expect(result.value.results[1]!.employee_count).toBe(10);
  });

  it('sends correct URL with pagination and campaign params', async () => {
    const mockFetch = createMockFetch({ results: [], total_results: 0 });
    await searchCompanies({ query: 'test company', page: 2, perPage: 5 }, mockFetch);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain('q=test%20company');
    expect(url).toContain('page=2');
    expect(url).toContain('per_page=5');
    expect(url).toContain('mtm_campaign=zenadmin');
    expect(url).toContain('etat_administratif=A');
  });

  it('handles missing siege gracefully', async () => {
    const mockFetch = createMockFetch({
      results: [{
        siren: '111222333',
        nom_complet: 'SANS SIEGE',
        etat_administratif: 'A',
      }],
      total_results: 1,
    });

    const result = await searchCompanies({ query: 'sans siege' }, mockFetch);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.results).toHaveLength(1);
    expect(result.value.results[0]!.company_name).toBe('SANS SIEGE');
    expect(result.value.results[0]!.siret).toBe('11122233300000'); // fallback
    expect(result.value.results[0]!.address.line1).toBe('');
  });

  it('passes onlyActive=false to exclude status filter', async () => {
    const mockFetch = createMockFetch({ results: [], total_results: 0 });
    await searchCompanies({ query: 'test', onlyActive: false }, mockFetch);

    const url = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).not.toContain('etat_administratif=A');
  });

  it('returns empty results on abort/timeout', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    const mockFetch = vi.fn().mockRejectedValue(abortError) as unknown as typeof fetch;
    const result = await searchCompanies({ query: 'timeout test' }, mockFetch);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.results).toEqual([]);
  });
});
