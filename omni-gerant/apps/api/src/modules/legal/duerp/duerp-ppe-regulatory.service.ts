// BUSINESS RULE [CDC-2.4]: E12 — Base EPI structuree + veille reglementaire simplifiee

import { PPE_DATABASE, type PPERequirement } from './ppe-database.js';

// ── Extended PPE database for all sectors ─────────────────────

const EXTENDED_PPE: PPERequirement[] = [
  // Agriculture
  { id: 'ppe-tronconneuse-pantalon', riskType: 'coupure_tronconneuse', ppeName: 'Pantalon anti-coupure tronconneuse', norm: 'EN 381-5 classe 1', sectors: ['exploitation-forestiere', 'paysagiste'], mandatory: true },
  { id: 'ppe-tronconneuse-bottes', riskType: 'coupure_tronconneuse', ppeName: 'Bottes anti-coupure', norm: 'EN 17249', sectors: ['exploitation-forestiere'], mandatory: true },
  { id: 'ppe-forestier-casque', riskType: 'chute_objets', ppeName: 'Casque forestier avec visiere et antibruit', norm: 'EN 397 + EN 352 + EN 1731', sectors: ['exploitation-forestiere', 'paysagiste'], mandatory: true },
  { id: 'ppe-phyto-combinaison', riskType: 'chimique_phyto', ppeName: 'Combinaison de protection phytosanitaire', norm: 'EN ISO 27065 cat.4', sectors: ['viticulture', 'maraichage', 'cereales', 'horticulture-pepiniere'], mandatory: true },
  { id: 'ppe-apiculteur', riskType: 'piqure_insecte', ppeName: 'Combinaison apiculteur integrale', norm: 'Equipement pro apicole', sectors: ['apiculture'], mandatory: true },
  // Transport
  { id: 'ppe-gilet-routier', riskType: 'circulation_routiere', ppeName: 'Gilet haute visibilite classe 3', norm: 'EN ISO 20471 classe 3', sectors: ['collecte-dechets', 'transport-routier-marchandises', 'assainissement'], mandatory: true },
  { id: 'ppe-gants-antipiqure', riskType: 'piqure_dechets', ppeName: 'Gants anti-piqure anti-coupure', norm: 'EN 388 + EN 374', sectors: ['collecte-dechets', 'assainissement'], mandatory: true },
  // Proprete
  { id: 'ppe-hp-gants', riskType: 'haute_pression', ppeName: 'Gants haute pression', norm: 'EN 388 anti-perforation', sectors: ['nettoyage-industriel'], mandatory: true },
  { id: 'ppe-confine-ari', riskType: 'asphyxie', ppeName: 'ARI (Appareil Respiratoire Isolant)', norm: 'EN 137 classe 2', sectors: ['assainissement', 'sapeurs-pompiers'], mandatory: true },
  { id: 'ppe-confine-detecteur', riskType: 'gaz_toxique', ppeName: 'Detecteur multi-gaz 4 voies', norm: 'EN 60079-29-1', sectors: ['assainissement', 'nettoyage-industriel', 'elevage-porcin'], mandatory: true },
  // Beaute
  { id: 'ppe-onglerie-masque', riskType: 'poussieres_acrylique', ppeName: 'Masque FFP2 pour onglerie', norm: 'EN 149', sectors: ['onglerie-manucure'], mandatory: true },
  { id: 'ppe-tatouage-gants', riskType: 'biologique_sang', ppeName: 'Gants nitrile non steriles (tatouage)', norm: 'EN 374', sectors: ['tatouage-piercing'], mandatory: true },
  // Securite
  { id: 'ppe-pare-coups', riskType: 'agression', ppeName: 'Gilet pare-coups', norm: 'NIJ Level II', sectors: ['agent-securite', 'police-municipale'], mandatory: false },
  // Sport
  { id: 'ppe-ski-casque', riskType: 'chute_ski', ppeName: 'Casque de ski', norm: 'EN 1077 classe B', sectors: ['moniteur-ski'], mandatory: true },
  { id: 'ppe-dva', riskType: 'avalanche', ppeName: 'DVA + sonde + pelle', norm: 'EN 300 (DVA)', sectors: ['moniteur-ski'], mandatory: true },
  { id: 'ppe-equitation-bombe', riskType: 'chute_cheval', ppeName: 'Bombe d\'equitation', norm: 'EN 1384', sectors: ['centre-equestre', 'centre-equin'], mandatory: true },
  // Pompiers
  { id: 'ppe-feu-tenue', riskType: 'incendie_intervention', ppeName: 'Tenue de feu integrale', norm: 'EN 469 niveau 2', sectors: ['sapeurs-pompiers'], mandatory: true },
  { id: 'ppe-feu-casque', riskType: 'incendie_intervention', ppeName: 'Casque F1 sapeur-pompier', norm: 'EN 443', sectors: ['sapeurs-pompiers'], mandatory: true },
];

