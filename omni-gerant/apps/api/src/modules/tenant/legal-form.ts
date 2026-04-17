// BUSINESS RULE [CDC-11.1]: Detection forme juridique depuis code INSEE
// Mapping code categorie juridique INSEE → LegalForm enum

export type LegalForm =
  | 'auto_entrepreneur'
  | 'ei'
  | 'eirl'
  | 'eurl'
  | 'sarl'
  | 'sas'
  | 'sasu'
  | 'sa'
  | 'sci'
  | 'scop'
  | 'other';

export interface LegalFormInfo {
  code: LegalForm;
  label: string;
  hasCapital: boolean;        // societes with capital social
  hasRcs: boolean;            // registered at RCS
  hasRm: boolean;             // registered at Repertoire des Metiers (artisans)
  isMicroEligible: boolean;   // can be micro-entreprise regime
  defaultTvaRegime: 'franchise_base' | 'reel_simplifie' | 'reel_normal';
  mentionsLegales: string[];  // required legal mentions on invoices
}

// INSEE categorie juridique → LegalForm mapping
// Reference: https://www.insee.fr/fr/information/2028129
const INSEE_CODE_MAP: Record<string, LegalForm> = {
  // Entrepreneur Individuel
  '1000': 'ei',
  '1100': 'ei',       // Artisan-commercant
  '1200': 'ei',       // Commercant
  '1300': 'ei',       // Artisan
  '1400': 'ei',       // Officier public ou ministeriel
  '1500': 'ei',       // Profession liberale
  '1600': 'ei',       // Exploitant agricole
  '1700': 'ei',       // Agent commercial
  '1800': 'ei',       // Associe-gerant de societe
  '1900': 'ei',       // Personne physique (autre)

  // EURL
  '5498': 'eurl',
  '5499': 'eurl',     // SARL unipersonnelle (=EURL)

  // SARL
  '5410': 'sarl',
  '5415': 'sarl',
  '5422': 'sarl',
  '5426': 'sarl',
  '5430': 'sarl',
  '5431': 'sarl',
  '5432': 'sarl',
  '5442': 'sarl',
  '5443': 'sarl',
  '5451': 'sarl',
  '5453': 'sarl',
  '5454': 'sarl',
  '5455': 'sarl',
  '5458': 'sarl',
  '5459': 'sarl',
  '5460': 'sarl',
  '5470': 'sarl',
  '5485': 'sarl',
  '5610': 'sarl',

  // SAS
  '5710': 'sas',

  // SASU
  '5720': 'sasu',

  // SA
  '5505': 'sa',
  '5510': 'sa',
  '5515': 'sa',
  '5520': 'sa',
  '5522': 'sa',
  '5525': 'sa',
  '5530': 'sa',
  '5531': 'sa',
  '5532': 'sa',
  '5542': 'sa',
  '5543': 'sa',
  '5546': 'sa',
  '5547': 'sa',
  '5548': 'sa',
  '5551': 'sa',
  '5552': 'sa',
  '5553': 'sa',
  '5554': 'sa',
  '5555': 'sa',
  '5558': 'sa',
  '5559': 'sa',
  '5560': 'sa',
  '5570': 'sa',
  '5585': 'sa',
  '5599': 'sa',
  '5605': 'sa',
  '5615': 'sa',
  '5620': 'sa',
  '5625': 'sa',
  '5630': 'sa',
  '5631': 'sa',
  '5632': 'sa',
  '5642': 'sa',
  '5643': 'sa',
  '5646': 'sa',
  '5647': 'sa',
  '5648': 'sa',
  '5651': 'sa',
  '5652': 'sa',
  '5653': 'sa',
  '5654': 'sa',
  '5655': 'sa',
  '5658': 'sa',
  '5659': 'sa',
  '5660': 'sa',
  '5670': 'sa',
  '5685': 'sa',
  '5699': 'sa',

  // SCI
  '6521': 'sci',
  '6532': 'sci',
  '6533': 'sci',
  '6534': 'sci',
  '6535': 'sci',
  '6536': 'sci',
  '6537': 'sci',
  '6538': 'sci',
  '6539': 'sci',
  '6540': 'sci',
  '6541': 'sci',
  '6542': 'sci',
  '6543': 'sci',
  '6544': 'sci',
  '6551': 'sci',
  '6554': 'sci',
  '6558': 'sci',
  '6560': 'sci',

};

