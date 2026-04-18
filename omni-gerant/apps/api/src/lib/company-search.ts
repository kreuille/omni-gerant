import type { Result } from '@omni-gerant/shared';
import { ok, err, appError } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';
import { estimateEffectifFromTranche } from './sirene-client.js';

// BUSINESS RULE [CDC-4]: Recherche entreprise par nom — API publique data.gouv.fr

export interface CompanySearchResult {
  siren: string;
  siret: string;
  company_name: string;
  legal_form: string;
  naf_code: string;
  naf_label: string;
  address: {
    line1: string;
    zip_code: string;
    city: string;
    country: string;
  };
  is_active: boolean;
  employee_count: number | null;
  creation_date: string | null;
}

export interface CompanySearchParams {
  query: string;
  page?: number;
  perPage?: number;
  departement?: string;
  nafCode?: string;
  onlyActive?: boolean;
}

export interface RechercheEntreprisesRawResult {
  siren: string;
  nom_complet: string;
  nom_raison_sociale: string;
  nature_juridique: string;
  nombre_etablissements_ouverts: number;
  siege: {
    siret: string;
    activite_principale: string;
    adresse: string;
    code_postal: string;
    commune: string;
    libelle_commune: string;
    date_creation: string;
    etat_administratif: string;
    tranche_effectif_salarie: string;
  };
  activite_principale: string;
  categorie_entreprise: string;
  dirigeants: Array<{
    nom: string;
    prenoms: string;
    qualite: string;
  }>;
  matching_etablissements: Array<{
    siret: string;
    adresse: string;
    etat_administratif: string;
    est_siege: boolean;
    activite_principale: string;
  }>;
  complements?: {
    convention_collective_renseignee?: boolean;
    liste_idcc?: string[];
  };
  tranche_effectif_salarie: string | null;
}

export interface RechercheEntreprisesResponse {
  results: RechercheEntreprisesRawResult[];
  total_results: number;
}

export function parseCompanyResult(raw: RechercheEntreprisesRawResult): CompanySearchResult {
  const siege = raw.siege;
  const nafCode = siege.activite_principale ?? raw.activite_principale ?? '';
  const effectif = estimateEffectifFromTranche(
    raw.tranche_effectif_salarie ?? siege.tranche_effectif_salarie ?? null,
  );

  return {
    siren: raw.siren,
    siret: siege.siret ?? `${raw.siren}00000`,
    company_name: raw.nom_complet || raw.nom_raison_sociale,
    legal_form: raw.nature_juridique ?? '',
    naf_code: nafCode,
    naf_label: '',
    address: {
      line1: siege.adresse ?? '',
      zip_code: siege.code_postal ?? '',
      city: siege.libelle_commune ?? '',
      country: 'FR',
    },
    is_active: siege.etat_administratif === 'A',
    employee_count: effectif,
    creation_date: siege.date_creation ?? null,
  };
}

export async function searchCompanies(
  params: CompanySearchParams,
  httpFetch: typeof fetch = globalThis.fetch,
): Promise<Result<{ results: CompanySearchResult[]; total: number }, AppError>> {
  const { query, page = 1, perPage = 10, departement, nafCode, onlyActive = true } = params;

  if (query.length < 2) {
    return err(appError('VALIDATION_ERROR', 'Search query must be at least 2 characters'));
  }

  const clampedPerPage = Math.min(perPage, 25);

  const url = new URL('https://recherche-entreprises.api.gouv.fr/search');
  url.searchParams.set('q', query);
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(clampedPerPage));
  url.searchParams.set('mtm_campaign', 'zenadmin');

  if (departement) url.searchParams.set('departement', departement);
  if (nafCode) url.searchParams.set('activite_principale', nafCode);
  if (onlyActive) url.searchParams.set('etat_administratif', 'A');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await httpFetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return err(appError('SERVICE_UNAVAILABLE', `recherche-entreprises returned ${response.status}`));
    }

    const data = (await response.json()) as RechercheEntreprisesResponse;
    const results = (data.results ?? []).map(parseCompanyResult);

    return ok({ results, total: data.total_results ?? 0 });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return ok({ results: [], total: 0 });
    }
    return ok({ results: [], total: 0 });
  }
}
