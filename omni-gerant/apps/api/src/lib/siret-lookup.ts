import type { Result } from '@zenadmin/shared';
import { ok, err, appError } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';
import { createPappersClient, type PappersClient } from './pappers-client.js';
import { createSireneClient, estimateEffectifFromTranche, type SireneClient } from './sirene-client.js';
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
  categorie_entreprise: string | null;
  finances: { ca: number | null; resultat_net: number | null; annee: string | null } | null;
  capital_cents: number | null;
  legal_form_label: string | null;
  effectif_min: number | null;
  effectif_max: number | null;
  qualifications: Array<{ type: string; label: string }>;
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
      categorie_entreprise: null,
      finances: null,
      capital_cents: null,
      legal_form_label: null,
      effectif_min: null,
      effectif_max: null,
      qualifications: [],
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
      categorie_entreprise: null,
      finances: null,
      capital_cents: null,
      legal_form_label: null,
      effectif_min: null,
      effectif_max: null,
      qualifications: [],
      source: 'sirene',
    });
  }

  // Common NAF code labels (data.gouv.fr doesn't return them)
  const NAF_LABELS: Record<string, string> = {
    '01.11Z': 'Culture de cereales', '01.13Z': 'Culture de legumes', '01.21Z': 'Culture de la vigne',
    '10.13A': 'Preparation industrielle charcuterie', '10.71C': 'Boulangerie-patisserie', '10.71D': 'Patisserie',
    '41.20A': 'Construction de batiments residentiels', '41.20B': 'Construction de batiments non residentiels',
    '43.11Z': 'Travaux de demolition', '43.12A': 'Travaux de terrassement courants', '43.21A': 'Travaux d\'installation electrique',
    '43.22A': 'Travaux d\'installation d\'eau et de gaz', '43.22B': 'Travaux d\'installation thermique',
    '43.31Z': 'Travaux de platrerie', '43.32A': 'Travaux de menuiserie bois et PVC', '43.32B': 'Travaux de menuiserie metallique',
    '43.33Z': 'Travaux de revetement des sols et des murs', '43.34Z': 'Travaux de peinture et vitrerie',
    '43.39Z': 'Autres travaux de finition', '43.91A': 'Travaux de charpente', '43.91B': 'Travaux de couverture',
    '43.99C': 'Travaux de maconnerie generale', '43.99D': 'Autres travaux specialises de construction',
    '45.11Z': 'Commerce de voitures', '45.20A': 'Entretien et reparation de vehicules automobiles legers',
    '45.20B': 'Entretien et reparation d\'autres vehicules automobiles',
    '46.90Z': 'Commerce de gros non specialise', '47.11B': 'Commerce d\'alimentation generale',
    '47.11C': 'Superettes', '47.11D': 'Supermarches', '47.11F': 'Hypermarches',
    '47.19A': 'Grands magasins', '47.19B': 'Autres commerces de detail en magasin non specialise',
    '49.10Z': 'Transport ferroviaire interurbain de voyageurs', '49.31Z': 'Transports urbains de voyageurs',
    '49.39A': 'Transports routiers reguliers de voyageurs', '49.41A': 'Transports routiers de fret interurbains',
    '55.10Z': 'Hotels et hebergement similaire', '56.10A': 'Restauration traditionnelle',
    '56.10B': 'Cafeterias et autres libres-services', '56.10C': 'Restauration de type rapide',
    '56.21Z': 'Services des traiteurs', '56.30Z': 'Debits de boissons',
    '62.01Z': 'Programmation informatique', '62.02A': 'Conseil en systemes et logiciels informatiques',
    '62.02B': 'Tierce maintenance de systemes et d\'applications informatiques',
    '62.09Z': 'Autres activites informatiques', '63.11Z': 'Traitement de donnees, hebergement',
    '63.12Z': 'Portails Internet',
    '68.10Z': 'Activites des marchands de biens immobiliers', '68.20A': 'Location de logements',
    '68.20B': 'Location de terrains et d\'autres biens immobiliers', '68.31Z': 'Agences immobilieres',
    '69.10Z': 'Activites juridiques', '69.20Z': 'Activites comptables',
    '70.10Z': 'Activites des sieges sociaux', '70.21Z': 'Conseil en relations publiques et communication',
    '70.22Z': 'Conseil pour les affaires et autres conseils de gestion',
    '71.11Z': 'Activites d\'architecture', '71.12B': 'Ingenierie, etudes techniques',
    '71.20B': 'Analyses, essais et inspections techniques',
    '85.10Z': 'Enseignement pre-primaire', '85.20Z': 'Enseignement primaire',
    '85.31Z': 'Enseignement secondaire general', '85.42Z': 'Enseignement superieur',
    '85.59A': 'Formation continue d\'adultes',
    '86.10Z': 'Activites hospitalieres', '86.21Z': 'Activite des medecins generalistes',
    '86.22C': 'Autres activites des medecins specialistes', '86.23Z': 'Pratique dentaire',
    '86.90A': 'Ambulances', '86.90D': 'Activites des infirmiers et des sages-femmes',
    '88.10A': 'Aide a domicile', '88.10B': 'Accueil ou accompagnement sans hebergement d\'adultes handicapes',
    '88.91A': 'Accueil de jeunes enfants',
    '90.01Z': 'Arts du spectacle vivant', '93.11Z': 'Gestion d\'installations sportives',
    '93.12Z': 'Activites de clubs de sports', '93.13Z': 'Activites des centres de culture physique',
    '96.02A': 'Coiffure', '96.02B': 'Soins de beaute', '96.04Z': 'Entretien corporel',
  };

  // Layer 3: recherche-entreprises.api.gouv.fr (free, no API key, always available)
  async function lookupRechercheEntreprises(siret: string): Promise<Result<EnrichedSiretInfo, AppError>> {
    try {
      // This API searches by SIREN (first 9 digits of SIRET)
      const siren = siret.substring(0, 9);
      const response = await httpFetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${siren}`,
      );

      if (!response.ok) {
        return err(appError('SERVICE_UNAVAILABLE', `recherche-entreprises returned ${response.status}`));
      }

      const data = await response.json() as {
        results: Array<{
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
            nom?: string;
            prenoms?: string;
            qualite?: string;
            denomination?: string;
            siren?: string;
            type_dirigeant?: string;
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
            est_qualiopi?: boolean;
            est_rge?: boolean;
            est_bio?: boolean;
            est_organisme_formation?: boolean;
            est_entrepreneur_spectacle?: boolean;
            liste_id_organisme_formation?: string[];
          };
          tranche_effectif_salarie: string | null;
          finances?: Record<string, { ca?: number; resultat_net?: number }>;
        }>;
        total_results: number;
      };

      // Find the matching company by SIREN
      const company = data.results.find((r) => r.siren === siren);
      if (!company) {
        return err(appError('NOT_FOUND', `SIRET ${siret} not found`));
      }

      const siege = company.siege;
      const nafCode = siege.activite_principale ?? company.activite_principale ?? '';
      const idccList = company.complements?.liste_idcc ?? [];
      const effectif = estimateEffectifFromTranche(company.tranche_effectif_salarie ?? siege.tranche_effectif_salarie ?? null);

      // Map IDCC code to convention name
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

      // Extract finances (most recent year)
      const financesObj = company.finances ?? {};
      const financesYears = Object.keys(financesObj).sort().reverse();
      const latestFinanceYear = financesYears[0] ?? null;
      const latestFinance = latestFinanceYear ? financesObj[latestFinanceYear] : null;

      // Extract qualifications from complements
      const qualifications: Array<{ type: string; label: string }> = [];
      const comp = company.complements ?? {};
      if (comp.est_rge) qualifications.push({ type: 'rge', label: 'RGE (Reconnu Garant de l\'Environnement)' });
      if (comp.est_qualiopi) qualifications.push({ type: 'qualiopi', label: 'Qualiopi (Qualite des formations)' });
      if (comp.est_bio) qualifications.push({ type: 'bio', label: 'Agriculture Biologique' });
      if (comp.est_organisme_formation) qualifications.push({ type: 'formation', label: 'Organisme de formation declare' });
      // RGE details from siege
      const rgeList = siege.liste_rge;
      if (rgeList && Array.isArray(rgeList)) {
        for (const rge of rgeList as string[]) {
          if (!qualifications.some((q) => q.type === 'rge')) {
            qualifications.push({ type: 'rge', label: rge });
          }
        }
      }

      // Map dirigeants (both personnes physiques and morales)
      const dirigeants = (company.dirigeants ?? []).map((d) => {
        if (d.type_dirigeant === 'personne morale') {
          return { nom: d.denomination ?? '', prenom: '', fonction: d.qualite ?? 'Personne morale' };
        }
        return { nom: d.nom ?? '', prenom: d.prenoms ?? '', fonction: d.qualite ?? '' };
      });

      return ok({
        siret: siege.siret ?? siret,
        siren: company.siren,
        company_name: company.nom_complet || company.nom_raison_sociale,
        legal_form: company.nature_juridique ?? '',
        naf_code: nafCode,
        naf_label: NAF_LABELS[nafCode] ?? '',
        address: {
          line1: siege.adresse ?? '',
          zip_code: siege.code_postal ?? '',
          city: siege.libelle_commune ?? '',
          country: 'FR',
        },
        tva_number: null,
        creation_date: siege.date_creation ?? null,
        is_active: siege.etat_administratif === 'A',
        effectif_reel: effectif,
        convention_collective: idccList.length > 0 ? (IDCC_NAMES[idccList[0]!] ?? `Convention IDCC ${idccList[0]}`) : null,
        code_idcc: idccList.length > 0 ? idccList[0]! : null,
        etablissements: (company.matching_etablissements ?? []).map((e) => ({
          siret: e.siret,
          nom: e.est_siege ? 'Siege' : `Etablissement ${e.siret.substring(9)}`,
          adresse: e.adresse ?? '',
          is_active: e.etat_administratif === 'A',
        })),
        dirigeants,
        categorie_entreprise: company.categorie_entreprise ?? null,
        capital_cents: null,
        legal_form_label: null,
        effectif_min: null,
        effectif_max: null,
        qualifications,
        finances: latestFinance ? {
          ca: latestFinance.ca ?? null,
          resultat_net: latestFinance.resultat_net ?? null,
          annee: latestFinanceYear,
        } : null,
        source: 'datagouv',
      });
    } catch (error) {
      return err(appError(
        'SERVICE_UNAVAILABLE',
        `recherche-entreprises error: ${error instanceof Error ? error.message : 'Unknown'}`,
      ));
    }
  }

  // Bonus layer: Pappers suggestions (free, no API key) — enriches with capital, CA, effectif exact
  async function enrichWithPappersSuggestions(info: EnrichedSiretInfo): Promise<EnrichedSiretInfo> {
    try {
      const siren = info.siren;
      const response = await httpFetch(
        `https://suggestions.pappers.fr/v2?q=${siren}&cibles=siren&nbr=1`,
      );
      if (!response.ok) return info;

      const data = await response.json() as {
        resultats_siren?: Array<{
          siren: string;
          capital?: number;
          chiffre_affaires?: number;
          resultat?: number;
          annee_finances?: string;
          effectif_min?: number;
          effectif_max?: number;
          annee_effectif?: string;
          forme_juridique?: string;
          libelle_code_naf?: string;
          categorie_juridique?: string;
          statut_rcs?: string;
        }>;
      };

      const match = data.resultats_siren?.find((r) => r.siren === siren);
      if (!match) return info;

      // Enrich with Pappers suggestions data
      const enriched = { ...info };

      if (match.capital && match.capital > 0) {
        enriched.capital_cents = match.capital * 100;
      }

      if (match.libelle_code_naf && !enriched.naf_label) {
        enriched.naf_label = match.libelle_code_naf;
      }

      if (match.forme_juridique && (!enriched.legal_form || enriched.legal_form.match(/^\d+$/))) {
        enriched.legal_form_label = match.forme_juridique;
      }

      if (match.chiffre_affaires || match.resultat) {
        enriched.finances = {
          ca: match.chiffre_affaires ?? null,
          resultat_net: match.resultat ?? null,
          annee: match.annee_finances ?? null,
        };
      }

      if (match.effectif_min && match.effectif_max) {
        enriched.effectif_min = match.effectif_min;
        enriched.effectif_max = match.effectif_max;
      }

      return enriched;
    } catch {
      return info; // silently fail — this is just enrichment
    }
  }

  return {
    /**
     * Lookup SIRET with 3-layer fallback cascade + Pappers suggestions enrichment.
     * Returns enriched info from the first source that succeeds.
     */
    async lookup(siret: string): Promise<Result<EnrichedSiretInfo, AppError>> {
      // Check cache first
      const cached = await getCached(siret);
      if (cached) return ok(cached);

      // Helper: run a lookup with 5s timeout
      async function withTimeout<T>(
        fn: () => Promise<Result<T, AppError>>,
        label: string,
      ): Promise<Result<T, AppError>> {
        try {
          const result = await Promise.race([
            fn(),
            new Promise<Result<T, AppError>>((resolve) =>
              setTimeout(() => resolve(err(appError('TIMEOUT', `${label} timed out after 5s`))), 5000),
            ),
          ]);
          return result;
        } catch (error) {
          return err(appError('SERVICE_UNAVAILABLE', `${label} error: ${error instanceof Error ? error.message : 'Unknown'}`));
        }
      }

      // Layer 1: Pappers (richest)
      const pappersResult = await withTimeout(() => lookupPappers(siret), 'Pappers');
      if (pappersResult.ok) {
        await setCache(siret, pappersResult.value);
        return pappersResult;
      }

      // Layer 2: INSEE SIRENE
      const sireneResult = await withTimeout(() => lookupSirene(siret), 'SIRENE');
      if (sireneResult.ok) {
        const enriched = await enrichWithPappersSuggestions(sireneResult.value);
        await setCache(siret, enriched);
        return ok(enriched);
      }

      // Layer 3: data.gouv.fr (last resort)
      const dataGouvResult = await withTimeout(() => lookupRechercheEntreprises(siret), 'data.gouv.fr');
      if (dataGouvResult.ok) {
        // Enrich with Pappers suggestions (free, no key) for capital, CA, etc.
        const enriched = await enrichWithPappersSuggestions(dataGouvResult.value);
        await setCache(siret, enriched);
        return ok(enriched);
      }

      // All layers failed — return a clear SIRET_LOOKUP_UNAVAILABLE error
      return err(appError(
        'SIRET_LOOKUP_UNAVAILABLE',
        `All SIRET lookup sources failed for ${siret}. Pappers: ${!pappersResult.ok ? pappersResult.error.message : 'ok'}, SIRENE: ${!sireneResult.ok ? sireneResult.error.message : 'ok'}, data.gouv.fr: ${!dataGouvResult.ok ? dataGouvResult.error.message : 'ok'}`,
      ));
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
