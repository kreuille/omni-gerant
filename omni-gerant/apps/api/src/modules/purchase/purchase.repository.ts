import { prisma } from '@omni-gerant/db';
import type { Prisma } from '@prisma/client';
import type { PurchaseRepository, Purchase, PurchaseLine } from './purchase.service.js';

// BUSINESS RULE [CDC-2.2]: Purchase CRUD with Prisma

export function createPrismaPurchaseRepository(): PurchaseRepository {
  const includeLines = { lines: { orderBy: { position: 'asc' as const } } };

  return {
    async create(data) {
      const row = await prisma.purchase.create({
        data: {
          tenant_id: data.tenant_id,
          supplier_id: data.supplier_id ?? null,
          number: data.number ?? null,
          status: 'pending',
          source: data.source,
          issue_date: data.issue_date ?? null,
          due_date: data.due_date ?? null,
          total_ht_cents: data.total_ht_cents,
          total_tva_cents: data.total_tva_cents,
          total_ttc_cents: data.total_ttc_cents,
          paid_cents: 0,
          category: data.category ?? null,
          notes: data.notes ?? null,
          document_url: data.document_url ?? null,
          lines: {
            create: data.lines.map((l) => ({
              position: l.position,
              label: l.label,
              quantity: l.quantity,
              unit_price_cents: l.unit_price_cents,
              tva_rate: l.tva_rate,
              total_ht_cents: Math.round(l.quantity * l.unit_price_cents),
            })),
          },
        },
        include: includeLines,
      });
      return mapPurchase(row);
    },

    async findById(id, tenantId) {
      const row = await prisma.purchase.findFirst({
        where: { id, tenant_id: tenantId },
        include: includeLines,
      });
      return row ? mapPurchase(row) : null;
    },

    async update(id, tenantId, data) {
      const existing = await prisma.purchase.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!existing) return null;
      const row = await prisma.purchase.update({
        where: { id },
        data: data as Prisma.PurchaseUpdateInput,
        include: includeLines,
      });
      return mapPurchase(row);
    },

    async updateStatus(id, tenantId, status) {
      const existing = await prisma.purchase.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!existing) return null;
      const row = await prisma.purchase.update({
        where: { id },
        data: { status },
        include: includeLines,
      });
      return mapPurchase(row);
    },

    async updatePayment(id, tenantId, paidCents) {
      const existing = await prisma.purchase.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!existing) return null;
      const row = await prisma.purchase.update({
        where: { id },
        data: { paid_cents: paidCents },
        include: includeLines,
      });
      return mapPurchase(row);
    },

    async softDelete(id, tenantId) {
      const existing = await prisma.purchase.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!existing) return false;
      await prisma.purchase.delete({ where: { id } });
      return true;
    },

    async list(tenantId, query) {
      const where: Prisma.PurchaseWhereInput = { tenant_id: tenantId };
      if (query.status) where.status = query.status;
      if (query.supplier_id) where.supplier_id = query.supplier_id;
      if (query.due_before) where.due_date = { lte: new Date(query.due_before) };
      if (query.search) {
        where.number = { contains: query.search, mode: 'insensitive' };
      }

      const rows = await prisma.purchase.findMany({
        where,
        include: includeLines,
        take: (query.limit ?? 20) + 1,
        orderBy: { created_at: 'desc' },
      });

      const limit = query.limit ?? 20;
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!.id : null;

      return { items: items.map(mapPurchase), next_cursor: nextCursor, has_more: hasMore };
    },
  };
}

function mapPurchase(row: {
  id: string;
  tenant_id: string;
  supplier_id: string | null;
  number: string | null;
  status: string;
  source: string;
  issue_date: Date | null;
  due_date: Date | null;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  paid_cents: number;
  category: string | null;
  notes: string | null;
  document_url: string | null;
  ocr_data: unknown;
  ocr_confidence: number | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  lines: Array<{
    id: string;
    purchase_id: string;
    position: number;
    label: string;
    quantity: unknown;
    unit_price_cents: number;
    tva_rate: number;
    total_ht_cents: number;
  }>;
}): Purchase {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    supplier_id: row.supplier_id,
    number: row.number,
    status: row.status,
    source: row.source,
    issue_date: row.issue_date,
    due_date: row.due_date,
    total_ht_cents: row.total_ht_cents,
    total_tva_cents: row.total_tva_cents,
    total_ttc_cents: row.total_ttc_cents,
    paid_cents: row.paid_cents,
    category: row.category,
    notes: row.notes,
    document_url: row.document_url,
    ocr_data: row.ocr_data as Record<string, unknown> | null,
    ocr_confidence: row.ocr_confidence,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    lines: row.lines.map((l) => ({
      id: l.id,
      purchase_id: l.purchase_id,
      position: l.position,
      label: l.label,
      quantity: Number(l.quantity),
      unit_price_cents: l.unit_price_cents,
      tva_rate: l.tva_rate,
      total_ht_cents: l.total_ht_cents,
    })),
  };
}
