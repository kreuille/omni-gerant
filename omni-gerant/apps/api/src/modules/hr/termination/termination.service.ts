// BUSINESS RULE [CDC-RH-V4]: Rupture contrat — calcul indemnites
//
// Scenarios :
// 1. CDI licenciement economique/personnel (non faute grave/lourde)
//    → indemnite legale : 1/4 mois par annee d'anciennete jusqu'a 10 ans, 1/3 au-dela
//      Art. R1234-2 CT (base = moyenne des 12 derniers mois ou 3 derniers, plus favorable)
// 2. CDI demission
//    → pas d'indemnite legale (sauf conventionnelle) + CP non pris + preavis
// 3. CDI rupture conventionnelle
//    → indemnite specifique rupture conventionnelle (ISRC) : minimum = indemnite legale (Art. L1237-13)
// 4. Fin CDD arrivee a terme
//    → indemnite de precarite 10% (Art. L1243-8) sauf exceptions (etudiant, saisonnier, refus CDI)
// 5. Fin apprentissage
//    → pas d'indemnite de precarite (Art. L6243-1-1)
//
// Toujours en plus : indemnite compensatrice de conges payes non pris.

import { prisma } from '@zenadmin/db';
import type { Result, AppError } from '@zenadmin/shared';
import { ok, err, notFound, validationError } from '@zenadmin/shared';

export type TerminationReason =
  | 'demission'
  | 'licenciement'
  | 'fin_cdd'
  | 'rupture_conventionnelle'
  | 'retraite'
  | 'deces'
  | 'fin_periode_essai'
  | 'fin_apprentissage';

export interface TerminationComputationInput {
  employeeId: string;
  terminationDate: Date;
  reason: TerminationReason;
  // Override si connu (sinon calcule depuis last_12_months_gross via payslips)
  avgMonthlyGrossCents?: number;
  cpDaysRemaining?: number;
  totalGrossPaidCents?: number; // pour CDD : sert a calculer 10% precarite
  noticeDaysPaid?: number; // jours de preavis paye si non effectue
  noticeDailyCents?: number;
}

export interface TerminationBreakdown {
  employeeId: string;
  reason: TerminationReason;
  terminationDate: Date;
  seniorityYears: number;
  seniorityMonths: number;
  baseMonthlyGrossCents: number;
  // Indemnites (centimes)
  indemniteLegaleLicenciementCents: number;
  indemniteRuptureConventionnelleCents: number;
  indemnitePrecariteCents: number;
  indemniteCompensatriceCongesCents: number;
  indemniteCompensatricePreavisCents: number;
  // Total
  totalIndemnitesCents: number;
  // Documents a generer
  documentsRequis: Array<'solde_tout_compte' | 'certificat_travail' | 'attestation_pole_emploi' | 'recu_solde'>;
  notes: string[];
}

export interface EmployeeSnapshot {
  contract_type: string;
  start_date: Date;
  monthly_gross_cents: number;
}

/**
 * Version pure (testable) qui calcule depuis un snapshot deja charge.
 */
export function computeTerminationFromSnapshot(
  employee: EmployeeSnapshot,
  input: TerminationComputationInput,
): Result<TerminationBreakdown, AppError> {
  if (input.terminationDate < employee.start_date) {
    return err(validationError('Date de sortie anterieure a la date d\'embauche'));
  }
  return ok(computeBreakdown(employee, input));
}

/**
 * Calcule les indemnites de rupture pour un employe.
 */
export async function computeTermination(
  tenantId: string,
  input: TerminationComputationInput,
): Promise<Result<TerminationBreakdown, AppError>> {
  const employee = await prisma.hrEmployee.findFirst({
    where: { id: input.employeeId, tenant_id: tenantId, deleted_at: null },
  });
  if (!employee) return err(notFound('HrEmployee', input.employeeId));

  if (input.terminationDate < employee.start_date) {
    return err(validationError('Date de sortie anterieure a la date d\'embauche'));
  }

  return ok(computeBreakdown(employee, input));
}

