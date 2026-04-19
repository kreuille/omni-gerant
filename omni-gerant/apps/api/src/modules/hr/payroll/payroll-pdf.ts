import type { PayslipRecord } from './payroll.service.js';
import { formatCentsEur } from './payroll-calculator.js';

// BUSINESS RULE [CDC-RH-V2]: Bulletin de paie HTML conforme Code du travail
// Art. R3243-1 — mentions obligatoires :
// 1. nom et adresse employeur + SIRET + code APE + URSSAF
// 2. identite du salarie : nom, emploi, position conventionnelle, coefficient
// 3. periode et nombre d'heures travaillees
// 4. nature et montant des accessoires de salaire
// 5. montant brut
// 6. detail des cotisations et contributions sociales (libelle, base, taux, montant)
// 7. montant net a payer + net imposable
// 8. date du paiement
// 9. conges payes et RTT : periode de reference, droits, conges pris
// 10. mention "le bulletin doit etre conserve sans limitation de duree"
// 11. mention du CDC : bulletin dematerialise conforme L3243-2

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
  payslip: PayslipRecord;
  cumulative?: {
    grossCents: number;
    netTaxableCents: number;
    netToPayCents: number;
  };
}

function monthLabel(month: number): string {
  const names = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
  return names[month - 1] ?? String(month);
}

