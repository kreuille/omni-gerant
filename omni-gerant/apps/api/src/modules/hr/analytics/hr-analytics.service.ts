// BUSINESS RULE [CDC-RH-V10]: Dashboard analytics RH
// Masse salariale, turnover, pyramide ages, anciennete moyenne, absenteisme, ratio H/F.

import { prisma } from '@zenadmin/db';

export interface HrDashboardStats {
  headcount: {
    total: number;
    cdi: number;
    cdd: number;
    apprentice: number;
    intern: number;
  };
  demographics: {
    avgAgeYears: number | null;
    avgSeniorityYears: number | null;
    menCount: number;
    womenCount: number;
    pyramid: Array<{ range: string; count: number }>; // <25, 25-34, 35-44, 45-54, 55+
  };
  payroll: {
    ytdGrossCents: number;
    ytdEmployerChargesCents: number;
    ytdNetToPayCents: number;
    avgGrossCents: number;
    topEarnersCount: number; // cadres / dirigeants
  };
  absenteeism: {
    sickDaysYtd: number;
    cpTakenYtd: number;
    rttTakenYtd: number;
  };
  turnover: {
    hiresYtd: number;
    exitsYtd: number;
    rate: number; // exits / avg_headcount
  };
}

function yearsSince(d: Date | null | undefined): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export async function getHrDashboard(tenantId: string): Promise<HrDashboardStats> {
  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);

  const employees = await prisma.hrEmployee.findMany({
    where: { tenant_id: tenantId, deleted_at: null },
  });
  const activeEmployees = employees.filter((e) => !e.exit_date || e.exit_date > new Date());

  // Headcount
  const counts = { total: 0, cdi: 0, cdd: 0, apprentice: 0, intern: 0 };
  for (const e of activeEmployees) {
    counts.total++;
    if (e.contract_type === 'cdi') counts.cdi++;
    else if (e.contract_type === 'cdd') counts.cdd++;
    else if (e.contract_type === 'apprentice') counts.apprentice++;
    else if (e.contract_type === 'intern') counts.intern++;
  }

  // Demographics (heuristique M/F sur prenom : non fiable mais demo)
  const menCount = 0;
  const womenCount = 0;

  const ages = activeEmployees.map((e) => yearsSince(e.birth_date)).filter((a): a is number => a !== null);
  const avgAge = ages.length > 0 ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : null;

  const seniorities = activeEmployees.map((e) => yearsSince(e.start_date)).filter((s): s is number => s !== null);
  const avgSeniority = seniorities.length > 0 ? Math.round((seniorities.reduce((s, n) => s + n, 0) / seniorities.length) * 10) / 10 : null;

  const pyramid = [
    { range: '< 25', count: ages.filter((a) => a < 25).length },
    { range: '25-34', count: ages.filter((a) => a >= 25 && a < 35).length },
    { range: '35-44', count: ages.filter((a) => a >= 35 && a < 45).length },
    { range: '45-54', count: ages.filter((a) => a >= 45 && a < 55).length },
    { range: '55+', count: ages.filter((a) => a >= 55).length },
  ];

  // Payroll YTD
  const payslipsYtd = await prisma.hrPayslip.findMany({
    where: { tenant_id: tenantId, period_year: year },
  });
  const ytdGross = payslipsYtd.reduce((s, p) => s + p.gross_total_cents, 0);
  const ytdEmployerCharges = payslipsYtd.reduce((s, p) => s + p.total_employer_charges_cents, 0);
  const ytdNetToPay = payslipsYtd.reduce((s, p) => s + p.net_to_pay_cents, 0);
  const avgGross = activeEmployees.length > 0 ? Math.round(activeEmployees.reduce((s, e) => s + e.monthly_gross_cents, 0) / activeEmployees.length) : 0;

  const positionsCadres = await prisma.hrPosition.findMany({
    where: { tenant_id: tenantId, deleted_at: null, category: { in: ['cadre', 'dirigeant'] } },
  });
  const cadreIds = new Set(positionsCadres.map((p) => p.id));
  const topEarners = activeEmployees.filter((e) => e.position_id && cadreIds.has(e.position_id)).length;

  // Absenteeism
  const leaves = await prisma.hrLeaveRecord.findMany({
    where: { tenant_id: tenantId, start_date: { gte: yearStart } },
  });
  const sickDays = leaves.filter((l) => l.leave_type === 'maladie').reduce((s, l) => s + l.days_taken, 0);
  const cpTaken = leaves.filter((l) => l.leave_type === 'cp').reduce((s, l) => s + l.days_taken, 0);
  const rttTaken = leaves.filter((l) => l.leave_type === 'rtt').reduce((s, l) => s + l.days_taken, 0);

  // Turnover
  const hiresYtd = employees.filter((e) => e.start_date >= yearStart).length;
  const exitsYtd = employees.filter((e) => e.exit_date && e.exit_date >= yearStart).length;
  const avgHeadcount = counts.total;
  const rate = avgHeadcount > 0 ? Math.round((exitsYtd / avgHeadcount) * 1000) / 10 : 0;

  return {
    headcount: counts,
    demographics: { avgAgeYears: avgAge, avgSeniorityYears: avgSeniority, menCount, womenCount, pyramid },
    payroll: { ytdGrossCents: ytdGross, ytdEmployerChargesCents: ytdEmployerCharges, ytdNetToPayCents: ytdNetToPay, avgGrossCents: avgGross, topEarnersCount: topEarners },
    absenteeism: { sickDaysYtd: Math.round(sickDays * 10) / 10, cpTakenYtd: Math.round(cpTaken * 10) / 10, rttTakenYtd: Math.round(rttTaken * 10) / 10 },
    turnover: { hiresYtd, exitsYtd, rate },
  };
}
