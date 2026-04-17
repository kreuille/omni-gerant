import type { Result } from '@zenadmin/shared';
import { ok, err, notFound, appError } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';
import type { UpdateTenantProfileInput } from './tenant.schemas.js';
import { detectLegalForm, detectLegalFormFromLabel, generateLegalMentions } from './legal-form.js';
import type { LegalForm } from './legal-form.js';
import { detectDefaultTvaRegime, detectActivityType, checkFranchiseThreshold } from './tva-regime.js';
import type { TvaRegime, FranchiseCheckResult } from './tva-regime.js';
import { computeFrenchTvaNumber } from '../../lib/vies-client.js';
import type { EnrichedSiretInfo } from '../../lib/siret-lookup.js';
import { createTenantRepository } from './tenant.repository.js';

// BUSINESS RULE [CDC-11.1]: Mapping departement → ville du Tribunal de Commerce (RCS)
const DEPT_TO_RCS: Record<string, string> = {
  '01': 'Bourg-en-Bresse', '02': 'Laon', '03': 'Cusset', '04': 'Manosque', '05': 'Gap',
  '06': 'Nice', '07': 'Aubenas', '08': 'Sedan', '09': 'Foix', '10': 'Troyes',
  '11': 'Narbonne', '12': 'Rodez', '13': 'Marseille', '14': 'Caen', '15': 'Aurillac',
  '16': 'Angouleme', '17': 'La Rochelle', '18': 'Bourges', '19': 'Brive-la-Gaillarde',
  '21': 'Dijon', '22': 'Saint-Brieuc', '23': 'Gueret', '24': 'Bergerac', '25': 'Besancon',
  '26': 'Romans-sur-Isere', '27': 'Bernay', '28': 'Chartres', '29': 'Brest',
  '30': 'Nimes', '31': 'Toulouse', '32': 'Auch', '33': 'Bordeaux', '34': 'Montpellier',
  '35': 'Rennes', '36': 'Chateauroux', '37': 'Tours', '38': 'Grenoble', '39': 'Lons-le-Saunier',
  '40': 'Dax', '41': 'Blois', '42': 'Saint-Etienne', '43': 'Le Puy-en-Velay', '44': 'Nantes',
  '45': 'Orleans', '46': 'Cahors', '47': 'Agen', '48': 'Mende', '49': 'Angers',
  '50': 'Coutances', '51': 'Chalons-en-Champagne', '52': 'Chaumont', '53': 'Laval', '54': 'Nancy',
  '55': 'Bar-le-Duc', '56': 'Vannes', '57': 'Metz', '58': 'Nevers', '59': 'Lille',
  '60': 'Compiegne', '61': 'Alencon', '62': 'Boulogne-sur-Mer', '63': 'Clermont-Ferrand',
  '64': 'Bayonne', '65': 'Tarbes', '66': 'Perpignan', '67': 'Strasbourg', '68': 'Mulhouse',
  '69': 'Lyon', '70': 'Vesoul', '71': 'Macon', '72': 'Le Mans', '73': 'Chambery',
  '74': 'Annecy', '75': 'Paris', '76': 'Rouen', '77': 'Meaux', '78': 'Versailles',
  '79': 'Niort', '80': 'Amiens', '81': 'Castres', '82': 'Montauban', '83': 'Toulon',
  '84': 'Avignon', '85': 'La Roche-sur-Yon', '86': 'Poitiers', '87': 'Limoges', '88': 'Epinal',
  '89': 'Auxerre', '90': 'Belfort', '91': 'Evry', '92': 'Nanterre', '93': 'Bobigny',
  '94': 'Creteil', '95': 'Pontoise',
  '971': 'Pointe-a-Pitre', '972': 'Fort-de-France', '973': 'Cayenne', '974': 'Saint-Denis', '976': 'Mamoudzou',
};

function detectRcsCity(zipCode: string): string | null {
  if (!zipCode || zipCode.length < 2) return null;
  // DOM-TOM: 3-digit prefix
  if (zipCode.startsWith('97')) {
    return DEPT_TO_RCS[zipCode.slice(0, 3)] ?? null;
  }
  // Metropolitan: 2-digit prefix
  return DEPT_TO_RCS[zipCode.slice(0, 2)] ?? null;
}

// BUSINESS RULE [CDC-11.1]: Profil entreprise complet avec auto-fill SIRET

