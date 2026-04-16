import { prisma } from '@omni-gerant/db';
import type { Prisma } from '@prisma/client';
import type { InvoiceRepository, Invoice } from './invoice.service.js';

// BUSINESS RULE [CDC-2.1]: Invoice CRUD with Prisma
// BUSINESS RULE [R02]: Montants en centimes

export function createPrismaInvoiceRepository(): InvoiceRepository {
  const includeLines = { lines: { orderBy: { position: 'asc' as const } } };

  return {
    async create(data) {
      const row = await prisma.invoice.create({
        data: {
          tenant_id: data.tenant_id,
          client_id: data.client_id,
          quote_id: data.quote_id ?? null,
          number: data.number,
          type: data.type,
          status: 'draft',
          due_date: data.due_date,
          deposit_percent: data.deposit_percent ?? null,
          situation_percent: data.situation_percent ?? null,
          previous_situation_cents: data.previous_situation_cents ?? null,
          payment_terms: data.payment_terms,
          notes: data.notes ?? null,
          total_ht_cents: data.total_ht_cents,
          total_tva_cents: data.total_tva_cents,
          total_ttc_cents: data.total_ttc_cents,
          paid_cents: 0,
          remaining_cents: data.remaining_cents,
          lines: {
            create: data.lines.map((l) => ({
              position: l.position,
              label: l.label,
              description: l.description ?? null,
              quantity: l.quantity,
              unit: l.unit,
              unit_price_cents: l.unit_price_cents,
              tva_rate: l.tva_rate,
              total_ht_cents: l.total_ht_cents,
            })),
          },
        },
        include: includeLines,
      });
      return mapInvoice(row);
    },

    async findById(id, tenantId) {
      const row = await prisma.invoice.findFirst({
        where: { id, tenant_id: tenantId },
        include: includeLines,
      });
      return row ? mapInvoice(row) : null;
    },

    async findMany(params) {
      const where: Prisma.InvoiceWhereInput = { tenant_id: params.tenant_id };
      if (params.status) where.status = params.status;
      if (params.type) where.type = params.type;
      if (params.client_id) where.client_id = params.client_id;
      if (params.search) {
        where.OR = [
          { number: { contains: params.search, mode: 'insensitive' } },
        ];
      }

      const rows = await prisma.invoice.findMany({
        where,
        include: includeLines,
        take: params.limit + 1,
        skip: params.cursor ? 1 : 0,
        cursor: params.cursor ? { id: params.cursor } : undefined,
        orderBy: { created_at: 'desc' },
      });

      const hasMore = rows.length > params.limit;
      const items = hasMore ? rows.slice(0, params.limit) : rows;
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!.id : null;

      return { items: items.map(mapInvoice), next_cursor: nextCursor, has_more: hasMore };
    },

    async updateStatus(id, tenantId, status, extra) {
      const existing = await prisma.invoice.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!existing) return null;

      const data: Prisma.InvoiceUpdateInput = { status };
      if (extra?.finalized_at) data.finalized_at = extra.finalized_at as Date;
      if (extra?.paid_at) data.paid_at = extra.paid_at as Date;

      const row = await prisma.invoice.update({
        where: { id },
        data,
        include: { lines: { orderBy: { position: 'asc' } } },
      });
      return mapInvoice(row);
    },

    async updatePayment(id, tenantId, paidCents, remainingCents, status, paidAt) {
      const existing = await prisma.invoice.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!existing) return null;

      const row = await prisma.invoice.update({
        where: { id },
        data: {
          paid_cents: paidCents,
          remaining_cents: remainingCents,
          status,
          paid_at: paidAt ?? null,
        },
        include: { lines: { orderBy: { position: 'asc' } } },
      });
      return mapInvoice(row);
    },

    async delete(id, tenantId) {
      const existing = await prisma.invoice.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!existing) return false;
      await prisma.invoice.delete({ where: { id } });
      return true;
    },
  };
}

function mapInvoice(row: {
  id: string;
  tenant_id: string;
  client_id: string;
  quote_id: string | null;
  number: string;
  type: string;
  status: string;
  issue_date: Date;
  due_date: Date;
  deposit_percent: number | null;
  situation_percent: number | null;
  previous_situation_cents: number | null;
  payment_terms: number;
  notes: string | null;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  paid_cents: number;
  remaining_cents: number;
  finalized_at: Date | null;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  lines: Array<{
    id: string;
    invoice_id: string;
    position: number;
    label: string;
    description: string | null;
    quantity: unknown;
    unit: string;
    unit_price_cents: number;
    tva_rate: number;
    total_ht_cents: number;
  }>;
}): Invoice {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    client_id: row.client_id,
    quote_id: row.quote_id,
    number: row.number,
    type: row.type,
    status: row.status,
    issue_date: row.issue_date,
    due_date: row.due_date,
    deposit_percent: row.deposit_percent,
    situation_percent: row.situation_percent,
    previous_situation_cents: row.previous_situation_cents,
    payment_terms: row.payment_terms,
    notes: row.notes,
    total_ht_cents: row.total_ht_cents,
    total_tva_cents: row.total_tva_cents,
    total_ttc_cents: row.total_ttc_cents,
    paid_cents: row.paid_cents,
    remaining_cents: row.remaining_cents,
    finalized_at: row.finalized_at,
    paid_at: row.paid_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    lines: row.lines.map((l) => ({
      id: l.id,
      invoice_id: l.invoice_id,
      position: l.position,
      label: l.label,
      description: l.description,
      quantity: Number(l.quantity),
      unit: l.unit,
      unit_price_cents: l.unit_price_cents,
      tva_rate: l.tva_rate,
      total_ht_cents: l.total_ht_cents,
    })),
  };
}
