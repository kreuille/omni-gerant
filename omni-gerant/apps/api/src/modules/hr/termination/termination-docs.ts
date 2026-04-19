// BUSINESS RULE [CDC-RH-V4]: Documents obligatoires de sortie
// - Solde de tout compte (Art. L1234-20 CT) — double exemplaire, dont recu
// - Certificat de travail (Art. L1234-19 CT) — obligatoire quel que soit le motif
// - Attestation Pole Emploi (Art. R1234-9 CT) — remise obligatoire pour tous sauf demission

import type { TerminationBreakdown } from './termination.service.js';
import { formatCentsEur } from '../payroll/payroll-calculator.js';

export interface TerminationDocContext {
  employer: {
    name: string;
    siret: string | null;
    address: string | null;
    nafCode: string | null;
  };
  employee: {
    firstName: string;
    lastName: string;
    birthDate: Date | null;
    socialSecurityNumber: string | null;
    address: string | null;
    position: string | null;
    contractType: string;
    hireDate: Date;
  };
  breakdown: TerminationBreakdown;
}

function shell(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>${title}</title>
<style>
body { font-family: 'Times New Roman', serif; max-width: 780px; margin: 0 auto; padding: 30px; font-size: 12px; line-height: 1.5; color: #000; }
h1 { text-align: center; font-size: 16px; text-transform: uppercase; margin-bottom: 16px; }
h2 { font-size: 13px; border-bottom: 1px solid #000; margin-top: 18px; padding-bottom: 2px; }
table { width: 100%; border-collapse: collapse; margin: 8px 0; }
td, th { padding: 5px 7px; border: 1px solid #888; }
td.label { background: #f0f0f0; font-weight: 600; width: 50%; }
td.num { text-align: right; font-variant-numeric: tabular-nums; }
.total { background: #ffffcc; font-weight: bold; }
.legal { font-size: 10px; color: #555; margin-top: 16px; }
.signature { margin-top: 40px; display: flex; justify-content: space-between; gap: 30px; }
.signature > div { flex: 1; border-top: 1px solid #000; padding-top: 4px; font-size: 11px; }
</style></head><body>${body}</body></html>`;
}

const fmtDate = (d: Date | null) => d ? d.toLocaleDateString('fr-FR') : '—';

export function renderSoldeToutCompte(ctx: TerminationDocContext): string {
  const { employer, employee, breakdown } = ctx;
  const body = `
<h1>Recu pour solde de tout compte</h1>

<p>Je soussigne(e) <strong>${employee.lastName.toUpperCase()} ${employee.firstName}</strong>,
demeurant ${employee.address ?? '—'},
reconnais avoir recu de la societe <strong>${employer.name}</strong>${employer.siret ? ` (SIRET ${employer.siret})` : ''}
la somme detaillee ci-dessous, en contrepartie de l'execution et de la cessation de mon contrat de travail,
et ce pour solde de tout compte.</p>

<h2>Detail du solde</h2>
<table>
<tr><td class="label">Anciennete</td><td>${breakdown.seniorityYears} an(s) et ${breakdown.seniorityMonths} mois</td></tr>
<tr><td class="label">Salaire mensuel de reference</td><td class="num">${formatCentsEur(breakdown.baseMonthlyGrossCents)} EUR</td></tr>
${breakdown.indemniteLegaleLicenciementCents > 0 ? `<tr><td class="label">Indemnite legale de licenciement</td><td class="num">${formatCentsEur(breakdown.indemniteLegaleLicenciementCents)} EUR</td></tr>` : ''}
${breakdown.indemniteRuptureConventionnelleCents > 0 ? `<tr><td class="label">Indemnite rupture conventionnelle</td><td class="num">${formatCentsEur(breakdown.indemniteRuptureConventionnelleCents)} EUR</td></tr>` : ''}
${breakdown.indemnitePrecariteCents > 0 ? `<tr><td class="label">Indemnite de precarite (CDD 10%)</td><td class="num">${formatCentsEur(breakdown.indemnitePrecariteCents)} EUR</td></tr>` : ''}
${breakdown.indemniteCompensatriceCongesCents > 0 ? `<tr><td class="label">Indemnite compensatrice conges payes</td><td class="num">${formatCentsEur(breakdown.indemniteCompensatriceCongesCents)} EUR</td></tr>` : ''}
${breakdown.indemniteCompensatricePreavisCents > 0 ? `<tr><td class="label">Indemnite compensatrice preavis</td><td class="num">${formatCentsEur(breakdown.indemniteCompensatricePreavisCents)} EUR</td></tr>` : ''}
<tr class="total"><td class="label">TOTAL NET A VERSER</td><td class="num">${formatCentsEur(breakdown.totalIndemnitesCents)} EUR</td></tr>
</table>

<p class="legal">
<strong>Mention legale (Art. L1234-20 CT)</strong> : le present recu est etabli en double exemplaire,
dont l'un est remis au salarie. Il peut etre denonce dans les 6 mois qui suivent sa signature ;
au-dela, il devient liberatoire pour l'employeur des sommes mentionnees.
</p>

<div class="signature">
<div>L'Employeur<br/>Fait le ${fmtDate(breakdown.terminationDate)}<br/><br/>Signature :</div>
<div>Le Salarie<br/>Mention « pour solde de tout compte »<br/><br/>Signature :</div>
</div>`;
  return shell('Solde de tout compte', body);
}

export function renderCertificatTravail(ctx: TerminationDocContext): string {
  const { employer, employee, breakdown } = ctx;
  const body = `
<h1>Certificat de travail</h1>

<p>Je soussigne(e), representant de la societe <strong>${employer.name}</strong>,
${employer.address ? `sise ${employer.address},` : ''}
${employer.siret ? `immatriculee au registre du commerce sous le numero SIRET ${employer.siret},` : ''}
certifie avoir employe :</p>

<table>
<tr><td class="label">Nom et prenom</td><td>${employee.lastName.toUpperCase()} ${employee.firstName}</td></tr>
${employee.birthDate ? `<tr><td class="label">Ne(e) le</td><td>${fmtDate(employee.birthDate)}</td></tr>` : ''}
${employee.socialSecurityNumber ? `<tr><td class="label">NIR</td><td>${employee.socialSecurityNumber}</td></tr>` : ''}
<tr><td class="label">Du</td><td>${fmtDate(employee.hireDate)}</td></tr>
<tr><td class="label">Au</td><td>${fmtDate(breakdown.terminationDate)}</td></tr>
<tr><td class="label">Emploi occupe</td><td>${employee.position ?? '—'}</td></tr>
<tr><td class="label">Type de contrat</td><td>${employee.contractType.toUpperCase()}</td></tr>
</table>

<p style="margin-top: 16px;">
Le salarie quitte la societe libre de tout engagement.
</p>

<p class="legal">
Article L1234-19 CT : le certificat doit etre remis au salarie a l'expiration du contrat, meme en cas de demission.
Il contient les dates d'entree et de sortie ainsi que la nature de l'emploi.
</p>

<div class="signature" style="justify-content: flex-end;">
<div style="flex: 0 0 40%;">L'Employeur<br/>Fait a ${employer.name}, le ${fmtDate(breakdown.terminationDate)}<br/><br/>Signature et cachet :</div>
</div>`;
  return shell('Certificat de travail', body);
}

export function renderAttestationPoleEmploi(ctx: TerminationDocContext): string {
  const { employer, employee, breakdown } = ctx;
  const reasonLabel: Record<string, string> = {
    demission: 'Demission',
    licenciement: 'Licenciement',
    fin_cdd: 'Fin de CDD',
    rupture_conventionnelle: 'Rupture conventionnelle',
    retraite: 'Depart a la retraite',
    deces: 'Deces',
    fin_periode_essai: 'Fin de periode d\'essai',
    fin_apprentissage: 'Fin de contrat d\'apprentissage',
  };
  const body = `
<h1>Attestation Pole Emploi (France Travail)</h1>
<p style="font-size:11px; color:#666;">Version simplifiee a transmettre a l'ex-salarie. L'attestation definitive
doit etre generee via la DSN mensuelle ou sur <a href="https://entreprise.pole-emploi.fr">entreprise.pole-emploi.fr</a>.</p>

<h2>Employeur</h2>
<table>
<tr><td class="label">Denomination</td><td>${employer.name}</td></tr>
<tr><td class="label">SIRET</td><td>${employer.siret ?? '—'}</td></tr>
<tr><td class="label">Code APE</td><td>${employer.nafCode ?? '—'}</td></tr>
<tr><td class="label">Adresse</td><td>${employer.address ?? '—'}</td></tr>
</table>

<h2>Salarie</h2>
<table>
<tr><td class="label">Nom / Prenom</td><td>${employee.lastName.toUpperCase()} ${employee.firstName}</td></tr>
<tr><td class="label">NIR</td><td>${employee.socialSecurityNumber ?? '—'}</td></tr>
<tr><td class="label">Date de naissance</td><td>${fmtDate(employee.birthDate)}</td></tr>
</table>

<h2>Contrat</h2>
<table>
<tr><td class="label">Type</td><td>${employee.contractType.toUpperCase()}</td></tr>
<tr><td class="label">Emploi</td><td>${employee.position ?? '—'}</td></tr>
<tr><td class="label">Du</td><td>${fmtDate(employee.hireDate)}</td></tr>
<tr><td class="label">Au</td><td>${fmtDate(breakdown.terminationDate)}</td></tr>
<tr><td class="label">Motif de rupture</td><td>${reasonLabel[breakdown.reason] ?? breakdown.reason}</td></tr>
</table>

<h2>Sommes versees a la sortie</h2>
<table>
<tr><td class="label">Base mensuelle brut</td><td class="num">${formatCentsEur(breakdown.baseMonthlyGrossCents)} EUR</td></tr>
<tr><td class="label">Total indemnites</td><td class="num">${formatCentsEur(breakdown.totalIndemnitesCents)} EUR</td></tr>
</table>

<p class="legal">
Cette attestation simplifiee sert de justificatif a l'employeur et au salarie.
Pour les droits au chomage, l'attestation officielle doit etre transmise via la DSN evenementielle
dans les 5 jours suivant la fin du contrat (Art. R1234-9 CT).
</p>

<div class="signature" style="justify-content: flex-end;">
<div style="flex: 0 0 40%;">L'Employeur<br/>Le ${fmtDate(breakdown.terminationDate)}<br/><br/>Signature :</div>
</div>`;
  return shell('Attestation Pole Emploi', body);
}
