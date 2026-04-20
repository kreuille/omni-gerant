// BUSINESS RULE [CDC-RH-V6]: Generation XML DSN NEODeS v2026.01
//
// La DSN (Declaration Sociale Nominative) utilise le format NEODeS
// specifie par net-entreprises.fr. C'est un format CCAM structure :
//   - Blocs S10 a S90 (identification, etablissement, salarie, remuneration)
//   - Rubriques normalisees (S21.G00.30.001, etc.)
//   - Periode (mois M) transmise avant le 5 (trimestriel) ou 15 (mensuel)
//
// Spec complete : http://www.net-entreprises.fr/media/documentation/cahier-technique-DSN.pdf
//
// V1 : generation simplifiee MINIMUM viable — couvre embauche + salaire brut
// Production reelle : nesite validation + certification par Urssaf Caisse Nationale

import type { DsnMonthlyPayload } from './dsn.service.js';

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

function formatDate(d: Date): string {
  return `${pad(d.getDate(), 2)}${pad(d.getMonth() + 1, 2)}${d.getFullYear()}`;
}

function neodesField(blockCode: string, rubricCode: string, value: string | number): string {
  return `S21.G00.${blockCode}.${rubricCode},'${String(value).replace(/'/g, '')}'`;
}

/**
 * Genere le fichier DSN NEODeS au format CCAM.
 * Format : lignes "S21.G00.XX.YYY,'valeur'" separees par CRLF.
 */
export function generateNeodesFile(payload: DsnMonthlyPayload): string {
  const lines: string[] = [];

  // S10 — Envoi (emetteur)
  lines.push(neodesField('10', '001', 'DSN')); // type
  lines.push(neodesField('10', '002', 'V2026.01')); // version norme
  lines.push(neodesField('10', '003', payload.employer.siret ?? ''));
  lines.push(neodesField('10', '004', payload.employer.name));
  lines.push(neodesField('10', '005', formatDate(new Date()))); // date constitution

  // S20 — Declaration
  lines.push(neodesField('20', '001', '01')); // nature : 01=mensuelle normale, 02=annule-remplace, 03=evenement
  lines.push(neodesField('20', '003', String(payload.period.year) + pad(payload.period.month, 2) + '01')); // debut periode
  lines.push(neodesField('20', '004', String(payload.period.year) + pad(payload.period.month, 2) + '28')); // fin periode

  // S21 — Entreprise
  const siren = (payload.employer.siret ?? '').slice(0, 9);
  lines.push(neodesField('06', '001', siren));
  lines.push(neodesField('06', '002', payload.employer.name));
  lines.push(neodesField('06', '003', payload.employer.nafCode ?? ''));

  // S21.G00.11 — Etablissement
  lines.push(neodesField('11', '001', (payload.employer.siret ?? '').slice(9, 14)));
  lines.push(neodesField('11', '002', payload.employer.nafCode ?? ''));

  // S21.G00.30 — Individu (salarie) — boucle par employe
  for (const emp of payload.employees) {
    lines.push(neodesField('30', '001', emp.nir ?? '')); // NIR
    lines.push(neodesField('30', '002', emp.lastName));
    lines.push(neodesField('30', '004', emp.firstName));
    lines.push(neodesField('30', '015', '01')); // sexe (inconnu 01)

    // S21.G00.40 — Contrat
    lines.push(neodesField('40', '001', emp.startDate.replace(/-/g, ''))); // date embauche
    lines.push(neodesField('40', '007', emp.contractType === 'cdi' ? '01' : emp.contractType === 'cdd' ? '02' : emp.contractType === 'apprentice' ? '73' : '09')); // nature contrat
    if (emp.endDate) lines.push(neodesField('40', '009', emp.endDate.replace(/-/g, '')));

    // S21.G00.50 — Versement/remuneration
    lines.push(neodesField('50', '002', (emp.grossCents / 100).toFixed(2))); // remuneration nette imposable
    lines.push(neodesField('50', '003', (emp.netTaxableCents / 100).toFixed(2)));
    lines.push(neodesField('50', '004', (emp.totalEmployeeDeductionsCents / 100).toFixed(2))); // cotisations salariales

    // S21.G00.81 — Cotisations URSSAF
    lines.push(neodesField('81', '001', '075')); // code URSSAF (fictif ici)
    lines.push(neodesField('81', '003', (emp.grossCents / 100).toFixed(2))); // assiette
    lines.push(neodesField('81', '004', (emp.employerChargesCents / 100).toFixed(2)));

    // S21.G00.51 — Retenue PAS
    if (emp.pasCents > 0) {
      lines.push(neodesField('51', '001', 'PAS'));
      lines.push(neodesField('51', '011', (emp.pasCents / 100).toFixed(2)));
    }
  }

  // S90 — Fin declaration
  lines.push(neodesField('90', '001', String(payload.employees.length))); // nb individus
  lines.push(neodesField('90', '002', (payload.totals.grossCents / 100).toFixed(2))); // total brut

  return lines.join('\r\n') + '\r\n';
}

/**
 * Informations de transmission : URL net-entreprises, format attendu,
 * calendrier obligatoire.
 */
export const NEODES_INFO = {
  transmissionUrl: 'https://www.net-entreprises.fr/declaration/dsn/',
  format: 'NEODeS V2026.01 (CCAM)',
  fileExtension: '.dsn',
  encoding: 'ISO-8859-15 ou UTF-8',
  deadlineMonthly: 'Avant le 5 du mois M+1 (mensualite M) ou le 15 (mensualite M-1)',
  deadlineEvent: '5 jours apres evenement (sortie, arret de travail)',
  certification: 'Necessite certificat numerique (niveau 2) enregistre net-entreprises.fr',
};
