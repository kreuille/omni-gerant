import { prisma } from '@zenadmin/db';
import type { Prisma } from '@prisma/client';
import type { RgpdRepository, RgpdRegistry, RgpdTreatment } from './rgpd.service.js';

// BUSINESS RULE [CDC-2.4]: RGPD registry Prisma repository
// The registry metadata (company_name, DPO info, SIRET) is persisted in
// Tenant.settings JSON under the "rgpd" key. Treatments use the dedicated
// RgpdTreatment table.

interface RgpdRegistrySettings {
  company_name?: string;
  siret?: string | null;
  dpo_name?: string | null;
  dpo_email?: string | null;
  created_at?: string;
}

interface TenantSettings {
  rgpd?: RgpdRegistrySettings;
  [key: string]: unknown;
}

async function readRgpdSettings(tenantId: string): Promise<RgpdRegistrySettings | null> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return null;
  const settings = (tenant.settings as TenantSettings) ?? {};
  return settings.rgpd ?? null;
}

async function writeRgpdSettings(tenantId: string, rgpd: RgpdRegistrySettings): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return;
  const currentSettings = (tenant.settings as TenantSettings) ?? {};
  const newSettings = { ...currentSettings, rgpd };
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { settings: newSettings as Prisma.InputJsonValue },
  });
}

async function buildRegistry(tenantId: string, fallback?: RgpdRegistrySettings): Promise<RgpdRegistry> {
  const settings = await readRgpdSettings(tenantId) ?? fallback ?? null;
  const treatments = await prisma.rgpdTreatment.findMany({
    where: { tenant_id: tenantId, deleted_at: null },
    orderBy: { created_at: 'asc' },
  });

  const createdAt = settings?.created_at ? new Date(settings.created_at) : new Date();
  const updatedAt = treatments.length > 0
    ? treatments[treatments.length - 1]!.updated_at
    : createdAt;

  return {
    id: tenantId,
    tenant_id: tenantId,
    company_name: settings?.company_name ?? '',
    siret: settings?.siret ?? null,
    dpo_name: settings?.dpo_name ?? null,
    dpo_email: settings?.dpo_email ?? null,
    treatments: treatments.map(mapTreatment),
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: null,
  };
}

