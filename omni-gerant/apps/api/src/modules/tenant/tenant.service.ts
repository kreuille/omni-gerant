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

// In-memory store for tenant profiles (shared across routes)
const tenantProfiles = new Map<string, TenantProfile>();

export function getTenantStore() {
  return tenantProfiles;
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
  return {
    async getProfile(tenantId: string): Promise<Result<TenantProfile, AppError>> {
      let profile = tenantProfiles.get(tenantId);
      if (!profile) {
        profile = createDefaultProfile(tenantId);
        tenantProfiles.set(tenantId, profile);
      }
      return ok(profile);
    },

    async updateProfile(
      tenantId: string,
      input: UpdateTenantProfileInput,
    ): Promise<Result<TenantProfile, AppError>> {
      let profile = tenantProfiles.get(tenantId);
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

      profile.updated_at = new Date();
      tenantProfiles.set(tenantId, profile);
      return ok(profile);
    },

    /**
     * Auto-fill tenant profile from enriched SIRET lookup result.
     * Returns the updated profile with auto-detected legal form and TVA regime.
     */
    async autoFillFromSiret(
      tenantId: string,
      siretInfo: EnrichedSiretInfo,
    ): Promise<Result<TenantProfile, AppError>> {
      let profile = tenantProfiles.get(tenantId);
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

      if (siretInfo.etablissements.length > 0) {
        // Enrichment data available
      }

      // Detect legal form from INSEE code or label
      const legalFormCode = siretInfo.legal_form;
      if (legalFormCode && /^\d+$/.test(legalFormCode)) {
        profile.legal_form = detectLegalForm(legalFormCode);
      } else if (legalFormCode) {
        profile.legal_form = detectLegalFormFromLabel(legalFormCode);
      }

      // Detect TVA regime from legal form
      profile.tva_regime = detectDefaultTvaRegime(profile.legal_form);

      profile.updated_at = new Date();
      tenantProfiles.set(tenantId, profile);
      return ok(profile);
    },

    /**
     * Get franchise threshold check for auto-entrepreneurs.
     */
    getFranchiseCheck(profile: TenantProfile): FranchiseCheckResult | null {
      if (profile.tva_regime !== 'franchise_base') return null;
      const activityType = profile.naf_code
        ? detectActivityType(profile.naf_code)
        : 'services';
      return checkFranchiseThreshold(profile.current_year_revenue_cents, activityType);
    },

    /**
     * Get legal mentions for this tenant's invoices/quotes.
     */
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
