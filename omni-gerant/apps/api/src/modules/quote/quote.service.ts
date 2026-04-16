import type { Result, PaginatedResult } from '@zenadmin/shared';
import { ok, err, notFound, forbidden } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';
import { calculateQuoteTotals, calculateLineTotal, type LineInput } from './quote-calculator.js';
import type { CreateQuoteInput, UpdateQuoteInput, QuoteListInput } from './quote.schemas.js';

// BUSINESS RULE [CDC-2.1]: Module Ventes - Devis CRUD

export interface QuoteLine {
  id: string;
  quote_id: string;
  product_id: string | null;
  position: number;
  type: string;
  label: string;
  description: string | null;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  tva_rate: number;
  discount_type: string | null;
  discount_value: number | null;
  total_ht_cents: number;
}

export interface Quote {
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
  lines: QuoteLine[];
}

export interface QuoteRepository {
  create(data: {
    tenant_id: string;
    client_id: string;
    number: string;
    title?: string;
    description?: string;
    validity_date: Date;
    deposit_rate?: number;
    discount_type?: string;
    discount_value?: number;
    notes?: string;
    total_ht_cents: number;
    total_tva_cents: number;
    total_ttc_cents: number;
    lines: Array<{
      product_id?: string;
      position: number;
      type: string;
      label: string;
      description?: string;
      quantity: number;
      unit: string;
      unit_price_cents: number;
      tva_rate: number;
      discount_type?: string;
      discount_value?: number;
      total_ht_cents: number;
    }>;
  }): Promise<Quote>;
  findById(id: string, tenantId: string): Promise<Quote | null>;
  findMany(params: {
    tenant_id: string;
    cursor?: string;
    limit: number;
    status?: string;
    client_id?: string;
    search?: string;
  }): Promise<{ items: Quote[]; next_cursor: string | null; has_more: boolean }>;
  update(id: string, tenantId: string, data: {
    client_id?: string;
    title?: string | null;
    description?: string | null;
    validity_date?: Date;
    deposit_rate?: number | null;
    discount_type?: string | null;
    discount_value?: number | null;
    notes?: string | null;
    total_ht_cents?: number;
    total_tva_cents?: number;
    total_ttc_cents?: number;
    lines?: Array<{
      product_id?: string;
      position: number;
      type: string;
      label: string;
      description?: string;
      quantity: number;
      unit: string;
      unit_price_cents: number;
      tva_rate: number;
      discount_type?: string;
      discount_value?: number;
      total_ht_cents: number;
    }>;
  }): Promise<Quote | null>;
  delete(id: string, tenantId: string): Promise<boolean>;
}

export interface DocumentNumberGenerator {
  generate(tenantId: string): Promise<Result<string, AppError>>;
}

