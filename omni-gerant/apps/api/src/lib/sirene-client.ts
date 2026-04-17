import type { Result } from '@zenadmin/shared';
import { ok, err, appError } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';

// BUSINESS RULE [CDC-4]: Client API SIRENE INSEE — fallback enrichi (OAuth2, 30 req/min)

export interface SireneCompanyInfo {
  siren: string;
  siret: string;
  denomination: string;
  categorie_juridique: string;
  activite_principale: string;
  libelle_activite_principale: string;
  tranche_effectifs: string | null;
  date_creation: string | null;
  etat_administratif: string;
  adresse: {
    numero_voie: string;
    type_voie: string;
    libelle_voie: string;
    code_postal: string;
    libelle_commune: string;
  };
}

export interface SireneClient {
  lookupBySiret(siret: string): Promise<Result<SireneCompanyInfo, AppError>>;
}

// OAuth2 token cache
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getOAuth2Token(clientId: string, clientSecret: string): Promise<Result<string, AppError>> {
  // Return cached token if still valid (with 60s margin)
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return ok(tokenCache.token);
  }

  try {
    const response = await fetch('https://api.insee.fr/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return err(appError('FORBIDDEN', `INSEE OAuth2 token request failed: ${response.status}`));
    }

    const data = await response.json();
    const token = data.access_token as string;
    const expiresIn = (data.expires_in as number) ?? 3600;

    tokenCache = {
      token,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    return ok(token);
  } catch (error) {
    return err(appError(
      'SERVICE_UNAVAILABLE',
      `INSEE OAuth2 error: ${error instanceof Error ? error.message : 'Unknown'}`,
    ));
  }
}

// SIRENE tranche effectif → nombre approximatif
const TRANCHE_EFFECTIFS_MAP: Record<string, number> = {
  '00': 0,
  '01': 1, '02': 3, '03': 6,
  '11': 10, '12': 20, '21': 50,
  '22': 100, '31': 200, '32': 250,
  '41': 500, '42': 1000, '51': 2000,
  '52': 5000, '53': 10000,
};

export function estimateEffectifFromTranche(tranche: string | null): number | null {
  if (!tranche) return null;
  return TRANCHE_EFFECTIFS_MAP[tranche] ?? null;
}

export function createSireneClient(clientId?: string, clientSecret?: string): SireneClient {
  const id = clientId ?? process.env['SIRENE_CLIENT_ID'];
  const secret = clientSecret ?? process.env['SIRENE_CLIENT_SECRET'];

  return {
    async lookupBySiret(siret: string): Promise<Result<SireneCompanyInfo, AppError>> {
      if (!id || !secret) {
        return err(appError('SERVICE_UNAVAILABLE', 'SIRENE_CLIENT_ID/SECRET not configured'));
      }

      const tokenResult = await getOAuth2Token(id, secret);
      if (!tokenResult.ok) return tokenResult as Result<never, AppError>;

      try {
        const response = await fetch(
          `https://api.insee.fr/entreprises/sirene/V3.11/siret/${encodeURIComponent(siret)}`,
          {
            headers: {
              'Authorization': `Bearer ${tokenResult.value}`,
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(10000),
          },
        );

        if (!response.ok) {
          if (response.status === 404) {
            return err(appError('NOT_FOUND', `SIRET ${siret} not found on INSEE`));
          }
          if (response.status === 429) {
            return err(appError('SERVICE_UNAVAILABLE', 'INSEE API rate limit exceeded (30 req/min)'));
          }
          return err(appError('SERVICE_UNAVAILABLE', `INSEE API returned ${response.status}`));
        }

        const data = await response.json();
        const etab = data.etablissement;
        const ul = etab?.uniteLegale ?? {};
        const adresse = etab?.adresseEtablissement ?? {};

        const info: SireneCompanyInfo = {
          siren: etab?.siren ?? siret.substring(0, 9),
          siret: etab?.siret ?? siret,
          denomination: ul.denominationUniteLegale ??
            `${ul.prenomUsuelUniteLegale ?? ''} ${ul.nomUniteLegale ?? ''}`.trim(),
          categorie_juridique: ul.categorieJuridiqueUniteLegale ?? '',
          activite_principale: etab?.activitePrincipaleEtablissement ??
            ul.activitePrincipaleUniteLegale ?? '',
          libelle_activite_principale: '', // INSEE ne renvoie pas le libelle
          tranche_effectifs: etab?.trancheEffectifsEtablissement ??
            ul.trancheEffectifsUniteLegale ?? null,
          date_creation: etab?.dateCreationEtablissement ?? ul.dateCreationUniteLegale ?? null,
          etat_administratif: etab?.etatAdministratifEtablissement ?? 'A',
          adresse: {
            numero_voie: adresse.numeroVoieEtablissement ?? '',
            type_voie: adresse.typeVoieEtablissement ?? '',
            libelle_voie: adresse.libelleVoieEtablissement ?? '',
            code_postal: adresse.codePostalEtablissement ?? '',
            libelle_commune: adresse.libelleCommuneEtablissement ?? '',
          },
        };

        return ok(info);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'TimeoutError') {
          return err(appError('SERVICE_UNAVAILABLE', 'INSEE API timeout'));
        }
        return err(appError(
          'SERVICE_UNAVAILABLE',
          `INSEE API error: ${error instanceof Error ? error.message : 'Unknown'}`,
        ));
      }
    },
  };
}
