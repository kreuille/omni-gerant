// BUSINESS RULE [CDC-RH-V2]: Generation PDF reel bulletin de paie avec pdf-lib
// Remplace le rendu HTML precedent pour garantir un fichier PDF telechargeable.
// Conforme Article R3243-1 : toutes les mentions legales obligatoires.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PayslipRecord } from './payroll.service.js';

export interface PayslipPdfContext {
  employer: {
    name: string;
    siret?: string | null;
    address?: string | null;
    nafCode?: string | null;
    urssafRef?: string | null;
  };
  employee: {
    firstName: string;
    lastName: string;
    position?: string | null;
    classification?: string | null;
    socialSecurityNumber?: string | null;
    startDate?: Date | null;
    contractType?: string | null;
  };
  payslip: PayslipRecord & {
    mutual_employee_cents?: number;
    prevoyance_employee_cents?: number;
    pas_cents?: number;
    tr_count?: number;
    tr_employee_cents?: number;
    ppv_cents?: number;
    overtime_25_cents?: number;
    overtime_25_hours?: number;
    overtime_50_cents?: number;
    overtime_50_hours?: number;
    benefits_in_kind_cents?: number;
    cp_balance_end?: number;
    rtt_balance_end?: number;
    ytd_gross_cents?: number;
    ytd_net_taxable_cents?: number;
    ytd_net_to_pay_cents?: number;
    sick_deduction_cents?: number;
    ijss_cents?: number;
    transport_allowance_cents?: number;
  };
}

