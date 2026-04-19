import { prisma } from '@zenadmin/db';
import { Prisma } from '@zenadmin/db';

// BUSINESS RULE [CDC-RH-V1]: Conformite droit du travail francais — SMIC, effectif moyen, seuils

// ── SMIC 2026 ────────────────────────────────────────────────────────
// Montant legal : 1 801,80 EUR brut mensuel pour 35h/semaine (151,67 h/mois)
// Taux horaire brut : 11,88 EUR
// Source : Arrete du 22 decembre 2025, Journal Officiel
export const SMIC_MONTHLY_CENTS_2026 = 180180;
export const SMIC_HOURLY_CENTS_2026 = 1188;
export const LEGAL_MONTHLY_HOURS = 151.67; // 35 * 52 / 12
export const LEGAL_WEEKLY_HOURS = 35;

// BUSINESS RULE [CDC-RH-V1]: Pourcentages SMIC pour apprentis (Article D6222-26)
export const APPRENTICE_SMIC_RATES = {
  // age < 18
  under18: { year1: 0.27, year2: 0.39, year3: 0.55 },
  // 18-20 ans
  age18to20: { year1: 0.43, year2: 0.51, year3: 0.67 },
  // 21-25 ans
  age21to25: { year1: 0.53, year2: 0.61, year3: 0.78 },
  // 26 ans et plus
  age26plus: { year1: 1.0, year2: 1.0, year3: 1.0 },
} as const;

export interface SmicValidationResult {
  valid: boolean;
  minimumCents: number;
  actualCents: number;
  messageKey?: 'below_smic' | 'below_apprentice_min' | 'below_part_time_pro_rata';
  message?: string;
}

export function validateSmic(input: {
  monthlyGrossCents: number;
  weeklyHours: number;
  contractType: string;
  birthDate?: string | null;
  startDate?: string;
  referenceDate?: Date;
}): SmicValidationResult {
  const ref = input.referenceDate ?? new Date();
  const proRata = Math.min(input.weeklyHours / LEGAL_WEEKLY_HOURS, 1);

  if (input.contractType === 'apprentice' && input.birthDate && input.startDate) {
    const age = computeAgeAtDate(new Date(input.birthDate), ref);
    const yearsSinceStart = Math.max(0, Math.floor((ref.getTime() - new Date(input.startDate).getTime()) / (365 * 24 * 3600 * 1000)));
    const yearKey: 'year1' | 'year2' | 'year3' = yearsSinceStart <= 0 ? 'year1' : yearsSinceStart === 1 ? 'year2' : 'year3';
    const rates = age < 18
      ? APPRENTICE_SMIC_RATES.under18
      : age <= 20
        ? APPRENTICE_SMIC_RATES.age18to20
        : age <= 25
          ? APPRENTICE_SMIC_RATES.age21to25
          : APPRENTICE_SMIC_RATES.age26plus;
    const pct = rates[yearKey];
    const minimum = Math.round(SMIC_MONTHLY_CENTS_2026 * proRata * pct);
    return {
      valid: input.monthlyGrossCents >= minimum,
      minimumCents: minimum,
      actualCents: input.monthlyGrossCents,
      messageKey: input.monthlyGrossCents < minimum ? 'below_apprentice_min' : undefined,
      message: input.monthlyGrossCents < minimum
        ? `Salaire apprenti < minimum legal (${pct * 100}% SMIC = ${(minimum / 100).toFixed(2)} EUR)`
        : undefined,
    };
  }

  // Stage : pas de salaire obligatoire sous 2 mois, gratification = 15% PMSS au-dela
  // Pour simplifier V1 : pas de validation SMIC stagiaire
  if (input.contractType === 'intern') {
    return { valid: true, minimumCents: 0, actualCents: input.monthlyGrossCents };
  }

  const minimum = Math.round(SMIC_MONTHLY_CENTS_2026 * proRata);
  return {
    valid: input.monthlyGrossCents >= minimum,
    minimumCents: minimum,
    actualCents: input.monthlyGrossCents,
    messageKey: input.monthlyGrossCents < minimum
      ? (input.weeklyHours < LEGAL_WEEKLY_HOURS ? 'below_part_time_pro_rata' : 'below_smic')
      : undefined,
    message: input.monthlyGrossCents < minimum
      ? `Salaire < SMIC${input.weeklyHours < LEGAL_WEEKLY_HOURS ? ' proratise' : ''} (${(minimum / 100).toFixed(2)} EUR pour ${input.weeklyHours}h)`
      : undefined,
  };
}

function computeAgeAtDate(birthDate: Date, atDate: Date): number {
  let age = atDate.getFullYear() - birthDate.getFullYear();
  const m = atDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && atDate.getDate() < birthDate.getDate())) age--;
  return age;
}

