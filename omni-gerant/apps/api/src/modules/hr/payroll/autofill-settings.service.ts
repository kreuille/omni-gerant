// BUSINESS RULE [CDC-RH-V5]: Auto-fill settings paie depuis SIRET
//
// Sources :
//   - API publique recherche-entreprises.api.gouv.fr (gratuite, sans token)
//     -> convention_collective.idcc + libelle si declaree par l'entreprise
//     -> activite_principale (NAF) pour fallback
//     -> siege.adresse + departement
//   - Mapping department -> URSSAF (22 regions URSSAF en France metropolitaine + DOM)
//   - Mapping region -> CARSAT (16 CARSAT regionales)
//   - Mapping NAF -> IDCC (top 30 branches, couvre ~80% des TPE)

import { prisma } from '@zenadmin/db';
import type { Result, AppError } from '@zenadmin/shared';
import { ok, err, notFound, validationError } from '@zenadmin/shared';

// ── URSSAF par departement (janvier 2026) ─────────────────────────
const URSSAF_BY_DEPT: Record<string, string> = {
  // Ile-de-France
  '75': 'URSSAF Ile-de-France', '77': 'URSSAF Ile-de-France', '78': 'URSSAF Ile-de-France',
  '91': 'URSSAF Ile-de-France', '92': 'URSSAF Ile-de-France', '93': 'URSSAF Ile-de-France',
  '94': 'URSSAF Ile-de-France', '95': 'URSSAF Ile-de-France',
  // Auvergne-Rhone-Alpes
  '01': 'URSSAF Rhone-Alpes', '03': 'URSSAF Auvergne', '07': 'URSSAF Rhone-Alpes',
  '15': 'URSSAF Auvergne', '26': 'URSSAF Rhone-Alpes', '38': 'URSSAF Rhone-Alpes',
  '42': 'URSSAF Rhone-Alpes', '43': 'URSSAF Auvergne', '63': 'URSSAF Auvergne',
  '69': 'URSSAF Rhone-Alpes', '73': 'URSSAF Rhone-Alpes', '74': 'URSSAF Rhone-Alpes',
  // Provence-Alpes-Cote d'Azur
  '04': 'URSSAF PACA', '05': 'URSSAF PACA', '06': 'URSSAF PACA',
  '13': 'URSSAF PACA', '83': 'URSSAF PACA', '84': 'URSSAF PACA',
  // Nouvelle-Aquitaine
  '16': 'URSSAF Poitou-Charentes', '17': 'URSSAF Poitou-Charentes',
  '19': 'URSSAF Limousin', '23': 'URSSAF Limousin', '24': 'URSSAF Aquitaine',
  '33': 'URSSAF Aquitaine', '40': 'URSSAF Aquitaine', '47': 'URSSAF Aquitaine',
  '64': 'URSSAF Aquitaine', '79': 'URSSAF Poitou-Charentes', '86': 'URSSAF Poitou-Charentes', '87': 'URSSAF Limousin',
  // Occitanie
  '09': 'URSSAF Midi-Pyrenees', '11': 'URSSAF Languedoc-Roussillon', '12': 'URSSAF Midi-Pyrenees',
  '30': 'URSSAF Languedoc-Roussillon', '31': 'URSSAF Midi-Pyrenees', '32': 'URSSAF Midi-Pyrenees',
  '34': 'URSSAF Languedoc-Roussillon', '46': 'URSSAF Midi-Pyrenees', '48': 'URSSAF Languedoc-Roussillon',
  '65': 'URSSAF Midi-Pyrenees', '66': 'URSSAF Languedoc-Roussillon', '81': 'URSSAF Midi-Pyrenees', '82': 'URSSAF Midi-Pyrenees',
  // Grand Est
  '08': 'URSSAF Champagne-Ardenne', '10': 'URSSAF Champagne-Ardenne',
  '51': 'URSSAF Champagne-Ardenne', '52': 'URSSAF Champagne-Ardenne',
  '54': 'URSSAF Lorraine', '55': 'URSSAF Lorraine', '57': 'URSSAF Lorraine', '88': 'URSSAF Lorraine',
  '67': 'URSSAF Alsace', '68': 'URSSAF Alsace',
  // Hauts-de-France
  '02': 'URSSAF Picardie', '59': 'URSSAF Nord-Pas-de-Calais', '60': 'URSSAF Picardie',
  '62': 'URSSAF Nord-Pas-de-Calais', '80': 'URSSAF Picardie',
  // Bourgogne-Franche-Comte
  '21': 'URSSAF Bourgogne', '25': 'URSSAF Franche-Comte', '39': 'URSSAF Franche-Comte',
  '58': 'URSSAF Bourgogne', '70': 'URSSAF Franche-Comte', '71': 'URSSAF Bourgogne',
  '89': 'URSSAF Bourgogne', '90': 'URSSAF Franche-Comte',
  // Pays de la Loire
  '44': 'URSSAF Pays de la Loire', '49': 'URSSAF Pays de la Loire', '53': 'URSSAF Pays de la Loire',
  '72': 'URSSAF Pays de la Loire', '85': 'URSSAF Pays de la Loire',
  // Bretagne
  '22': 'URSSAF Bretagne', '29': 'URSSAF Bretagne', '35': 'URSSAF Bretagne', '56': 'URSSAF Bretagne',
  // Normandie
  '14': 'URSSAF Basse-Normandie', '27': 'URSSAF Haute-Normandie', '50': 'URSSAF Basse-Normandie',
  '61': 'URSSAF Basse-Normandie', '76': 'URSSAF Haute-Normandie',
  // Centre
  '18': 'URSSAF Centre', '28': 'URSSAF Centre', '36': 'URSSAF Centre',
  '37': 'URSSAF Centre', '41': 'URSSAF Centre', '45': 'URSSAF Centre',
  // Corse
  '2A': 'URSSAF Corse', '2B': 'URSSAF Corse',
  // DOM
  '971': 'URSSAF Guadeloupe', '972': 'URSSAF Martinique',
  '973': 'URSSAF Guyane', '974': 'URSSAF La Reunion', '976': 'URSSAF Mayotte',
};

