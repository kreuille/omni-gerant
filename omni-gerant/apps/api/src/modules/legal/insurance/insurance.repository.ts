import { prisma } from '@omni-gerant/db';
import type { InsuranceRepository, InsuranceDocument } from './insurance.service.js';

// BUSINESS RULE [CDC-2.4]: Insurance vault Prisma repository

export function createPrismaInsuranceRepository(): InsuranceRepository {
  return {
    async create(tenantId, data) {
      const row = await prisma.insurancePolicy.create({
        data: {
          tenant_id: tenantId,
          type: data.type,
          insurer: data.insurer,
          policy_number: data.policy_number ?? null,
          start_date: data.start_date,
          end_date: data.end_date,
          premium_cents: data.premium_cents ?? null,
          coverage_amount_cents: data.coverage_amount_cents ?? null,
          document_url: data.document_url ?? null,
          status: data.status ?? 'active',
        },
      });
      return mapInsurance(row);
    },

    async findById(id, tenantId) {
      const row = await prisma.insurancePolicy.findFirst({
        where: { id, tenant_id: tenantId },
      });
      return row ? mapInsurance(row) : null;
    },

    async update(id, tenantId, data) {
      const existing = await prisma.insurancePolicy.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!existing) return null;

      const updateData: Record<string, unknown> = {};
      if (data.type !== undefined) updateData.type = data.type;
      if (data.insurer !== undefined) updateData.insurer = data.insurer;
      if (data.policy_number !== undefined) updateData.policy_number = data.policy_number;
      if (data.start_date !== undefined) updateData.start_date = data.start_date;
      if (data.end_date !== undefined) updateData.end_date = data.end_date;
      if (data.premium_cents !== undefined) updateData.premium_cents = data.premium_cents;
      if (data.coverage_amount_cents !== undefined) updateData.coverage_amount_cents = data.coverage_amount_cents;
      if (data.document_url !== undefined) updateData.document_url = data.document_url;
      if (data.status !== undefined) updateData.status = data.status;

      const row = await prisma.insurancePolicy.update({
        where: { id },
        data: updateData,
      });
      return mapInsurance(row);
    },

    async softDelete(id, tenantId) {
      const existing = await prisma.insurancePolicy.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!existing) return false;
      await prisma.insurancePolicy.delete({ where: { id } });
      return true;
    },

    async list(tenantId) {
      const rows = await prisma.insurancePolicy.findMany({
        where: { tenant_id: tenantId },
        orderBy: { end_date: 'asc' },
      });
      return rows.map(mapInsurance);
    },

    async findExpiring(tenantId, beforeDate) {
      const now = new Date();
      const rows = await prisma.insurancePolicy.findMany({
        where: {
          tenant_id: tenantId,
          end_date: { gte: now, lte: beforeDate },
        },
        orderBy: { end_date: 'asc' },
      });
      return rows.map(mapInsurance);
    },

    async findAllExpiring(beforeDate) {
      const now = new Date();
      const rows = await prisma.insurancePolicy.findMany({
        where: {
          end_date: { gte: now, lte: beforeDate },
        },
        orderBy: { end_date: 'asc' },
      });
      return rows.map(mapInsurance);
    },
  };
}

function mapInsurance(row: {
  id: string;
  tenant_id: string;
  type: string;
  insurer: string;
  policy_number: string | null;
  start_date: Date;
  end_date: Date;
  premium_cents: number | null;
  coverage_amount_cents: number | null;
  document_url: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): InsuranceDocument {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    type: row.type,
    insurer: row.insurer,
    policy_number: row.policy_number,
    start_date: row.start_date,
    end_date: row.end_date,
    premium_cents: row.premium_cents,
    coverage_amount_cents: row.coverage_amount_cents,
    document_url: row.document_url,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}
