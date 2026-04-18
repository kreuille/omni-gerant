// BUSINESS RULE [CDC-2.1]: Calcul factures - reutilise la logique du calculateur devis
// BUSINESS RULE [R02]: Tous les montants en centimes

export interface InvoiceLineInput {
  quantity: number;
  unit_price_cents: number;
  tva_rate: number;
}

export interface InvoiceLineCalculation {
  total_ht_cents: number;
}

export interface InvoiceTvaGroup {
  tva_rate: number;
  base_ht_cents: number;
  tva_cents: number;
  total_ttc_cents: number;
}

export interface InvoiceTotals {
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  tva_breakdown: InvoiceTvaGroup[];
}

export function calculateInvoiceLineTotal(line: InvoiceLineInput): InvoiceLineCalculation {
  return { total_ht_cents: Math.round(line.quantity * line.unit_price_cents) };
}

export function calculateInvoiceTotals(lines: InvoiceLineInput[]): InvoiceTotals {
  const tvaMap = new Map<number, number>();

  for (const line of lines) {
    const ht = calculateInvoiceLineTotal(line).total_ht_cents;
    if (ht === 0) continue;
    const current = tvaMap.get(line.tva_rate) ?? 0;
    tvaMap.set(line.tva_rate, current + ht);
  }

  const breakdown: InvoiceTvaGroup[] = [];
  let totalHt = 0;
  let totalTva = 0;

  for (const [rate, baseHt] of tvaMap) {
    if (rate > 100) throw new Error('TVA rate seems in basis points, expected percentage (e.g. 20 for 20%)');
    const tvaCents = Math.round((baseHt * rate) / 100);
    breakdown.push({
      tva_rate: rate,
      base_ht_cents: baseHt,
      tva_cents: tvaCents,
      total_ttc_cents: baseHt + tvaCents,
    });
    totalHt += baseHt;
    totalTva += tvaCents;
  }

  breakdown.sort((a, b) => b.tva_rate - a.tva_rate);

  return {
    total_ht_cents: totalHt,
    total_tva_cents: totalTva,
    total_ttc_cents: totalHt + totalTva,
    tva_breakdown: breakdown,
  };
}

// BUSINESS RULE [CDC-2.1]: Facture d'acompte - calcul proportionnel
export function calculateDepositTotals(
  fullTotals: InvoiceTotals,
  depositPercent: number, // basis points (3000 = 30%)
): InvoiceTotals {
  const ratio = depositPercent / 10000;

  const breakdown: InvoiceTvaGroup[] = fullTotals.tva_breakdown.map((group) => {
    const baseHt = Math.round(group.base_ht_cents * ratio);
    const tvaCents = Math.round((baseHt * group.tva_rate) / 100);
    return {
      tva_rate: group.tva_rate,
      base_ht_cents: baseHt,
      tva_cents: tvaCents,
      total_ttc_cents: baseHt + tvaCents,
    };
  });

  const totalHt = breakdown.reduce((sum, g) => sum + g.base_ht_cents, 0);
  const totalTva = breakdown.reduce((sum, g) => sum + g.tva_cents, 0);

  return {
    total_ht_cents: totalHt,
    total_tva_cents: totalTva,
    total_ttc_cents: totalHt + totalTva,
    tva_breakdown: breakdown,
  };
}