// ── CARSAT par region (simplifie) ────────────────────────────────
const CARSAT_BY_DEPT: Record<string, string> = {
  // IDF
  '75': 'CNAV Ile-de-France', '77': 'CNAV Ile-de-France', '78': 'CNAV Ile-de-France',
  '91': 'CNAV Ile-de-France', '92': 'CNAV Ile-de-France', '93': 'CNAV Ile-de-France',
  '94': 'CNAV Ile-de-France', '95': 'CNAV Ile-de-France',
  // Nord
  '59': 'CARSAT Nord-Picardie', '60': 'CARSAT Nord-Picardie', '62': 'CARSAT Nord-Picardie', '80': 'CARSAT Nord-Picardie',
  // Bretagne
  '22': 'CARSAT Bretagne', '29': 'CARSAT Bretagne', '35': 'CARSAT Bretagne', '56': 'CARSAT Bretagne',
  // Sud-Est
  '13': 'CARSAT Sud-Est', '04': 'CARSAT Sud-Est', '05': 'CARSAT Sud-Est', '06': 'CARSAT Sud-Est', '83': 'CARSAT Sud-Est', '84': 'CARSAT Sud-Est', '2A': 'CARSAT Sud-Est', '2B': 'CARSAT Sud-Est',
  // Sud-Ouest
  '31': 'CARSAT Midi-Pyrenees', '09': 'CARSAT Midi-Pyrenees', '12': 'CARSAT Midi-Pyrenees', '32': 'CARSAT Midi-Pyrenees', '46': 'CARSAT Midi-Pyrenees', '65': 'CARSAT Midi-Pyrenees', '81': 'CARSAT Midi-Pyrenees', '82': 'CARSAT Midi-Pyrenees',
  '33': 'CARSAT Aquitaine', '24': 'CARSAT Aquitaine', '40': 'CARSAT Aquitaine', '47': 'CARSAT Aquitaine', '64': 'CARSAT Aquitaine',
  // Centre-Ouest
  '44': 'CARSAT Pays de la Loire', '49': 'CARSAT Pays de la Loire', '53': 'CARSAT Pays de la Loire', '72': 'CARSAT Pays de la Loire', '85': 'CARSAT Pays de la Loire',
  // Rhone-Alpes
  '69': 'CARSAT Rhone-Alpes', '01': 'CARSAT Rhone-Alpes', '07': 'CARSAT Rhone-Alpes', '26': 'CARSAT Rhone-Alpes', '38': 'CARSAT Rhone-Alpes', '42': 'CARSAT Rhone-Alpes', '73': 'CARSAT Rhone-Alpes', '74': 'CARSAT Rhone-Alpes',
  // Auvergne
  '03': 'CARSAT Auvergne', '15': 'CARSAT Auvergne', '43': 'CARSAT Auvergne', '63': 'CARSAT Auvergne',
  // Centre
  '18': 'CARSAT Centre', '28': 'CARSAT Centre', '36': 'CARSAT Centre', '37': 'CARSAT Centre', '41': 'CARSAT Centre', '45': 'CARSAT Centre',
  // Normandie
  '14': 'CARSAT Normandie', '27': 'CARSAT Normandie', '50': 'CARSAT Normandie', '61': 'CARSAT Normandie', '76': 'CARSAT Normandie',
  // Grand Est
  '67': 'CARSAT Alsace-Moselle', '68': 'CARSAT Alsace-Moselle', '57': 'CARSAT Alsace-Moselle',
  '54': 'CARSAT Nord-Est', '55': 'CARSAT Nord-Est', '88': 'CARSAT Nord-Est',
  '08': 'CARSAT Nord-Est', '10': 'CARSAT Nord-Est', '51': 'CARSAT Nord-Est', '52': 'CARSAT Nord-Est',
  // Bourgogne-Franche-Comte
  '21': 'CARSAT Bourgogne-Franche-Comte', '25': 'CARSAT Bourgogne-Franche-Comte', '39': 'CARSAT Bourgogne-Franche-Comte',
  '58': 'CARSAT Bourgogne-Franche-Comte', '70': 'CARSAT Bourgogne-Franche-Comte', '71': 'CARSAT Bourgogne-Franche-Comte', '89': 'CARSAT Bourgogne-Franche-Comte', '90': 'CARSAT Bourgogne-Franche-Comte',
  // Languedoc
  '34': 'CARSAT Languedoc-Roussillon', '11': 'CARSAT Languedoc-Roussillon', '30': 'CARSAT Languedoc-Roussillon', '48': 'CARSAT Languedoc-Roussillon', '66': 'CARSAT Languedoc-Roussillon',
  // Poitou-Limousin
  '16': 'CARSAT Centre-Ouest', '17': 'CARSAT Centre-Ouest', '79': 'CARSAT Centre-Ouest', '86': 'CARSAT Centre-Ouest',
  '19': 'CARSAT Centre-Ouest', '23': 'CARSAT Centre-Ouest', '87': 'CARSAT Centre-Ouest',
  // DOM
  '971': 'CGSS Guadeloupe', '972': 'CGSS Martinique', '973': 'CGSS Guyane', '974': 'CGSS La Reunion', '976': 'CGSS Mayotte',
};

