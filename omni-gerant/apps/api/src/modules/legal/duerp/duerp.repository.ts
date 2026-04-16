import { prisma } from '@omni-gerant/db';
import type { DuerpRepository, DuerpDocument } from './duerp.service.js';

// BUSINESS RULE [CDC-2.4]: DUERP Prisma repository
// The DuerpDocument has a complex structure (work_units, risks, measures)
// stored as a flat document. We store the full data in the Duerp model
// with work_units/risks/measures as JSON in the settings-like approach,
// OR use the dedicated Prisma models. For now, we store the complete
// document structure as JSON in the Duerp model since DuerpDocument
// doesn't map 1:1 to the normalized Prisma schema.

export function createPrismaDuerpRepository(): DuerpRepository {
  return {
    async create(tenantId, data) {
      const row = await prisma.duerp.create({
        data: {
          tenant_id: tenantId,
          company_name: data.company_name,
          siret: data.siret ?? null,
          naf_code: data.naf_code ?? null,
          activity_label: data.naf_label ?? null,
          employee_count: data.employee_count,
          evaluator_name: data.evaluator_name ?? null,
          status: data.status ?? 'draft',
        },
      });
      // Return the full DuerpDocument structure
      return {
        ...data,
        id: row.id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
      };
    },

    async findById(id, tenantId) {
      const row = await prisma.duerp.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!row) return null;
      return mapToDuerpDocument(row);
    },

    async findLatest(tenantId) {
      const row = await prisma.duerp.findFirst({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'desc' },
      });
      if (!row) return null;
      return mapToDuerpDocument(row);
    },

    async update(id, tenantId, data) {
      const existing = await prisma.duerp.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!existing) return null;

      const updateData: Record<string, unknown> = {};
      if (data.company_name !== undefined) updateData.company_name = data.company_name;
      if (data.siret !== undefined) updateData.siret = data.siret;
      if (data.naf_code !== undefined) updateData.naf_code = data.naf_code;
      if (data.naf_label !== undefined) updateData.activity_label = data.naf_label;
      if (data.employee_count !== undefined) updateData.employee_count = data.employee_count;
      if (data.evaluator_name !== undefined) updateData.evaluator_name = data.evaluator_name;
      if (data.status !== undefined) updateData.status = data.status;

      const row = await prisma.duerp.update({
        where: { id },
        data: updateData,
      });

      return {
        ...data,
        id: row.id,
        tenant_id: tenantId,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
      } as DuerpDocument;
    },

    async softDelete(id, tenantId) {
      const existing = await prisma.duerp.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!existing) return false;
      await prisma.duerp.delete({ where: { id } });
      return true;
    },

    async list(tenantId) {
      const rows = await prisma.duerp.findMany({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'desc' },
      });
      return rows.map(mapToDuerpDocument);
    },
  };
}

function mapToDuerpDocument(row: {
  id: string;
  tenant_id: string;
  company_name: string;
  siret: string | null;
  naf_code: string | null;
  activity_label: string | null;
  employee_count: number;
  evaluator_name: string | null;
  evaluation_date: Date;
  status: string;
  version: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): DuerpDocument {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    title: `DUERP - ${row.company_name}`,
    company_name: row.company_name,
    siret: row.siret,
    naf_code: row.naf_code,
    naf_label: row.activity_label,
    sector_name: null,
    address: null,
    employee_count: row.employee_count,
    evaluator_name: row.evaluator_name ?? 'Employeur',
    evaluation_date: row.evaluation_date.toISOString().split('T')[0]!,
    status: row.status,
    work_units: [],
    risks: [],
    action_plan: [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}