function computeBreakdown(employee: EmployeeSnapshot, input: TerminationComputationInput): TerminationBreakdown {
  // Anciennete
  const ms = input.terminationDate.getTime() - employee.start_date.getTime();
  const years = ms / (365.25 * 24 * 3600 * 1000);
  const seniorityYears = Math.floor(years);
  const seniorityMonths = Math.max(0, Math.round((years - seniorityYears) * 12));

  // Base de calcul : override ou salaire brut mensuel du contrat
  const baseMonthly = input.avgMonthlyGrossCents ?? employee.monthly_gross_cents;

  let indemniteLegaleLicenciement = 0;
  let indemniteRuptureConventionnelle = 0;
  let indemnitePrecarite = 0;
  const notes: string[] = [];

  // ── Indemnite legale de licenciement (Art. R1234-2) ─────────────
  // Conditions legales : CDI + 8 mois d'anciennete min + pas de faute grave/lourde.
  const eligibleForLegal = employee.contract_type === 'cdi' && years >= 8 / 12;

  if (input.reason === 'licenciement' && eligibleForLegal) {
    const yearsUpTo10 = Math.min(years, 10);
    const yearsAfter10 = Math.max(0, years - 10);
    indemniteLegaleLicenciement = Math.round(
      (yearsUpTo10 * baseMonthly * 0.25) + (yearsAfter10 * baseMonthly * (1 / 3)),
    );
    notes.push(`Indemnite legale licenciement : 1/4 mois pour ${yearsUpTo10.toFixed(2)} premieres annees, 1/3 au-dela (Art. R1234-2).`);
  } else if (input.reason === 'licenciement' && !eligibleForLegal) {
    notes.push(`Anciennete insuffisante (<8 mois) — pas d'indemnite legale.`);
  }

  // ── Indemnite rupture conventionnelle (Art. L1237-13) ───────────
  if (input.reason === 'rupture_conventionnelle' && eligibleForLegal) {
    const yearsUpTo10 = Math.min(years, 10);
    const yearsAfter10 = Math.max(0, years - 10);
    indemniteRuptureConventionnelle = Math.round(
      (yearsUpTo10 * baseMonthly * 0.25) + (yearsAfter10 * baseMonthly * (1 / 3)),
    );
    notes.push(`Indemnite rupture conventionnelle : minimum = indemnite legale licenciement (Art. L1237-13). Peut etre negociee a la hausse.`);
  }

  // ── Indemnite de precarite CDD (Art. L1243-8) ───────────────────
  if (input.reason === 'fin_cdd' && employee.contract_type === 'cdd') {
    const total = input.totalGrossPaidCents ?? (baseMonthly * 12 * years);
    indemnitePrecarite = Math.round(total * 0.10);
    notes.push(`Indemnite de precarite 10% du brut total (Art. L1243-8). Sauf exceptions : refus CDI, faute grave, saisonnier, etudiant.`);
  }
  if (input.reason === 'fin_apprentissage' && employee.contract_type === 'apprentice') {
    notes.push(`Fin apprentissage : pas d'indemnite de precarite (Art. L6243-1-1).`);
  }

  // ── Indemnite compensatrice conges payes ────────────────────────
  let indemniteCompensatriceConges = 0;
  if (input.cpDaysRemaining && input.cpDaysRemaining > 0) {
    const dailyCents = Math.round(baseMonthly / 21.67); // 21.67 jours ouvrables / mois
    indemniteCompensatriceConges = Math.round(input.cpDaysRemaining * dailyCents);
    notes.push(`Indemnite conges payes : ${input.cpDaysRemaining} jours restants x ${(dailyCents / 100).toFixed(2)} EUR.`);
  }

  // ── Indemnite compensatrice de preavis ──────────────────────────
  let indemniteCompensatricePreavis = 0;
  if (input.noticeDaysPaid && input.noticeDailyCents) {
    indemniteCompensatricePreavis = Math.round(input.noticeDaysPaid * input.noticeDailyCents);
    notes.push(`Indemnite compensatrice de preavis : ${input.noticeDaysPaid} jours payes non effectues.`);
  }

  const totalIndemnites =
    indemniteLegaleLicenciement +
    indemniteRuptureConventionnelle +
    indemnitePrecarite +
    indemniteCompensatriceConges +
    indemniteCompensatricePreavis;

  // Documents requis selon motif
  const documentsRequis: TerminationBreakdown['documentsRequis'] = ['solde_tout_compte', 'certificat_travail', 'recu_solde'];
  if (['licenciement', 'rupture_conventionnelle', 'fin_cdd', 'fin_apprentissage', 'demission', 'fin_periode_essai'].includes(input.reason)) {
    documentsRequis.push('attestation_pole_emploi');
  }

  return {
    employeeId: input.employeeId,
    reason: input.reason,
    terminationDate: input.terminationDate,
    seniorityYears,
    seniorityMonths,
    baseMonthlyGrossCents: baseMonthly,
    indemniteLegaleLicenciementCents: indemniteLegaleLicenciement,
    indemniteRuptureConventionnelleCents: indemniteRuptureConventionnelle,
    indemnitePrecariteCents: indemnitePrecarite,
    indemniteCompensatriceCongesCents: indemniteCompensatriceConges,
    indemniteCompensatricePreavisCents: indemniteCompensatricePreavis,
    totalIndemnitesCents: totalIndemnites,
    documentsRequis,
    notes,
  };
}
