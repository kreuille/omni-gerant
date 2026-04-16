// BUSINESS RULE [CDC-2.1]: Moteur TVA intelligent
// Detecte automatiquement le regime, le taux et les mentions depuis le profil entreprise + client + prestation

// ── Types ───────────────────────────────────────────────────────────

export type TvaRegime =
  | 'franchise_base'      // Auto-entrepreneur / micro sous seuil
  | 'standard'            // Reel simplifie / normal
  | 'intracom_ue'         // Client pro UE → autoliquidation
  | 'export_hors_ue'      // Client hors UE → exoneration
  | 'sous_traitance_btp'  // Sous-traitance BTP → autoliquidation
  | 'exonere'             // Sante, formation agree, location nue SCI
  | 'dom_tom';            // Taux DOM-TOM specifiques

export type TvaRate = 2000 | 1000 | 550 | 210 | 0;
// 2000 = 20%, 1000 = 10%, 550 = 5.5%, 210 = 2.1%, 0 = exonere

export type ClientType = 'france_particulier' | 'france_pro' | 'ue_pro' | 'ue_particulier' | 'hors_ue';

export type ActivitySector =
  | 'btp_renovation'
  | 'btp_neuf'
  | 'btp_energie'
  | 'restauration_sur_place'
  | 'restauration_emporter'
  | 'hotellerie'
  | 'transport_voyageurs'
  | 'aide_domicile'
  | 'spectacle_vivant'
  | 'presse'
  | 'medicament_rembourse'
  | 'sante_actes_medicaux'
  | 'formation_agree'
  | 'sci_location_nue'
  | 'alimentaire'
  | 'livres'
  | 'it_conseil'
  | 'commerce_general'
  | 'beaute'
  | 'immobilier'
  | 'association_exoneree'
  | 'autre';

export interface TvaDetectionInput {
  regimeTva: string;           // 'franchise_base' | 'reel_simplifie' | 'reel_normal' | 'mini_reel'
  formeJuridique: string;     // 'auto_entrepreneur' | 'ei' | 'sarl' | 'sas' | etc.
  secteurActivite?: string;   // code NAF or detected sector
  clientType: ClientType;
  activitySector?: ActivitySector;
  isSousTraitanceBtp?: boolean;
  clientTvaNumber?: string;    // if UE pro
  isDomTom?: boolean;
}

export interface TvaDetectionResult {
  regime: TvaRegime;
  rate: TvaRate;
  rateLabel: string;
  mention: string;
  autoliquidation: boolean;
  attestationBtpRequired: boolean;
}

// ── Franchise thresholds (2026) ─────────────────────────────────────

// BUSINESS RULE [CDC-2.1]: Seuils franchise en base TVA (mise a jour 2026)
export const FRANCHISE_THRESHOLDS = {
  services: { base: 3680000, majoree: 3910000 },   // 36 800 EUR / 39 100 EUR
  vente: { base: 9190000, majoree: 10100000 },      // 91 900 EUR / 101 000 EUR
} as const;

// ── Core detection logic ────────────────────────────────────────────

// BUSINESS RULE [CDC-2.1]: Detection automatique du taux TVA
export function detectTvaRate(sector?: ActivitySector): TvaRate {
  if (!sector) return 2000; // 20% default

  switch (sector) {
    // 5.5%
    case 'btp_energie':
    case 'restauration_emporter':
    case 'alimentaire':
    case 'spectacle_vivant':
    case 'livres':
      return 550;

    // 10%
    case 'btp_renovation':
    case 'restauration_sur_place':
    case 'hotellerie':
    case 'transport_voyageurs':
    case 'aide_domicile':
      return 1000;

    // 2.1%
    case 'presse':
    case 'medicament_rembourse':
      return 210;

    // 0% exonere
    case 'sante_actes_medicaux':
    case 'formation_agree':
    case 'sci_location_nue':
    case 'association_exoneree':
      return 0;

    // 20% standard
    case 'btp_neuf':
    case 'it_conseil':
    case 'commerce_general':
    case 'beaute':
    case 'immobilier':
    case 'autre':
    default:
      return 2000;
  }
}

