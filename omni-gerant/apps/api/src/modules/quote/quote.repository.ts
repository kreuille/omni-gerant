import { prisma } from '@zenadmin/db';
import type { Prisma } from '@prisma/client';
import type { QuoteRepository, Quote, QuoteLine } from './quote.service.js';

// BUSINESS RULE [CDC-2.1]: Quote CRUD with Prisma
// BUSINESS RULE [R04]: Soft delete via middleware

export function createPrismaQuoteRepository(): QuoteRepository {
  const includeAll = {
    lines: { orderBy: { position: 'asc' as const } },
    client: true,
  };

  return {
    async create(data) {
      const row = await prisma.quote.create({
        data: {
          tenant_id: data.tenant_id,
          client_id: data.client_id,
          number: data.number,
          status: 'draft',
          title: data.title ?? null,
          description: data.description ?? null,
          validity_date: data.validity_date,
          deposit_rate: data.deposit_rate ?? null,
          discount_type: data.discount_type ?? null,
          discount_value: data.discount_value ?? null,
          notes: data.notes ?? null,
          total_ht_cents: data.total_ht_cents,
          total_tva_cents: data.total_tva_cents,
          total_ttc_cents: data.total_ttc_cents,
          lines: {
            create: data.lines.map((l) => ({
              product_id: l.product_id ?? null,
              position: l.position,
              type: l.type,
              label: l.label,
              description: l.description ?? null,
              quantity: l.quantity,
              unit: l.unit,
              unit_price_cents: l.unit_price_cents,
              tva_rate: l.tva_rate,
              discount_type: l.discount_type ?? null,
              discount_value: l.discount_value ?? null,
              total_ht_cents: l.total_ht_cents,
            })),
          },
        },
        include: includeAll,
      });
      return mapQuote(row);
    },

    async findById(id, tenantId) {
      const row = await prisma.quote.findFirst({
        where: { id, tenant_id: tenantId },
        include: includeAll,
      });
      return row ? mapQuote(row) : null;
    },

    async findMany(params) {
      const where: Prisma.QuoteWhereInput = { tenant_id: params.tenant_id };
      if (params.status) where.status = params.status;
      if (params.client_id) where.client_id = params.client_id;
      if (params.search) {
        where.OR = [
          { title: { contains: params.search, mode: 'insensitive' } },
          { number: { contains: params.search, mode: 'insensitive' } },
        ];
      }

      const rows = await prisma.quote.findMany({
        where,
        include: includeAll,
        take: params.limit + 1,
        skip: params.cursor ? 1 : 0,
        cursor: params.cursor ? { id: params.cursor } : undefined,
        orderBy: { created_at: 'desc' },
      });

      const hasMore = rows.length > params.limit;
      const items = hasMore ? rows.slice(0, params.limit) : rows;
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!.id : null;

      return { items: items.map(mapQuote), next_cursor: nextCursor, has_more: hasMore };
    },

    async update(id, tenantId, data) {
      const existing = await prisma.quote.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!existing) return null;

      // If lines are provided, replace them all (delete old + create new)
      const updateData: Prisma.QuoteUpdateInput = {};
      if (data.client_id !== undefined) updateData.client = { connect: { id: data.client_id } };
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.validity_date !== undefined) updateData.validity_date = data.validity_date;
      if (data.deposit_rate !== undefined) updateData.deposit_rate = data.deposit_rate;
      if (data.discount_type !== undefined) updateData.discount_type = data.discount_type;
      if (data.discount_value !== undefined) updateData.discount_value = data.discount_value;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.total_ht_cents !== undefined) updateData.total_ht_cents = data.total_ht_cents;
      if (data.total_tva_cents !== undefined) updateData.total_tva_cents = data.total_tva_cents;
      if (data.total_ttc_cents !== undefined) updateData.total_ttc_cents = data.total_ttc_cents;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.signed_at !== undefined) updateData.signed_at = data.signed_at;
      if (data.signature_data !== undefined) updateData.signature_data = data.signature_data as Prisma.InputJsonValue;

      if (data.lines) {
        // Replace all lines in a transaction
        const row = await prisma.$transaction(async (tx) => {
          await tx.quoteLine.deleteMany({ where: { quote_id: id } });
          return tx.quote.update({
            where: { id },
            data: {
              ...updateData,
              lines: {
                create: data.lines!.map((l) => ({
                  product_id: l.product_id ?? null,
                  position: l.position,
                  type: l.type,
                  label: l.label,
                  description: l.description ?? null,
                  quantity: l.quantity,
                  unit: l.unit,
                  unit_price_cents: l.unit_price_cents,
                  tva_rate: l.tva_rate,
                  discount_type: l.discount_type ?? null,
                  discount_value: l.discount_value ?? null,
                  total_ht_cents: l.total_ht_cents,
                })),
              },
            },
            include: { lines: { orderBy: { position: 'asc' } } },
          });
        });
        return mapQuote(row);
      }

      const row = await prisma.quote.update({
        where: { id },
        data: updateData,
        include: includeAll,
      });
      return mapQuote(row);
    },

    async delete(id, tenantId) {
      const existing = await prisma.quote.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!existing) return false;
      await prisma.quote.delete({ where: { id } });
      return true;
    },
  };
}