const LEGAL_FORM_INFO: Record<LegalForm, LegalFormInfo> = {
  auto_entrepreneur: {
    code: 'auto_entrepreneur',
    label: 'Auto-entrepreneur (Micro-entreprise)',
    hasCapital: false,
    hasRcs: false,
    hasRm: true,
    isMicroEligible: true,
    defaultTvaRegime: 'franchise_base',
    mentionsLegales: [
      'Dispensé d\'immatriculation au registre du commerce et des sociétés (RCS) et au répertoire des métiers (RM)',
    ],
  },
  ei: {
    code: 'ei',
    label: 'Entreprise Individuelle (EI)',
    hasCapital: false,
    hasRcs: true,
    hasRm: true,
    isMicroEligible: true,
    defaultTvaRegime: 'reel_simplifie',
    mentionsLegales: [],
  },
  eirl: {
    code: 'eirl',
    label: 'Entreprise Individuelle à Responsabilité Limitée (EIRL)',
    hasCapital: false,
    hasRcs: true,
    hasRm: true,
    isMicroEligible: true,
    defaultTvaRegime: 'reel_simplifie',
    mentionsLegales: [
      'Entrepreneur individuel à responsabilité limitée',
    ],
  },
  eurl: {
    code: 'eurl',
    label: 'Entreprise Unipersonnelle à Responsabilité Limitée (EURL)',
    hasCapital: true,
    hasRcs: true,
    hasRm: false,
    isMicroEligible: false,
    defaultTvaRegime: 'reel_normal',
    mentionsLegales: [
      'EURL au capital de {capital} €',
      'RCS {rcs_city}',
    ],
  },
  sarl: {
    code: 'sarl',
    label: 'Société à Responsabilité Limitée (SARL)',
    hasCapital: true,
    hasRcs: true,
    hasRm: false,
    isMicroEligible: false,
    defaultTvaRegime: 'reel_normal',
    mentionsLegales: [
      'SARL au capital de {capital} €',
      'RCS {rcs_city}',
    ],
  },
  sas: {
    code: 'sas',
    label: 'Société par Actions Simplifiée (SAS)',
    hasCapital: true,
    hasRcs: true,
    hasRm: false,
    isMicroEligible: false,
    defaultTvaRegime: 'reel_normal',
    mentionsLegales: [
      'SAS au capital de {capital} €',
      'RCS {rcs_city}',
    ],
  },
  sasu: {
    code: 'sasu',
    label: 'Société par Actions Simplifiée Unipersonnelle (SASU)',
    hasCapital: true,
    hasRcs: true,
    hasRm: false,
    isMicroEligible: false,
    defaultTvaRegime: 'reel_normal',
    mentionsLegales: [
      'SASU au capital de {capital} €',
      'RCS {rcs_city}',
    ],
  },
  sa: {
    code: 'sa',
    label: 'Société Anonyme (SA)',
    hasCapital: true,
    hasRcs: true,
    hasRm: false,
    isMicroEligible: false,
    defaultTvaRegime: 'reel_normal',
    mentionsLegales: [
      'SA au capital de {capital} €',
      'RCS {rcs_city}',
    ],
  },
  sci: {
    code: 'sci',
    label: 'Société Civile Immobilière (SCI)',
    hasCapital: true,
    hasRcs: true,
    hasRm: false,
    isMicroEligible: false,
    defaultTvaRegime: 'franchise_base',
    mentionsLegales: [
      'SCI au capital de {capital} €',
      'RCS {rcs_city}',
    ],
  },
  scop: {
    code: 'scop',
    label: 'Société Coopérative (SCOP)',
    hasCapital: true,
    hasRcs: true,
    hasRm: false,
    isMicroEligible: false,
    defaultTvaRegime: 'reel_normal',
    mentionsLegales: [
      'SCOP au capital variable',
      'RCS {rcs_city}',
    ],
  },
  other: {
    code: 'other',
    label: 'Autre forme juridique',
    hasCapital: false,
    hasRcs: false,
    hasRm: false,
    isMicroEligible: false,
    defaultTvaRegime: 'reel_simplifie',
    mentionsLegales: [],
  },
};