// ── NAF -> IDCC (top branches TPE/PME, 2-digit NAF prefix) ───────
const NAF_TO_IDCC: Record<string, { idcc: string; libelle: string }> = {
  // Commerce
  '47.11': { idcc: '2216', libelle: 'CCN du commerce de detail et de gros a predominance alimentaire' },
  '47.2': { idcc: '1505', libelle: 'CCN du commerce de detail de l\'alimentation' },
  '47.7': { idcc: '1483', libelle: 'CCN du commerce de detail non alimentaire' },
  // Restauration / hotellerie
  '56.10': { idcc: '1979', libelle: 'CCN des hotels, cafes et restaurants (HCR)' },
  '55.10': { idcc: '1979', libelle: 'CCN des hotels, cafes et restaurants (HCR)' },
  '56.2': { idcc: '1266', libelle: 'CCN de la restauration de collectivites' },
  '56.3': { idcc: '1979', libelle: 'CCN des hotels, cafes et restaurants (HCR)' },
  // Batiment
  '41.2': { idcc: '2609', libelle: 'CCN du batiment (ETAM et cadres)' },
  '42.1': { idcc: '2609', libelle: 'CCN des travaux publics' },
  '43.': { idcc: '1596', libelle: 'CCN du batiment - ouvriers jusqu\'a 10 salaries' },
  // Informatique / conseil
  '62.': { idcc: '1486', libelle: 'CCN Syntec (informatique, conseil, etudes)' },
  '63.': { idcc: '1486', libelle: 'CCN Syntec' },
  '71.12': { idcc: '1486', libelle: 'CCN Syntec' },
  '70.22': { idcc: '1486', libelle: 'CCN Syntec' },
  '74.9': { idcc: '1486', libelle: 'CCN Syntec' },
  // Transport
  '49.4': { idcc: '0016', libelle: 'CCN des transports routiers et activites auxiliaires' },
  '52.': { idcc: '0016', libelle: 'CCN des transports routiers et activites auxiliaires' },
  // Sante / social
  '86.': { idcc: '1147', libelle: 'CCN du personnel des cabinets medicaux' },
  '87.': { idcc: '2264', libelle: 'CCN de l\'hospitalisation privee' },
  '88.9': { idcc: '3246', libelle: 'CCN des etablissements pour personnes agees' },
  // Coiffure / esthetique
  '96.02': { idcc: '2596', libelle: 'CCN de la coiffure' },
  '96.04': { idcc: '3032', libelle: 'CCN de l\'esthetique-cosmetique et de l\'enseignement technique' },
  // Immobilier
  '68.': { idcc: '1527', libelle: 'CCN de l\'immobilier' },
  // Garage / auto
  '45.2': { idcc: '1090', libelle: 'CCN des services de l\'automobile' },
  '45.3': { idcc: '1090', libelle: 'CCN des services de l\'automobile' },
  // Proprete
  '81.2': { idcc: '3043', libelle: 'CCN de la proprete et services associes' },
  // Securite
  '80.': { idcc: '1351', libelle: 'CCN des entreprises de prevention et de securite' },
  // Boulangerie / boucherie
  '10.71': { idcc: '0843', libelle: 'CCN de la boulangerie-patisserie' },
  '47.22': { idcc: '0992', libelle: 'CCN de la boucherie, boucherie-charcuterie' },
  // Metallurgie
  '24.': { idcc: '3248', libelle: 'CCN de la metallurgie (nationale 2022)' },
  '25.': { idcc: '3248', libelle: 'CCN de la metallurgie' },
  '28.': { idcc: '3248', libelle: 'CCN de la metallurgie' },
};

