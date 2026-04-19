// BUSINESS RULE [CDC-RH-V2]: Calcul bulletin de paie France 2026
//
// Simplification volontaire V2 : 4 grandes rubriques salariales
//   - Securite sociale (maladie/maternite/invalidite/deces + vieillesse) — 7.30%
//   - Retraite complementaire AGIRC-ARRCO tranche 1 — 4.15% (non cadre + cadre T1)
//   - Chomage — 0% part salariale depuis 2018 (loi avenir pro)
//   - CSG/CRDS : 9.20% sur 98.25% du brut (abattement forfaitaire frais pro)
//       — dont 6.80% CSG deductible + 2.40% CSG+CRDS non deductibles
//
// Cotisations patronales (ordre de grandeur) :
//   - URSSAF (maladie 7%, AT-MP 1.5%, famille 3.45%, vieillesse 8.55%, FNAL 0.1%) ≈ 20.6%
//   - Retraite complementaire T1 — 6.01%
//   - Chomage — 4.05%
//   - Mutuelle patronale — 0% (simplifie)
//
// Reduction Fillon (reduction generale) : degressive de 100% a 1.0 SMIC a 0% a 1.6 SMIC.
// Formule : coef = (T / 0.6) * (1.6 * SMIC_annuel / brut_annuel − 1), plafonne a T.
// T 2026 = 0.3194 pour entreprises <50 salaries, 0.3234 pour >=50.
//
// Sources : bulletins-officiels URSSAF 2026, Memento Paie Lefebvre 2026.

export const SMIC_MONTHLY_CENTS_2026 = 180180;
export const SMIC_HOURLY_CENTS_2026 = 1188;
export const LEGAL_MONTHLY_HOURS = 151.67;

// Taux salariaux (part employe) — 2026
export const RATE_SS_EMPLOYEE = 0.0730; // securite sociale salariale
export const RATE_RETIREMENT_EMPLOYEE = 0.0415; // AGIRC-ARRCO T1
export const RATE_UNEMPLOYMENT_EMPLOYEE = 0; // 0% depuis 2018
export const RATE_CSG_DEDUCTIBLE = 0.0680;
export const RATE_CSG_CRDS_NON_DEDUCTIBLE = 0.0240;
export const CSG_BASE_RATIO = 0.9825; // abattement 1.75% frais pro (plafond 4 PSS)

// Taux patronaux (part employeur) — 2026 (simplifies)
export const RATE_SS_EMPLOYER = 0.2060; // cumul URSSAF patronale (maladie+AT+famille+vieillesse+FNAL)
export const RATE_RETIREMENT_EMPLOYER = 0.0601; // AGIRC-ARRCO T1
export const RATE_UNEMPLOYMENT_EMPLOYER = 0.0405;

// Reduction Fillon (reduction generale des cotisations patronales)
export const FILLON_COEF_MAX_UNDER_50 = 0.3194;
export const FILLON_COEF_MAX_50_AND_OVER = 0.3234;

export interface PayrollInput {
  grossBaseCents: number;    // salaire brut de base
  overtimeCents?: number;    // heures sup brutes
  bonusCents?: number;       // primes brutes
  indemnityCents?: number;   // indemnites (transport, repas) — non soumises ici (simplifie)
  hoursWorked: number;       // heures travaillees dans le mois
  weeklyHours: number;       // horaire contractuel
  headcountUnder50: boolean; // entreprise <50 salaries pour coef Fillon

  // V5 : Mutuelle / Prevoyance / Tickets restos
  mutuelleEmployeeRateBp?: number; // 100 = 1%
  mutuelleEmployerRateBp?: number;
  mutuelleFlatEmployeeCents?: number; // montant forfaitaire alternatif
  mutuelleFlatEmployerCents?: number;
  prevoyanceEmployeeRateBp?: number;
  prevoyanceEmployerRateBp?: number;
  trCount?: number;
  trFaceValueCents?: number;
  trEmployerShareBp?: number; // 5000 = 50%

  // V6 : AT-MP specifique + PAS
  atmpRateBp?: number;     // defaut 150 = 1.5%
  pasRateBp?: number;      // taux salarie (personnalise ou neutre)

  // V7 : heures supplementaires detaillees + avantages nature + PPV
  overtime25Hours?: number; // heures sup a +25% (36h->43h)
  overtime50Hours?: number; // heures sup a +50% (>43h)
  benefitsInKindCents?: number; // avantage en nature nourriture/logement (soumis a cotisations)
  ppvCents?: number; // prime de partage de la valeur (exoneree sous conditions)
  cpBalance?: number; // solde CP au moment du bulletin
  rttBalance?: number; // solde RTT
}

// V7 : Avantage en nature repas restauration (URSSAF 2026)
export const AVANTAGE_NATURE_REPAS_CENTS_2026 = 545; // 5.45 EUR / repas
// Plafond PPV (prime partage valeur) exoneree sous 3 SMIC
export const PPV_CEILING_GROSS_CENTS = 900000; // 9000 EUR par an et par salarie