/**
 * Detect LegalForm from INSEE categorie_juridique code.
 * If the company is EI and has micro-fiscal regime (from Pappers), returns auto_entrepreneur.
 */
export function detectLegalForm(inseeCode: string, isMicroFiscal?: boolean): LegalForm {
  const normalized = inseeCode.replace(/\D/g, '').substring(0, 4);
  const form = INSEE_CODE_MAP[normalized];

  if (!form) {
    // Try prefix matching (2-digit family)
    const prefix2 = normalized.substring(0, 2);
    if (prefix2 === '10' || prefix2 === '11' || prefix2 === '12' || prefix2 === '13' ||
        prefix2 === '14' || prefix2 === '15' || prefix2 === '16' || prefix2 === '17' ||
        prefix2 === '18' || prefix2 === '19') {
      return isMicroFiscal ? 'auto_entrepreneur' : 'ei';
    }
    return 'other';
  }

  // EI with micro-fiscal = auto-entrepreneur
  if (form === 'ei' && isMicroFiscal) {
    return 'auto_entrepreneur';
  }

  return form;
}

/**
 * Detect LegalForm from the human-readable "forme juridique" string (from Pappers/data.gouv).
 * Fallback when INSEE code is not available.
 */
export function detectLegalFormFromLabel(label: string): LegalForm {
  const l = label.toLowerCase().trim();

  if (l.includes('sasu') || (l.includes('actions simplifi') && l.includes('unipersonnelle'))) return 'sasu';
  if (l.includes('sas') && !l.includes('sarl')) return 'sas';
  if (l.includes('eurl') || (l.includes('sarl') && l.includes('unipersonnelle'))) return 'eurl';
  if (l.includes('sarl')) return 'sarl';
  if (l.includes('sa ') || l === 'sa' || l.includes('societe anonyme')) return 'sa';
  if (l.includes('sci') || l.includes('civile immobiliere')) return 'sci';
  if (l.includes('scop') || l.includes('cooperative')) return 'scop';
  if (l.includes('eirl')) return 'eirl';
  if (l.includes('micro') || l.includes('auto-entrepreneur') || l.includes('auto entrepreneur')) return 'auto_entrepreneur';
  if (l.includes('individuel') || l.includes('personne physique') || l === 'ei') return 'ei';

  return 'other';
}

export function getLegalFormInfo(form: LegalForm): LegalFormInfo {
  return LEGAL_FORM_INFO[form];
}

export function getAllLegalForms(): LegalFormInfo[] {
  return Object.values(LEGAL_FORM_INFO);
}

/**
 * Generate legal mentions for invoices/quotes based on company profile.
 */
export function generateLegalMentions(
  form: LegalForm,
  options: {
    capitalCents?: number;
    rcsCity?: string;
    rmNumber?: string;
    rmCity?: string;
    siret?: string;
    tvaNumber?: string;
    isFranchiseBase?: boolean;
  },
): string[] {
  const info = LEGAL_FORM_INFO[form];
  const mentions: string[] = [];

  for (const template of info.mentionsLegales) {
    let mention = template;
    if (options.capitalCents !== undefined) {
      mention = mention.replace('{capital}', (options.capitalCents / 100).toFixed(2).replace('.00', ''));
    }
    if (options.rcsCity) {
      mention = mention.replace('{rcs_city}', options.rcsCity);
    }
    mentions.push(mention);
  }

  if (options.siret) {
    mentions.push(`SIRET ${options.siret}`);
  }

  if (options.rmNumber && options.rmCity) {
    mentions.push(`RM ${options.rmCity} ${options.rmNumber}`);
  }

  if (options.tvaNumber && !options.isFranchiseBase) {
    mentions.push(`TVA intracommunautaire : ${options.tvaNumber}`);
  }

  if (options.isFranchiseBase) {
    mentions.push('TVA non applicable, article 293 B du Code Général des Impôts');
  }

  return mentions;
}
