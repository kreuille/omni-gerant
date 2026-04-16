import { ok, err } from '@zenadmin/shared';
import type { Result, AppError } from '@zenadmin/shared';
import type { CreateInsuranceInput, UpdateInsuranceInput, InsuranceType } from './insurance.schemas.js';

// BUSINESS RULE [CDC-2.4]: Service Coffre-Fort Assurances

export interface InsuranceDocument {
  id: string;
  tenant_id: string;
  type: InsuranceType;
  insurer: string;
  contract_number: string;
  start_date: Date;
  end_date: Date;
  premium_cents: number;
  document_url: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  rc_pro: 'Responsabilite Civile Professionnelle (RC Pro)',
  decennale: 'Decennale (obligatoire BTP)',
  multirisque: 'Multirisque professionnelle',
  protection_juridique: 'Protection juridique',
  prevoyance: 'Prevoyance',
};

export interface InsuranceRepository {
  create(tenantId: string, data: Omit<InsuranceDocument, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<InsuranceDocument>;
  findById(id: string, tenantId: string): Promise<InsuranceDocument | null>;
  update(id: string, tenantId: string, data: Partial<InsuranceDocument>): Promise<InsuranceDocument | null>;
  softDelete(id: string, tenantId: string): Promise<boolean>;
  list(tenantId: string): Promise<InsuranceDocument[]>;
  findExpiring(tenantId: string, beforeDate: Date): Promise<InsuranceDocument[]>;
  findAllExpiring(beforeDate: Date): Promise<InsuranceDocument[]>;
}

export function createInsuranceService(repo: InsuranceRepository) {
  return {
    async create(
      tenantId: string,
      input: CreateInsuranceInput,
    ): Promise<Result<InsuranceDocument, AppError>> {
      const startDate = new Date(input.start_date);
      const endDate = new Date(input.end_date);

      if (endDate <= startDate) {
        return err({ code: 'VALIDATION_ERROR', message: 'La date de fin doit etre posterieure a la date de debut' });
      }

      const doc = await repo.create(tenantId, {
        tenant_id: tenantId,
        type: input.type,
        insurer: input.insurer,
        contract_number: input.contract_number,
        start_date: startDate,
        end_date: endDate,
        premium_cents: input.premium_cents,
        document_url: input.document_url ?? null,
        notes: input.notes ?? null,
      });

      return ok(doc);
    },

    async getById(
      id: string,
      tenantId: string,
    ): Promise<Result<InsuranceDocument, AppError>> {
      const doc = await repo.findById(id, tenantId);
      if (!doc) return err({ code: 'NOT_FOUND', message: `Assurance ${id} non trouvee` });
      return ok(doc);
    },

    async update(
      id: string,
      tenantId: string,
      input: UpdateInsuranceInput,
    ): Promise<Result<InsuranceDocument, AppError>> {
      const existing = await repo.findById(id, tenantId);
      if (!existing) return err({ code: 'NOT_FOUND', message: `Assurance ${id} non trouvee` });

      const updateData: Partial<InsuranceDocument> = {};
      if (input.insurer) updateData.insurer = input.insurer;
      if (input.contract_number) updateData.contract_number = input.contract_number;
      if (input.start_date) updateData.start_date = new Date(input.start_date);
      if (input.end_date) updateData.end_date = new Date(input.end_date);
      if (input.premium_cents !== undefined) updateData.premium_cents = input.premium_cents;
      if (input.document_url !== undefined) updateData.document_url = input.document_url ?? null;
      if (input.notes !== undefined) updateData.notes = input.notes ?? null;

      const updated = await repo.update(id, tenantId, updateData);
      if (!updated) return err({ code: 'NOT_FOUND', message: `Assurance ${id} non trouvee` });

      return ok(updated);
    },

    async delete(
      id: string,
      tenantId: string,
    ): Promise<Result<void, AppError>> {
      const deleted = await repo.softDelete(id, tenantId);
      if (!deleted) return err({ code: 'NOT_FOUND', message: `Assurance ${id} non trouvee` });
      return ok(undefined);
    },

    async list(
      tenantId: string,
    ): Promise<Result<InsuranceDocument[], AppError>> {
      const docs = await repo.list(tenantId);
      return ok(docs);
    },

    async getExpiring(
      tenantId: string,
      withinDays: number = 60,
    ): Promise<Result<InsuranceDocument[], AppError>> {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + withinDays);
      const docs = await repo.findExpiring(tenantId, futureDate);
      return ok(docs);
    },

    async uploadDocument(
      id: string,
      tenantId: string,
      documentUrl: string,
    ): Promise<Result<InsuranceDocument, AppError>> {
      const existing = await repo.findById(id, tenantId);
      if (!existing) return err({ code: 'NOT_FOUND', message: `Assurance ${id} non trouvee` });

      const updated = await repo.update(id, tenantId, { document_url: documentUrl });
      if (!updated) return err({ code: 'NOT_FOUND', message: `Assurance ${id} non trouvee` });

      return ok(updated);
    },
  };
}
