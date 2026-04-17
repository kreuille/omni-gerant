// BUSINESS RULE [CDC-2.1]: Generateur de mentions legales automatiques
// Adapte selon forme juridique x secteur x type client

import type { ClientType, TvaRegime } from './tva-engine.js';

// ── Types ───────────────────────────────────────────────────────────

export interface CompanyProfile {
  companyName: string;
  formeJuridique: string;
  siret: string;
  rcsCity?: string;
  rmNumber?: string;
  rmCity?: string;
  capitalCents?: number;
  tvaNumber?: string;
  regimeTva: string;
  secteurActivite?: string;
  nafCode?: string;
  // Assurances
  decennaleNumber?: string;
  decennaleInsurer?: string;
  decennaleCoverage?: string;
  rcProNumber?: string;
  rcProInsurer?: string;
  // Qualifications
  qualifications?: Array<{ type: string; number: string; label: string }>;
  // Specific
  adeliNumber?: string;
  rppsNumber?: string;
  qualiopiNumber?: string;
  declarationActivite?: string;
  carteProNumber?: string;
  licenceTransport?: string;
  cnapsNumber?: string;
}

export interface MentionsLegalesInput {
  company: CompanyProfile;
  clientType: ClientType;
  tvaRegime: TvaRegime;
  tvaRate?: number;
  isSousTraitanceBtp?: boolean;
}

export interface MentionsLegales {
  headerMentions: string[];
  footerMentions: string[];
  tvaMention: string;
  paymentMentions: string[];
  sectorMentions: string[];
  clientMentions: string[];
}

// ── Generator ───────────────────────────────────────────────────────

// BUSINESS RULE [CDC-2.1]: Generation automatique des mentions legales
export function generateMentionsLegales(input: MentionsLegalesInput): MentionsLegales {
  const { company, clientType, tvaRegime } = input;

  const headerMentions = buildHeaderMentions(company);
  const footerMentions = buildFooterMentions(company);
  const tvaMention = buildTvaMention(company, tvaRegime, input.tvaRate);
  const paymentMentions = buildPaymentMentions(clientType);
  const sectorMentions = buildSectorMentions(company);
  const clientMentions = buildClientMentions(clientType);

  return { headerMentions, footerMentions, tvaMention, paymentMentions, sectorMentions, clientMentions };
}

// ── Header mentions (identification entreprise) ─────────────────────

function buildHeaderMentions(company: CompanyProfile): string[] {
  const mentions: string[] = [];

  mentions.push(company.companyName);

  // Forme juridique specific
  switch (company.formeJuridique) {
    case 'auto_entrepreneur':
      mentions.push('Micro-entreprise');
      if (company.siret) mentions.push(`SIRET : ${company.siret}`);
      break;
    case 'ei':
    case 'eirl':
      mentions.push(company.formeJuridique === 'eirl' ? 'EIRL' : 'Entreprise Individuelle');
      if (company.siret) mentions.push(`SIRET : ${company.siret}`);
      if (company.rmNumber && company.rmCity) {
        mentions.push(`RM ${company.rmCity} n° ${company.rmNumber}`);
      }
      break;
    case 'eurl':
    case 'sarl':
      mentions.push(`${company.formeJuridique.toUpperCase()} au capital de ${formatCurrency(company.capitalCents ?? 0)}`);
      if (company.siret) mentions.push(`SIRET : ${company.siret}`);
      if (company.rcsCity) mentions.push(`RCS ${company.rcsCity}`);
      break;
    case 'sas':
    case 'sasu':
      mentions.push(`${company.formeJuridique.toUpperCase()} au capital de ${formatCurrency(company.capitalCents ?? 0)}`);
      if (company.siret) mentions.push(`SIRET : ${company.siret}`);
      if (company.rcsCity) mentions.push(`RCS ${company.rcsCity}`);
      break;
    case 'sci':
      mentions.push(`SCI au capital de ${formatCurrency(company.capitalCents ?? 0)}`);
      if (company.siret) mentions.push(`SIRET : ${company.siret}`);
      if (company.rcsCity) mentions.push(`RCS ${company.rcsCity}`);
      break;
    default:
      if (company.siret) mentions.push(`SIRET : ${company.siret}`);
      break;
  }

  // TVA number
  if (company.tvaNumber && company.regimeTva !== 'franchise_base') {
    mentions.push(`N° TVA : ${company.tvaNumber}`);
  }

  return mentions;
}

// ── Footer mentions ─────────────────────────────────────────────────

function buildFooterMentions(company: CompanyProfile): string[] {
  const mentions: string[] = [];

  // Franchise mention
  if (company.regimeTva === 'franchise_base') {
    mentions.push('TVA non applicable, art. 293 B du CGI');
  }

  return mentions;
}

// ── TVA mention ─────────────────────────────────────────────────────

