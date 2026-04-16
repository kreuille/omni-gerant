// BUSINESS RULE [CDC-2.4]: Mise a jour annuelle et declencheurs automatiques du DUERP
// Art. R4121-2 du Code du travail

export interface DuerpUpdateSchedule {
  duerpId: string;
  tenantId: string;
  lastUpdateDate: Date;
  nextMandatoryDate: Date;
  updateFrequency: 'annual' | 'on_change';
  effectif: number;
  reminders: DuerpReminder[];
  triggers: DuerpUpdateTrigger[];
  cseRequired: boolean;
  papripactRequired: boolean;
}

export interface DuerpReminder {
  type: 'J-60' | 'J-30' | 'J-15' | 'J-7' | 'J-DAY' | 'J+7_OVERDUE' | 'J+30_OVERDUE';
  scheduledDate: Date;
  sent: boolean;
  sentAt: Date | null;
  channel: 'email' | 'dashboard' | 'both';
}

export interface DuerpUpdateTrigger {
  id: string;
  type: DuerpUpdateTriggerType;
  detectedAt: Date;
  sourceModule: string;
  description: string;
  acknowledged: boolean;
  resultingUpdateId: string | null;
}

export type DuerpUpdateTriggerType =
  | 'accident_travail'
  | 'new_equipment'
  | 'new_chemical_product'
  | 'staff_change'
  | 'premises_change'
  | 'annual_deadline'
  | 'regulation_change'
  | 'insurance_expiry';

// BUSINESS RULE [CDC-2.4]: Frequence de mise a jour selon effectif
export function getUpdateFrequency(effectif: number): 'annual' | 'on_change' {
  return effectif >= 11 ? 'annual' : 'on_change';
}

// BUSINESS RULE [CDC-2.4]: Calcul date prochaine mise a jour obligatoire
export function calculateNextMandatoryDate(lastUpdate: Date, effectif: number): Date {
  if (effectif >= 11) {
    // Mise a jour annuelle obligatoire
    const next = new Date(lastUpdate);
    next.setFullYear(next.getFullYear() + 1);
    return next;
  }
  // TPE < 11 : pas de date fixe, uniquement sur changement
  const far = new Date(lastUpdate);
  far.setFullYear(far.getFullYear() + 5); // placeholder lointain
  return far;
}

// BUSINESS RULE [CDC-2.4]: Generation des rappels automatiques
export function generateReminders(nextMandatoryDate: Date): DuerpReminder[] {
  const offsets: Array<{ type: DuerpReminder['type']; daysOffset: number; channel: DuerpReminder['channel'] }> = [
    { type: 'J-60', daysOffset: -60, channel: 'dashboard' },
    { type: 'J-30', daysOffset: -30, channel: 'both' },
    { type: 'J-15', daysOffset: -15, channel: 'both' },
    { type: 'J-7', daysOffset: -7, channel: 'both' },
    { type: 'J-DAY', daysOffset: 0, channel: 'both' },
    { type: 'J+7_OVERDUE', daysOffset: 7, channel: 'both' },
    { type: 'J+30_OVERDUE', daysOffset: 30, channel: 'both' },
  ];

  return offsets.map(({ type, daysOffset, channel }) => {
    const date = new Date(nextMandatoryDate);
    date.setDate(date.getDate() + daysOffset);
    return { type, scheduledDate: date, sent: false, sentAt: null, channel };
  });
}

// BUSINESS RULE [CDC-2.4]: Statut conformite DUERP
export type DuerpConformityStatus = 'up_to_date' | 'update_recommended' | 'overdue';