// BUSINESS RULE [CDC-2.1]: Detection complete du regime TVA
export function detectTva(input: TvaDetectionInput): TvaDetectionResult {
  const result: TvaDetectionResult = {
    regime: 'standard',
    rate: 2000,
    rateLabel: '20%',
    mention: '',
    autoliquidation: false,
    attestationBtpRequired: false,
  };

  // 1. Franchise en base
  if (input.regimeTva === 'franchise_base' || input.formeJuridique === 'auto_entrepreneur') {
    result.regime = 'franchise_base';
    result.rate = 0;
    result.rateLabel = '0% (franchise)';
    result.mention = 'TVA non applicable, art. 293 B du CGI';
    return result;
  }

  // 2. Export hors UE
  if (input.clientType === 'hors_ue') {
    result.regime = 'export_hors_ue';
    result.rate = 0;
    result.rateLabel = '0% (export)';
    result.mention = 'Exoneration de TVA — Art. 262-I du CGI — Exportation';
    return result;
  }

  // 3. Client pro UE → autoliquidation
  if (input.clientType === 'ue_pro' && input.clientTvaNumber) {
    result.regime = 'intracom_ue';
    result.rate = 0;
    result.rateLabel = '0% (intracom)';
    result.autoliquidation = true;
    result.mention = `Autoliquidation de la TVA — Art. 283-2 du CGI — N° TVA client : ${input.clientTvaNumber}`;
    return result;
  }

  // 4. Sous-traitance BTP → autoliquidation
  if (input.isSousTraitanceBtp) {
    result.regime = 'sous_traitance_btp';
    result.rate = 0;
    result.rateLabel = '0% (autoliq. BTP)';
    result.autoliquidation = true;
    result.mention = 'Autoliquidation de la TVA — Art. 283-2 nonies du CGI — Sous-traitance BTP';
    return result;
  }

  // 5. Exoneration par nature
  if (input.activitySector === 'sante_actes_medicaux' ||
      input.activitySector === 'formation_agree' ||
      input.activitySector === 'sci_location_nue' ||
      input.activitySector === 'association_exoneree') {
    result.regime = 'exonere';
    result.rate = 0;
    result.rateLabel = '0% (exonere)';
    result.mention = getExonerationMention(input.activitySector);
    return result;
  }

  // 6. DOM-TOM
  if (input.isDomTom) {
    result.regime = 'dom_tom';
    result.rate = 850 as TvaRate; // 8.5% DOM taux normal
    result.rateLabel = '8.5% (DOM)';
    result.mention = 'Taux reduit DOM — Art. 296 du CGI';
    return result;
  }

  // 7. Standard — detect rate from sector
  const rate = detectTvaRate(input.activitySector);
  result.rate = rate;
  result.rateLabel = formatRate(rate);
  result.mention = '';

  // BTP renovation attestation
  if ((input.activitySector === 'btp_renovation' || input.activitySector === 'btp_energie') &&
      input.clientType === 'france_particulier') {
    result.attestationBtpRequired = true;
    result.mention = 'Taux reduit applicable sur attestation simplifiee (CERFA 1301-SD) du client';
  }

  return result;
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatRate(rate: TvaRate): string {
  switch (rate) {
    case 2000: return '20%';
    case 1000: return '10%';
    case 550: return '5,5%';
    case 210: return '2,1%';
    case 0: return '0%';
    default: return `${(rate as number) / 100}%`;
  }
}

function getExonerationMention(sector: ActivitySector): string {
  switch (sector) {
    case 'sante_actes_medicaux':
      return 'TVA non applicable — Art. 261-4-1° du CGI — Actes medicaux';
    case 'formation_agree':
      return 'TVA non applicable — Art. 261-4-4°-a du CGI — Organisme de formation agree';
    case 'sci_location_nue':
      return 'TVA non applicable — Art. 261 D-2° du CGI — Location de locaux nus';
    case 'association_exoneree':
      return 'TVA non applicable — Art. 261-7-1°-b du CGI — Association a but non lucratif';
    default:
      return 'TVA non applicable';
  }
}

// BUSINESS RULE [CDC-2.1]: Detection du type de client
export function detectClientType(options: {
  country?: string;
  isEu?: boolean;
  isProfessional?: boolean;
  tvaNumber?: string;
}): ClientType {
  if (!options.country || options.country === 'FR') return options.isProfessional ? 'france_pro' : 'france_particulier';
  if (options.isEu) return options.isProfessional && options.tvaNumber ? 'ue_pro' : 'ue_particulier';
  return 'hors_ue';
}

// BUSINESS RULE [CDC-2.1]: Detection du secteur d'activite depuis code NAF
export function detectActivitySector(nafCode: string): ActivitySector {
  const prefix2 = nafCode.slice(0, 2);
  const prefix4 = nafCode.slice(0, 4);

  // BTP
  if (['41', '42', '43'].includes(prefix2)) {
    return 'btp_renovation'; // default, overridden by user
  }

  // Restauration
  if (prefix4 === '56.1') return 'restauration_sur_place';
  if (prefix4 === '56.2') return 'restauration_emporter';

  // Hotellerie
  if (prefix2 === '55') return 'hotellerie';

  // Transport
  if (['49', '50', '51'].includes(prefix2)) return 'transport_voyageurs';

  // Aide a domicile (must be before sante since 88.1x is aide domicile, not sante)
  if (prefix4 === '88.1') return 'aide_domicile';

  // Sante
  if (['86', '87', '88'].includes(prefix2)) return 'sante_actes_medicaux';

  // Formation
  if (prefix2 === '85') return 'formation_agree';

  // IT/Conseil
  if (['62', '63', '69', '70', '71'].includes(prefix2)) return 'it_conseil';

  // Commerce
  if (['45', '46', '47'].includes(prefix2)) return 'commerce_general';

  // Beaute
  if (prefix4 === '96.0') return 'beaute';

  // Immobilier
  if (prefix2 === '68') return 'immobilier';

  // Alimentaire
  if (['10', '11'].includes(prefix2)) return 'alimentaire';

  return 'autre';
}

// BUSINESS RULE [CDC-2.1]: Alerte seuil franchise pour auto-entrepreneurs
export interface FranchiseAlert {
  level: 'ok' | 'warning' | 'danger' | 'exceeded';
  currentCents: number;
  thresholdCents: number;
  majoredThresholdCents: number;
  percentUsed: number;
  message: string;
}

export function checkFranchiseThreshold(
  caTotalCents: number,
  activityType: 'services' | 'vente',
): FranchiseAlert {
  const thresholds = FRANCHISE_THRESHOLDS[activityType];
  const percent = Math.round((caTotalCents / thresholds.base) * 100);

  if (caTotalCents >= thresholds.majoree) {
    return { level: 'exceeded', currentCents: caTotalCents, thresholdCents: thresholds.base, majoredThresholdCents: thresholds.majoree, percentUsed: percent, message: 'Seuil majore depasse — Vous devez facturer la TVA des le 1er jour du depassement' };
  }
  if (caTotalCents >= thresholds.base) {
    return { level: 'danger', currentCents: caTotalCents, thresholdCents: thresholds.base, majoredThresholdCents: thresholds.majoree, percentUsed: percent, message: 'Seuil de base depasse — TVA due si depassement seuil majore' };
  }
  if (percent >= 80) {
    return { level: 'warning', currentCents: caTotalCents, thresholdCents: thresholds.base, majoredThresholdCents: thresholds.majoree, percentUsed: percent, message: `Attention : ${percent}% du seuil franchise atteint` };
  }
  return { level: 'ok', currentCents: caTotalCents, thresholdCents: thresholds.base, majoredThresholdCents: thresholds.majoree, percentUsed: percent, message: `${percent}% du seuil franchise` };
}
