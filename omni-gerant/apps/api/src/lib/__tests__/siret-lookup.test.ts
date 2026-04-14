import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSiretLookup } from '../siret-lookup.js';

const mockApiResponse = {
  etablissement: {
    siret: '12345678901234',
    siren: '123456789',
    unite_legale: {
      denomination: 'Test Company SARL',
      categorie_juridique: '5710',
    },
    activite_principale: '4399C',
    libelle_activite_principale: 'Travaux de couverture',
    numero_voie: '12',
    type_voie: 'Rue',
    libelle_voie: 'de la Paix',
    code_postal: '75002',
    libelle_commune: 'Paris',
    date_creation: '2020-01-15',
    etat_administratif: 'A',
  },
};

describe('SIRET Lookup', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let siretLookup: ReturnType<typeof createSiretLookup>;

  beforeEach(() => {
    mockFetch = vi.fn();
    siretLookup = createSiretLookup({ fetch: mockFetch });
    siretLookup.clearCache();
  });

  it('fetches and parses SIRET data', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockApiResponse),
    });

    const result = await siretLookup.lookup('12345678901234');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.company_name).toBe('Test Company SARL');
      expect(result.value.siret).toBe('12345678901234');
      expect(result.value.siren).toBe('123456789');
      expect(result.value.naf_code).toBe('4399C');
      expect(result.value.address.city).toBe('Paris');
      expect(result.value.address.zip_code).toBe('75002');
      expect(result.value.is_active).toBe(true);
    }
  });

  it('returns NOT_FOUND for unknown SIRET', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await siretLookup.lookup('99999999999999');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('returns SERVICE_UNAVAILABLE on API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await siretLookup.lookup('12345678901234');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
    }
  });

  it('returns SERVICE_UNAVAILABLE on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));

    const result = await siretLookup.lookup('12345678901234');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
    }
  });

  it('caches successful results', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockApiResponse),
    });

    // First call - fetches from API
    await siretLookup.lookup('12345678901234');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call - should use cache
    const result = await siretLookup.lookup('12345678901234');
    expect(mockFetch).toHaveBeenCalledTimes(1); // Not called again
    expect(result.ok).toBe(true);
  });

  it('builds full address from components', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockApiResponse),
    });

    const result = await siretLookup.lookup('12345678901234');

    if (result.ok) {
      expect(result.value.address.line1).toBe('12 Rue de la Paix');
    }
  });
});
