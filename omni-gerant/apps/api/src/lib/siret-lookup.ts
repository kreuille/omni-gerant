import type { Result } from '@omni-gerant/shared';
import { ok, err, appError } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';
import { createPappersClient, type PappersClient } from './pappers-client.js';
import { createSireneClient, estimateEffectifFromTranche, type SireneClient } from './sirene-client.js';
import { parseCompanyResult, type RechercheEntreprisesResponse, type RechercheEntreprisesRawResult } from './company-search.js';
import type { CacheStore } from './cache.js';
import { CACHE_TTL } from './cache.js';

// BUSINESS RULE [CDC-4]: Lookup SIRET enrichi — 3 couches de fallback
// 1. Pappers.fr (principal) — effectif reel, IDCC, etablissements, dirigeants
// 2. INSEE SIRENE (fallback) — OAuth2, tranche effectifs
// 3. data.gouv.fr (fallback ultime) — gratuit, pas de cle

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

export interface EnrichedSiretInfo extends SiretInfo {
  effectif_reel: number | null;
  convention_collective: string | null;
  code_idcc: string | null;
  etablissements: Array<{
    siret: string;
    nom: string;
    adresse: string;
    is_active: boolean;
  }>;
  dirigeants: Array<{
    nom: string;
    prenom: string;
    fonction: string;
  }>;
  source: 'pappers' | 'sirene' | 'datagouv';
}

// Simple in-memory cache fallback
const memoryCache = new Map<string, { data: EnrichedSiretInfo; expires_at: number }>();

export interface SiretLookupDeps {
  pappersClient?: PappersClient;
  sireneClient?: SireneClient;
  cacheStore?: CacheStore;
  httpFetch?: typeof fetch;
}

