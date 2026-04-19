import { prisma } from '@zenadmin/db';
import type { Result, AppError } from '@zenadmin/shared';
import { ok, err, notFound, forbidden, validationError } from '@zenadmin/shared';
import { computePayroll, LEGAL_MONTHLY_HOURS } from './payroll-calculator.js';

// BUSINESS RULE [CDC-RH-V2]: Service paie — generation + recalcul + cloture

export interface GeneratePayslipInput {
  employeeId: string;
  overtimeCents?: number;
  bonusCents?: number;
  indemnityCents?: number;
  hoursWorked?: number; // defaut = horaire contractuel
  trCount?: number; // V5 : nombre de titres restaurants du mois
  // V7
  overtime25Hours?: number;
  overtime50Hours?: number;
  benefitsInKindCents?: number;
  ppvCents?: number;
}

export interface PayslipRecord {
  id: string;
  tenant_id: string;
  period_id: string;
  employee_id: string;
  period_year: number;
  period_month: number;
  gross_base_cents: number;
  overtime_cents: number;
  bonus_cents: number;
  indemnity_cents: number;
  gross_total_cents: number;
  urssaf_employee_cents: number;
  retirement_employee_cents: number;
  unemployment_employee_cents: number;
  mutual_employee_cents: number;
  csg_crds_cents: number;
  total_employee_deductions_cents: number;
  net_taxable_cents: number;
  net_to_pay_cents: number;
  urssaf_employer_cents: number;
  retirement_employer_cents: number;
  unemployment_employer_cents: number;
  mutual_employer_cents: number;
  total_employer_charges_cents: number;
  fillon_reduction_cents: number;
  gross_rate_cents_per_hour: number;
  hours_worked: number;
  sent_to_employee_at: Date | null;
  pdf_url: string | null;
  created_at: Date;
  prevoyance_employee_cents?: number;
  prevoyance_employer_cents?: number;
  tr_count?: number;
  tr_employee_cents?: number;
  tr_employer_cents?: number;
  pas_cents?: number;
  ytd_gross_cents?: number;
  ytd_net_taxable_cents?: number;
  ytd_net_to_pay_cents?: number;
  overtime_25_hours?: number;
  overtime_50_hours?: number;
  overtime_25_cents?: number;
  overtime_50_cents?: number;
  benefits_in_kind_cents?: number;
  ppv_cents?: number;
  cp_balance_end?: number;
  rtt_balance_end?: number;
}

export async function getOrCreatePeriod(tenantId: string, year: number, month: number): Promise<{
  id: string; tenant_id: string; period_year: number; period_month: number; closed_at: Date | null;
}> {
  const existing = await prisma.hrPayrollPeriod.findUnique({
    where: { tenant_id_period_year_period_month: { tenant_id: tenantId, period_year: year, period_month: month } },
  });
  if (existing) return existing;
  return prisma.hrPayrollPeriod.create({
    data: { tenant_id: tenantId, period_year: year, period_month: month },
  });
}

export async function countActiveNonExcludedHeadcount(tenantId: string, atDate: Date): Promise<number> {
  // Approximation rapide pour determiner si <50 pour coef Fillon
  const count = await prisma.hrEmployee.count({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
      start_date: { lte: atDate },
      OR: [{ exit_date: null }, { exit_date: { gte: atDate } }],
      NOT: { contract_type: { in: ['apprentice', 'intern'] } },
    },
  });
  return count;
}

/**
 * Genere (ou recalcule si existant) le bulletin de paie d'un employe pour un mois.
 * Retourne une erreur si la periode est fermee.
 */
