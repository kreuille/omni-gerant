// BUSINESS RULE [NF525-K0]: Mapping des donnees zenAdmin vers le format Kiwiz
// Les montants zenAdmin sont en centimes (R02), Kiwiz attend des strings a 4 decimales.
// Les taux de TVA zenAdmin sont en basis points (2000 = 20%), Kiwiz attend des strings.

import { formatKiwizAmount } from './kiwiz-client.js';
import type { KiwizInvoiceData, KiwizItem, KiwizTax, KiwizAddress } from './kiwiz-client.js';

// ---------------------------------------------------------------------------
// Input interfaces (aligned with zenAdmin domain models)
// ---------------------------------------------------------------------------

export interface InvoiceForKiwiz {
  number: string;
  created_at: Date;
  total_ht_cents: number;
  total_ttc_cents: number;
  total_tva_cents: number;
  payment_method?: string;
  lines: Array<{
    id: string;
    label: string;
    quantity: number;
    unit_price_cents: number;
    total_ht_cents: number;
    tva_rate: number; // basis points (2000 = 20%)
  }>;
}

export interface ClientForKiwiz {
  name: string;
  email?: string;
  address?: { line1?: string; zip_code?: string; city?: string; country?: string };
}

export interface CompanyForKiwiz {
  name: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

// BUSINESS RULE [R02]: tva_rate is in basis points (2000 = 20%)
function basisPointsToPercent(basisPoints: number): string {
  return (basisPoints / 100).toFixed(2);
}

function mapItems(lines: InvoiceForKiwiz['lines']): KiwizItem[] {
  return lines.map((line) => ({
    id: line.id,
    label: line.label,
    quantity: line.quantity.toFixed(4),
    unit_price: formatKiwizAmount(line.unit_price_cents),
    total_ht: formatKiwizAmount(line.total_ht_cents),
    tax_rate: basisPointsToPercent(line.tva_rate),
  }));
}

/**
 * Aggregate tax lines by rate.
 * Groups invoice lines by their TVA rate and sums base and tax amounts.
 */
function aggregateTaxes(lines: InvoiceForKiwiz['lines']): KiwizTax[] {
  const taxMap = new Map<number, { base: number; amount: number }>();

  for (const line of lines) {
    const existing = taxMap.get(line.tva_rate);
    const taxAmount = Math.round(line.total_ht_cents * line.tva_rate / 10000);

    if (existing) {
      existing.base += line.total_ht_cents;
      existing.amount += taxAmount;
    } else {
      taxMap.set(line.tva_rate, { base: line.total_ht_cents, amount: taxAmount });
    }
  }

  return Array.from(taxMap.entries()).map(([rate, { base, amount }]) => ({
    rate: basisPointsToPercent(rate),
    base: formatKiwizAmount(base),
    amount: formatKiwizAmount(amount),
  }));
}

function mapBuyerAddress(address?: ClientForKiwiz['address']): KiwizAddress | undefined {
  if (!address) return undefined;
  return {
    street: address.line1,
    zip_code: address.zip_code,
    city: address.city,
    country: address.country,
  };
}

// ---------------------------------------------------------------------------
// Public mappers
// ---------------------------------------------------------------------------

// BUSINESS RULE [NF525-K0]: Mapping facture -> Kiwiz pour certification blockchain
export function mapInvoiceToKiwiz(
  invoice: InvoiceForKiwiz,
  client: ClientForKiwiz,
  company: CompanyForKiwiz,
): KiwizInvoiceData {
  return {
    number: invoice.number,
    date: formatDate(invoice.created_at),
    total_ht: formatKiwizAmount(invoice.total_ht_cents),
    total_ttc: formatKiwizAmount(invoice.total_ttc_cents),
    total_tax: formatKiwizAmount(invoice.total_tva_cents),
    currency: 'EUR',
    payment_method: invoice.payment_method,
    seller_name: company.name,
    buyer_name: client.name,
    buyer_email: client.email,
    buyer_address: mapBuyerAddress(client.address),
    items: mapItems(invoice.lines),
    taxes: aggregateTaxes(invoice.lines),
  };
}

// BUSINESS RULE [NF525-K0]: Mapping avoir -> Kiwiz pour certification blockchain
export function mapCreditMemoToKiwiz(
  creditMemo: InvoiceForKiwiz,
  client: ClientForKiwiz,
  company: CompanyForKiwiz,
): KiwizInvoiceData {
  // Credit memos use the same structure as invoices in Kiwiz
  return mapInvoiceToKiwiz(creditMemo, client, company);
}