// PMSS 2026 — plafond mensuel Securite Sociale
export const PMSS_2026_CENTS = 386400;

export interface PayrollBreakdown {
  grossBaseCents: number;
  overtimeCents: number;
  bonusCents: number;
  indemnityCents: number;
  grossTotalCents: number;

  urssafEmployeeCents: number;
  retirementEmployeeCents: number;
  unemploymentEmployeeCents: number;
  mutualEmployeeCents: number;
  csgCrdsCents: number;
  totalEmployeeDeductionsCents: number;

  netTaxableCents: number;
  netToPayCents: number;

  urssafEmployerCents: number;
  retirementEmployerCents: number;
  unemploymentEmployerCents: number;
  mutualEmployerCents: number;
  totalEmployerChargesCents: number;

  fillonReductionCents: number;

  grossRateCentsPerHour: number;

  // V5
  prevoyanceEmployeeCents: number;
  prevoyanceEmployerCents: number;
  trCount: number;
  trEmployeeCents: number;
  trEmployerCents: number;

  // V6
  atmpEmployerCents: number;
  pasCents: number; // prelevement a la source (deduit du net apres impot)

  // V7
  overtime25Cents: number;
  overtime50Cents: number;
  overtime25Hours: number;
  overtime50Hours: number;
  benefitsInKindCents: number;
  ppvCents: number;
  cpBalance: number;
  rttBalance: number;
}

/**
 * Calcule un bulletin de paie simplifie V2.
 * Tous les montants en centimes (R02).
 */
