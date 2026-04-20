// BUSINESS RULE [CDC-RH-V3]: Contrats de travail — 4 templates
//   - CDI (Contrat a Duree Indeterminee)
//   - CDD (Contrat a Duree Determinee) — motif obligatoire
//   - Contrat d'apprentissage (CERFA 10103-11)
//   - Convention de stage (tripartite)

import { prisma } from '@zenadmin/db';
import type { Result, AppError } from '@zenadmin/shared';
import { ok, err, notFound, validationError } from '@zenadmin/shared';
import { formatCentsEur } from '../payroll/payroll-calculator.js';
import { formatAddress } from '../payroll/address-format.js';

export interface ContractContext {
  employer: {
    name: string;
    siret: string | null;
    address: string | null;
    legalForm: string | null;
  };
  employee: {
    firstName: string;
    lastName: string;
    birthDate: Date | null;
    birthPlace: string | null;
    nationality: string;
    socialSecurityNumber: string | null;
    address: string | null;
  };
  employment: {
    position: string | null;
    contractType: string;
    cddReason: string | null;
    startDate: Date;
    endDate: Date | null;
    probationEndDate: Date | null;
    weeklyHours: number;
    monthlyGrossCents: number;
  };
}

/**
 * Charge l'employe + tenant pour generation contrat.
 */
export async function loadContractContext(employeeId: string, tenantId: string): Promise<Result<ContractContext, AppError>> {
  const employee = await prisma.hrEmployee.findFirst({
    where: { id: employeeId, tenant_id: tenantId, deleted_at: null },
    include: { position: true },
  });
  if (!employee) return err(notFound('HrEmployee', employeeId));

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return err(notFound('Tenant', tenantId));

  // Validations par type
  if (employee.contract_type === 'cdd' && !employee.cdd_reason) {
    return err(validationError('Motif CDD obligatoire (Art. L1242-12)'));
  }
  if (['cdd', 'apprentice', 'intern'].includes(employee.contract_type) && !employee.end_date) {
    return err(validationError('Date de fin obligatoire pour CDD/apprenti/stagiaire'));
  }

  return ok({
    employer: {
      name: tenant.name,
      siret: tenant.siret,
      address: formatAddress(tenant.address),
      legalForm: tenant.legal_form,
    },
    employee: {
      firstName: employee.first_name,
      lastName: employee.last_name,
      birthDate: employee.birth_date,
      birthPlace: employee.birth_place,
      nationality: employee.nationality,
      socialSecurityNumber: employee.social_security_number,
      address: [employee.address_line1, employee.zip_code, employee.city].filter(Boolean).join(', ') || null,
    },
    employment: {
      position: employee.position?.name ?? null,
      contractType: employee.contract_type,
      cddReason: employee.cdd_reason,
      startDate: employee.start_date,
      endDate: employee.end_date,
      probationEndDate: employee.probation_end_date,
      weeklyHours: employee.weekly_hours,
      monthlyGrossCents: employee.monthly_gross_cents,
    },
  });
}

