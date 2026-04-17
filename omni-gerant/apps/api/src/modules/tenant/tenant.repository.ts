import { prisma } from '@zenadmin/db';
import type { TenantProfile } from './tenant.service.js';

// BUSINESS RULE [R03]: Tenant profile persistence via Prisma
// The TenantProfile has more fields than the Tenant model.
// Core fields map to columns; extra fields are stored in the `settings` JSON.

interface TenantExtras {
  trade_name?: string | null;
  naf_label?: string | null;
  tva_number?: string | null;
  creation_date?: string | null;
  capital_cents?: number | null;
  rcs_city?: string | null;
  rm_number?: string | null;
  rm_city?: string | null;
  convention_collective?: string | null;
  code_idcc?: string | null;
  dirigeants?: Array<{ nom: string; prenom: string; fonction: string }>;
  effectif?: number | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  iban?: string | null;
  bic?: string | null;
  tva_regime?: string;
  current_year_revenue_cents?: number;
  insurance_decennale_number?: string | null;
  insurance_decennale_insurer?: string | null;
  insurance_decennale_coverage?: string | null;
  insurance_rc_pro_number?: string | null;
  insurance_rc_pro_insurer?: string | null;
  qualifications?: Array<{ type: string; number: string; label: string; valid_until?: string }>;
}

export function createTenantRepository() {
  return {
    async findById(tenantId: string): Promise<TenantProfile | null> {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) return null;
      return mapToProfile(tenant);
    },

    async upsertProfile(tenantId: string, profile: TenantProfile): Promise<TenantProfile> {
      const extras: TenantExtras = {
        trade_name: profile.trade_name,
        naf_label: profile.naf_label,
        tva_number: profile.tva_number,
        creation_date: profile.creation_date,
        capital_cents: profile.capital_cents,
        rcs_city: profile.rcs_city,
        rm_number: profile.rm_number,
        rm_city: profile.rm_city,
        convention_collective: profile.convention_collective,
        code_idcc: profile.code_idcc,
        dirigeants: profile.dirigeants,
        effectif: profile.effectif,
        email: profile.email,
        phone: profile.phone,
        website: profile.website,
        iban: profile.iban,
        bic: profile.bic,
        tva_regime: profile.tva_regime,
        current_year_revenue_cents: profile.current_year_revenue_cents,
        insurance_decennale_number: profile.insurance_decennale_number,
        insurance_decennale_insurer: profile.insurance_decennale_insurer,
        insurance_decennale_coverage: profile.insurance_decennale_coverage,
        insurance_rc_pro_number: profile.insurance_rc_pro_number,
        insurance_rc_pro_insurer: profile.insurance_rc_pro_insurer,
        qualifications: profile.qualifications,
      };

      const data = {
        name: profile.company_name,
        siret: profile.siret,
        siren: profile.siren,
        naf_code: profile.naf_code,
        legal_form: profile.legal_form,
        address: profile.address as Record<string, unknown> | null ?? undefined,
        plan: profile.plan,
        settings: extras as Record<string, unknown>,
      };

      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data,
      });

      return mapToProfile(tenant);
    },
  };
}

function mapToProfile(tenant: {
  id: string;
  name: string;
  siret: string | null;
  siren: string | null;
  naf_code: string | null;
  legal_form: string | null;
  address: unknown;
  settings: unknown;
  plan: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): TenantProfile {
  const extras = (tenant.settings ?? {}) as TenantExtras;
  const address = tenant.address as TenantProfile['address'];

  return {
    id: tenant.id,
    siret: tenant.siret,
    siren: tenant.siren,
    company_name: tenant.name,
    trade_name: extras.trade_name ?? null,
    legal_form: (tenant.legal_form as TenantProfile['legal_form']) ?? 'ei',
    naf_code: tenant.naf_code,
    naf_label: extras.naf_label ?? null,
    address: address ?? null,
    tva_number: extras.tva_number ?? null,
    creation_date: extras.creation_date ?? null,
    capital_cents: extras.capital_cents ?? null,
    rcs_city: extras.rcs_city ?? null,
    rm_number: extras.rm_number ?? null,
    rm_city: extras.rm_city ?? null,
    convention_collective: extras.convention_collective ?? null,
    code_idcc: extras.code_idcc ?? null,
    dirigeants: extras.dirigeants ?? [],
    effectif: extras.effectif ?? null,
    email: extras.email ?? null,
    phone: extras.phone ?? null,
    website: extras.website ?? null,
    iban: extras.iban ?? null,
    bic: extras.bic ?? null,
    tva_regime: (extras.tva_regime as TenantProfile['tva_regime']) ?? 'reel_simplifie',
    current_year_revenue_cents: extras.current_year_revenue_cents ?? 0,
    insurance_decennale_number: extras.insurance_decennale_number ?? null,
    insurance_decennale_insurer: extras.insurance_decennale_insurer ?? null,
    insurance_decennale_coverage: extras.insurance_decennale_coverage ?? null,
    insurance_rc_pro_number: extras.insurance_rc_pro_number ?? null,
    insurance_rc_pro_insurer: extras.insurance_rc_pro_insurer ?? null,
    qualifications: extras.qualifications ?? [],
    plan: tenant.plan,
    settings: extras as Record<string, unknown>,
    created_at: tenant.created_at,
    updated_at: tenant.updated_at,
    deleted_at: tenant.deleted_at,
  };
}