export interface TenantProfile {
  id: string;
  // Auto-fill SIRET
  siret: string | null;
  siren: string | null;
  company_name: string;
  trade_name: string | null;
  legal_form: LegalForm;
  naf_code: string | null;
  naf_label: string | null;
  address: {
    line1: string;
    line2?: string;
    zip_code: string;
    city: string;
    country: string;
  } | null;
  tva_number: string | null;
  creation_date: string | null;
  capital_cents: number | null;
  rcs_city: string | null;
  rm_number: string | null;
  rm_city: string | null;
  convention_collective: string | null;
  code_idcc: string | null;
  dirigeants: Array<{ nom: string; prenom: string; fonction: string }>;
  effectif: number | null;

  // Manual fields
  email: string | null;
  phone: string | null;
  website: string | null;
  iban: string | null;
  bic: string | null;

  // TVA
  tva_regime: TvaRegime;
  current_year_revenue_cents: number;

  // Assurances
  insurance_decennale_number: string | null;
  insurance_decennale_insurer: string | null;
  insurance_decennale_coverage: string | null;
  insurance_rc_pro_number: string | null;
  insurance_rc_pro_insurer: string | null;

  // Qualifications
  qualifications: Array<{
    type: string;
    number: string;
    label: string;
    valid_until?: string;
  }>;

