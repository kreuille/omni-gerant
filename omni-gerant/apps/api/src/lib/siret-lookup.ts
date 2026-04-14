import type { Result } from '@omni-gerant/shared';
import { ok, err, appError } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';

// BUSINESS RULE [CDC-4]: Recuperation automatique identite entreprise via SIRET (API Pappers/Insee)

export interface SiretInfo {
  siret: string;
  siren: string;
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
  tva_number: string | null;
  creation_date: string | null;
  is_active: boolean;
}

// Simple in-memory cache with TTL
const cache = new Map<string, { data: SiretInfo; expires_at: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export interface SiretLookupClient {
  fetch(url: string): Promise<Response>;
}

export function createSiretLookup(client?: SiretLookupClient) {
  const httpFetch = client?.fetch ?? globalThis.fetch;

  return {
    async lookup(siret: string): Promise<Result<SiretInfo, AppError>> {
      // Check cache
      const cached = cache.get(siret);
      if (cached && cached.expires_at > Date.now()) {
        return ok(cached.data);
      }

      try {
        // Use API Entreprise (data.gouv.fr) - free, no API key needed
        const response = await httpFetch(
          `https://entreprise.data.gouv.fr/api/sirene/v3/etablissements/${siret}`,
        );

        if (!response.ok) {
          if (response.status === 404) {
            return err(appError('NOT_FOUND', `SIRET ${siret} not found`));
          }
          return err(
            appError('SERVICE_UNAVAILABLE', `SIRET lookup failed with status ${response.status}`),
          );
        }

        const data = await response.json();
        const etablissement = data.etablissement;

        const info: SiretInfo = {
          siret: etablissement.siret,
          siren: etablissement.siren,
          company_name:
            etablissement.unite_legale?.denomination ??
            `${etablissement.unite_legale?.prenom_1 ?? ''} ${etablissement.unite_legale?.nom ?? ''}`.trim(),
          legal_form: etablissement.unite_legale?.categorie_juridique ?? '',
          naf_code: etablissement.activite_principale ?? '',
          naf_label: etablissement.libelle_activite_principale ?? '',
          address: {
            line1: [
              etablissement.numero_voie,
              etablissement.type_voie,
              etablissement.libelle_voie,
            ]
              .filter(Boolean)
              .join(' '),
            zip_code: etablissement.code_postal ?? '',
            city: etablissement.libelle_commune ?? '',
            country: 'FR',
          },
          tva_number: null,
          creation_date: etablissement.date_creation ?? null,
          is_active: etablissement.etat_administratif === 'A',
        };

        // Cache result
        cache.set(siret, { data: info, expires_at: Date.now() + CACHE_TTL_MS });

        return ok(info);
      } catch (error) {
        return err(
          appError(
            'SERVICE_UNAVAILABLE',
            `SIRET lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ),
        );
      }
    },

    clearCache() {
      cache.clear();
    },
  };
}