export function computePayroll(input: PayrollInput): PayrollBreakdown {
  const grossBaseCents = Math.max(0, Math.floor(input.grossBaseCents));
  const bonusCents = Math.max(0, Math.floor(input.bonusCents ?? 0));
  const indemnityCents = Math.max(0, Math.floor(input.indemnityCents ?? 0));

  // V7 : Heures sup calculees automatiquement si fournies en heures
  const hourlyRateCents = input.hoursWorked > 0 ? grossBaseCents / input.hoursWorked : 0;
  const overtime25Hours = Math.max(0, input.overtime25Hours ?? 0);
  const overtime50Hours = Math.max(0, input.overtime50Hours ?? 0);
  const overtime25Cents = Math.round(overtime25Hours * hourlyRateCents * 1.25);
  const overtime50Cents = Math.round(overtime50Hours * hourlyRateCents * 1.50);
  const overtimeCents = Math.max(0, Math.floor(input.overtimeCents ?? 0)) + overtime25Cents + overtime50Cents;

  // V7 : Avantage en nature (soumis a cotisations)
  const benefitsInKindCents = Math.max(0, input.benefitsInKindCents ?? 0);

  // V7 : PPV — exoneree sous plafonds, non soumise a cotisations hors CSG
  const ppvCents = Math.max(0, input.ppvCents ?? 0);

  const grossTotalCents = grossBaseCents + overtimeCents + bonusCents + benefitsInKindCents;
  // Indemnites : exoneres de cotisations dans le cas simplifie (repas/transport dans limites URSSAF)

  // ── Cotisations salariales ─────────────────────────────────────
  const urssafEmployeeCents = Math.round(grossTotalCents * RATE_SS_EMPLOYEE);
  const retirementEmployeeCents = Math.round(grossTotalCents * RATE_RETIREMENT_EMPLOYEE);
  const unemploymentEmployeeCents = Math.round(grossTotalCents * RATE_UNEMPLOYMENT_EMPLOYEE);

  // V5 : Mutuelle (loi ANI 2013) — taux en bp OU montant forfaitaire
  const mutuelleRateEmp = (input.mutuelleEmployeeRateBp ?? 0) / 10000;
  const mutualEmployeeCents = mutuelleRateEmp > 0
    ? Math.round(grossTotalCents * mutuelleRateEmp)
    : (input.mutuelleFlatEmployeeCents ?? 0);

  // V5 : Prevoyance (obligatoire cadres convention 1947, facultatif autres sauf CC)
  const prevoyanceEmployeeCents = Math.round(grossTotalCents * ((input.prevoyanceEmployeeRateBp ?? 0) / 10000));

  // CSG / CRDS : assiette = 98.25% du brut (abattement forfaitaire frais pro)
  const csgBase = grossTotalCents * CSG_BASE_RATIO;
  const csgDeductibleCents = Math.round(csgBase * RATE_CSG_DEDUCTIBLE);
  const csgCrdsNonDeductibleCents = Math.round(csgBase * RATE_CSG_CRDS_NON_DEDUCTIBLE);
  const csgCrdsCents = csgDeductibleCents + csgCrdsNonDeductibleCents;

  const totalEmployeeDeductionsCents =
    urssafEmployeeCents +
    retirementEmployeeCents +
    unemploymentEmployeeCents +
    mutualEmployeeCents +
    prevoyanceEmployeeCents +
    csgCrdsCents;

  // Net imposable = brut − cotisations deductibles (hors CSG non deductible et CRDS)
  const netTaxableCents = grossTotalCents - (totalEmployeeDeductionsCents - csgCrdsNonDeductibleCents);

  // V5 : Tickets restaurants (part salariale deduite du net, part patronale non soumise)
  const trCount = Math.max(0, input.trCount ?? 0);
  const trFaceValue = Math.max(0, input.trFaceValueCents ?? 0);
  const trEmployerShareBp = Math.max(0, Math.min(6000, input.trEmployerShareBp ?? 5000));
  const trEmployerCents = Math.round(trCount * trFaceValue * (trEmployerShareBp / 10000));
  const trEmployeeCents = trCount * trFaceValue - trEmployerCents;

  // V6 : PAS (prelevement a la source) — base = net imposable
  const pasRate = (input.pasRateBp ?? 0) / 10000;
  const pasCents = Math.round(netTaxableCents * pasRate);

  // Net a payer = brut − cotisations − benefits nature (deja inclus brut) + indemnites + PPV − part salariale TR − PAS
  // Note : avantage nature est ajoute au brut pour cotisations puis re-deduit pour ne pas etre verse cash
  const netToPayCents = grossTotalCents - totalEmployeeDeductionsCents + indemnityCents + ppvCents - benefitsInKindCents - trEmployeeCents - pasCents;

  // ── Cotisations patronales ──────────────────────────────────────
  const urssafEmployerCents = Math.round(grossTotalCents * RATE_SS_EMPLOYER);
  const retirementEmployerCents = Math.round(grossTotalCents * RATE_RETIREMENT_EMPLOYER);
  const unemploymentEmployerCents = Math.round(grossTotalCents * RATE_UNEMPLOYMENT_EMPLOYER);

  // V5 : Mutuelle patronale
  const mutuelleRateEmpr = (input.mutuelleEmployerRateBp ?? 0) / 10000;
  const mutualEmployerCents = mutuelleRateEmpr > 0
    ? Math.round(grossTotalCents * mutuelleRateEmpr)
    : (input.mutuelleFlatEmployerCents ?? 0);
  const prevoyanceEmployerCents = Math.round(grossTotalCents * ((input.prevoyanceEmployerRateBp ?? 0) / 10000));

  // V6 : AT-MP specifique entreprise (CARSAT)
  const atmpRateBp = input.atmpRateBp ?? 150;
  const atmpEmployerCents = Math.round(grossTotalCents * (atmpRateBp / 10000));

  // ── Reduction Fillon (reduction generale) ───────────────────────
  // SMIC mensuel proratise selon horaire contractuel
  const smicMensuelProratise = Math.round(SMIC_MONTHLY_CENTS_2026 * (input.weeklyHours / 35));
  const fillonCoefMax = input.headcountUnder50 ? FILLON_COEF_MAX_UNDER_50 : FILLON_COEF_MAX_50_AND_OVER;
  let fillonReductionCents = 0;
  if (grossTotalCents > 0 && grossTotalCents < smicMensuelProratise * 1.6) {
    const ratio = (1.6 * smicMensuelProratise) / grossTotalCents - 1;
    const coef = Math.max(0, Math.min(fillonCoefMax, (fillonCoefMax / 0.6) * ratio));
    fillonReductionCents = Math.round(grossTotalCents * coef);
  }

  const totalEmployerChargesCents =
    urssafEmployerCents +
    retirementEmployerCents +
    unemploymentEmployerCents +
    mutualEmployerCents +
    prevoyanceEmployerCents +
    atmpEmployerCents +
    trEmployerCents -
    fillonReductionCents;

  const grossRateCentsPerHour = input.hoursWorked > 0
    ? Math.round(grossBaseCents / input.hoursWorked)
    : 0;

  return {
    grossBaseCents,
    overtimeCents,
    bonusCents,
    indemnityCents,
    grossTotalCents,
    urssafEmployeeCents,
    retirementEmployeeCents,
    unemploymentEmployeeCents,
    mutualEmployeeCents,
    csgCrdsCents,
    totalEmployeeDeductionsCents,
    netTaxableCents,
    netToPayCents,
    urssafEmployerCents,
    retirementEmployerCents,
    unemploymentEmployerCents,
    mutualEmployerCents,
    totalEmployerChargesCents,
    fillonReductionCents,
    grossRateCentsPerHour,
    prevoyanceEmployeeCents,
    prevoyanceEmployerCents,
    trCount,
    trEmployeeCents,
    trEmployerCents,
    atmpEmployerCents,
    pasCents,
    overtime25Cents,
    overtime50Cents,
    overtime25Hours,
    overtime50Hours,
    benefitsInKindCents,
    ppvCents,
    cpBalance: input.cpBalance ?? 0,
    rttBalance: input.rttBalance ?? 0,
  };
}

/**
 * Formate un montant en centimes en euros avec 2 decimales.
 */
export function formatCentsEur(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