export function getDuerpConformityStatus(schedule: DuerpUpdateSchedule): {
  status: DuerpConformityStatus;
  label: string;
  daysSinceLastUpdate: number;
  daysUntilNext: number;
  pendingTriggers: number;
} {
  const now = new Date();
  const daysSinceLastUpdate = Math.floor((now.getTime() - schedule.lastUpdateDate.getTime()) / (86400000));
  const daysUntilNext = Math.floor((schedule.nextMandatoryDate.getTime() - now.getTime()) / (86400000));
  const pendingTriggers = schedule.triggers.filter((t) => !t.acknowledged).length;

  let status: DuerpConformityStatus;
  let label: string;

  if (daysUntilNext < 0) {
    status = 'overdue';
    label = `DUERP en retard de ${Math.abs(daysUntilNext)} jours`;
  } else if (pendingTriggers > 0 || daysUntilNext <= 30) {
    status = 'update_recommended';
    label = pendingTriggers > 0
      ? `${pendingTriggers} declencheur(s) en attente`
      : `Mise a jour dans ${daysUntilNext} jours`;
  } else {
    status = 'up_to_date';
    label = `DUERP a jour (prochaine mise a jour dans ${daysUntilNext} jours)`;
  }

  return { status, label, daysSinceLastUpdate, daysUntilNext, pendingTriggers };
}

// BUSINESS RULE [CDC-2.4]: Conservation 40 ans (Loi 2021-1018)
export const CONSERVATION_YEARS = 40;

export function isDepotDematerialiseRequired(effectif: number, year: number = new Date().getFullYear()): boolean {
  if (year >= 2026) return true; // Toutes les entreprises
  if (year >= 2025 && effectif >= 50) return true;
  if (year >= 2024 && effectif >= 150) return true;
  return false;
}

// BUSINESS RULE [CDC-2.4]: Penalites en cas de non-conformite
export const DUERP_PENALTIES = {
  absence: { amount: 1500_00, label: 'Contravention 5e classe : 1 500 EUR' },
  recidive: { amount: 3000_00, label: 'Recidive : 3 000 EUR' },
  accident_sans_duerp: { amount: 3750_00, label: 'Accident sans DUERP : 3 750 EUR + 1 an de prison possible' },
  faute_inexcusable: { amount: null, label: 'Faute inexcusable : responsabilite civile aggravee (indemnisation majoree)' },
} as const;

// BUSINESS RULE [CDC-2.4]: References legales du DUERP
export const DUERP_LEGAL_REFERENCES = [
  'Art. R4121-1 a R4121-4 du Code du travail (obligation DUERP)',
  'Art. L4121-1 a L4121-5 du Code du travail (obligation generale de securite)',
  'Loi n° 2021-1018 du 2 aout 2021 (conservation 40 ans, depot dematerialise)',
  'Decret n° 2001-1016 du 5 novembre 2001 (creation du DUERP)',
] as const;

// References sectorielles
export const SECTOR_LEGAL_REFERENCES: Record<string, string[]> = {
  'btp-general': ['Art. R4532-56 a R4532-74 (PPSPS)', 'Decret 2012-639 (amiante)', 'Art. R4323-58 a R4323-90 (hauteur)', 'Decret 2006-892 (bruit/vibrations)'],
  'restaurant': ['CCN HCR 30/04/1997', 'Reglement CE 852/2004 (HACCP)', 'Code construction ERP Type N'],
  'commerce': ['ERP Type M', 'Art. R4541-1 a R4541-11 (manutention)', 'Accord 26/03/2010 (agression)'],
  'electricien': ['NF C 18-510', 'Arrete 26/04/2012', 'Art. R4544-1 a R4544-11', 'Directive ATEX 1999/92/CE'],
  'garage-auto': ['Art. R4412-1 a R4412-93 (CMR)', 'Art. R4323-22 a R4323-35 (levage)', 'NF C 18-550'],
  'aide-domicile': ['CCN BAD IDCC 2941', 'Recommandation CNAM R497'],
  'coiffure': ['Tableau RG n° 65 (eczema)', 'Art. R4412-1 (agents chimiques)'],
  'boulangerie': ['Tableau RG n° 66 (asthme)', 'Decrets ATEX 2002-1553/1554'],
};
