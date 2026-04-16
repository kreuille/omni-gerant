import type { Result } from '@omni-gerant/shared';
import { ok, err, forbidden, notFound } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';

// BUSINESS RULE [CDC-2.1]: Situations de travaux - facturer l'avancement d'un chantier
// BUSINESS RULE [CDC-2.1]: Calcul automatique du reste a facturer

export interface SituationLine {
  quote_line_position: number;
  label: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  tva_rate: number;
  total_ht_cents: number; // Full quote line total
  cumulative_percent: number; // basis points (3000 = 30%)
}

export interface Situation {
  id: string;
  quote_id: string;
  tenant_id: string;
  situation_number: number;
  global_percent: number; // basis points - cumulative
  previous_percent: number; // basis points - from previous situations
  lines: SituationLine[];
  invoice_ht_cents: number; // This situation's HT amount
  invoice_tva_cents: number;
  invoice_ttc_cents: number;
  cumulative_ht_cents: number; // Total invoiced so far
  remaining_ht_cents: number; // Left to invoice
  status: string; // draft, finalized
  invoice_id: string | null;
  created_at: Date;
}

export interface SituationRepository {
  findByQuote(quoteId: string, tenantId: string): Promise<Situation[]>;
  create(data: {
    quote_id: string;
    tenant_id: string;
    situation_number: number;
    global_percent: number;
    previous_percent: number;
    lines: SituationLine[];
    invoice_ht_cents: number;
    invoice_tva_cents: number;
    invoice_ttc_cents: number;
    cumulative_ht_cents: number;
    remaining_ht_cents: number;
  }): Promise<Situation>;
  findById(id: string, tenantId: string): Promise<Situation | null>;
  update(id: string, tenantId: string, data: {
    global_percent: number;
    lines: SituationLine[];
    invoice_ht_cents: number;
    invoice_tva_cents: number;
    invoice_ttc_cents: number;
    cumulative_ht_cents: number;
    remaining_ht_cents: number;
  }): Promise<Situation | null>;
}

export interface QuoteForSituation {
  id: string;
  tenant_id: string;
  status: string;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  lines: Array<{
    position: number;
    type: string;
    label: string;
    quantity: number;
    unit: string;
    unit_price_cents: number;
    tva_rate: number;
    total_ht_cents: number;
  }>;
}

export interface QuoteLookup {
  findById(quoteId: string, tenantId: string): Promise<QuoteForSituation | null>;
}

// Calculate situation amounts from quote lines and cumulative percentages
export function calculateSituationAmounts(
  quoteLines: QuoteForSituation['lines'],
  cumulativePercent: number, // basis points
  previousPercent: number, // basis points
): {
  lines: SituationLine[];
  invoice_ht_cents: number;
  invoice_tva_cents: number;
  invoice_ttc_cents: number;
  cumulative_ht_cents: number;
  remaining_ht_cents: number;
  total_quote_ht_cents: number;
} {
  const productLines = quoteLines.filter((l) => l.type === 'line');
  const situationPercent = cumulativePercent - previousPercent; // This situation's percentage

  let invoiceHt = 0;
  let invoiceTva = 0;
  let cumulativeHt = 0;
  let totalQuoteHt = 0;

  const lines: SituationLine[] = productLines.map((ql) => {
    totalQuoteHt += ql.total_ht_cents;
    const lineHt = Math.round((ql.total_ht_cents * situationPercent) / 10000);
    const lineTva = Math.round((lineHt * ql.tva_rate) / 100);
    const lineCumulativeHt = Math.round((ql.total_ht_cents * cumulativePercent) / 10000);

    invoiceHt += lineHt;
    invoiceTva += lineTva;
    cumulativeHt += lineCumulativeHt;

    return {
      quote_line_position: ql.position,
      label: ql.label,
      quantity: ql.quantity,
      unit: ql.unit,
      unit_price_cents: ql.unit_price_cents,
      tva_rate: ql.tva_rate,
      total_ht_cents: ql.total_ht_cents,
      cumulative_percent: cumulativePercent,
    };
  });

  return {
    lines,
    invoice_ht_cents: invoiceHt,
    invoice_tva_cents: invoiceTva,
    invoice_ttc_cents: invoiceHt + invoiceTva,
    cumulative_ht_cents: cumulativeHt,
    remaining_ht_cents: totalQuoteHt - cumulativeHt,
    total_quote_ht_cents: totalQuoteHt,
  };
}

export function createSituationService(repo: SituationRepository, quoteLookup: QuoteLookup) {
  return {
    async create(
      quoteId: string,
      tenantId: string,
      globalPercent: number, // basis points
    ): Promise<Result<Situation, AppError>> {
      // Validate quote
      const quote = await quoteLookup.findById(quoteId, tenantId);
      if (!quote) return err(notFound('Quote', quoteId));
      if (quote.status !== 'signed') {
        return err(forbidden('Can only create situations for signed quotes'));
      }

      // Cannot exceed 100%
      if (globalPercent > 10000) {
        return err(forbidden('Cumulative percentage cannot exceed 100%'));
      }
      if (globalPercent <= 0) {
        return err(forbidden('Percentage must be greater than 0'));
      }

      // Get previous situations
      const existing = await repo.findByQuote(quoteId, tenantId);
      const lastSituation = existing[existing.length - 1];
      const previousPercent = lastSituation?.global_percent ?? 0;

      if (globalPercent <= previousPercent) {
        return err(forbidden(`Cumulative percentage must be greater than previous (${previousPercent / 100}%)`));
      }

      const situationNumber = existing.length + 1;
      const amounts = calculateSituationAmounts(quote.lines, globalPercent, previousPercent);

      const situation = await repo.create({
        quote_id: quoteId,
        tenant_id: tenantId,
        situation_number: situationNumber,
        global_percent: globalPercent,
        previous_percent: previousPercent,
        ...amounts,
      });

      return ok(situation);
    },

    async list(quoteId: string, tenantId: string): Promise<Result<Situation[], AppError>> {
      const situations = await repo.findByQuote(quoteId, tenantId);
      return ok(situations);
    },

    async update(
      id: string,
      tenantId: string,
      globalPercent: number,
    ): Promise<Result<Situation, AppError>> {
      const situation = await repo.findById(id, tenantId);
      if (!situation) return err(notFound('Situation', id));
      if (situation.status !== 'draft') {
        return err(forbidden('Cannot modify a finalized situation'));
      }

      if (globalPercent > 10000) {
        return err(forbidden('Cumulative percentage cannot exceed 100%'));
      }
      if (globalPercent <= situation.previous_percent) {
        return err(forbidden(`Must be greater than previous (${situation.previous_percent / 100}%)`));
      }

      const quote = await quoteLookup.findById(situation.quote_id, tenantId);
      if (!quote) return err(notFound('Quote', situation.quote_id));

      const amounts = calculateSituationAmounts(quote.lines, globalPercent, situation.previous_percent);

      const updated = await repo.update(id, tenantId, {
        global_percent: globalPercent,
        ...amounts,
      });
      if (!updated) return err(notFound('Situation', id));
      return ok(updated);
    },
  };
}