  // Metadata
  plan: string;
  settings: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

function createDefaultProfile(tenantId: string): TenantProfile {
  return {
    id: tenantId,
    siret: null,
    siren: null,
    company_name: 'Mon Entreprise',
    trade_name: null,
    legal_form: 'ei',
    naf_code: null,
    naf_label: null,
    address: null,
    tva_number: null,
    creation_date: null,
    capital_cents: null,
    rcs_city: null,
    rm_number: null,
    rm_city: null,
    convention_collective: null,
    code_idcc: null,
    dirigeants: [],
    effectif: null,
    email: null,
    phone: null,
    website: null,
    iban: null,
    bic: null,
    tva_regime: 'reel_simplifie',
    current_year_revenue_cents: 0,
    insurance_decennale_number: null,
    insurance_decennale_insurer: null,
    insurance_decennale_coverage: null,
    insurance_rc_pro_number: null,
    insurance_rc_pro_insurer: null,
    qualifications: [],
    plan: 'free',
    settings: {},
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  };
}

export function createTenantService() {
  const tenantRepo = createTenantRepository();

  return {
    async getProfile(tenantId: string): Promise<Result<TenantProfile, AppError>> {
      const profile = await tenantRepo.findById(tenantId);
      if (!profile) {
        // Tenant exists in DB (created during register) but has default settings
        return ok(createDefaultProfile(tenantId));
      }
      return ok(profile);
    },

    async updateProfile(
      tenantId: string,
      input: UpdateTenantProfileInput,
    ): Promise<Result<TenantProfile, AppError>> {
      let profile = await tenantRepo.findById(tenantId);
      if (!profile) {
        profile = createDefaultProfile(tenantId);
      }

      // Apply all provided fields
      if (input.siret !== undefined) profile.siret = input.siret;
      if (input.siren !== undefined) profile.siren = input.siren;
      if (input.company_name !== undefined) profile.company_name = input.company_name;
      if (input.trade_name !== undefined) profile.trade_name = input.trade_name;
      if (input.legal_form !== undefined) profile.legal_form = input.legal_form;
      if (input.naf_code !== undefined) profile.naf_code = input.naf_code;
      if (input.naf_label !== undefined) profile.naf_label = input.naf_label;
      if (input.address !== undefined) profile.address = input.address;
      if (input.tva_number !== undefined) profile.tva_number = input.tva_number;
      if (input.creation_date !== undefined) profile.creation_date = input.creation_date;
      if (input.capital_cents !== undefined) profile.capital_cents = input.capital_cents;
      if (input.rcs_city !== undefined) profile.rcs_city = input.rcs_city;
      if (input.rm_number !== undefined) profile.rm_number = input.rm_number;
      if (input.rm_city !== undefined) profile.rm_city = input.rm_city;
      if (input.convention_collective !== undefined) profile.convention_collective = input.convention_collective;
      if (input.code_idcc !== undefined) profile.code_idcc = input.code_idcc;
      if (input.dirigeants !== undefined) profile.dirigeants = input.dirigeants;
      if (input.effectif !== undefined) profile.effectif = input.effectif;
      if (input.email !== undefined) profile.email = input.email;
      if (input.phone !== undefined) profile.phone = input.phone;
      if (input.website !== undefined) profile.website = input.website;
      if (input.iban !== undefined) profile.iban = input.iban;
      if (input.bic !== undefined) profile.bic = input.bic;
      if (input.tva_regime !== undefined) profile.tva_regime = input.tva_regime;
      if (input.current_year_revenue_cents !== undefined) profile.current_year_revenue_cents = input.current_year_revenue_cents;
      if (input.insurance_decennale_number !== undefined) profile.insurance_decennale_number = input.insurance_decennale_number;
      if (input.insurance_decennale_insurer !== undefined) profile.insurance_decennale_insurer = input.insurance_decennale_insurer;
      if (input.insurance_decennale_coverage !== undefined) profile.insurance_decennale_coverage = input.insurance_decennale_coverage;
      if (input.insurance_rc_pro_number !== undefined) profile.insurance_rc_pro_number = input.insurance_rc_pro_number;
      if (input.insurance_rc_pro_insurer !== undefined) profile.insurance_rc_pro_insurer = input.insurance_rc_pro_insurer;
      if (input.qualifications !== undefined) profile.qualifications = input.qualifications;

      const updated = await tenantRepo.upsertProfile(tenantId, profile);
      return ok(updated);
    },

    async autoFillFromSiret(
      tenantId: string,
      siretInfo: EnrichedSiretInfo,
    ): Promise<Result<TenantProfile, AppError>> {
      let profile = await tenantRepo.findById(tenantId);
      if (!profile) {
        profile = createDefaultProfile(tenantId);
      }

      // Auto-fill from SIRET data
      profile.siret = siretInfo.siret;
      profile.siren = siretInfo.siren;
      profile.company_name = siretInfo.company_name;
      profile.naf_code = siretInfo.naf_code;
      profile.naf_label = siretInfo.naf_label;
      profile.address = {
        line1: siretInfo.address.line1,
        zip_code: siretInfo.address.zip_code,
        city: siretInfo.address.city,
        country: siretInfo.address.country,
      };
      profile.tva_number = siretInfo.tva_number ?? computeFrenchTvaNumber(siretInfo.siren);
      profile.creation_date = siretInfo.creation_date;
      profile.effectif = siretInfo.effectif_reel;
      profile.convention_collective = siretInfo.convention_collective;
      profile.code_idcc = siretInfo.code_idcc;

      if (siretInfo.dirigeants.length > 0) {
        profile.dirigeants = siretInfo.dirigeants;
      }

      // Capital social from Pappers suggestions (free enrichment)
      if (siretInfo.capital_cents && siretInfo.capital_cents > 0) {
        profile.capital_cents = siretInfo.capital_cents;
      }

      // Auto-detect RCS city from zip code
      if (!profile.rcs_city && siretInfo.address.zip_code) {
        profile.rcs_city = detectRcsCity(siretInfo.address.zip_code);
      }

      // Detect legal form from INSEE code or label (or Pappers label)
      const legalFormCode = siretInfo.legal_form;
      if (legalFormCode && /^\d+$/.test(legalFormCode)) {
        profile.legal_form = detectLegalForm(legalFormCode);
      } else if (legalFormCode) {
        profile.legal_form = detectLegalFormFromLabel(legalFormCode);
      }

      // Detect TVA regime from legal form
      profile.tva_regime = detectDefaultTvaRegime(profile.legal_form);

      const updated = await tenantRepo.upsertProfile(tenantId, profile);
      return ok(updated);
    },

    getFranchiseCheck(profile: TenantProfile): FranchiseCheckResult | null {
      if (profile.tva_regime !== 'franchise_base') return null;
      const activityType = profile.naf_code
        ? detectActivityType(profile.naf_code)
        : 'services';
      return checkFranchiseThreshold(profile.current_year_revenue_cents, activityType);
    },

    getLegalMentions(profile: TenantProfile): string[] {
      return generateLegalMentions(profile.legal_form, {
        capitalCents: profile.capital_cents ?? undefined,
        rcsCity: profile.rcs_city ?? undefined,
        rmNumber: profile.rm_number ?? undefined,
        rmCity: profile.rm_city ?? undefined,
        siret: profile.siret ?? undefined,
        tvaNumber: profile.tva_number ?? undefined,
        isFranchiseBase: profile.tva_regime === 'franchise_base',
      });
    },
  };
}