export const ALL_PPE: PPERequirement[] = [...PPE_DATABASE, ...EXTENDED_PPE];

// ── PPE by risk ─────────────────────────────────────────────────

export function getExtendedPPEForRisk(riskType: string): PPERequirement[] {
  const lower = riskType.toLowerCase();
  return ALL_PPE.filter((ppe) =>
    lower.includes(ppe.riskType.toLowerCase()) ||
    ppe.riskType.toLowerCase().includes(lower),
  );
}

export function getExtendedPPEForSector(metierSlug: string): PPERequirement[] {
  return ALL_PPE.filter((ppe) => ppe.sectors.includes(metierSlug));
}

// ── Regulatory watch ────────────────────────────────────────────

export interface RegulatoryUpdate {
  id: string;
  title: string;
  description: string;
  type: 'new_regulation' | 'update' | 'repeal' | 'new_disease_table';
  affectedNafCodes: string[];
  affectedSectors: string[];
  affectedRiskTypes: string[];
  effectiveDate: Date;
  source: string;
  sourceUrl: string | null;
  severity: 'info' | 'action_required';
  createdAt: Date;
}

// BUSINESS RULE [CDC-2.4]: Base de mises a jour reglementaires (alimentee manuellement pour le MVP)
const REGULATORY_UPDATES: RegulatoryUpdate[] = [
  {
    id: 'reg-2026-depot-duerp',
    title: 'Depot dematerialise DUERP obligatoire pour toutes les entreprises',
    description: 'A compter du 1er juillet 2024 (pour >= 150 sal.), 2025 (>= 50) et 2026 (toutes) : depot dematerialise du DUERP sur un portail numerique dedie.',
    type: 'new_regulation',
    affectedNafCodes: [],
    affectedSectors: ['*'],
    affectedRiskTypes: [],
    effectiveDate: new Date('2026-07-01'),
    source: 'Loi 2021-1018 du 2 aout 2021',
    sourceUrl: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000043884445',
    severity: 'action_required',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'reg-2024-amiante-ss4',
    title: 'Mise a jour du reperage amiante avant travaux (RAT)',
    description: 'Renforcement des obligations de reperage amiante avant travaux pour les donneurs d\'ordre et les entreprises de BTP.',
    type: 'update',
    affectedNafCodes: ['41', '42', '43'],
    affectedSectors: ['btp-general', 'electricien', 'plombier', 'peintre-batiment', 'carreleur', 'macon', 'couvreur', 'terrassement-demolition'],
    affectedRiskTypes: ['chimique', 'poussieres'],
    effectiveDate: new Date('2024-01-01'),
    source: 'Decret 2023-XXX (reperage amiante)',
    sourceUrl: null,
    severity: 'action_required',
    createdAt: new Date('2023-12-01'),
  },
  {
    id: 'reg-2024-cmr',
    title: 'Mise a jour des VLEP pour agents chimiques CMR',
    description: 'Nouvelles valeurs limites d\'exposition professionnelle pour certains agents cancerogenes, mutagenes et reprotoxiques.',
    type: 'update',
    affectedNafCodes: [],
    affectedSectors: ['garage-auto', 'imprimerie', 'traitement-metaux', 'plasturgie', 'coiffure', 'pressing'],
    affectedRiskTypes: ['chimique'],
    effectiveDate: new Date('2024-07-01'),
    source: 'Directive UE 2022/431',
    sourceUrl: null,
    severity: 'action_required',
    createdAt: new Date('2024-03-01'),
  },
  {
    id: 'reg-2024-chaleur',
    title: 'Renforcement des mesures de prevention canicule au travail',
    description: 'Obligation de mise en oeuvre d\'un plan canicule avec mesures concretes (eau, repos, adaptation horaires) pour les travailleurs exterieurs.',
    type: 'update',
    affectedNafCodes: [],
    affectedSectors: ['btp-general', 'paysagiste', 'viticulture', 'maraichage', 'collecte-dechets', 'entretien-espaces-verts'],
    affectedRiskTypes: ['thermique'],
    effectiveDate: new Date('2024-06-01'),
    source: 'Instruction DGT 2024',
    sourceUrl: null,
    severity: 'info',
    createdAt: new Date('2024-05-01'),
  },
  {
    id: 'reg-2025-prevention-chutes',
    title: 'Renforcement de la prevention des chutes de hauteur',
    description: 'Nouvelles exigences pour les protections collectives et individuelles contre les chutes de hauteur dans le BTP.',
    type: 'update',
    affectedNafCodes: ['41', '42', '43'],
    affectedSectors: ['btp-general', 'couvreur', 'charpentier', 'nettoyage-vitrerie', 'evenementiel-spectacle'],
    affectedRiskTypes: ['chute_hauteur'],
    effectiveDate: new Date('2025-01-01'),
    source: 'Arrete du XX/XX/2024',
    sourceUrl: null,
    severity: 'action_required',
    createdAt: new Date('2024-09-01'),
  },
  {
    id: 'reg-rg-tableau-103',
    title: 'Nouveau tableau de maladie professionnelle RG 103',
    description: 'Reconnaissance des cancers de la prostate lies a l\'exposition aux pesticides (agriculture).',
    type: 'new_disease_table',
    affectedNafCodes: ['01'],
    affectedSectors: ['viticulture', 'maraichage', 'cereales', 'horticulture-pepiniere', 'paysagiste'],
    affectedRiskTypes: ['chimique'],
    effectiveDate: new Date('2022-01-01'),
    source: 'Decret 2021-1724',
    sourceUrl: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000044557228',
    severity: 'info',
    createdAt: new Date('2022-01-15'),
  },
];