export async function generatePayslip(
  tenantId: string,
  year: number,
  month: number,
  input: GeneratePayslipInput,
): Promise<Result<PayslipRecord, AppError>> {
  const period = await getOrCreatePeriod(tenantId, year, month);
  if (period.closed_at) {
    return err(forbidden(`Periode ${year}-${String(month).padStart(2, '0')} fermee, plus de modification possible.`));
  }

  const employee = await prisma.hrEmployee.findFirst({
    where: { id: input.employeeId, tenant_id: tenantId, deleted_at: null },
  });
  if (!employee) return err(notFound('HrEmployee', input.employeeId));

  // Verifier que l'employe etait present pendant le mois
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  if (employee.start_date > monthEnd) {
    return err(validationError('Employe non embauche sur cette periode'));
  }
  if (employee.exit_date && employee.exit_date < monthStart) {
    return err(validationError('Employe deja sorti avant cette periode'));
  }

  // Horaire par defaut = horaire contractuel monthly
  const hoursWorked = input.hoursWorked ?? (employee.weekly_hours * 52) / 12;
  const headcount = await countActiveNonExcludedHeadcount(tenantId, monthEnd);

  // V5 : charger les parametres paie du tenant
  const settings = await prisma.hrPayrollSettings.findUnique({ where: { tenant_id: tenantId } });

  const breakdown = computePayroll({
    grossBaseCents: employee.monthly_gross_cents,
    overtimeCents: input.overtimeCents,
    bonusCents: input.bonusCents,
    indemnityCents: input.indemnityCents,
    hoursWorked,
    weeklyHours: employee.weekly_hours,
    headcountUnder50: headcount < 50,
    // V5 : settings tenant
    mutuelleEmployeeRateBp: settings?.mutuelle_enabled ? settings.mutuelle_employee_rate_bp : 0,
    mutuelleEmployerRateBp: settings?.mutuelle_enabled ? settings.mutuelle_employer_rate_bp : 0,
    mutuelleFlatEmployeeCents: settings?.mutuelle_enabled ? settings.mutuelle_flat_employee_cents : 0,
    mutuelleFlatEmployerCents: settings?.mutuelle_enabled ? settings.mutuelle_flat_employer_cents : 0,
    prevoyanceEmployeeRateBp: settings?.prevoyance_enabled ? settings.prevoyance_employee_rate_bp : 0,
    prevoyanceEmployerRateBp: settings?.prevoyance_enabled ? settings.prevoyance_employer_rate_bp : 0,
    trCount: (input as { trCount?: number }).trCount,
    trFaceValueCents: settings?.tr_enabled ? settings.tr_face_value_cents : 0,
    trEmployerShareBp: settings?.tr_enabled ? settings.tr_employer_share_bp : 0,
    // V6
    atmpRateBp: settings?.atmp_rate_bp ?? 150,
    pasRateBp: employee.pas_rate_bp,
    // V7
    overtime25Hours: input.overtime25Hours,
    overtime50Hours: input.overtime50Hours,
    benefitsInKindCents: input.benefitsInKindCents,
    ppvCents: input.ppvCents,
  });

  // V7 : solde CP/RTT a la fin du mois courant
  const { computeLeaveBalance } = await import('../docs/leaves.service.js');
  const balanceResult = await computeLeaveBalance(employee.id, tenantId, monthEnd);
  const cpBalance = balanceResult.ok ? balanceResult.value.cpBalance : 0;
  const rttBalance = balanceResult.ok ? balanceResult.value.rttBalance : 0;

  // V6 : cumuls annuels (YTD jusqu'au mois courant)
  const ytdAgg = await prisma.hrPayslip.aggregate({
    where: {
      tenant_id: tenantId,
      employee_id: employee.id,
      period_year: year,
      period_month: { lt: month },
    },
    _sum: {
      gross_total_cents: true,
      net_taxable_cents: true,
      net_to_pay_cents: true,
    },
  });
  const ytdGross = (ytdAgg._sum.gross_total_cents ?? 0) + breakdown.grossTotalCents;
  const ytdNetTaxable = (ytdAgg._sum.net_taxable_cents ?? 0) + breakdown.netTaxableCents;
  const ytdNetToPay = (ytdAgg._sum.net_to_pay_cents ?? 0) + breakdown.netToPayCents;

  const existing = await prisma.hrPayslip.findUnique({
    where: { period_id_employee_id: { period_id: period.id, employee_id: employee.id } },
  });

  const data = {
    tenant_id: tenantId,
    period_id: period.id,
    employee_id: employee.id,
    period_year: year,
    period_month: month,
    gross_base_cents: breakdown.grossBaseCents,
    overtime_cents: breakdown.overtimeCents,
    bonus_cents: breakdown.bonusCents,
    indemnity_cents: breakdown.indemnityCents,
    gross_total_cents: breakdown.grossTotalCents,
    urssaf_employee_cents: breakdown.urssafEmployeeCents,
    retirement_employee_cents: breakdown.retirementEmployeeCents,
    unemployment_employee_cents: breakdown.unemploymentEmployeeCents,
    mutual_employee_cents: breakdown.mutualEmployeeCents,
    csg_crds_cents: breakdown.csgCrdsCents,
    total_employee_deductions_cents: breakdown.totalEmployeeDeductionsCents,
    net_taxable_cents: breakdown.netTaxableCents,
    net_to_pay_cents: breakdown.netToPayCents,
    urssaf_employer_cents: breakdown.urssafEmployerCents,
    retirement_employer_cents: breakdown.retirementEmployerCents,
    unemployment_employer_cents: breakdown.unemploymentEmployerCents,
    mutual_employer_cents: breakdown.mutualEmployerCents,
    total_employer_charges_cents: breakdown.totalEmployerChargesCents,
    fillon_reduction_cents: breakdown.fillonReductionCents,
    gross_rate_cents_per_hour: breakdown.grossRateCentsPerHour,
    hours_worked: hoursWorked,
    prevoyance_employee_cents: breakdown.prevoyanceEmployeeCents,
    prevoyance_employer_cents: breakdown.prevoyanceEmployerCents,
    tr_count: breakdown.trCount,
    tr_employee_cents: breakdown.trEmployeeCents,
    tr_employer_cents: breakdown.trEmployerCents,
    pas_cents: breakdown.pasCents,
    ytd_gross_cents: ytdGross,
    ytd_net_taxable_cents: ytdNetTaxable,
    ytd_net_to_pay_cents: ytdNetToPay,
    overtime_25_hours: breakdown.overtime25Hours,
    overtime_50_hours: breakdown.overtime50Hours,
    overtime_25_cents: breakdown.overtime25Cents,
    overtime_50_cents: breakdown.overtime50Cents,
    benefits_in_kind_cents: breakdown.benefitsInKindCents,
    ppv_cents: breakdown.ppvCents,
    cp_balance_end: cpBalance,
    rtt_balance_end: rttBalance,
  };

  const payslip = existing
    ? await prisma.hrPayslip.update({ where: { id: existing.id }, data })
    : await prisma.hrPayslip.create({ data });

  return ok(payslip as PayslipRecord);
}

