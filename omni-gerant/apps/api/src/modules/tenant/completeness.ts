import type { TenantProfile } from './tenant.service.js';

// P2-03 : calcul du score de completude du profil entreprise
//
// Score = (champs requis remplis) / (champs requis total) * 100
// Optionnels comptent pour bonus +2 pts chacun (cap a 100).

export interface CompletenessResult {
  score: number;        // 0-100
  required: string[];   // liste ordonnee des champs requis
  optional: string[];
  missing_required: string[];
  missing_optional: string[];
  complete: boolean;    // score === 100
}

const REQUIRED_FIELDS: Array<{ key: keyof TenantProfile | 'address.line1' | 'address.city' | 'address.zip_code'; label: string }> = [
  { key: 'siret', label: 'SIRET' },
  { key: 'company_name', label: 'Raison sociale' },
  { key: 'naf_code', label: 'Code NAF' },
  { key: 'legal_form', label: 'Forme juridique' },
  { key: 'address.line1', label: 'Adresse (rue)' },
  { key: 'address.city', label: 'Adresse (ville)' },
  { key: 'address.zip_code', label: 'Adresse (CP)' },
  { key: 'email', label: 'Email de contact' },
];

const OPTIONAL_FIELDS: Array<{ key: keyof TenantProfile | 'address.line2'; label: string }> = [
  { key: 'phone', label: 'Téléphone' },
  { key: 'website', label: 'Site web' },
  { key: 'iban', label: 'IBAN' },
  { key: 'bic', label: 'BIC' },
  { key: 'tva_number', label: 'Numéro de TVA' },
  { key: 'capital_cents', label: 'Capital social' },
  { key: 'insurance_rc_pro_number', label: 'Assurance RC Pro' },
];

function getFieldValue(profile: TenantProfile, key: string): unknown {
  if (key.startsWith('address.')) {
    const sub = key.split('.')[1] as 'line1' | 'line2' | 'city' | 'zip_code' | 'country';
    return profile.address?.[sub];
  }
  return (profile as unknown as Record<string, unknown>)[key];
}

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return value > 0;
  return true;
}

export function computeCompleteness(profile: TenantProfile): CompletenessResult {
  const requiredLabels = REQUIRED_FIELDS.map((f) => f.label);
  const optionalLabels = OPTIONAL_FIELDS.map((f) => f.label);

  const missingRequired = REQUIRED_FIELDS.filter((f) => !isFilled(getFieldValue(profile, f.key as string))).map((f) => f.label);
  const missingOptional = OPTIONAL_FIELDS.filter((f) => !isFilled(getFieldValue(profile, f.key as string))).map((f) => f.label);

  const requiredDone = REQUIRED_FIELDS.length - missingRequired.length;
  const optionalDone = OPTIONAL_FIELDS.length - missingOptional.length;

  // Base : 70 pts max pour le required, 30 pts pour l'optionnel
  const requiredScore = Math.round((requiredDone / REQUIRED_FIELDS.length) * 70);
  const optionalScore = Math.round((optionalDone / OPTIONAL_FIELDS.length) * 30);
  const score = Math.min(100, requiredScore + optionalScore);

  return {
    score,
    required: requiredLabels,
    optional: optionalLabels,
    missing_required: missingRequired,
    missing_optional: missingOptional,
    complete: missingRequired.length === 0 && score >= 95,
  };
}
