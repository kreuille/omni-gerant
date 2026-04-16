import { ok, err } from '@zenadmin/shared';
import type { Result, AppError } from '@zenadmin/shared';
import type {
  CreateRegistryInput,
  UpdateRegistryInput,
  TreatmentInput,
  UpdateTreatmentInput,
  LegalBasis,
} from './rgpd.schemas.js';

// BUSINESS RULE [CDC-2.4]: Service Registre RGPD

export interface RgpdTreatment {
  id: string;
  registry_id: string;
  name: string;
  purpose: string;
  legal_basis: LegalBasis;
  data_categories: string[];
  data_subjects: string;
  recipients: string[];
  retention_period: string;
  security_measures: string[];
  transfer_outside_eu: boolean;
  transfer_details: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface RgpdRegistry {
  id: string;
  tenant_id: string;
  company_name: string;
  siret: string | null;
  dpo_name: string | null;
  dpo_email: string | null;
  treatments: RgpdTreatment[];
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface RgpdRepository {
  createRegistry(tenantId: string, data: Omit<RgpdRegistry, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<RgpdRegistry>;
  findRegistry(tenantId: string): Promise<RgpdRegistry | null>;
  updateRegistry(tenantId: string, data: Partial<RgpdRegistry>): Promise<RgpdRegistry | null>;
  deleteRegistry(tenantId: string): Promise<boolean>;
  addTreatment(registryId: string, data: Omit<RgpdTreatment, 'id' | 'created_at' | 'updated_at'>): Promise<RgpdTreatment>;
  updateTreatment(registryId: string, treatmentId: string, data: Partial<RgpdTreatment>): Promise<RgpdTreatment | null>;
  deleteTreatment(registryId: string, treatmentId: string): Promise<boolean>;
}

// BUSINESS RULE [CDC-2.4]: Pre-remplissage du registre des donnees clients
// 5 traitements par defaut pour une TPE
interface DefaultTreatment {
  name: string;
  purpose: string;
  legal_basis: LegalBasis;
  data_categories: string[];
  data_subjects: string;
  recipients: string[];
  retention_period: string;
  security_measures: string[];
}

const DEFAULT_TREATMENTS: DefaultTreatment[] = [
  {
    name: 'Gestion de la relation client',
    purpose: 'Gestion du fichier clients, suivi des commandes, service apres-vente, historique des echanges',
    legal_basis: 'contrat',
    data_categories: [
      'Identite (nom, prenom)',
      'Coordonnees (adresse, telephone, email)',
      'Donnees de facturation (SIRET, TVA)',
      'Historique des commandes',
    ],
    data_subjects: 'Clients et prospects',
    recipients: ['Personnel habilite', 'Prestataire hebergement'],
    retention_period: '3 ans apres la fin de la relation commerciale',
    security_measures: [
      'Acces restreint par mot de passe',
      'Chiffrement des donnees en transit (TLS)',
      'Sauvegardes regulieres',
    ],
  },
  {
    name: 'Facturation et comptabilite',
    purpose: 'Emission et suivi des factures, gestion comptable, declarations fiscales',
    legal_basis: 'obligation_legale',
    data_categories: [
      'Identite (nom, prenom, raison sociale)',
      'Coordonnees (adresse)',
      'Donnees bancaires (IBAN pour virements)',
      'Montants factures',
    ],
    data_subjects: 'Clients et fournisseurs',
    recipients: ['Personnel comptable', 'Expert-comptable', 'Administration fiscale'],
    retention_period: '10 ans (obligation legale comptable)',
    security_measures: [
      'Acces restreint au personnel comptable',
      'Archivage securise',
      'Piste d\'audit',
    ],
  },
  {
    name: 'Gestion des fournisseurs',
    purpose: 'Suivi des commandes fournisseurs, gestion des contrats, paiements',
    legal_basis: 'contrat',
    data_categories: [
      'Identite du contact (nom, prenom)',
      'Coordonnees professionnelles (email, telephone)',
      'Donnees entreprise (SIRET, adresse)',
      'Coordonnees bancaires (RIB)',
    ],
    data_subjects: 'Fournisseurs et sous-traitants',
    recipients: ['Personnel habilite', 'Banque (pour virements)'],
    retention_period: '5 ans apres la fin du contrat',
    security_measures: [
      'Acces restreint par profil',
      'Chiffrement des coordonnees bancaires',
      'Journalisation des acces',
    ],
  },
  {
    name: 'Gestion du personnel',
    purpose: 'Gestion administrative des salaries, paie, conges, formation',
    legal_basis: 'obligation_legale',
    data_categories: [
      'Identite (nom, prenom, date de naissance)',
      'Numero de securite sociale',
      'Coordonnees personnelles',
      'Donnees bancaires (virement salaire)',
      'Donnees de paie',
    ],
    data_subjects: 'Salaries et stagiaires',
    recipients: ['Service RH', 'Expert-comptable', 'Organismes sociaux (URSSAF, caisses)'],
    retention_period: '5 ans apres le depart du salarie (50 ans pour les bulletins de paie)',
    security_measures: [
      'Acces strictement limite au service RH',
      'Chiffrement des donnees sensibles',
      'Coffre-fort numerique pour bulletins de paie',
      'Journalisation des acces',
    ],
  },
  {
    name: 'Prospection commerciale',
    purpose: 'Envoi de communications commerciales, newsletters, offres promotionnelles',
    legal_basis: 'interet_legitime',
    data_categories: [
      'Identite (nom, prenom)',
      'Coordonnees (email, telephone)',
      'Historique des interactions',
    ],
    data_subjects: 'Prospects et anciens clients',
    recipients: ['Personnel commercial', 'Prestataire emailing (si applicable)'],
    retention_period: '3 ans apres le dernier contact',
    security_measures: [
      'Lien de desinscription dans chaque communication',
      'Base prospects separee de la base clients',
      'Consentement trace pour la prospection B2C',
    ],
  },
];

function treatmentInputToTreatment(
  input: TreatmentInput,
  registryId: string,
): RgpdTreatment {
  return {
    id: crypto.randomUUID(),
    registry_id: registryId,
    name: input.name,
    purpose: input.purpose,
    legal_basis: input.legal_basis,
    data_categories: input.data_categories,
    data_subjects: input.data_subjects,
    recipients: input.recipients,
    retention_period: input.retention_period,
    security_measures: input.security_measures,
    transfer_outside_eu: input.transfer_outside_eu ?? false,
    transfer_details: input.transfer_details ?? null,
    notes: input.notes ?? null,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

// BUSINESS RULE [CDC-2.4]: Export au format standard CNIL
export function exportCnilFormat(registry: RgpdRegistry): string {
  const header = [
    'Activite de traitement',
    'Finalite',
    'Base legale',
    'Categories de donnees',
    'Personnes concernees',
    'Destinataires',
    'Duree de conservation',
    'Mesures de securite',
    'Transfert hors UE',
    'Details transfert',
  ].join('\t');

  const rows = registry.treatments.map((t) =>
    [
      t.name,
      t.purpose,
      t.legal_basis,
      t.data_categories.join(', '),
      t.data_subjects,
      t.recipients.join(', '),
      t.retention_period,
      t.security_measures.join(', '),
      t.transfer_outside_eu ? 'Oui' : 'Non',
      t.transfer_details ?? '',
    ].join('\t'),
  );

  const meta = [
    `Responsable de traitement\t${registry.company_name}`,
    `SIRET\t${registry.siret ?? 'Non renseigne'}`,
    `DPO / Referent\t${registry.dpo_name ?? 'Non designe'}`,
    `Email DPO\t${registry.dpo_email ?? ''}`,
    `Date d'export\t${new Date().toISOString().split('T')[0]}`,
    '',
  ].join('\n');

  return `${meta}${header}\n${rows.join('\n')}`;
}

export function createRgpdService(repo: RgpdRepository) {
  return {
    async createRegistry(
      tenantId: string,
      input: CreateRegistryInput,
    ): Promise<Result<RgpdRegistry, AppError>> {
      const existing = await repo.findRegistry(tenantId);
      if (existing) {
        return err({ code: 'CONFLICT', message: 'Un registre RGPD existe deja pour ce tenant' });
      }

      const registryId = crypto.randomUUID();
      const treatments: RgpdTreatment[] = [];

      // BUSINESS RULE [CDC-2.4]: Pre-remplissage automatique
      if (input.prefill !== false) {
        for (const def of DEFAULT_TREATMENTS) {
          treatments.push(treatmentInputToTreatment({
            ...def,
            transfer_outside_eu: false,
          }, registryId));
        }
      }

      const registry = await repo.createRegistry(tenantId, {
        tenant_id: tenantId,
        company_name: input.company_name,
        siret: input.siret ?? null,
        dpo_name: input.dpo_name ?? null,
        dpo_email: input.dpo_email ?? null,
        treatments,
      });

      return ok(registry);
    },

    async getRegistry(
      tenantId: string,
    ): Promise<Result<RgpdRegistry | null, AppError>> {
      const registry = await repo.findRegistry(tenantId);
      return ok(registry);
    },

    async updateRegistry(
      tenantId: string,
      input: UpdateRegistryInput,
    ): Promise<Result<RgpdRegistry, AppError>> {
      const existing = await repo.findRegistry(tenantId);
      if (!existing) {
        return err({ code: 'NOT_FOUND', message: 'Registre RGPD non trouve' });
      }

      const updateData: Partial<RgpdRegistry> = {};
      if (input.company_name) updateData.company_name = input.company_name;
      if (input.siret !== undefined) updateData.siret = input.siret ?? null;
      if (input.dpo_name !== undefined) updateData.dpo_name = input.dpo_name ?? null;
      if (input.dpo_email !== undefined) updateData.dpo_email = input.dpo_email ?? null;

      const updated = await repo.updateRegistry(tenantId, updateData);
      if (!updated) return err({ code: 'NOT_FOUND', message: 'Registre RGPD non trouve' });

      return ok(updated);
    },

    async deleteRegistry(
      tenantId: string,
    ): Promise<Result<void, AppError>> {
      const deleted = await repo.deleteRegistry(tenantId);
      if (!deleted) return err({ code: 'NOT_FOUND', message: 'Registre RGPD non trouve' });
      return ok(undefined);
    },

    async addTreatment(
      tenantId: string,
      input: TreatmentInput,
    ): Promise<Result<RgpdTreatment, AppError>> {
      const registry = await repo.findRegistry(tenantId);
      if (!registry) {
        return err({ code: 'NOT_FOUND', message: 'Registre RGPD non trouve' });
      }

      const treatment = await repo.addTreatment(registry.id, {
        registry_id: registry.id,
        name: input.name,
        purpose: input.purpose,
        legal_basis: input.legal_basis,
        data_categories: input.data_categories,
        data_subjects: input.data_subjects,
        recipients: input.recipients,
        retention_period: input.retention_period,
        security_measures: input.security_measures,
        transfer_outside_eu: input.transfer_outside_eu ?? false,
        transfer_details: input.transfer_details ?? null,
        notes: input.notes ?? null,
      });

      return ok(treatment);
    },

    async updateTreatment(
      tenantId: string,
      treatmentId: string,
      input: UpdateTreatmentInput,
    ): Promise<Result<RgpdTreatment, AppError>> {
      const registry = await repo.findRegistry(tenantId);
      if (!registry) {
        return err({ code: 'NOT_FOUND', message: 'Registre RGPD non trouve' });
      }

      const updated = await repo.updateTreatment(registry.id, treatmentId, input as Partial<RgpdTreatment>);
      if (!updated) {
        return err({ code: 'NOT_FOUND', message: `Traitement ${treatmentId} non trouve` });
      }

      return ok(updated);
    },

    async deleteTreatment(
      tenantId: string,
      treatmentId: string,
    ): Promise<Result<void, AppError>> {
      const registry = await repo.findRegistry(tenantId);
      if (!registry) {
        return err({ code: 'NOT_FOUND', message: 'Registre RGPD non trouve' });
      }

      const deleted = await repo.deleteTreatment(registry.id, treatmentId);
      if (!deleted) {
        return err({ code: 'NOT_FOUND', message: `Traitement ${treatmentId} non trouve` });
      }

      return ok(undefined);
    },

    async exportCnil(
      tenantId: string,
    ): Promise<Result<string, AppError>> {
      const registry = await repo.findRegistry(tenantId);
      if (!registry) {
        return err({ code: 'NOT_FOUND', message: 'Registre RGPD non trouve' });
      }

      return ok(exportCnilFormat(registry));
    },

    getDefaultTreatments(): DefaultTreatment[] {
      return [...DEFAULT_TREATMENTS];
    },
  };
}