export function createPrismaRgpdRepository(): RgpdRepository {
  return {
    async createRegistry(tenantId, data) {
      const rgpdSettings: RgpdRegistrySettings = {
        company_name: data.company_name,
        siret: data.siret ?? null,
        dpo_name: data.dpo_name ?? null,
        dpo_email: data.dpo_email ?? null,
        created_at: new Date().toISOString(),
      };
      await writeRgpdSettings(tenantId, rgpdSettings);
      return buildRegistry(tenantId, rgpdSettings);
    },

    async findRegistry(tenantId) {
      const settings = await readRgpdSettings(tenantId);
      if (!settings) return null;
      return buildRegistry(tenantId, settings);
    },

    async updateRegistry(tenantId, data) {
      const current = await readRgpdSettings(tenantId);
      if (!current) return null;
      const updated: RgpdRegistrySettings = {
        ...current,
        company_name: data.company_name ?? current.company_name,
        siret: data.siret !== undefined ? data.siret : current.siret,
        dpo_name: data.dpo_name !== undefined ? data.dpo_name : current.dpo_name,
        dpo_email: data.dpo_email !== undefined ? data.dpo_email : current.dpo_email,
      };
      await writeRgpdSettings(tenantId, updated);
      return buildRegistry(tenantId, updated);
    },

    async deleteRegistry(tenantId) {
      await prisma.rgpdTreatment.deleteMany({ where: { tenant_id: tenantId } });
      // Remove the rgpd key from tenant settings
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) return false;
      const settings = (tenant.settings as TenantSettings) ?? {};
      delete settings.rgpd;
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { settings: settings as Prisma.InputJsonValue },
      });
      return true;
    },

    async addTreatment(registryId, data) {
      // registryId == tenantId (1 registry per tenant)
      const retentionDays = parseRetentionPeriod(data.retention_period ?? null);
      const row = await prisma.rgpdTreatment.create({
        data: {
          tenant_id: registryId,
          name: data.name,
          purpose: data.purpose,
          legal_basis: data.legal_basis,
          data_categories: data.data_categories as Prisma.InputJsonValue,
          // Service exposes string; DB stores array for flexibility
          data_subjects: (Array.isArray(data.data_subjects) ? data.data_subjects : [data.data_subjects]) as Prisma.InputJsonValue,
          recipients: (data.recipients ?? []) as Prisma.InputJsonValue,
          retention_days: retentionDays,
          security_measures: (data.security_measures ?? []) as Prisma.InputJsonValue,
          transfer_outside_eu: data.transfer_outside_eu ?? false,
          transfer_details: data.transfer_details ?? null,
          dpia_required: false,
          status: 'active',
        },
      });
      return mapTreatment(row);
    },

    async updateTreatment(_registryId, treatmentId, data) {
      try {
        const updateData: Record<string, unknown> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.purpose !== undefined) updateData.purpose = data.purpose;
        if (data.legal_basis !== undefined) updateData.legal_basis = data.legal_basis;
        if (data.data_categories !== undefined) updateData.data_categories = data.data_categories;
        if (data.data_subjects !== undefined) {
          updateData.data_subjects = Array.isArray(data.data_subjects) ? data.data_subjects : [data.data_subjects];
        }
        if (data.recipients !== undefined) updateData.recipients = data.recipients;
        if (data.retention_period !== undefined) updateData.retention_days = parseRetentionPeriod(data.retention_period);
        if (data.security_measures !== undefined) updateData.security_measures = data.security_measures;
        if (data.transfer_outside_eu !== undefined) updateData.transfer_outside_eu = data.transfer_outside_eu;
        if (data.transfer_details !== undefined) updateData.transfer_details = data.transfer_details;

        const row = await prisma.rgpdTreatment.update({
          where: { id: treatmentId },
          data: updateData as Prisma.RgpdTreatmentUpdateInput,
        });
        return mapTreatment(row);
      } catch {
        return null;
      }
    },

    async deleteTreatment(_registryId, treatmentId) {
      try {
        await prisma.rgpdTreatment.update({
          where: { id: treatmentId },
          data: { deleted_at: new Date() },
        });
        return true;
      } catch {
        return false;
      }
    },
  };
}

// Parse retention period string into days (best-effort, returns null if unparseable)
function parseRetentionPeriod(value: string | null): number | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  const years = lower.match(/(\d+)\s*an/);
  if (years) return parseInt(years[1]!, 10) * 365;
  const months = lower.match(/(\d+)\s*mois/);
  if (months) return parseInt(months[1]!, 10) * 30;
  const days = lower.match(/(\d+)\s*jour/);
  if (days) return parseInt(days[1]!, 10);
  return null;
}

function formatRetentionDays(days: number | null): string {
  if (!days) return 'Non defini';
  if (days >= 365 && days % 365 === 0) return `${days / 365} an${days / 365 > 1 ? 's' : ''}`;
  if (days >= 30 && days % 30 === 0) return `${days / 30} mois`;
  return `${days} jours`;
}

function mapTreatment(row: {
  id: string;
  tenant_id: string;
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
  created_at: Date;
  updated_at: Date;
}): RgpdTreatment {
  const subjects = row.data_subjects as string[] | string | null;
  const subjectStr = Array.isArray(subjects)
    ? subjects.join(', ')
    : (subjects ?? '');

  return {
    id: row.id,
    registry_id: row.tenant_id,
    name: row.name,
    purpose: row.purpose,
    legal_basis: row.legal_basis as RgpdTreatment['legal_basis'],
    data_categories: (row.data_categories as string[]) ?? [],
    data_subjects: subjectStr,
    recipients: (row.recipients as string[]) ?? [],
    retention_period: formatRetentionDays(row.retention_days),
    security_measures: (row.security_measures as string[]) ?? [],
    transfer_outside_eu: row.transfer_outside_eu,
    transfer_details: row.transfer_details,
    notes: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
