import { prisma } from '@zenadmin/db';
import type { Prisma } from '@prisma/client';
import type { RgpdRepository, RgpdRegistry, RgpdTreatment } from './rgpd.service.js';

// BUSINESS RULE [CDC-2.4]: RGPD registry Prisma repository
// The RgpdRegistry is a container with embedded treatments.
// We use RgpdTreatment model in Prisma for individual treatments
// and synthesize the registry from the tenant's treatments.

export function createPrismaRgpdRepository(): RgpdRepository {
  return {
    async createRegistry(tenantId, data) {
      // The "registry" is virtual — we just track its existence
      // by having treatments. Create a marker via tenant settings if needed.
      const registry: RgpdRegistry = {
        id: tenantId, // registry ID = tenant ID (one per tenant)
        tenant_id: tenantId,
        company_name: data.company_name,
        responsible_name: data.responsible_name,
        dpo_name: data.dpo_name ?? null,
        dpo_email: data.dpo_email ?? null,
        treatments: [],
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      return registry;
    },

    async findRegistry(tenantId) {
      const treatments = await prisma.rgpdTreatment.findMany({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'asc' },
      });

      if (treatments.length === 0) return null;

      return {
        id: tenantId,
        tenant_id: tenantId,
        company_name: '',
        responsible_name: '',
        dpo_name: null,
        dpo_email: null,
        treatments: treatments.map(mapTreatment),
        created_at: treatments[0]!.created_at,
        updated_at: treatments[treatments.length - 1]!.updated_at,
        deleted_at: null,
      };
    },

    async updateRegistry(tenantId, data) {
      const existing = await this.findRegistry(tenantId);
      if (!existing) return null;
      return { ...existing, ...data, updated_at: new Date() } as RgpdRegistry;
    },

    async deleteRegistry(tenantId) {
      const result = await prisma.rgpdTreatment.deleteMany({
        where: { tenant_id: tenantId },
      });
      return result.count > 0;
    },

    async addTreatment(registryId, data) {
      const row = await prisma.rgpdTreatment.create({
        data: {
          tenant_id: registryId, // registryId = tenantId
          name: data.name,
          purpose: data.purpose,
          legal_basis: data.legal_basis,
          data_categories: data.data_categories as Prisma.InputJsonValue,
          data_subjects: data.data_subjects as Prisma.InputJsonValue,
          recipients: data.recipients ? (data.recipients as Prisma.InputJsonValue) : undefined,
          retention_days: data.retention_days ?? null,
          security_measures: data.security_measures ? (data.security_measures as Prisma.InputJsonValue) : undefined,
          transfer_outside_eu: data.transfer_outside_eu ?? false,
          transfer_details: data.transfer_details ?? null,
          dpia_required: data.dpia_required ?? false,
          status: 'active',
        },
      });
      return mapTreatment(row);
    },

    async updateTreatment(registryId, treatmentId, data) {
      try {
        const updateData: Record<string, unknown> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.purpose !== undefined) updateData.purpose = data.purpose;
        if (data.legal_basis !== undefined) updateData.legal_basis = data.legal_basis;
        if (data.data_categories !== undefined) updateData.data_categories = data.data_categories;
        if (data.data_subjects !== undefined) updateData.data_subjects = data.data_subjects;
        if (data.recipients !== undefined) updateData.recipients = data.recipients;
        if (data.retention_days !== undefined) updateData.retention_days = data.retention_days;
        if (data.security_measures !== undefined) updateData.security_measures = data.security_measures;
        if (data.transfer_outside_eu !== undefined) updateData.transfer_outside_eu = data.transfer_outside_eu;
        if (data.transfer_details !== undefined) updateData.transfer_details = data.transfer_details;
        if (data.dpia_required !== undefined) updateData.dpia_required = data.dpia_required;

        const row = await prisma.rgpdTreatment.update({
          where: { id: treatmentId },
          data: updateData as Prisma.RgpdTreatmentUpdateInput,
        });
        return mapTreatment(row);
      } catch {
        return null;
      }
    },

    async deleteTreatment(registryId, treatmentId) {
      try {
        await prisma.rgpdTreatment.delete({ where: { id: treatmentId } });
        return true;
      } catch {
        return false;
      }
    },
  };
}

function mapTreatment(row: {
  id: string;
  name: string;
  purpose: string;
  legal_basis: string;
  data_categories: unknown;
  data_subjects: unknown;
  recipients: unknown;
  retention_days: number | null;
  security_measures: unknown;
  transfer_outside_eu: boolean;
  transfer_details: string | null;
  dpia_required: boolean;
  status: string;
  created_at: Date;
  updated_at: Date;
}): RgpdTreatment {
  return {
    id: row.id,
    name: row.name,
    purpose: row.purpose,
    legal_basis: row.legal_basis,
    data_categories: row.data_categories as string[],
    data_subjects: row.data_subjects as string[],
    recipients: (row.recipients as string[]) ?? [],
    retention_days: row.retention_days,
    security_measures: (row.security_measures as string[]) ?? [],
    transfer_outside_eu: row.transfer_outside_eu,
    transfer_details: row.transfer_details,
    dpia_required: row.dpia_required,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
