import type { Result } from '@omni-gerant/shared';
import { ok, err } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';
import { generateFacturxXml, getTypeCode, type FacturxInvoiceData, type FacturxParty } from './facturx-xml.js';
import { validateFacturxData, validateFacturxXml } from './facturx-validator.js';
import { embedXmlInPdf, type FacturxPdfResult } from './facturx-pdf.js';
import { generateInvoiceHtml, type PdfGeneratorConfig, type InvoicePdfData } from '../invoice-pdf.js';

// BUSINESS RULE [CDC-2.1]: Orchestrateur generation Factur-X complete

export interface FacturxGeneratorInput {
  invoice: {
    number: string;
    type: string;
    issue_date: Date;
    due_date: Date;
    payment_terms: number;
    notes?: string | null;
    total_ht_cents: number;
    total_tva_cents: number;
    total_ttc_cents: number;
    deposit_percent?: number | null;
    lines: Array<{
      position: number;
      label: string;
      description?: string | null;
      quantity: number;
      unit: string;
      unit_price_cents: number;
      tva_rate: number;
      total_ht_cents: number;
    }>;
  };
  seller: FacturxParty;
  buyer: FacturxParty & { client_name_display: string };
  tva_breakdown: Array<{
    tva_rate: number;
    base_ht_cents: number;
    tva_cents: number;
  }>;
}

export async function generateFacturx(
  input: FacturxGeneratorInput,
  pdfConfig: PdfGeneratorConfig,
): Promise<Result<FacturxPdfResult, AppError>> {
  // Build Factur-X data
  const facturxData: FacturxInvoiceData = {
    number: input.invoice.number,
    type_code: getTypeCode(input.invoice.type),
    issue_date: input.invoice.issue_date,
    due_date: input.invoice.due_date,
    currency: 'EUR',
    seller: input.seller,
    buyer: input.buyer,
    lines: input.invoice.lines.map((l) => ({
      position: l.position,
      label: l.label,
      quantity: l.quantity,
      unit: l.unit,
      unit_price_cents: l.unit_price_cents,
      tva_rate: l.tva_rate,
      total_ht_cents: l.total_ht_cents,
    })),
    tax_groups: input.tva_breakdown,
    total_ht_cents: input.invoice.total_ht_cents,
    total_tva_cents: input.invoice.total_tva_cents,
    total_ttc_cents: input.invoice.total_ttc_cents,
    payment_terms_days: input.invoice.payment_terms,
    notes: input.invoice.notes ?? undefined,
  };

  // Validate data
  const validationResult = validateFacturxData(facturxData);
  if (!validationResult.ok) return validationResult as Result<FacturxPdfResult, AppError>;

  // Generate XML
  const xml = generateFacturxXml(facturxData);

  // Validate XML structure
  const xmlValidation = validateFacturxXml(xml);
  if (!xmlValidation.ok) return xmlValidation as Result<FacturxPdfResult, AppError>;

  // Generate HTML for PDF
  const pdfData: InvoicePdfData = {
    number: input.invoice.number,
    type: input.invoice.type,
    issue_date: input.invoice.issue_date.toLocaleDateString('fr-FR'),
    due_date: input.invoice.due_date.toLocaleDateString('fr-FR'),
    client_name: input.buyer.client_name_display,
    client_address: `${input.buyer.address_line}\n${input.buyer.zip_code} ${input.buyer.city}`,
    client_siret: input.buyer.siret,
    lines: input.invoice.lines,
    total_ht_cents: input.invoice.total_ht_cents,
    total_tva_cents: input.invoice.total_tva_cents,
    total_ttc_cents: input.invoice.total_ttc_cents,
    tva_breakdown: input.tva_breakdown,
    payment_terms: input.invoice.payment_terms,
    notes: input.invoice.notes,
    deposit_percent: input.invoice.deposit_percent,
  };
  const html = generateInvoiceHtml(pdfConfig, pdfData);

  // Embed XML in PDF
  return embedXmlInPdf(html, xml, input.invoice.number);
}
