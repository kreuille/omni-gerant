// BUSINESS RULE [CDC-2.1]: Calcul marge brute en temps reel
// BUSINESS RULE [CDC-2.1]: Gestion TVA multi-taux (20%, 10%, 5.5%) sur un meme document
// BUSINESS RULE [R02]: Tous les montants en centimes (entiers)

export interface LineInput {
  type: 'line' | 'section' | 'subtotal' | 'comment';
  quantity: number; // Decimal (e.g., 2.5)
  unit_price_cents: number;
  tva_rate: number; // Percentage: 20 = 20%, 5.5 = 5.5%
  discount_type?: 'percentage' | 'fixed' | null;
  discount_value?: number | null; // Basis points for percentage, centimes for fixed
}

export interface LineCalculation {
  total_ht_cents: number;
}

export interface TvaGroup {
  tva_rate: number;
  base_ht_cents: number;
  tva_cents: number;
  total_ttc_cents: number;
}

export interface QuoteTotals {
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  tva_breakdown: TvaGroup[];
}

// Calculate line total HT (before TVA)
export function calculateLineTotal(line: LineInput): LineCalculation {
  // Non-product lines (section, subtotal, comment) have no monetary value
  if (line.type !== 'line') {
    return { total_ht_cents: 0 };
  }

  // Base: quantity * unit_price_cents, rounded to nearest centime
  const baseCents = Math.round(line.quantity * line.unit_price_cents);

  // Apply discount
  let totalHt = baseCents;
  if (line.discount_type && line.discount_value && line.discount_value > 0) {
    if (line.discount_type === 'percentage') {
      // discount_value in basis points (e.g., 1000 = 10%)
      const discountCents = Math.round((baseCents * line.discount_value) / 10000);
      totalHt = baseCents - discountCents;
    } else if (line.discount_type === 'fixed') {
      // discount_value in centimes
      totalHt = baseCents - line.discount_value;
    }
  }

  return { total_ht_cents: Math.max(0, totalHt) };
}

// Calculate quote totals with TVA breakdown
export function calculateQuoteTotals(
  lines: LineInput[],
  globalDiscount?: { type: 'percentage' | 'fixed'; value: number } | null,
): QuoteTotals {
  // Calculate each line total
  const lineResults = lines.map((line) => ({
    total_ht_cents: calculateLineTotal(line).total_ht_cents,
    tva_rate: line.type === 'line' ? line.tva_rate : 0,
  }));

  // Sum HT before global discount
  let totalHtBeforeDiscount = lineResults.reduce((sum, l) => sum + l.total_ht_cents, 0);

  // Apply global discount proportionally across TVA groups
  let globalDiscountRatio = 0;
  let globalDiscountFixed = 0;
  if (globalDiscount && globalDiscount.value > 0) {
    if (globalDiscount.type === 'percentage') {
      globalDiscountRatio = globalDiscount.value / 10000;
    } else {
      globalDiscountFixed = globalDiscount.value;
    }
  }

  // Group by TVA rate
  const tvaMap = new Map<number, number>();
  for (const lr of lineResults) {
    if (lr.total_ht_cents === 0) continue;
    const current = tvaMap.get(lr.tva_rate) ?? 0;
    tvaMap.set(lr.tva_rate, current + lr.total_ht_cents);
  }

  // Apply global discount proportionally and calculate TVA
  const breakdown: TvaGroup[] = [];
  let totalHt = 0;
  let totalTva = 0;

  for (const [rate, baseHt] of tvaMap) {
    let adjustedHt = baseHt;

    // Apply proportional global discount
    if (globalDiscountRatio > 0) {
      adjustedHt = Math.round(baseHt * (1 - globalDiscountRatio));
    } else if (globalDiscountFixed > 0 && totalHtBeforeDiscount > 0) {
      // Distribute fixed discount proportionally
      const proportion = baseHt / totalHtBeforeDiscount;
      adjustedHt = Math.round(baseHt - globalDiscountFixed * proportion);
    }

    adjustedHt = Math.max(0, adjustedHt);

    // BUSINESS RULE [R02][CDC-2.1]: tva_rate en basis points (2000 = 20.00%)
    // Support legacy percentage values (<= 100) pour la retrocompatibilite.
    const rateBp = rate > 100 ? rate : rate * 100;
    const tvaCents = Math.round((adjustedHt * rateBp) / 10000);

    breakdown.push({
      tva_rate: rate,
      base_ht_cents: adjustedHt,
      tva_cents: tvaCents,
      total_ttc_cents: adjustedHt + tvaCents,
    });

    totalHt += adjustedHt;
    totalTva += tvaCents;
  }

  // Sort breakdown by rate (highest first)
  breakdown.sort((a, b) => b.tva_rate - a.tva_rate);

  return {
    total_ht_cents: totalHt,
    total_tva_cents: totalTva,
    total_ttc_cents: totalHt + totalTva,
    tva_breakdown: breakdown,
  };
}