function buildTvaMention(company: CompanyProfile, regime: TvaRegime, rate?: number): string {
  switch (regime) {
    case 'franchise_base':
      return 'TVA non applicable, art. 293 B du CGI';
    case 'intracom_ue':
      return 'Autoliquidation de la TVA — Art. 283-2 du CGI';
    case 'export_hors_ue':
      return 'Exoneration de TVA — Art. 262-I du CGI — Exportation';
    case 'sous_traitance_btp':
      return 'Autoliquidation de la TVA — Art. 283-2 nonies du CGI — Sous-traitance BTP';
    case 'exonere':
      return 'TVA non applicable';
    default:
      return rate ? `TVA ${rate / 100}%` : '';
  }
}

// ── Payment mentions (selon type client) ────────────────────────────

function buildPaymentMentions(clientType: ClientType): string[] {
  const mentions: string[] = [];

  if (clientType === 'france_particulier') {
    // BUSINESS RULE [CDC-2.1]: Mentions obligatoires pour clients particuliers
    mentions.push('Delai de retractation : 14 jours a compter de l\'acceptation du devis (Art. L221-18 du Code de la consommation)');
    mentions.push('En cas de litige, le client peut recourir gratuitement au service de mediation');
  } else if (clientType === 'france_pro' || clientType === 'ue_pro') {
    // BUSINESS RULE [CDC-2.1]: Mentions obligatoires pour clients professionnels
    mentions.push('En cas de retard de paiement, des penalites de retard seront exigibles (taux BCE + 10 points)');
    mentions.push('Indemnite forfaitaire pour frais de recouvrement : 40 EUR (Art. D441-5 du Code de commerce)');
  }

  return mentions;
}

// ── Sector-specific mentions ────────────────────────────────────────

function buildSectorMentions(company: CompanyProfile): string[] {
  const mentions: string[] = [];
  const naf2 = (company.nafCode ?? '').slice(0, 2);

  // BTP
  if (['41', '42', '43'].includes(naf2)) {
    if (company.decennaleNumber && company.decennaleInsurer) {
      mentions.push(`Assurance decennale : ${company.decennaleInsurer} — Police n° ${company.decennaleNumber}`);
      if (company.decennaleCoverage) {
        mentions.push(`Couverture geographique : ${company.decennaleCoverage}`);
      }
    }
    if (company.rcProNumber && company.rcProInsurer) {
      mentions.push(`RC Professionnelle : ${company.rcProInsurer} — Police n° ${company.rcProNumber}`);
    }
    if (company.rmNumber && company.rmCity) {
      mentions.push(`Immatriculation RM : ${company.rmCity} n° ${company.rmNumber}`);
    }
    // Qualifications
    const btpQuals = (company.qualifications ?? []).filter((q) =>
      ['qualibat', 'rge', 'qualifelec'].includes(q.type),
    );
    for (const q of btpQuals) {
      mentions.push(`${q.label} : n° ${q.number}`);
    }
  }

  // Sante
  if (['86', '87', '88'].includes(naf2)) {
    if (company.adeliNumber) mentions.push(`ADELI : ${company.adeliNumber}`);
    if (company.rppsNumber) mentions.push(`RPPS : ${company.rppsNumber}`);
  }

  // Formation
  if (naf2 === '85') {
    if (company.qualiopiNumber) mentions.push(`Qualiopi : ${company.qualiopiNumber}`);
    if (company.declarationActivite) mentions.push(`Declaration d'activite : ${company.declarationActivite}`);
  }

  // Immobilier
  if (naf2 === '68') {
    if (company.carteProNumber) mentions.push(`Carte professionnelle : ${company.carteProNumber}`);
  }

  // Securite
  if (company.cnapsNumber) {
    mentions.push(`Autorisation CNAPS : ${company.cnapsNumber}`);
  }

  return mentions;
}

// ── Client-type mentions ────────────────────────────────────────────

function buildClientMentions(clientType: ClientType): string[] {
  const mentions: string[] = [];

  if (clientType === 'france_particulier') {
    mentions.push('Devis valable 30 jours');
    mentions.push('Ce devis doit etre retourne signe avec la mention "Bon pour accord"');
  } else {
    mentions.push('Conditions generales de vente applicables');
  }

  return mentions;
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(euros);
}

// ── CERFA BTP attestation ───────────────────────────────────────────

// BUSINESS RULE [CDC-2.1]: Attestation simplifiee BTP (CERFA 1301-SD)
// Obligatoire pour taux reduit 10% ou 5.5% sur travaux d'amelioration chez un particulier
export interface BtpAttestation {
  required: boolean;
  cerfa: string;
  conditions: string[];
}

export function checkBtpAttestation(
  nafCode: string,
  clientType: ClientType,
  tvaRate: number,
): BtpAttestation {
  const isBtp = ['41', '42', '43'].includes((nafCode ?? '').slice(0, 2));
  const isParticulier = clientType === 'france_particulier';
  const isReducedRate = tvaRate === 1000 || tvaRate === 550;

  if (isBtp && isParticulier && isReducedRate) {
    return {
      required: true,
      cerfa: 'CERFA 1301-SD',
      conditions: [
        'Logement acheve depuis plus de 2 ans',
        'Locaux a usage d\'habitation',
        'Travaux d\'amelioration, de transformation, d\'amenagement ou d\'entretien',
        'Le client doit fournir l\'attestation signee avant le debut des travaux',
      ],
    };
  }

  return { required: false, cerfa: '', conditions: [] };
}