export function renderPayslipHtml(ctx: PayslipPdfContext): string {
  const { employer, employee, payslip, cumulative } = ctx;
  const periodLabel = `${monthLabel(payslip.period_month)} ${payslip.period_year}`;
  const formatPct = (r: number) => `${(r * 100).toFixed(2).replace('.', ',')} %`;

  // Assiettes affichees
  const grossBase = payslip.gross_total_cents;
  const csgBase = Math.round(grossBase * 0.9825);

  // Anciennete
  const seniorityYears = employee.startDate
    ? Math.floor((Date.now() - employee.startDate.getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Bulletin de paie — ${employee.lastName} ${employee.firstName} — ${periodLabel}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; max-width: 820px; margin: 0 auto; padding: 24px; font-size: 12px; }
    h1 { font-size: 18px; margin: 0 0 8px; text-align: center; }
    h2 { font-size: 13px; margin: 16px 0 6px; border-bottom: 1px solid #333; padding-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { padding: 4px 6px; border: 1px solid #d0d0d0; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; font-weight: 600; font-size: 11px; }
    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
    .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 12px; }
    .header > div { flex: 1; font-size: 11px; }
    .header strong { display: block; }
    .total { font-weight: bold; background: #eef; }
    .net-pay { background: #e8f5e9; font-weight: bold; font-size: 14px; }
    .legal { font-size: 10px; color: #555; margin-top: 16px; line-height: 1.4; }
    .legal p { margin: 4px 0; }
    .sig { margin-top: 24px; font-size: 11px; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <h1>Bulletin de paie — ${periodLabel}</h1>

  <div class="header">
    <div>
      <strong>Employeur</strong>
      ${employer.name}<br/>
      ${employer.address ?? ''}<br/>
      ${employer.siret ? `SIRET : ${employer.siret}<br/>` : ''}
      ${employer.nafCode ? `Code APE : ${employer.nafCode}<br/>` : ''}
      ${employer.urssafRef ? `URSSAF : ${employer.urssafRef}` : ''}
    </div>
    <div>
      <strong>Salarie</strong>
      ${employee.lastName.toUpperCase()} ${employee.firstName}<br/>
      ${employee.position ? `Emploi : ${employee.position}<br/>` : ''}
      ${employee.classification ? `Classification : ${employee.classification}<br/>` : ''}
      ${employee.socialSecurityNumber ? `N° SS : ${employee.socialSecurityNumber}<br/>` : ''}
      ${employee.contractType ? `Contrat : ${employee.contractType.toUpperCase()}<br/>` : ''}
      ${seniorityYears !== null ? `Anciennete : ${seniorityYears} an(s)` : ''}
    </div>
  </div>

  <h2>Remuneration</h2>
  <table>
    <thead>
      <tr>
        <th>Libelle</th>
        <th class="num">Base</th>
        <th class="num">Taux</th>
        <th class="num">Montant (EUR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Salaire de base</td>
        <td class="num">${payslip.hours_worked.toFixed(2)} h</td>
        <td class="num">${formatCentsEur(payslip.gross_rate_cents_per_hour)}</td>
        <td class="num">${formatCentsEur(payslip.gross_base_cents)}</td>
      </tr>
      ${(payslip.overtime_25_cents ?? 0) > 0 ? `
      <tr>
        <td>Heures supplementaires +25%</td>
        <td class="num">${(payslip.overtime_25_hours ?? 0).toFixed(2)} h</td>
        <td class="num">125%</td>
        <td class="num">${formatCentsEur(payslip.overtime_25_cents ?? 0)}</td>
      </tr>` : ''}
      ${(payslip.overtime_50_cents ?? 0) > 0 ? `
      <tr>
        <td>Heures supplementaires +50%</td>
        <td class="num">${(payslip.overtime_50_hours ?? 0).toFixed(2)} h</td>
        <td class="num">150%</td>
        <td class="num">${formatCentsEur(payslip.overtime_50_cents ?? 0)}</td>
      </tr>` : ''}
      ${(payslip.overtime_cents - (payslip.overtime_25_cents ?? 0) - (payslip.overtime_50_cents ?? 0)) > 0 ? `
      <tr>
        <td>Heures supplementaires (autres)</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td class="num">${formatCentsEur(payslip.overtime_cents - (payslip.overtime_25_cents ?? 0) - (payslip.overtime_50_cents ?? 0))}</td>
      </tr>` : ''}
      ${(payslip.benefits_in_kind_cents ?? 0) > 0 ? `
      <tr>
        <td>Avantage en nature (nourriture)</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td class="num">${formatCentsEur(payslip.benefits_in_kind_cents ?? 0)}</td>
      </tr>` : ''}
      ${(payslip.ppv_cents ?? 0) > 0 ? `
      <tr>
        <td>Prime partage de la valeur (PPV)</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td class="num">${formatCentsEur(payslip.ppv_cents ?? 0)}</td>
      </tr>` : ''}
      ${payslip.bonus_cents > 0 ? `
      <tr>
        <td>Primes</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td class="num">${formatCentsEur(payslip.bonus_cents)}</td>
      </tr>` : ''}
      <tr class="total">
        <td colspan="3">SALAIRE BRUT</td>
        <td class="num">${formatCentsEur(payslip.gross_total_cents)}</td>
      </tr>
    </tbody>
  </table>

  <h2>Cotisations et contributions salariales</h2>
  <table>
    <thead>
      <tr>
        <th>Libelle</th>
        <th class="num">Base</th>
        <th class="num">Taux</th>
        <th class="num">A deduire (EUR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Securite sociale (maladie-vieillesse)</td>
        <td class="num">${formatCentsEur(grossBase)}</td>
        <td class="num">${formatPct(0.0730)}</td>
        <td class="num">${formatCentsEur(payslip.urssaf_employee_cents)}</td>
      </tr>
      <tr>
        <td>Retraite complementaire AGIRC-ARRCO T1</td>
        <td class="num">${formatCentsEur(grossBase)}</td>
        <td class="num">${formatPct(0.0415)}</td>
        <td class="num">${formatCentsEur(payslip.retirement_employee_cents)}</td>
      </tr>
      <tr>
        <td>CSG deductible</td>
        <td class="num">${formatCentsEur(csgBase)}</td>
        <td class="num">${formatPct(0.0680)}</td>
        <td class="num">${formatCentsEur(Math.round(csgBase * 0.068))}</td>
      </tr>
      <tr>
        <td>CSG+CRDS non deductibles</td>
        <td class="num">${formatCentsEur(csgBase)}</td>
        <td class="num">${formatPct(0.0240)}</td>
        <td class="num">${formatCentsEur(Math.round(csgBase * 0.024))}</td>
      </tr>
      ${payslip.mutual_employee_cents > 0 ? `
      <tr>
        <td>Mutuelle complementaire sante (ANI 2013)</td>
        <td class="num">${formatCentsEur(grossBase)}</td>
        <td class="num">—</td>
        <td class="num">${formatCentsEur(payslip.mutual_employee_cents)}</td>
      </tr>` : ''}
      ${(payslip.prevoyance_employee_cents ?? 0) > 0 ? `
      <tr>
        <td>Prevoyance complementaire</td>
        <td class="num">${formatCentsEur(grossBase)}</td>
        <td class="num">—</td>
        <td class="num">${formatCentsEur(payslip.prevoyance_employee_cents ?? 0)}</td>
      </tr>` : ''}
      <tr class="total">
        <td colspan="3">TOTAL COTISATIONS SALARIALES</td>
        <td class="num">${formatCentsEur(payslip.total_employee_deductions_cents)}</td>
      </tr>
      ${(payslip.tr_count ?? 0) > 0 ? `
      <tr>
        <td>Titres restaurants (part salariale)</td>
        <td class="num">${payslip.tr_count} titres</td>
        <td class="num">—</td>
        <td class="num">- ${formatCentsEur(payslip.tr_employee_cents ?? 0)}</td>
      </tr>` : ''}
    </tbody>
  </table>

  <h2>Nets</h2>
  <table>
    <tbody>
      <tr>
        <td>Net imposable</td>
        <td class="num">${formatCentsEur(payslip.net_taxable_cents)}</td>
      </tr>
      ${(payslip.pas_cents ?? 0) > 0 ? `
      <tr>
        <td>Impot sur le revenu preleve a la source</td>
        <td class="num">- ${formatCentsEur(payslip.pas_cents ?? 0)}</td>
      </tr>` : ''}
      ${payslip.indemnity_cents > 0 ? `
      <tr>
        <td>Indemnites non soumises (transport, repas)</td>
        <td class="num">${formatCentsEur(payslip.indemnity_cents)}</td>
      </tr>` : ''}
      <tr class="net-pay">
        <td>NET A PAYER</td>
        <td class="num">${formatCentsEur(payslip.net_to_pay_cents)}</td>
      </tr>
    </tbody>
  </table>

  <h2>Cotisations patronales (a titre d'information)</h2>
  <table>
    <tbody>
      <tr>
        <td>URSSAF part patronale</td>
        <td class="num">${formatCentsEur(payslip.urssaf_employer_cents)}</td>
      </tr>
      <tr>
        <td>Retraite complementaire part patronale</td>
        <td class="num">${formatCentsEur(payslip.retirement_employer_cents)}</td>
      </tr>
      <tr>
        <td>Assurance chomage</td>
        <td class="num">${formatCentsEur(payslip.unemployment_employer_cents)}</td>
      </tr>
      ${payslip.fillon_reduction_cents > 0 ? `
      <tr>
        <td>Reduction generale (Fillon)</td>
        <td class="num">- ${formatCentsEur(payslip.fillon_reduction_cents)}</td>
      </tr>` : ''}
      <tr class="total">
        <td>Total charges patronales</td>
        <td class="num">${formatCentsEur(payslip.total_employer_charges_cents)}</td>
      </tr>
    </tbody>
  </table>

  ${((payslip.cp_balance_end ?? 0) > 0 || (payslip.rtt_balance_end ?? 0) > 0) ? `
  <h2>Conges payes et RTT</h2>
  <table>
    <tbody>
      <tr><td>Solde conges payes</td><td class="num">${(payslip.cp_balance_end ?? 0).toFixed(1)} jours</td></tr>
      ${(payslip.rtt_balance_end ?? 0) > 0 ? `<tr><td>Solde RTT</td><td class="num">${(payslip.rtt_balance_end ?? 0).toFixed(1)} jours</td></tr>` : ''}
    </tbody>
  </table>` : ''}

  ${(payslip.ytd_gross_cents ?? cumulative?.grossCents ?? 0) > 0 ? `
  <h2>Cumuls annuels</h2>
  <table>
    <tbody>
      <tr><td>Cumul brut</td><td class="num">${formatCentsEur(payslip.ytd_gross_cents ?? cumulative?.grossCents ?? 0)} EUR</td></tr>
      <tr><td>Cumul net imposable</td><td class="num">${formatCentsEur(payslip.ytd_net_taxable_cents ?? cumulative?.netTaxableCents ?? 0)} EUR</td></tr>
      <tr><td>Cumul net a payer</td><td class="num">${formatCentsEur(payslip.ytd_net_to_pay_cents ?? cumulative?.netToPayCents ?? 0)} EUR</td></tr>
    </tbody>
  </table>` : ''}

  <div class="legal">
    <p><strong>Mentions legales obligatoires :</strong></p>
    <p>Conservation du bulletin : pour une duree illimitee (Art. L3243-4 CT). Le salarie doit conserver ce bulletin sans limitation de duree.</p>
    <p>En cas de litige, le delai de prescription est de 3 ans a compter du paiement.</p>
    <p>Bulletin dematerialise conforme a l'article L3243-2 du Code du travail.</p>
    <p>Taux de cotisations au ${payslip.period_month}/${payslip.period_year} — base de calcul Barem URSSAF.</p>
  </div>

  <div class="sig">
    <div>Date d'emission : ${new Date().toLocaleDateString('fr-FR')}</div>
    <div>Paiement : virement</div>
  </div>
</body>
</html>`;
}