export function createRegulatoryWatchService() {
  const updates = [...REGULATORY_UPDATES];

  function getAll(): RegulatoryUpdate[] {
    return updates.sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime());
  }

  // BUSINESS RULE [CDC-2.4]: Filtrer par secteur de l'entreprise
  function getRelevantForSector(metierSlug: string): RegulatoryUpdate[] {
    return updates
      .filter((u) =>
        u.affectedSectors.includes('*') ||
        u.affectedSectors.includes(metierSlug),
      )
      .sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime());
  }

  // BUSINESS RULE [CDC-2.4]: Filtrer par code NAF (prefix 2 premiers chiffres)
  function getRelevantForNaf(nafCode: string): RegulatoryUpdate[] {
    const prefix = nafCode.slice(0, 2);
    return updates
      .filter((u) =>
        u.affectedSectors.includes('*') ||
        u.affectedNafCodes.length === 0 ||
        u.affectedNafCodes.some((code) => nafCode.startsWith(code) || code === prefix),
      )
      .sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime());
  }

  function getActionRequired(): RegulatoryUpdate[] {
    return updates
      .filter((u) => u.severity === 'action_required')
      .sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime());
  }

  // Manual addition (for MVP — future: automated feed)
  function addUpdate(update: Omit<RegulatoryUpdate, 'id' | 'createdAt'>): RegulatoryUpdate {
    const entry: RegulatoryUpdate = {
      ...update,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    updates.push(entry);
    return entry;
  }

  return {
    getAll,
    getRelevantForSector,
    getRelevantForNaf,
    getActionRequired,
    addUpdate,
  };
}

export type RegulatoryWatchService = ReturnType<typeof createRegulatoryWatchService>;