function matchNafToIdcc(naf: string | null | undefined): { idcc: string; libelle: string } | null {
  if (!naf) return null;
  const cleaned = naf.replace(/[^0-9.]/g, '');
  // Try longest prefix first
  const keys = Object.keys(NAF_TO_IDCC).sort((a, b) => b.length - a.length);
  for (const prefix of keys) {
    if (cleaned.startsWith(prefix)) return NAF_TO_IDCC[prefix]!;
  }
  return null;
}

function urssafFromDept(dept: string | null | undefined): string | null {
  if (!dept) return null;
  const key = dept.length === 3 && dept.startsWith('97') ? dept : dept.slice(0, 2).toUpperCase();
  return URSSAF_BY_DEPT[key] ?? null;
}

function carsatFromDept(dept: string | null | undefined): string | null {
  if (!dept) return null;
  const key = dept.length === 3 && dept.startsWith('97') ? dept : dept.slice(0, 2).toUpperCase();
  return CARSAT_BY_DEPT[key] ?? null;
}

export interface AutofillResult {
  suggested: {
    urssaf_ref: string | null;
    carsat_ref: string | null;
    convention_collective: string | null;
    idcc: string | null;
  };
  sources: {
    siret: string | null;
    nafCode: string | null;
    department: string | null;
    apiConventionFound: boolean;
  };
  notes: string[];
}

