import type { Result } from '@zenadmin/shared';
import { ok, err, appError } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';

// BUSINESS RULE [CDC-4]: Recherche entreprise par nom — API publique data.gouv.fr
// Endpoint gratuit, sans cle API, limite a 5 req/s cote serveur

export interface CompanySearchResult {
  siren: string;
  siret: string;
  company_name: string;
  legal_form: string;
  naf_code: string;
  naf_label: string;
  address: { line1: string; zip_code: string; city: string; country: string };
  is_active: boolean;
  employee_count: number | null;
  creation_date: string | null;
}

export interface CompanySearchParams {
  query: string;
  page?: number;
  perPage?: number;
  onlyActive?: boolean;
}

interface ApiSiege {
  siret?: string;
  adresse?: string;
  code_postal?: string;
  libelle_commune?: string;
  date_creation?: string;
  etat_administratif?: string;
  tranche_effectif_salarie?: string;
  activite_principale?: string;
}

interface ApiResult {
  siren: string;
  nom_complet: string;
  nom_raison_sociale?: string;
  nature_juridique?: string;
  activite_principale?: string;
  siege?: ApiSiege;
  nombre_etablissements_ouverts?: number;
  tranche_effectif_salarie?: string | null;
  date_creation?: string;
  etat_administratif?: string;
}

interface ApiResponse {
  results: ApiResult[];
  total_results: number;
}

// BUSINESS RULE [CDC-4]: Estimation effectif depuis tranche INSEE
function estimateFromTranche(tranche: string | null | undefined): number | null {
  if (!tranche) return null;
  const map: Record<string, number> = {
    '00': 0, '01': 1, '02': 3, '03': 6, '11': 10, '12': 20,
    '21': 50, '22': 100, '31': 200, '32': 250, '41': 500, '42': 1000,
    '51': 2000, '52': 5000, '53': 10000,
  };
  return map[tranche] ?? null;
}

function mapResult(r: ApiResult): CompanySearchResult {
  const siege = r.siege ?? {};
  const nafCode = siege.activite_principale ?? r.activite_principale ?? '';

  return {
    siren: r.siren,
    siret: siege.siret ?? `${r.siren}00000`,
    company_name: r.nom_complet || r.nom_raison_sociale || '',
    legal_form: r.nature_juridique ?? '',
    naf_code: nafCode,
    naf_label: '', // Not returned by this API — enriched later if needed
    address: {
      line1: siege.adresse ?? '',
      zip_code: siege.code_postal ?? '',
      city: siege.libelle_commune ?? '',
      country: 'FR',
    },
    is_active: (r.etat_administratif ?? siege.etat_administratif) === 'A',
    employee_count: estimateFromTranche(r.tranche_effectif_salarie ?? siege.tranche_effectif_salarie),
    creation_date: siege.date_creation ?? r.date_creation ?? null,
  };
}

export async function searchCompanies(
  params: CompanySearchParams,
  httpFetch: typeof fetch = fetch,
): Promise<Result<{ results: CompanySearchResult[]; total: number }, AppError>> {
  const { query, page = 1, perPage = 10, onlyActive = true } = params;

  // BUSINESS RULE [R08]: Validation aux frontieres
  if (!query || query.trim().length < 2) {
    return err(appError('VALIDATION_ERROR', 'Query must be at least 2 characters'));
  }

  const encodedQuery = encodeURIComponent(query.trim());
  const statusFilter = onlyActive ? '&etat_administratif=A' : '';
  const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodedQuery}&page=${page}&per_page=${perPage}${statusFilter}&mtm_campaign=zenadmin`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await httpFetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      // Graceful degradation: return empty results instead of 500
      return ok({ results: [], total: 0 });
    }

    const data = (await response.json()) as ApiResponse;
    const results = (data.results ?? []).map(mapResult);

    return ok({ results, total: data.total_results ?? 0 });
  } catch (error) {
    // BUSINESS RULE [CDC-4]: Graceful degradation — never fail the user request
    if (error instanceof DOMException && error.name === 'AbortError') {
      return ok({ results: [], total: 0 });
    }
    return ok({ results: [], total: 0 });
  }
}