/**
 * Genere les bulletins de tous les employes actifs pour un mois donne.
 */
export async function generateAllPayslips(
  tenantId: string,
  year: number,
  month: number,
): Promise<Result<{ generated: number; skipped: number; errors: Array<{ employeeId: string; reason: string }> }, AppError>> {
  const period = await getOrCreatePeriod(tenantId, year, month);
  if (period.closed_at) {
    return err(forbidden('Periode fermee'));
  }

  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  const employees = await prisma.hrEmployee.findMany({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
      start_date: { lte: monthEnd },
      OR: [{ exit_date: null }, { exit_date: { gte: new Date(year, month - 1, 1) } }],
    },
  });

  let generated = 0;
  let skipped = 0;
  const errors: Array<{ employeeId: string; reason: string }> = [];

  for (const emp of employees) {
    if (emp.monthly_gross_cents <= 0) {
      skipped++;
      continue;
    }
    const result = await generatePayslip(tenantId, year, month, { employeeId: emp.id });
    if (result.ok) generated++;
    else errors.push({ employeeId: emp.id, reason: result.error.message });
  }

  return ok({ generated, skipped, errors });
}

export async function listPayslips(tenantId: string, year: number, month: number): Promise<PayslipRecord[]> {
  const rows = await prisma.hrPayslip.findMany({
    where: { tenant_id: tenantId, period_year: year, period_month: month },
    orderBy: { created_at: 'desc' },
  });
  return rows as PayslipRecord[];
}

export async function getPayslip(id: string, tenantId: string): Promise<Result<PayslipRecord, AppError>> {
  const payslip = await prisma.hrPayslip.findFirst({ where: { id, tenant_id: tenantId } });
  if (!payslip) return err(notFound('HrPayslip', id));
  return ok(payslip as PayslipRecord);
}

export async function closePeriod(tenantId: string, year: number, month: number): Promise<Result<{ closedAt: Date }, AppError>> {
  const period = await prisma.hrPayrollPeriod.findUnique({
    where: { tenant_id_period_year_period_month: { tenant_id: tenantId, period_year: year, period_month: month } },
  });
  if (!period) return err(notFound('HrPayrollPeriod', `${year}-${month}`));
  if (period.closed_at) return ok({ closedAt: period.closed_at });
  const closedAt = new Date();
  await prisma.hrPayrollPeriod.update({ where: { id: period.id }, data: { closed_at: closedAt } });
  return ok({ closedAt });
}

export async function markPayslipSent(id: string): Promise<void> {
  await prisma.hrPayslip.update({ where: { id }, data: { sent_to_employee_at: new Date() } });
}

export { LEGAL_MONTHLY_HOURS };
