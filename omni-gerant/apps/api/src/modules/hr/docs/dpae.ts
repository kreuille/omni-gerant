// BUSINESS RULE [CDC-RH-V3]: Declaration Prealable A l'Embauche (DPAE)
//
// Obligatoire avant toute embauche, au plus tot 8 jours avant (Art. R1221-1 CT).
// En pratique, depot dematerialise sur https://www.due.urssaf.fr/
// Le service zenAdmin genere un document PDF pre-rempli au format CERFA 14738*01
// que l'employeur peut archiver et/ou recuperer pour deposer en ligne.
//
// Mentions obligatoires :
// - Employeur : denomination, adresse, SIRET, code APE, URSSAF
// - Salarie : nom, prenom, nom naissance, date naissance, lieu naissance, nationalite, NIR
// - Emploi : intitule, code PCS-ESE (facultatif), date embauche prevue, type contrat, duree, lieu

import { prisma } from '@zenadmin/db';
import type { Result, AppError } from '@zenadmin/shared';
import { ok, err, notFound, validationError } from '@zenadmin/shared';
import { formatAddress } from '../payroll/address-format.js';

export interface DpaeContext {
  employer: {
    name: string;
    siret: string | null;
    address: string | null;
    nafCode: string | null;
  };
  employee: {
    firstName: string;
    lastName: string;
    birthName: string | null;
    birthDate: Date | null;
    birthPlace: string | null;
    nationality: string;
    socialSecurityNumber: string | null;
    address: string | null;
  };
  employment: {
    position: string | null;
    contractType: string;
    startDate: Date;
    endDate: Date | null;
    weeklyHours: number;
  };
  reference: string; // numero de reference genere
  generatedAt: Date;
}

/**
 * Genere la DPAE pour un employe. Met a jour `dpae_declared_at` + reference.
 */
export async function generateDpae(employeeId: string, tenantId: string): Promise<Result<DpaeContext, AppError>> {
  const employee = await prisma.hrEmployee.findFirst({
    where: { id: employeeId, tenant_id: tenantId, deleted_at: null },
    include: { position: true },
  });
  if (!employee) return err(notFound('HrEmployee', employeeId));

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return err(notFound('Tenant', tenantId));

  // Validation : champs obligatoires DPAE
  if (!employee.social_security_number) {
    return err(validationError('NIR requis pour DPAE'));
  }
  if (!employee.birth_date || !employee.birth_place) {
    return err(validationError('Date et lieu de naissance requis pour DPAE'));
  }

  const reference = `DPAE-${tenantId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date();

  await prisma.hrEmployee.update({
    where: { id: employeeId },
    data: { dpae_declared_at: now, dpae_reference: reference },
  });

  return ok({
    employer: {
      name: tenant.name,
      siret: tenant.siret,
      address: formatAddress(tenant.address),
      nafCode: tenant.naf_code,
    },
    employee: {
      firstName: employee.first_name,
      lastName: employee.last_name,
      birthName: employee.birth_name,
      birthDate: employee.birth_date,
      birthPlace: employee.birth_place,
      nationality: employee.nationality,
      socialSecurityNumber: employee.social_security_number,
      address: [employee.address_line1, employee.zip_code, employee.city].filter(Boolean).join(', ') || null,
    },
    employment: {
      position: employee.position?.name ?? null,
      contractType: employee.contract_type,
      startDate: employee.start_date,
      endDate: employee.end_date,
      weeklyHours: employee.weekly_hours,
    },
    reference,
    generatedAt: now,
  });
}

export function renderDpaeHtml(ctx: DpaeContext): string {
  const fmt = (d: Date | null) => d ? d.toLocaleDateString('fr-FR') : '';
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><title>DPAE ${ctx.reference}</title>
<style>
body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; font-size: 12px; color: #000; }
h1 { text-align: center; font-size: 16px; }
h2 { font-size: 13px; border-bottom: 1px solid #000; margin-top: 20px; padding-bottom: 2px; }
table { width: 100%; border-collapse: collapse; }
td { padding: 4px 6px; border: 1px solid #999; vertical-align: top; }
td.label { width: 35%; background: #f0f0f0; font-weight: 600; }
.info { margin: 12px 0; padding: 10px; background: #fffbe6; border: 1px solid #f0c040; font-size: 11px; }
.ref { text-align: right; font-size: 10px; color: #666; }
</style></head><body>
<h1>DECLARATION PREALABLE A L'EMBAUCHE (DPAE)</h1>
<p class="ref">Reference interne : ${ctx.reference}<br/>Generee le ${ctx.generatedAt.toLocaleString('fr-FR')}</p>

<div class="info">
Ce document doit etre depose en ligne sur <strong>https://www.due.urssaf.fr/</strong>
au plus tot 8 jours avant la date d'embauche, et au plus tard dans les instants precedant l'embauche.
Conservation obligatoire : 5 ans (Art. R1221-26 CT).
</div>

<h2>Employeur</h2>
<table>
  <tr><td class="label">Denomination</td><td>${ctx.employer.name}</td></tr>
  <tr><td class="label">SIRET</td><td>${ctx.employer.siret ?? '—'}</td></tr>
  <tr><td class="label">Code APE</td><td>${ctx.employer.nafCode ?? '—'}</td></tr>
  <tr><td class="label">Adresse</td><td>${ctx.employer.address ?? '—'}</td></tr>
</table>

<h2>Salarie</h2>
<table>
  <tr><td class="label">Nom d'usage</td><td>${ctx.employee.lastName.toUpperCase()}</td></tr>
  <tr><td class="label">Nom de naissance</td><td>${ctx.employee.birthName ?? ctx.employee.lastName.toUpperCase()}</td></tr>
  <tr><td class="label">Prenom(s)</td><td>${ctx.employee.firstName}</td></tr>
  <tr><td class="label">Date de naissance</td><td>${fmt(ctx.employee.birthDate)}</td></tr>
  <tr><td class="label">Lieu de naissance</td><td>${ctx.employee.birthPlace ?? ''}</td></tr>
  <tr><td class="label">Nationalite</td><td>${ctx.employee.nationality}</td></tr>
  <tr><td class="label">NIR (numero SS)</td><td>${ctx.employee.socialSecurityNumber ?? ''}</td></tr>
  <tr><td class="label">Adresse</td><td>${ctx.employee.address ?? ''}</td></tr>
</table>

<h2>Emploi</h2>
<table>
  <tr><td class="label">Poste</td><td>${ctx.employment.position ?? ''}</td></tr>
  <tr><td class="label">Type de contrat</td><td>${ctx.employment.contractType.toUpperCase()}</td></tr>
  <tr><td class="label">Date d'embauche</td><td>${fmt(ctx.employment.startDate)}</td></tr>
  ${ctx.employment.endDate ? `<tr><td class="label">Date de fin</td><td>${fmt(ctx.employment.endDate)}</td></tr>` : ''}
  <tr><td class="label">Duree hebdomadaire</td><td>${ctx.employment.weeklyHours} h</td></tr>
</table>

<p style="margin-top: 30px; font-size: 11px;">
Fait a ${ctx.employer.name}, le ${fmt(new Date())}<br/>
Signature de l'employeur :
</p>
</body></html>`;
}