interface ClientRow {
  id: string;
  type: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  siret: string | null;
  address_line1: string | null;
  address_line2: string | null;
  zip_code: string | null;
  city: string | null;
  country: string;
}

function getClientDisplayName(client: ClientRow | null): string | null {
  if (!client) return null;
  if (client.type === 'company' && client.company_name) return client.company_name;
  return [client.first_name, client.last_name].filter(Boolean).join(' ') || null;
}

function mapQuote(row: {
  id: string;
  tenant_id: string;
  client_id: string;
  number: string;
  status: string;
  title: string | null;
  description: string | null;
  issue_date: Date;
  validity_date: Date;
  deposit_rate: number | null;
  discount_type: string | null;
  discount_value: number | null;
  notes: string | null;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  signed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  client?: ClientRow | null;
  lines: Array<{
    id: string;
    quote_id: string;
    product_id: string | null;
    position: number;
    type: string;
    label: string;
    description: string | null;
    quantity: unknown;
    unit: string;
    unit_price_cents: number;
    tva_rate: number;
    discount_type: string | null;
    discount_value: number | null;
    total_ht_cents: number;
  }>;
}): Quote {
  const client = row.client ?? null;
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    client_id: row.client_id,
    number: row.number,
    status: row.status,
    title: row.title,
    description: row.description,
    issue_date: row.issue_date,
    validity_date: row.validity_date,
    deposit_rate: row.deposit_rate,
    discount_type: row.discount_type,
    discount_value: row.discount_value,
    notes: row.notes,
    total_ht_cents: row.total_ht_cents,
    total_tva_cents: row.total_tva_cents,
    total_ttc_cents: row.total_ttc_cents,
    signed_at: row.signed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    lines: row.lines.map(mapLine),
    client_name: getClientDisplayName(client),
    client_email: client?.email ?? null,
    client_phone: client?.phone ?? null,
    client_address: client ? [client.address_line1, client.address_line2].filter(Boolean).join(', ') : null,
    client_zip_code: client?.zip_code ?? null,
    client_city: client?.city ?? null,
    client_country: client?.country ?? null,
    client_siret: client?.siret ?? null,
  };
}

function mapLine(row: {
  id: string;
  quote_id: string;
  product_id: string | null;
  position: number;
  type: string;
  label: string;
  description: string | null;
  quantity: unknown;
  unit: string;
  unit_price_cents: number;
  tva_rate: number;
  discount_type: string | null;
  discount_value: number | null;
  total_ht_cents: number;
}): QuoteLine {
  return {
    id: row.id,
    quote_id: row.quote_id,
    product_id: row.product_id,
    position: row.position,
    type: row.type,
    label: row.label,
    description: row.description,
    quantity: Number(row.quantity),
    unit: row.unit,
    unit_price_cents: row.unit_price_cents,
    tva_rate: row.tva_rate,
    discount_type: row.discount_type,
    discount_value: row.discount_value,
    total_ht_cents: row.total_ht_cents,
  };
}