export function createQuoteService(repo: QuoteRepository, numberGen: DocumentNumberGenerator) {
  function buildLineInputs(lines: CreateQuoteInput['lines']): LineInput[] {
    return lines.map((l) => ({
      type: l.type as LineInput['type'],
      quantity: l.quantity,
      unit_price_cents: l.unit_price_cents,
      tva_rate: l.tva_rate,
      discount_type: l.discount_type as LineInput['discount_type'],
      discount_value: l.discount_value,
    }));
  }

  return {
    async create(tenantId: string, input: CreateQuoteInput): Promise<Result<Quote, AppError>> {
      // Generate document number
      const numberResult = await numberGen.generate(tenantId);
      if (!numberResult.ok) return numberResult as Result<Quote, AppError>;

      // Calculate totals
      const lineInputs = buildLineInputs(input.lines);
      const globalDiscount = input.discount_type && input.discount_value
        ? { type: input.discount_type, value: input.discount_value }
        : null;
      const totals = calculateQuoteTotals(lineInputs, globalDiscount);

      // Calculate individual line totals
      const linesWithTotals = input.lines.map((line, i) => ({
        ...line,
        product_id: line.product_id,
        description: line.description,
        discount_type: line.discount_type,
        discount_value: line.discount_value,
        total_ht_cents: calculateLineTotal(lineInputs[i]!).total_ht_cents,
      }));

      const validityDate = new Date();
      validityDate.setDate(validityDate.getDate() + (input.validity_days ?? 30));

      const quote = await repo.create({
        tenant_id: tenantId,
        client_id: input.client_id,
        number: numberResult.value,
        title: input.title,
        description: input.description,
        validity_date: validityDate,
        deposit_rate: input.deposit_rate,
        discount_type: input.discount_type,
        discount_value: input.discount_value,
        notes: input.notes,
        total_ht_cents: totals.total_ht_cents,
        total_tva_cents: totals.total_tva_cents,
        total_ttc_cents: totals.total_ttc_cents,
        lines: linesWithTotals,
      });

      return ok(quote);
    },

    async getById(id: string, tenantId: string): Promise<Result<Quote, AppError>> {
      const quote = await repo.findById(id, tenantId);
      if (!quote) {
        return err(notFound('Quote', id));
      }
      return ok(quote);
    },

    async list(tenantId: string, params: QuoteListInput): Promise<Result<PaginatedResult<Quote>, AppError>> {
      const result = await repo.findMany({
        tenant_id: tenantId,
        cursor: params.cursor,
        limit: params.limit ?? 20,
        status: params.status,
        client_id: params.client_id,
        search: params.search,
      });
      return ok({
        items: result.items,
        next_cursor: result.next_cursor,
        has_more: result.has_more,
      });
    },

    async update(id: string, tenantId: string, input: UpdateQuoteInput): Promise<Result<Quote, AppError>> {
      // Check quote exists and is draft
      const existing = await repo.findById(id, tenantId);
      if (!existing) {
        return err(notFound('Quote', id));
      }
      if (existing.status !== 'draft') {
        return err(forbidden('Cannot modify a quote that is not in draft status'));
      }

      // Recalculate totals if lines changed
      let totals: { total_ht_cents: number; total_tva_cents: number; total_ttc_cents: number } | undefined;
      let linesWithTotals: Array<{
        product_id?: string;
        position: number;
        type: string;
        label: string;
        description?: string;
        quantity: number;
        unit: string;
        unit_price_cents: number;
        tva_rate: number;
        discount_type?: string;
        discount_value?: number;
        total_ht_cents: number;
      }> | undefined;

      if (input.lines) {
        const lineInputs = buildLineInputs(input.lines);
        const discountType = input.discount_type ?? existing.discount_type;
        const discountValue = input.discount_value ?? existing.discount_value;
        const globalDiscount = discountType && discountValue
          ? { type: discountType as 'percentage' | 'fixed', value: discountValue }
          : null;
        totals = calculateQuoteTotals(lineInputs, globalDiscount);

        linesWithTotals = input.lines.map((line, i) => ({
          ...line,
          product_id: line.product_id,
          description: line.description,
          discount_type: line.discount_type,
          discount_value: line.discount_value,
          total_ht_cents: calculateLineTotal(lineInputs[i]!).total_ht_cents,
        }));
      }

      const validityDate = input.validity_days
        ? new Date(existing.issue_date.getTime() + input.validity_days * 24 * 60 * 60 * 1000)
        : undefined;

      const updated = await repo.update(id, tenantId, {
        client_id: input.client_id,
        title: input.title,
        description: input.description,
        validity_date: validityDate,
        deposit_rate: input.deposit_rate,
        discount_type: input.discount_type,
        discount_value: input.discount_value,
        notes: input.notes,
        ...totals,
        lines: linesWithTotals,
      });

      if (!updated) {
        return err(notFound('Quote', id));
      }
      return ok(updated);
    },

    async delete(id: string, tenantId: string): Promise<Result<void, AppError>> {
      const existing = await repo.findById(id, tenantId);
      if (!existing) {
        return err(notFound('Quote', id));
      }
      if (existing.status !== 'draft') {
        return err(forbidden('Cannot delete a quote that is not in draft status'));
      }

      await repo.delete(id, tenantId);
      return ok(undefined);
    },
  };
}