export function createSiretLookup(deps: SiretLookupDeps = {}) {
  const pappers = deps.pappersClient ?? createPappersClient();
  const sirene = deps.sireneClient ?? createSireneClient();
  const cacheStore = deps.cacheStore ?? null;
  const httpFetch = deps.httpFetch ?? globalThis.fetch;

  async function getCached(siret: string): Promise<EnrichedSiretInfo | null> {
    // Try Redis/external cache first
    if (cacheStore) {
      const cached = await cacheStore.get(`siret:${siret}`);
      if (cached) return JSON.parse(cached) as EnrichedSiretInfo;
    }
    // Fallback to memory cache
    const mem = memoryCache.get(siret);
    if (mem && mem.expires_at > Date.now()) return mem.data;
    return null;
  }

  async function setCache(siret: string, data: EnrichedSiretInfo): Promise<void> {
    if (cacheStore) {
      await cacheStore.set(`siret:${siret}`, JSON.stringify(data), CACHE_TTL.SIRET_LOOKUP);
    }
    memoryCache.set(siret, { data, expires_at: Date.now() + CACHE_TTL.SIRET_LOOKUP * 1000 });
  }

  // Layer 1: Pappers.fr (richest data)
  async function lookupPappers(siret: string): Promise<Result<EnrichedSiretInfo, AppError>> {
    const result = await pappers.lookupBySiret(siret);
    if (!result.ok) return result as Result<never, AppError>;

    const p = result.value;
    return ok({
      siret,
      siren: p.siren,
      company_name: p.denomination,
      legal_form: p.forme_juridique,
      naf_code: p.code_naf,
      naf_label: p.libelle_code_naf,
      address: p.siege ? {
        line1: p.siege.adresse_ligne_1,
        zip_code: p.siege.code_postal,
        city: p.siege.ville,
        country: 'FR',
      } : { line1: '', zip_code: '', city: '', country: 'FR' },
      tva_number: p.numero_tva,
      creation_date: p.date_creation,
      is_active: true,
      effectif_reel: p.effectifs,
      convention_collective: p.convention_collective,
      code_idcc: p.code_idcc,
      etablissements: p.etablissements.map((e) => ({
        siret: e.siret,
        nom: e.nom_commercial ?? p.denomination,
        adresse: [e.adresse_ligne_1, e.code_postal, e.ville].filter(Boolean).join(', '),
        is_active: e.statut === 'A' || e.statut === 'actif',
      })),
      dirigeants: p.dirigeants.map((d) => ({
        nom: d.nom,
        prenom: d.prenom,
        fonction: d.qualite,
      })),
      source: 'pappers',
    });
  }

  // Layer 2: INSEE SIRENE (OAuth2, tranche effectif)
  async function lookupSirene(siret: string): Promise<Result<EnrichedSiretInfo, AppError>> {
    const result = await sirene.lookupBySiret(siret);
    if (!result.ok) return result as Result<never, AppError>;

    const s = result.value;
    return ok({
      siret: s.siret,
      siren: s.siren,
      company_name: s.denomination,
      legal_form: s.categorie_juridique,
      naf_code: s.activite_principale,
      naf_label: s.libelle_activite_principale,
      address: {
        line1: [s.adresse.numero_voie, s.adresse.type_voie, s.adresse.libelle_voie]
          .filter(Boolean).join(' '),
        zip_code: s.adresse.code_postal,
        city: s.adresse.libelle_commune,
        country: 'FR',
      },
      tva_number: null,
      creation_date: s.date_creation,
      is_active: s.etat_administratif === 'A',
      effectif_reel: estimateEffectifFromTranche(s.tranche_effectifs),
      convention_collective: null,
      code_idcc: null,
      etablissements: [],
      dirigeants: [],
      source: 'sirene',
    });
  }

  // Layer 3: recherche-entreprises.api.gouv.fr (free, no API key, always available)
  async function lookupRechercheEntreprises(siret: string): Promise<Result<EnrichedSiretInfo, AppError>> {
    try {
      const siren = siret.substring(0, 9);
      const response = await httpFetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${siren}`,
      );

      if (!response.ok) {
        return err(appError('SERVICE_UNAVAILABLE', `recherche-entreprises returned ${response.status}`));
      }

      const data = await response.json() as RechercheEntreprisesResponse;

      const company = data.results.find((r: RechercheEntreprisesRawResult) => r.siren === siren);
      if (!company) {
        return err(appError('NOT_FOUND', `SIRET ${siret} not found`));
      }

      const parsed = parseCompanyResult(company);
      const idccList = company.complements?.liste_idcc ?? [];

      const IDCC_NAMES: Record<string, string> = {
        '1596': 'Convention collective nationale des ouvriers du batiment',
        '1597': 'Convention collective nationale des ETAM du batiment',
        '3043': 'Convention collective nationale des entreprises de proprete',
        '1501': 'Convention collective nationale de la restauration rapide',
        '1486': 'Convention collective nationale des bureaux d\'etudes techniques (Syntec)',
        '1516': 'Convention collective nationale des organismes de formation',
        '0044': 'Convention collective nationale des industries chimiques',
        '2098': 'Convention collective nationale de la plasturgie',
        '1090': 'Convention collective nationale des services de l\'automobile',
        '0573': 'Convention collective nationale des commerces de gros',
        '2216': 'Convention collective nationale du commerce de detail et de gros a predominance alimentaire',
      };

      return ok({
        siret: parsed.siret,
        siren: parsed.siren,
        company_name: parsed.company_name,
        legal_form: parsed.legal_form,
        naf_code: parsed.naf_code,
        naf_label: parsed.naf_label,
        address: parsed.address,
        tva_number: null,
        creation_date: parsed.creation_date,
        is_active: parsed.is_active,
        effectif_reel: parsed.employee_count,
        convention_collective: idccList.length > 0 ? (IDCC_NAMES[idccList[0]!] ?? `Convention IDCC ${idccList[0]}`) : null,
        code_idcc: idccList.length > 0 ? idccList[0]! : null,
        etablissements: (company.matching_etablissements ?? []).map((e) => ({
          siret: e.siret,
          nom: e.est_siege ? 'Siege' : `Etablissement ${e.siret.substring(9)}`,
          adresse: e.adresse ?? '',
          is_active: e.etat_administratif === 'A',
        })),
        dirigeants: (company.dirigeants ?? []).map((d) => ({
          nom: d.nom ?? '',
          prenom: d.prenoms ?? '',
          fonction: d.qualite ?? '',
        })),
        source: 'datagouv',
      });
    } catch (error) {
      return err(appError(
        'SERVICE_UNAVAILABLE',
        `recherche-entreprises error: ${error instanceof Error ? error.message : 'Unknown'}`,
      ));
    }
  }

  return {
    /**
     * Lookup SIRET with 3-layer fallback cascade.
     * Returns enriched info from the first source that succeeds.
     */
    async lookup(siret: string): Promise<Result<EnrichedSiretInfo, AppError>> {
      // Check cache first
      const cached = await getCached(siret);
      if (cached) return ok(cached);

      // Layer 1: Pappers (richest)
      const pappersResult = await lookupPappers(siret);
      if (pappersResult.ok) {
        await setCache(siret, pappersResult.value);
        return pappersResult;
      }

      // Layer 2: INSEE SIRENE
      const sireneResult = await lookupSirene(siret);
      if (sireneResult.ok) {
        await setCache(siret, sireneResult.value);
        return sireneResult;
      }

      // Layer 3: data.gouv.fr (last resort)
      const dataGouvResult = await lookupRechercheEntreprises(siret);
      if (dataGouvResult.ok) {
        await setCache(siret, dataGouvResult.value);
        return dataGouvResult;
      }

      // All layers failed — return the most relevant error
      return dataGouvResult;
    },

    /**
     * Basic lookup (non-enriched) for backward compatibility
     */
    async lookupBasic(siret: string): Promise<Result<SiretInfo, AppError>> {
      const result = await this.lookup(siret);
      if (!result.ok) return result;
      // Strip enriched fields
      const { effectif_reel, convention_collective, code_idcc, etablissements, dirigeants, source, ...base } = result.value;
      return ok(base);
    },

    clearCache() {
      memoryCache.clear();
    },
  };
}