// ── Effectif mensuel moyen (Article L130-1 Code du travail) ──────────
//
// Pour chaque mois, on calcule l'effectif a la fin du mois selon les regles :
// - CDI temps plein : compte pour 1
// - CDI temps partiel : horaires contractuels / 35h
// - CDD temps plein : prorata presence sur l'annee (CDD 6 mois = 0.5 mois sur l'annee)
// - Interim : meme regle que CDD
// - Apprenti / stagiaire / contrat aide : NE COMPTE PAS pour les seuils sociaux
//
// L'effectif annuel moyen = moyenne des effectifs mensuels sur 12 mois.
// Les seuils (11, 20, 50) se declenchent si l'effectif annuel moyen est
// atteint pendant 5 annees civiles consecutives (Loi PACTE 2019).

export interface HeadcountResult {
  year: number;
  monthly: Array<{ month: number; headcount: number }>;
  average: number;
  threshold_11_reached: boolean;
  threshold_20_reached: boolean;
  threshold_50_reached: boolean;
  // NB : declenchement reel des obligations = 5 ans consecutifs au seuil
  details: {
    cdi_full_time: number;
    cdi_part_time: number;
    cdd: number;
    interim: number;
    excluded: number; // apprentis + stagiaires
  };
}

const EXCLUDED_CONTRACT_TYPES = new Set(['apprentice', 'intern']);

export async function computeAverageHeadcount(tenantId: string, year: number): Promise<HeadcountResult> {
  // On charge tous les employes actifs au moins un jour dans l'annee
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  const employees = await prisma.hrEmployee.findMany({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
      start_date: { lte: yearEnd },
      OR: [{ exit_date: null }, { exit_date: { gte: yearStart } }],
    },
  });

  const monthly: Array<{ month: number; headcount: number }> = [];
  const details = {
    cdi_full_time: 0,
    cdi_part_time: 0,
    cdd: 0,
    interim: 0,
    excluded: 0,
  };

  for (let month = 0; month < 12; month++) {
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
    let headcount = 0;

    for (const e of employees) {
      const started = e.start_date <= monthEnd;
      const notYetExited = !e.exit_date || e.exit_date >= monthEnd;
      if (!started || !notYetExited) continue;

      if (EXCLUDED_CONTRACT_TYPES.has(e.contract_type)) {
        if (month === 0) details.excluded++;
        continue;
      }

      const fraction = e.is_part_time ? Math.min(e.weekly_hours / LEGAL_WEEKLY_HOURS, 1) : 1;

      if (e.contract_type === 'cdi') {
        headcount += fraction;
        if (month === 0) {
          if (e.is_part_time) details.cdi_part_time++;
          else details.cdi_full_time++;
        }
      } else if (e.contract_type === 'cdd' || e.contract_type === 'seasonal') {
        // Prorata presence dans l'annee
        const start = e.start_date > yearStart ? e.start_date : yearStart;
        const end = e.exit_date && e.exit_date < yearEnd ? e.exit_date : yearEnd;
        const daysInYear = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (24 * 3600 * 1000)));
        const yearDays = 365;
        headcount += (daysInYear / yearDays) * fraction;
        if (month === 0) details.cdd++;
      } else if (e.contract_type === 'interim') {
        headcount += 1 * fraction; // meme calcul simplifie
        if (month === 0) details.interim++;
      }
    }

    monthly.push({ month: month + 1, headcount: Math.round(headcount * 100) / 100 });
  }

  const average = monthly.reduce((sum, m) => sum + m.headcount, 0) / 12;

  return {
    year,
    monthly,
    average: Math.round(average * 100) / 100,
    threshold_11_reached: average >= 11,
    threshold_20_reached: average >= 20,
    threshold_50_reached: average >= 50,
    details,
  };
}

// ── Registre Unique du Personnel (Article L1221-13) ──────────────────
// Append-only immuable. Une entree par evenement RH majeur.

export type RegistryEntryType = 'embauche' | 'sortie' | 'modification_contrat';

export interface RegistryEntryInput {
  tenant_id: string;
  employee_id: string | null;
  entry_type: RegistryEntryType;
  employee_name: string;
  position_name?: string | null;
  contract_type?: string | null;
  event_date: Date;
  metadata?: Prisma.InputJsonValue;
  created_by?: string;
}

export async function appendRegistryEntry(input: RegistryEntryInput): Promise<void> {
  await prisma.hrRegistryEntry.create({
    data: {
      tenant_id: input.tenant_id,
      employee_id: input.employee_id,
      entry_type: input.entry_type,
      employee_name: input.employee_name,
      position_name: input.position_name ?? null,
      contract_type: input.contract_type ?? null,
      event_date: input.event_date,
      metadata: input.metadata ?? Prisma.JsonNull,
      created_by: input.created_by ?? null,
    },
  });
}

export async function listRegistryEntries(tenantId: string, limit = 200): Promise<Array<{
  id: string;
  entryType: RegistryEntryType;
  employeeName: string;
  positionName: string | null;
  contractType: string | null;
  eventDate: Date;
  metadata: unknown;
  createdAt: Date;
}>> {
  const rows = await prisma.hrRegistryEntry.findMany({
    where: { tenant_id: tenantId },
    orderBy: { event_date: 'desc' },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    entryType: r.entry_type as RegistryEntryType,
    employeeName: r.employee_name,
    positionName: r.position_name,
    contractType: r.contract_type,
    eventDate: r.event_date,
    metadata: r.metadata,
    createdAt: r.created_at,
  }));
}
