import { prisma } from '@zenadmin/db';
import type { Prisma } from '@prisma/client';
import type { DuerpRepository, DuerpDocument, DuerpWorkUnit, DuerpRisk } from './duerp.service.js';

// BUSINESS RULE [CDC-2.4]: DUERP Prisma repository with normalized work_units + risks
// Schema: Duerp -> DuerpWorkUnit[] -> DuerpRisk[]
// All risks are stored under a default work unit when the service delivers a flat risks[] list.

const DEFAULT_WORK_UNIT_NAME = '__default__';

// BUSINESS RULE [CDC-2.4]: Encoding type+description in the Prisma `description` column
// The Prisma schema doesn't have a `type` column, so we JSON-encode it as:
//   { "type": "chantier", "description": "..." }
// Legacy rows with plain text are treated as type='autre'.
function encodeWorkUnitData(type: string, description: string): string {
  return JSON.stringify({ type, description });
}

function decodeWorkUnitData(raw: string | null): { type: string; description: string } {
  if (!raw) return { type: 'autre', description: '' };
  try {
    const parsed = JSON.parse(raw) as { type?: string; description?: string };
    if (parsed && typeof parsed === 'object' && 'type' in parsed) {
      return {
        type: parsed.type ?? 'autre',
        description: parsed.description ?? '',
      };
    }
  } catch {
    // Legacy plain text description
  }
  return { type: 'autre', description: raw };
}

interface PrismaDuerpRow {
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
  work_units?: Array<{
    id: string;
    duerp_id: string;
    name: string;
    description: string | null;
    employee_count: number;
    risks?: Array<{
      id: string;
      work_unit_id: string;
      category: string;
      label: string;
      description: string | null;
      gravity: number;
      probability: number;
      risk_level: number;
      exposure_situations: unknown;
      health_consequences: unknown;
      legal_references: unknown;
      residual_risk: number | null;
      prevention_measures?: Array<{
        id: string;
        risk_id: string;
        label: string;
        type: string;
        principle_level: number;
        priority: string;
        responsible_role: string | null;
        verification_method: string | null;
        status: string;
      }>;
    }>;
  }>;
}

function mapToDuerpDocument(row: PrismaDuerpRow): DuerpDocument {
  const workUnits: DuerpWorkUnit[] = [];
  const risks: DuerpRisk[] = [];

  for (const wu of row.work_units ?? []) {
    // Skip the default synthetic work unit from the output
    if (wu.name !== DEFAULT_WORK_UNIT_NAME) {
      const decoded = decodeWorkUnitData(wu.description);
      workUnits.push({
        id: wu.id,
        duerp_id: row.id,
        name: wu.name,
        type: decoded.type,
        description: decoded.description,
      });
    }

    for (const r of wu.risks ?? []) {
      const preventiveActions = (r.prevention_measures ?? []).map((m) => m.label);
      risks.push({
        id: r.id,
        duerp_id: row.id,
        risk_id: null,
        category: r.category,
        name: r.label,
        description: r.description,
        gravity: r.gravity,
        probability: r.probability,
        risk_level: r.risk_level,
        risk_label: riskLevelLabel(r.risk_level),
        preventive_actions: preventiveActions,
        existing_measures: null,
        responsible: null,
        deadline: null,
      });
    }
  }

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
    evaluation_date: row.evaluation_date,
    convention_collective: null,
    code_idcc: null,
    work_units: workUnits,
    risks,
    version: row.version,
    status: row.status,
    notes: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}

function riskLevelLabel(score: number): string {
  if (score <= 3) return 'faible';
  if (score <= 6) return 'modere';
  if (score <= 9) return 'eleve';
  return 'critique';
}

const INCLUDE_ALL = {
  work_units: {
    include: {
      risks: {
        include: { prevention_measures: true },
      },
    },
  },
} as const;

