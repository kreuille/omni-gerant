// BUSINESS RULE [CDC-RH-V4]: Export comptable paie — classe 6 (charges) et classe 4 (dettes)
//
// Plan comptable francais (PCG) :
//   641 Remunerations du personnel (brut)
//   645 Charges de securite sociale et prevoyance (part patronale)
//   648 Autres charges de personnel (mutuelle, ticket resto, etc.)
// Contreparties :
//   421 Personnel — Remunerations dues (net a payer au salarie)
//   431 Securite sociale (URSSAF salariale + patronale + CSG/CRDS)
//   437 Autres organismes sociaux (retraite AGIRC-ARRCO, chomage)
//
// Principe : pour chaque bulletin, on genere une operation diverse (OD) equilibree.
//   Debit 641 = brut + indemnites non soumises
//   Debit 645 = charges patronales apres Fillon
//   Credit 421 = net a payer
//   Credit 431 = cotisations URSSAF (salariales + patronales + CSG/CRDS)
//   Credit 437 = retraite + chomage (salariales + patronales)

import { prisma } from '@zenadmin/db';
import type { Result, AppError } from '@zenadmin/shared';
import { ok, err, validationError } from '@zenadmin/shared';

export interface AccountingEntry {
  account: string;
  label: string;
  debitCents: number;
  creditCents: number;
}

export interface PayrollAccountingExport {
  year: number;
  month: number;
  periodLabel: string;
  entries: AccountingEntry[];
  totalDebitCents: number;
  totalCreditCents: number;
  balanced: boolean;
  payslipsCount: number;
}

export async function exportPayrollAccounting(
  tenantId: string,
  year: number,
  month: number,
): Promise<Result<PayrollAccountingExport, AppError>> {
  if (month < 1 || month > 12) return err(validationError('Mois invalide'));
  if (year < 2020 || year > 2100) return err(validationError('Annee invalide'));

  const payslips = await prisma.hrPayslip.findMany({
    where: { tenant_id: tenantId, period_year: year, period_month: month },
  });

  if (payslips.length === 0) {
    return ok({
      year, month, periodLabel: `${year}-${String(month).padStart(2, '0')}`,
      entries: [], totalDebitCents: 0, totalCreditCents: 0, balanced: true, payslipsCount: 0,
    });
  }

  // Aggregat par compte
  let totalGross = 0;
  let totalIndemnities = 0;
  let totalNetToPay = 0;
  let totalUrssafEmp = 0;
  let totalUrssafPat = 0;
  let totalCsgCrds = 0;
  let totalRetraiteEmp = 0;
  let totalRetraitePat = 0;
  let totalChomagePat = 0;
  let totalFillon = 0;

  for (const p of payslips) {
    totalGross += p.gross_total_cents;
    totalIndemnities += p.indemnity_cents;
    totalNetToPay += p.net_to_pay_cents;
    totalUrssafEmp += p.urssaf_employee_cents;
    totalUrssafPat += p.urssaf_employer_cents;
    totalCsgCrds += p.csg_crds_cents;
    totalRetraiteEmp += p.retirement_employee_cents;
    totalRetraitePat += p.retirement_employer_cents;
    totalChomagePat += p.unemployment_employer_cents;
    totalFillon += p.fillon_reduction_cents;
  }

  // Debits : charges
  const debit641 = totalGross + totalIndemnities;
  const debit645 = totalUrssafPat + totalRetraitePat + totalChomagePat - totalFillon;

  // Credits : dettes
  const credit421 = totalNetToPay;
  const credit431 = totalUrssafEmp + totalUrssafPat + totalCsgCrds - totalFillon;
  const credit437 = totalRetraiteEmp + totalRetraitePat + totalChomagePat;

  const entries: AccountingEntry[] = [
    { account: '641', label: 'Remunerations du personnel (brut + indemnites)', debitCents: debit641, creditCents: 0 },
    { account: '645', label: 'Charges de securite sociale et prevoyance (part patronale)', debitCents: debit645, creditCents: 0 },
    { account: '421', label: 'Personnel - Remunerations dues', debitCents: 0, creditCents: credit421 },
    { account: '431', label: 'Securite sociale (URSSAF + CSG/CRDS)', debitCents: 0, creditCents: credit431 },
    { account: '437', label: 'Autres organismes sociaux (retraite + chomage)', debitCents: 0, creditCents: credit437 },
  ];

  const totalDebit = entries.reduce((s, e) => s + e.debitCents, 0);
  const totalCredit = entries.reduce((s, e) => s + e.creditCents, 0);

  // Ecart d'arrondi : equilibre par contre-passation sur 641 si necessaire
  const diff = totalCredit - totalDebit;
  if (Math.abs(diff) > 0 && Math.abs(diff) <= 10) {
    entries[0]!.debitCents += diff;
  }

  const totalDebitFinal = entries.reduce((s, e) => s + e.debitCents, 0);
  const totalCreditFinal = entries.reduce((s, e) => s + e.creditCents, 0);

  return ok({
    year,
    month,
    periodLabel: `${year}-${String(month).padStart(2, '0')}`,
    entries,
    totalDebitCents: totalDebitFinal,
    totalCreditCents: totalCreditFinal,
    balanced: totalDebitFinal === totalCreditFinal,
    payslipsCount: payslips.length,
  });
}

/**
 * Format CSV : date;numero_piece;compte;libelle;debit;credit
 */
export function formatAccountingExportCsv(exportData: PayrollAccountingExport): string {
  const pieceRef = `SAL-${exportData.year}${String(exportData.month).padStart(2, '0')}`;
  const dateStr = `${exportData.year}-${String(exportData.month).padStart(2, '0')}-28`;
  const lines = ['date;piece;compte;libelle;debit;credit'];
  for (const e of exportData.entries) {
    lines.push([
      dateStr,
      pieceRef,
      e.account,
      `"${e.label.replace(/"/g, '""')}"`,
      (e.debitCents / 100).toFixed(2).replace('.', ','),
      (e.creditCents / 100).toFixed(2).replace('.', ','),
    ].join(';'));
  }
  return lines.join('\n');
}