const MONTH_NAMES = ['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];

// Sanitize char pour WinAnsi (ASCII-safe) — remplace accents et NBSP
function clean(s: string): string {
  return (s ?? '')
    .replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ')
    .replace(/[àâäÀÂÄ]/g, 'a').replace(/[éèêëÉÈÊË]/g, 'e').replace(/[îïÎÏ]/g, 'i')
    .replace(/[ôöÔÖ]/g, 'o').replace(/[ùûüÙÛÜ]/g, 'u').replace(/[ÿŸ]/g, 'y')
    .replace(/[çÇ]/g, 'c').replace(/[œŒ]/g, 'oe').replace(/[æÆ]/g, 'ae')
    .replace(/[€]/g, 'EUR');
}

function eur(cents: number): string {
  const v = (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ');
  return v + ' EUR';
}

export async function generatePayslipPdf(ctx: PayslipPdfContext): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const p = ctx.payslip;
  const gross = p.gross_total_cents;
  const csgBase = Math.round(gross * 0.9825);

  const periodLabel = `${MONTH_NAMES[p.period_month - 1]} ${p.period_year}`;

  pdf.setTitle(`Bulletin de paie ${ctx.employee.lastName} ${ctx.employee.firstName} ${periodLabel}`);
  pdf.setAuthor(ctx.employer.name);
  pdf.setProducer('zenAdmin');
  pdf.setCreationDate(new Date());

  let y = height - 40;
  const left = 40;

  // Titre
  page.drawText(clean(`BULLETIN DE PAIE — ${periodLabel}`), { x: left, y, size: 14, font: bold });
  y -= 22;

  // Employeur
  page.drawText(clean('EMPLOYEUR'), { x: left, y, size: 9, font: bold, color: rgb(0.3, 0.3, 0.3) });
  y -= 12;
  page.drawText(clean(ctx.employer.name), { x: left, y, size: 11, font: bold });
  y -= 12;
  if (ctx.employer.address) { page.drawText(clean(ctx.employer.address).slice(0, 90), { x: left, y, size: 9, font }); y -= 11; }
  if (ctx.employer.siret) { page.drawText(`SIRET : ${ctx.employer.siret}`, { x: left, y, size: 9, font }); y -= 11; }
  if (ctx.employer.nafCode) { page.drawText(`Code APE : ${ctx.employer.nafCode}`, { x: left, y, size: 9, font }); y -= 11; }

  // Salarie (colonne droite)
  let ye = height - 62;
  const right = 320;
  page.drawText(clean('SALARIE'), { x: right, y: ye, size: 9, font: bold, color: rgb(0.3, 0.3, 0.3) });
  ye -= 12;
  page.drawText(clean(`${ctx.employee.lastName.toUpperCase()} ${ctx.employee.firstName}`), { x: right, y: ye, size: 11, font: bold });
  ye -= 12;
  if (ctx.employee.position) { page.drawText(clean(`Emploi : ${ctx.employee.position}`), { x: right, y: ye, size: 9, font }); ye -= 11; }
  if (ctx.employee.socialSecurityNumber) { page.drawText(`N SS : ${ctx.employee.socialSecurityNumber}`, { x: right, y: ye, size: 9, font }); ye -= 11; }
  if (ctx.employee.contractType) { page.drawText(clean(`Contrat : ${ctx.employee.contractType.toUpperCase()}`), { x: right, y: ye, size: 9, font }); ye -= 11; }
  if (ctx.employee.startDate) {
    const years = Math.floor((Date.now() - ctx.employee.startDate.getTime()) / (365.25 * 24 * 3600 * 1000));
    page.drawText(clean(`Anciennete : ${years} an(s)`), { x: right, y: ye, size: 9, font });
    ye -= 11;
  }

  y = Math.min(y, ye) - 10;

  // Trait separateur
  page.drawLine({ start: { x: left, y }, end: { x: width - left, y }, thickness: 0.5 });
  y -= 15;

  // Section Remuneration
  page.drawText(clean('REMUNERATION'), { x: left, y, size: 10, font: bold });
  y -= 14;

  const drawRow = (label: string, base: string, rate: string, amount: string, isBold = false) => {
    const f = isBold ? bold : font;
    page.drawText(clean(label), { x: left, y, size: 9, font: f });
    page.drawText(base, { x: 300, y, size: 9, font: f });
    page.drawText(rate, { x: 390, y, size: 9, font: f });
    page.drawText(amount, { x: 470, y, size: 9, font: f });
    y -= 13;
  };

  // Headers
  page.drawText('Libelle', { x: left, y, size: 8, font: bold, color: rgb(0.4, 0.4, 0.4) });
  page.drawText('Base', { x: 300, y, size: 8, font: bold, color: rgb(0.4, 0.4, 0.4) });
  page.drawText('Taux', { x: 390, y, size: 8, font: bold, color: rgb(0.4, 0.4, 0.4) });
  page.drawText('Montant', { x: 470, y, size: 8, font: bold, color: rgb(0.4, 0.4, 0.4) });
  y -= 12;

  const hourlyRate = p.gross_rate_cents_per_hour;
  drawRow('Salaire de base', `${p.hours_worked.toFixed(2)} h`, eur(hourlyRate), eur(p.gross_base_cents));

  if (p.overtime_25_cents && p.overtime_25_cents > 0) {
    drawRow('Heures supp. +25%', `${(p.overtime_25_hours ?? 0).toFixed(2)} h`, '+25%', eur(p.overtime_25_cents));
  }
  if (p.overtime_50_cents && p.overtime_50_cents > 0) {
    drawRow('Heures supp. +50%', `${(p.overtime_50_hours ?? 0).toFixed(2)} h`, '+50%', eur(p.overtime_50_cents));
  }
  if (p.overtime_cents > (p.overtime_25_cents ?? 0) + (p.overtime_50_cents ?? 0)) {
    drawRow('Autres heures sup.', '-', '-', eur(p.overtime_cents - (p.overtime_25_cents ?? 0) - (p.overtime_50_cents ?? 0)));
  }
  if (p.bonus_cents > 0) drawRow('Primes', '-', '-', eur(p.bonus_cents));
  if (p.benefits_in_kind_cents && p.benefits_in_kind_cents > 0) drawRow('Avantage en nature', '-', '-', eur(p.benefits_in_kind_cents));
  if (p.ppv_cents && p.ppv_cents > 0) drawRow('Prime Partage Valeur (PPV)', '-', '-', eur(p.ppv_cents));
  if (p.sick_deduction_cents && p.sick_deduction_cents > 0) drawRow('Absence maladie (deduction)', '-', '-', '-' + eur(p.sick_deduction_cents));

  drawRow('SALAIRE BRUT', '', '', eur(gross), true);
  y -= 5;
  page.drawLine({ start: { x: left, y }, end: { x: width - left, y }, thickness: 0.3 });
  y -= 12;

  // Cotisations salariales
  page.drawText(clean('COTISATIONS SALARIALES'), { x: left, y, size: 10, font: bold });
  y -= 14;
  drawRow('Securite sociale', eur(gross), '7,30%', eur(p.urssaf_employee_cents));
  drawRow('Retraite AGIRC-ARRCO T1', eur(gross), '4,15%', eur(p.retirement_employee_cents));
  drawRow('CSG deductible', eur(csgBase), '6,80%', eur(Math.round(csgBase * 0.068)));
  drawRow('CSG+CRDS non deductibles', eur(csgBase), '2,40%', eur(Math.round(csgBase * 0.024)));
  if (p.mutual_employee_cents && p.mutual_employee_cents > 0) drawRow('Mutuelle sante (ANI 2013)', eur(gross), '-', eur(p.mutual_employee_cents));
  if (p.prevoyance_employee_cents && p.prevoyance_employee_cents > 0) drawRow('Prevoyance', eur(gross), '-', eur(p.prevoyance_employee_cents));

  drawRow('TOTAL COTISATIONS', '', '', eur(p.total_employee_deductions_cents), true);
  y -= 5;
  page.drawLine({ start: { x: left, y }, end: { x: width - left, y }, thickness: 0.3 });
  y -= 12;

  // Net
  page.drawText(clean('NETS'), { x: left, y, size: 10, font: bold });
  y -= 14;
  drawRow('Net imposable', '', '', eur(p.net_taxable_cents));
  if (p.pas_cents && p.pas_cents > 0) drawRow('Impot preleve a la source', '', '', '-' + eur(p.pas_cents));
  if (p.ijss_cents && p.ijss_cents > 0) drawRow('IJSS (subrogation)', '', '', eur(p.ijss_cents));
  if (p.transport_allowance_cents && p.transport_allowance_cents > 0) drawRow('Indemnite transport', '', '', eur(p.transport_allowance_cents));
  if (p.indemnity_cents > 0) drawRow('Indemnites non soumises', '', '', eur(p.indemnity_cents));
  if (p.tr_count && p.tr_count > 0 && p.tr_employee_cents && p.tr_employee_cents > 0) drawRow('Titres restaurants (part salariale)', `${p.tr_count} titres`, '-', '-' + eur(p.tr_employee_cents));

  // NET A PAYER mis en valeur
  y -= 4;
  page.drawRectangle({ x: left - 2, y: y - 4, width: width - 2 * left + 4, height: 18, color: rgb(0.9, 1, 0.9) });
  drawRow('NET A PAYER', '', '', eur(p.net_to_pay_cents), true);
  y -= 10;

  // Charges patronales
  page.drawText(clean('CHARGES PATRONALES (info)'), { x: left, y, size: 9, font: bold, color: rgb(0.4, 0.4, 0.4) });
  y -= 12;
  page.drawText(`Total patronal : ${eur(p.total_employer_charges_cents)}`, { x: left, y, size: 8, font });
  if (p.fillon_reduction_cents > 0) {
    page.drawText(`(incl. reduction Fillon -${eur(p.fillon_reduction_cents)})`, { x: 260, y, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
  }
  y -= 14;

  // Conges et cumuls
  if ((p.cp_balance_end ?? 0) > 0 || (p.rtt_balance_end ?? 0) > 0) {
    page.drawText(clean('CONGES ET RTT'), { x: left, y, size: 9, font: bold });
    y -= 12;
    page.drawText(`Solde CP : ${(p.cp_balance_end ?? 0).toFixed(1)} j`, { x: left, y, size: 9, font });
    if ((p.rtt_balance_end ?? 0) > 0) page.drawText(`Solde RTT : ${(p.rtt_balance_end ?? 0).toFixed(1)} j`, { x: 200, y, size: 9, font });
    y -= 14;
  }

  if ((p.ytd_gross_cents ?? 0) > 0) {
    page.drawText(clean('CUMULS ANNUELS'), { x: left, y, size: 9, font: bold });
    y -= 12;
    page.drawText(`Brut : ${eur(p.ytd_gross_cents ?? 0)}`, { x: left, y, size: 8, font });
    page.drawText(`Net imposable : ${eur(p.ytd_net_taxable_cents ?? 0)}`, { x: 200, y, size: 8, font });
    page.drawText(`Net a payer : ${eur(p.ytd_net_to_pay_cents ?? 0)}`, { x: 400, y, size: 8, font });
    y -= 14;
  }

  // Mentions legales
  y = Math.max(y, 80);
  page.drawLine({ start: { x: left, y }, end: { x: width - left, y }, thickness: 0.3 });
  y -= 10;
  const legalLines = [
    clean('Mentions legales obligatoires (Art. R3243-1 et L3243-4 CT) :'),
    clean('Conservation sans limitation de duree par le salarie. En cas de litige : delai prescription 3 ans.'),
    clean('Bulletin dematerialise conforme Art. L3243-2. Base URSSAF 2026.'),
    clean(`Emis le ${new Date().toLocaleDateString('fr-FR')}.`),
  ];
  for (const line of legalLines) {
    page.drawText(line.slice(0, 110), { x: left, y, size: 7, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 9;
  }

  const bytes = await pdf.save({ useObjectStreams: false });
  return Buffer.from(bytes);
}