/**
 * Cherche et suggere les settings paie depuis le SIRET tenant.
 * N'ecrit pas en DB — l'utilisateur valide avant save.
 */
export async function autofillPayrollSettings(tenantId: string): Promise<Result<AutofillResult, AppError>> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return err(notFound('Tenant', tenantId));
  if (!tenant.siret) return err(validationError('Tenant sans SIRET — renseigner d\'abord dans Profil entreprise'));

  const notes: string[] = [];
  let apiIdcc: string | null = null;
  let apiLibelle: string | null = null;
  let department: string | null = null;

  try {
    const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${tenant.siret}&limite_matching_etablissements=1`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json() as { results?: Array<{
        siege?: { departement?: string; code_postal?: string };
        complements?: { convention_collective_renseignee?: boolean };
        matching_etablissements?: Array<{ liste_idcc?: string[]; departement?: string; code_postal?: string }>;
      }> };
      const first = data.results?.[0];
      department = first?.siege?.departement ?? first?.matching_etablissements?.[0]?.departement ?? null;
      const idccList = first?.matching_etablissements?.[0]?.liste_idcc ?? [];
      if (idccList.length > 0) {
        apiIdcc = idccList[0] ?? null;
        notes.push(`Convention collective trouvee via API gouv.fr (IDCC ${apiIdcc})`);
      } else {
        notes.push('Pas de convention collective declaree a l\'INSEE — fallback NAF');
      }
    }
  } catch {
    notes.push('API recherche-entreprises.api.gouv.fr indisponible — fallback sur NAF local');
  }

  // Fallback NAF -> IDCC
  let idcc: string | null = apiIdcc;
  let libelle: string | null = apiLibelle;
  if (!idcc) {
    const nafMatch = matchNafToIdcc(tenant.naf_code);
    if (nafMatch) {
      idcc = nafMatch.idcc;
      libelle = nafMatch.libelle;
      notes.push(`CC deduite du NAF ${tenant.naf_code} : ${libelle}`);
    } else if (tenant.naf_code) {
      notes.push(`NAF ${tenant.naf_code} non mappe — configuration manuelle requise`);
    }
  } else {
    // Enrichir libelle via mapping local si dispo
    const nafMatch = matchNafToIdcc(tenant.naf_code);
    if (nafMatch && nafMatch.idcc === idcc) libelle = nafMatch.libelle;
  }

  // Department fallback depuis zip_code tenant
  if (!department) {
    const addr = tenant.address as { zip_code?: string; zip?: string } | null;
    const zip = addr?.zip_code ?? addr?.zip ?? null;
    if (zip) {
      department = zip.startsWith('97') ? zip.slice(0, 3) : zip.slice(0, 2);
    }
  }

  const urssaf = urssafFromDept(department);
  const carsat = carsatFromDept(department);

  if (!urssaf) notes.push(`URSSAF non trouvee pour departement ${department ?? '??'} — saisie manuelle requise`);
  if (!carsat) notes.push(`CARSAT non trouvee pour departement ${department ?? '??'} — saisie manuelle requise`);

  return ok({
    suggested: {
      urssaf_ref: urssaf,
      carsat_ref: carsat,
      convention_collective: libelle,
      idcc: idcc,
    },
    sources: {
      siret: tenant.siret,
      nafCode: tenant.naf_code,
      department,
      apiConventionFound: apiIdcc !== null,
    },
    notes,
  });
}