export function createPrismaDuerpRepository(): DuerpRepository {
  return {
    async create(tenantId, data) {
      // Create DUERP with nested work_units and risks
      const defaultWorkUnits = data.work_units.length === 0
        ? [{ name: DEFAULT_WORK_UNIT_NAME, type: 'default', description: '' }]
        : data.work_units;

      // For each input work unit, include any risks that match (or all risks in the default)
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
          version: data.version ?? 1,
          work_units: {
            create: defaultWorkUnits.map((wu, wuIndex) => ({
              name: wu.name,
              description: encodeWorkUnitData(wu.type, wu.description ?? ''),
              employee_count: 1,
              // Attach all risks to the first work unit (the service delivers a flat list)
              risks: wuIndex === 0 ? {
                create: data.risks.map((r) => ({
                  category: r.category,
                  label: r.name,
                  description: r.description ?? null,
                  gravity: r.gravity,
                  probability: r.probability,
                  risk_level: r.risk_level,
                  exposure_situations: [] as string[],
                  health_consequences: [] as string[],
                  legal_references: [] as string[],
                  prevention_measures: {
                    create: r.preventive_actions.map((action) => ({
                      label: action,
                      type: 'organizational',
                      principle_level: 1,
                      priority: 'short_term',
                    })),
                  },
                })),
              } : undefined,
            })),
          },
        },
        include: INCLUDE_ALL,
      });

      return mapToDuerpDocument(row as PrismaDuerpRow);
    },

    async findById(id, tenantId) {
      const row = await prisma.duerp.findFirst({
        where: { id, tenant_id: tenantId, deleted_at: null },
        include: INCLUDE_ALL,
      });
      if (!row) return null;
      return mapToDuerpDocument(row as PrismaDuerpRow);
    },

    async findLatest(tenantId) {
      const row = await prisma.duerp.findFirst({
        where: { tenant_id: tenantId, deleted_at: null },
        orderBy: { created_at: 'desc' },
        include: INCLUDE_ALL,
      });
      if (!row) return null;
      return mapToDuerpDocument(row as PrismaDuerpRow);
    },

    async update(id, tenantId, data) {
      const existing = await prisma.duerp.findFirst({
        where: { id, tenant_id: tenantId, deleted_at: null },
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
      if (data.version !== undefined) updateData.version = data.version;

      // If work_units or risks are provided, replace them atomically
      if (data.work_units || data.risks) {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          await tx.duerpWorkUnit.deleteMany({ where: { duerp_id: id } });

          const wuInputs = data.work_units && data.work_units.length > 0
            ? data.work_units
            : [{ name: DEFAULT_WORK_UNIT_NAME, type: 'default', description: '' }];

          for (let i = 0; i < wuInputs.length; i++) {
            const wu = wuInputs[i]!;
            await tx.duerpWorkUnit.create({
              data: {
                duerp_id: id,
                name: wu.name,
                description: encodeWorkUnitData(wu.type, wu.description ?? ''),
                employee_count: 1,
                risks: i === 0 && data.risks ? {
                  create: data.risks.map((r) => ({
                    category: r.category,
                    label: r.name,
                    description: r.description ?? null,
                    gravity: r.gravity,
                    probability: r.probability,
                    risk_level: r.risk_level,
                    exposure_situations: [] as string[],
                    health_consequences: [] as string[],
                    legal_references: [] as string[],
                    prevention_measures: {
                      create: r.preventive_actions.map((action) => ({
                        label: action,
                        type: 'organizational',
                        principle_level: 1,
                        priority: 'short_term',
                      })),
                    },
                  })),
                } : undefined,
              },
            });
          }

          await tx.duerp.update({ where: { id }, data: updateData });
        });
      } else if (Object.keys(updateData).length > 0) {
        await prisma.duerp.update({ where: { id }, data: updateData });
      }

      const row = await prisma.duerp.findFirst({
        where: { id, tenant_id: tenantId },
        include: INCLUDE_ALL,
      });
      if (!row) return null;
      return mapToDuerpDocument(row as PrismaDuerpRow);
    },

    async softDelete(id, tenantId) {
      const existing = await prisma.duerp.findFirst({
        where: { id, tenant_id: tenantId, deleted_at: null },
      });
      if (!existing) return false;
      await prisma.duerp.update({
        where: { id },
        data: { deleted_at: new Date() },
      });
      return true;
    },

    async list(tenantId) {
      const rows = await prisma.duerp.findMany({
        where: { tenant_id: tenantId, deleted_at: null },
        orderBy: { created_at: 'desc' },
        include: INCLUDE_ALL,
      });
      return rows.map((r: unknown) => mapToDuerpDocument(r as PrismaDuerpRow));
    },
  };
}
