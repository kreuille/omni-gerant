import type { Result } from '@zenadmin/shared';
import { ok, err, appError } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';

// BUSINESS RULE [CDC-4]: Client API Pappers.fr — source enrichie SIRET (effectif, IDCC, etablissements)

export interface PappersCompanyInfo {
  siren: string;
  siret_siege: string;
  denomination: string;
  forme_juridique: string;
  code_naf: string;
  libelle_code_naf: string;
  effectifs: number | null;
  tranche_effectifs: string | null;
  convention_collective: string | null;
  code_idcc: string | null;
  date_creation: string | null;
  numero_tva: string | null;
  siege: {
    siret: string;
    adresse_ligne_1: string;
    code_postal: string;
    ville: string;
  } | null;
  etablissements: Array<{
    siret: string;
    nom_commercial: string | null;
    adresse_ligne_1: string;
    code_postal: string;
    ville: string;
    est_siege: boolean;
    statut: string;
  }>;
  dirigeants: Array<{
    nom: string;
    prenom: string;
    qualite: string;
  }>;
}

export interface PappersClient {
  lookupBySiret(siret: string): Promise<Result<PappersCompanyInfo, AppError>>;
}

export function createPappersClient(apiToken?: string): PappersClient {
  const token = apiToken ?? process.env['PAPPERS_API_TOKEN'];
  const baseUrl = process.env['PAPPERS_API_ENDPOINT'] ?? 'https://api.pappers.fr/v2';

  return {
    async lookupBySiret(siret: string): Promise<Result<PappersCompanyInfo, AppError>> {
      if (!token) {
        return err(appError('SERVICE_UNAVAILABLE', 'PAPPERS_API_TOKEN not configured'));
      }

      try {
        const url = `${baseUrl}/entreprise?siret=${encodeURIComponent(siret)}&api_token=${encodeURIComponent(token)}`;
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          if (response.status === 404) {
            return err(appError('NOT_FOUND', `SIRET ${siret} not found on Pappers`));
          }
          if (response.status === 401 || response.status === 403) {
            return err(appError('FORBIDDEN', 'Invalid Pappers API token'));
          }
          return err(appError('SERVICE_UNAVAILABLE', `Pappers API returned ${response.status}`));
        }

        const data = await response.json();

        const info: PappersCompanyInfo = {
          siren: data.siren ?? siret.substring(0, 9),
          siret_siege: data.siege?.siret ?? siret,
          denomination: data.nom_entreprise ?? data.denomination ?? '',
          forme_juridique: data.forme_juridique ?? '',
          code_naf: data.code_naf ?? '',
          libelle_code_naf: data.libelle_code_naf ?? '',
          effectifs: data.effectifs ?? data.dernier_traitement?.effectifs ?? null,
          tranche_effectifs: data.tranche_effectifs ?? null,
          convention_collective: data.convention_collective ?? null,
          code_idcc: data.code_idcc ?? null,
          date_creation: data.date_creation ?? null,
          numero_tva: data.numero_tva_intracommunautaire ?? null,
          siege: data.siege ? {
            siret: data.siege.siret ?? siret,
            adresse_ligne_1: [data.siege.numero_voie, data.siege.type_voie, data.siege.libelle_voie]
              .filter(Boolean).join(' ') || data.siege.adresse_ligne_1 || '',
            code_postal: data.siege.code_postal ?? '',
            ville: data.siege.ville ?? '',
          } : null,
          etablissements: (data.etablissements ?? []).map((e: Record<string, unknown>) => ({
            siret: (e.siret ?? '') as string,
            nom_commercial: (e.nom_commercial ?? null) as string | null,
            adresse_ligne_1: (e.adresse_ligne_1 ?? '') as string,
            code_postal: (e.code_postal ?? '') as string,
            ville: (e.ville ?? '') as string,
            est_siege: e.est_siege === true,
            statut: (e.statut ?? 'inconnu') as string,
          })),
          dirigeants: (data.representants ?? data.dirigeants ?? []).map((d: Record<string, unknown>) => ({
            nom: (d.nom ?? '') as string,
            prenom: (d.prenom ?? '') as string,
            qualite: (d.qualite ?? d.fonction ?? '') as string,
          })),
        };

        return ok(info);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'TimeoutError') {
          return err(appError('SERVICE_UNAVAILABLE', 'Pappers API timeout'));
        }
        return err(appError(
          'SERVICE_UNAVAILABLE',
          `Pappers API error: ${error instanceof Error ? error.message : 'Unknown'}`,
        ));
      }
    },
  };
}