function baseShell(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>${title}</title>
<style>
body { font-family: 'Times New Roman', serif; max-width: 760px; margin: 0 auto; padding: 30px; font-size: 12px; color: #000; line-height: 1.5; }
h1 { text-align: center; font-size: 16px; margin-bottom: 20px; text-transform: uppercase; }
h2 { font-size: 13px; margin-top: 18px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 2px; }
.party { margin: 10px 0; padding: 8px; background: #f5f5f5; font-size: 11px; }
.clause { margin: 12px 0; text-align: justify; }
.signature { margin-top: 40px; display: flex; justify-content: space-between; gap: 40px; }
.signature > div { flex: 1; border-top: 1px solid #000; padding-top: 4px; font-size: 11px; }
.important { border: 1px solid #000; padding: 8px; margin: 12px 0; background: #fffbe6; font-size: 11px; }
</style></head><body>${body}</body></html>`;
}

function commonParties(ctx: ContractContext): string {
  const fmt = (d: Date | null) => d ? d.toLocaleDateString('fr-FR') : '—';
  return `
<h2>Entre les parties</h2>
<div class="party">
<strong>L'EMPLOYEUR</strong><br/>
${ctx.employer.name}${ctx.employer.legalForm ? ` (${ctx.employer.legalForm})` : ''}<br/>
${ctx.employer.address ?? ''}<br/>
${ctx.employer.siret ? `SIRET : ${ctx.employer.siret}` : ''}<br/>
Ci-apres « l'Employeur »
</div>
<div class="party">
<strong>LE SALARIE</strong><br/>
${ctx.employee.lastName.toUpperCase()} ${ctx.employee.firstName}<br/>
Ne(e) le ${fmt(ctx.employee.birthDate)}${ctx.employee.birthPlace ? ` a ${ctx.employee.birthPlace}` : ''}<br/>
Nationalite : ${ctx.employee.nationality}<br/>
${ctx.employee.socialSecurityNumber ? `NIR : ${ctx.employee.socialSecurityNumber}<br/>` : ''}
${ctx.employee.address ? `Domicilie(e) : ${ctx.employee.address}<br/>` : ''}
Ci-apres « le Salarie »
</div>`;
}

export function renderCdiContract(ctx: ContractContext): string {
  const fmt = (d: Date | null) => d ? d.toLocaleDateString('fr-FR') : '—';
  const body = `
<h1>Contrat de travail a duree indeterminee</h1>
${commonParties(ctx)}

<h2>Article 1 — Engagement</h2>
<div class="clause">
L'Employeur engage le Salarie en contrat a duree indeterminee (CDI), a compter du
<strong>${fmt(ctx.employment.startDate)}</strong>, au poste de <strong>${ctx.employment.position ?? '[A COMPLETER]'}</strong>.
</div>

<h2>Article 2 — Periode d'essai</h2>
<div class="clause">
Le present contrat est conclu sous reserve d'une periode d'essai de
${ctx.employment.probationEndDate ? `<strong>jusqu'au ${fmt(ctx.employment.probationEndDate)}</strong>` : '<strong>2 mois</strong> (ouvriers/employes) ou <strong>3 mois</strong> (agents de maitrise/techniciens)'},
renouvelable une fois par accord ecrit des deux parties.
</div>

<h2>Article 3 — Duree et repartition du travail</h2>
<div class="clause">
Le Salarie est engage pour une duree hebdomadaire de <strong>${ctx.employment.weeklyHours} heures</strong>.
${ctx.employment.weeklyHours < 35 ? 'Temps partiel. La repartition des horaires sera communiquee par ecrit.' : 'Temps plein.'}
</div>

<h2>Article 4 — Remuneration</h2>
<div class="clause">
La remuneration brute mensuelle est fixee a <strong>${formatCentsEur(ctx.employment.monthlyGrossCents)} EUR</strong>,
versee le dernier jour de chaque mois par virement bancaire.
</div>

<h2>Article 5 — Conges payes</h2>
<div class="clause">
Le Salarie beneficie des conges payes conformement a la legislation en vigueur (2,5 jours ouvrables par mois travaille, soit 30 jours par an).
</div>

<h2>Article 6 — Convention collective</h2>
<div class="clause">
Le Salarie est soumis aux dispositions de la convention collective applicable a l'entreprise, disponible a la consultation.
</div>

<h2>Article 7 — Rupture</h2>
<div class="clause">
Le present contrat peut etre rompu a l'initiative de chacune des parties dans les conditions prevues par le Code du travail (preavis selon conventions).
</div>

<div class="signature">
<div>L'Employeur<br/>Fait a ${ctx.employer.name.split(' ')[0] ?? '[Ville]'}, le ${fmt(new Date())}<br/><br/>Signature :</div>
<div>Le Salarie<br/>Mention « lu et approuve »<br/><br/>Signature :</div>
</div>`;
  return baseShell('Contrat de travail CDI', body);
}

export function renderCddContract(ctx: ContractContext): string {
  const fmt = (d: Date | null) => d ? d.toLocaleDateString('fr-FR') : '—';
  const body = `
<h1>Contrat de travail a duree determinee</h1>
${commonParties(ctx)}

<div class="important">
<strong>Motif du recours au CDD</strong> (Art. L1242-12 CT) :<br/>
${ctx.employment.cddReason}
</div>

<h2>Article 1 — Engagement et duree</h2>
<div class="clause">
L'Employeur engage le Salarie en contrat a duree determinee, au poste de
<strong>${ctx.employment.position ?? '[A COMPLETER]'}</strong>,
du <strong>${fmt(ctx.employment.startDate)}</strong> au <strong>${fmt(ctx.employment.endDate)}</strong>.
</div>

<h2>Article 2 — Periode d'essai</h2>
<div class="clause">
Periode d'essai : 1 jour par semaine dans la limite de 2 semaines (CDD < 6 mois) ou 1 mois (CDD >= 6 mois) —
Art. L1242-10 CT.
</div>

<h2>Article 3 — Temps de travail</h2>
<div class="clause">Duree hebdomadaire : ${ctx.employment.weeklyHours} heures.</div>

<h2>Article 4 — Remuneration</h2>
<div class="clause">
Remuneration brute mensuelle : <strong>${formatCentsEur(ctx.employment.monthlyGrossCents)} EUR</strong>.
</div>

<h2>Article 5 — Indemnite de fin de contrat</h2>
<div class="clause">
Au terme du contrat, le Salarie percevra une indemnite de precarite egale a 10% de la remuneration brute totale
versee (sauf exceptions : refus d'un CDI similaire, rupture pour faute grave, CDD saisonnier, contrats etudiants).
</div>

<h2>Article 6 — Indemnite compensatrice de conges payes</h2>
<div class="clause">
Au terme du contrat, le Salarie percevra une indemnite compensatrice egale a 10% de la remuneration brute totale
(Art. L1243-9 CT).
</div>

<div class="signature">
<div>L'Employeur<br/>Fait le ${fmt(new Date())}<br/><br/>Signature :</div>
<div>Le Salarie<br/>Mention « lu et approuve »<br/><br/>Signature :</div>
</div>`;
  return baseShell('Contrat de travail CDD', body);
}

export function renderApprenticeshipContract(ctx: ContractContext): string {
  const fmt = (d: Date | null) => d ? d.toLocaleDateString('fr-FR') : '—';
  const body = `
<h1>Contrat d'apprentissage</h1>
<p style="font-size:11px; color:#666;">Pre-remplissage du CERFA 10103-11. Version signee a telecharger sur <a href="https://www.service-public.fr">service-public.fr</a>.</p>
${commonParties(ctx)}

<h2>Article 1 — Engagement</h2>
<div class="clause">
L'Employeur engage l'apprenti en contrat d'apprentissage (Art. L6221-1 CT) pour la periode du
<strong>${fmt(ctx.employment.startDate)}</strong> au <strong>${fmt(ctx.employment.endDate)}</strong>.
</div>

<h2>Article 2 — Formation</h2>
<div class="clause">
L'apprenti suit une formation en alternance dans un Centre de Formation d'Apprentis (CFA) en vue
d'obtenir une qualification professionnelle. [A completer : nom CFA, diplome prepare]
</div>

<h2>Article 3 — Duree du travail</h2>
<div class="clause">
Duree hebdomadaire : ${ctx.employment.weeklyHours} heures, incluant les heures de formation en CFA.
Les apprentis de moins de 18 ans ne peuvent travailler plus de 8h/jour et 35h/semaine sauf derogation.
</div>

<h2>Article 4 — Remuneration</h2>
<div class="clause">
Remuneration brute mensuelle : <strong>${formatCentsEur(ctx.employment.monthlyGrossCents)} EUR</strong>,
calculee en pourcentage du SMIC selon l'age et l'annee du contrat (Art. D6222-26).
</div>

<h2>Article 5 — Maitre d'apprentissage</h2>
<div class="clause">
L'apprenti sera suivi par un maitre d'apprentissage designe par l'Employeur. [A completer : nom, qualification]
</div>

<h2>Article 6 — Rupture</h2>
<div class="clause">
Rupture libre durant les 45 premiers jours effectifs en entreprise. Au-dela, rupture uniquement par accord
ecrit des parties ou decision du conseil de prud'hommes (Art. L6222-18 CT).
</div>

<div class="signature">
<div>L'Employeur<br/>Signature :</div>
<div>L'apprenti (et son representant legal si mineur)<br/>Signature :</div>
</div>`;
  return baseShell('Contrat d\'apprentissage', body);
}

export function renderInternshipAgreement(ctx: ContractContext): string {
  const fmt = (d: Date | null) => d ? d.toLocaleDateString('fr-FR') : '—';
  const body = `
<h1>Convention de stage</h1>
<p style="font-size:11px; color:#666;">Convention tripartite : entreprise, stagiaire, etablissement d'enseignement (a signer par les 3).</p>
${commonParties(ctx)}

<h2>Article 1 — Objet et duree</h2>
<div class="clause">
La presente convention a pour objet la realisation d'un stage au sein de l'entreprise ${ctx.employer.name},
du <strong>${fmt(ctx.employment.startDate)}</strong> au <strong>${fmt(ctx.employment.endDate)}</strong>,
pour une duree hebdomadaire de ${ctx.employment.weeklyHours} heures.
</div>

<h2>Article 2 — Mission</h2>
<div class="clause">Mission confiee au stagiaire : <strong>${ctx.employment.position ?? '[A COMPLETER]'}</strong></div>

<h2>Article 3 — Gratification</h2>
<div class="clause">
${ctx.employment.monthlyGrossCents > 0
  ? `Gratification mensuelle : <strong>${formatCentsEur(ctx.employment.monthlyGrossCents)} EUR</strong>.`
  : 'Stage non gratifie (duree < 2 mois consecutifs).'}
Rappel : au-dela de 2 mois consecutifs, la gratification est obligatoire et au minimum 15% du plafond mensuel de la Securite sociale (Art. L124-6 Code education).
</div>

<h2>Article 4 — Avantages et protections</h2>
<div class="clause">
Le stagiaire beneficie des protections prevues par le Code de l'education (articles L124-1 a L124-20) :
acces au restaurant d'entreprise, remboursement transports, congés pour grossesse/paternite, etc.
</div>

<h2>Article 5 — Encadrement</h2>
<div class="clause">
Tuteur entreprise : [A completer]<br/>
Enseignant referent : [A completer]<br/>
Etablissement d'enseignement : [A completer]
</div>

<div class="signature">
<div>L'Entreprise<br/>Signature :</div>
<div>Le Stagiaire (et son representant legal si mineur)<br/>Signature :</div>
<div>L'etablissement<br/>Signature :</div>
</div>`;
  return baseShell('Convention de stage', body);
}

export function renderContract(ctx: ContractContext): string {
  switch (ctx.employment.contractType) {
    case 'cdi': return renderCdiContract(ctx);
    case 'cdd': case 'seasonal': return renderCddContract(ctx);
    case 'apprentice': return renderApprenticeshipContract(ctx);
    case 'intern': return renderInternshipAgreement(ctx);
    default: return renderCdiContract(ctx);
  }
}

export async function markContractSigned(employeeId: string, tenantId: string): Promise<Result<{ signedAt: Date }, AppError>> {
  const employee = await prisma.hrEmployee.findFirst({
    where: { id: employeeId, tenant_id: tenantId, deleted_at: null },
  });
  if (!employee) return err(notFound('HrEmployee', employeeId));
  const signedAt = new Date();
  await prisma.hrEmployee.update({
    where: { id: employeeId },
    data: { contract_signed_at: signedAt },
  });
  return ok({ signedAt });
}
