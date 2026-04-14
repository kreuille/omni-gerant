import type { Result } from '@omni-gerant/shared';
import { ok, err, validationError } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';
import type { FacturxInvoiceData } from './facturx-xml.js';

// BUSINESS RULE [CDC-2.1]: Validation conformite Factur-X

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export function validateFacturxData(data: FacturxInvoiceData): Result<true, AppError> {
  const issues: ValidationIssue[] = [];

  // Required fields
  if (!data.number) {
    issues.push({ field: 'number', message: 'Invoice number is required', severity: 'error' });
  }
  if (!data.type_code || !['380', '381', '386'].includes(data.type_code)) {
    issues.push({ field: 'type_code', message: 'Invalid type code (must be 380, 381, or 386)', severity: 'error' });
  }
  if (!data.issue_date) {
    issues.push({ field: 'issue_date', message: 'Issue date is required', severity: 'error' });
  }
  if (!data.due_date) {
    issues.push({ field: 'due_date', message: 'Due date is required', severity: 'error' });
  }
  if (data.currency !== 'EUR') {
    issues.push({ field: 'currency', message: 'Only EUR currency is supported', severity: 'error' });
  }

  // Seller validation
  if (!data.seller.name) {
    issues.push({ field: 'seller.name', message: 'Seller name is required', severity: 'error' });
  }
  if (!data.seller.country_code) {
    issues.push({ field: 'seller.country_code', message: 'Seller country code is required', severity: 'error' });
  }

  // Buyer validation
  if (!data.buyer.name) {
    issues.push({ field: 'buyer.name', message: 'Buyer name is required', severity: 'error' });
  }
  if (!data.buyer.country_code) {
    issues.push({ field: 'buyer.country_code', message: 'Buyer country code is required', severity: 'error' });
  }

  // Lines validation
  if (data.lines.length === 0) {
    issues.push({ field: 'lines', message: 'At least one line item is required', severity: 'error' });
  }

  // Tax groups validation
  if (data.tax_groups.length === 0) {
    issues.push({ field: 'tax_groups', message: 'At least one tax group is required', severity: 'error' });
  }

  // Totals consistency
  const taxGroupsHt = data.tax_groups.reduce((sum, g) => sum + g.base_ht_cents, 0);
  if (taxGroupsHt !== data.total_ht_cents) {
    issues.push({
      field: 'totals',
      message: `Tax groups HT sum (${taxGroupsHt}) does not match total HT (${data.total_ht_cents})`,
      severity: 'error',
    });
  }

  const taxGroupsTva = data.tax_groups.reduce((sum, g) => sum + g.tva_cents, 0);
  if (taxGroupsTva !== data.total_tva_cents) {
    issues.push({
      field: 'totals',
      message: `Tax groups TVA sum (${taxGroupsTva}) does not match total TVA (${data.total_tva_cents})`,
      severity: 'error',
    });
  }

  if (data.total_ht_cents + data.total_tva_cents !== data.total_ttc_cents) {
    issues.push({
      field: 'totals',
      message: 'HT + TVA does not equal TTC',
      severity: 'error',
    });
  }

  const errors = issues.filter((i) => i.severity === 'error');
  if (errors.length > 0) {
    return err(validationError('Factur-X validation failed', {
      issues: errors.map((e) => ({ field: e.field, message: e.message })),
    }));
  }

  return ok(true);
}

// Validate generated XML structure
export function validateFacturxXml(xml: string): Result<true, AppError> {
  const issues: string[] = [];

  // Check root element
  if (!xml.includes('CrossIndustryInvoice')) {
    issues.push('Missing CrossIndustryInvoice root element');
  }

  // Check required namespaces
  if (!xml.includes('urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100')) {
    issues.push('Missing rsm namespace');
  }
  if (!xml.includes('urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100')) {
    issues.push('Missing ram namespace');
  }

  // Check required sections
  if (!xml.includes('ExchangedDocumentContext')) {
    issues.push('Missing ExchangedDocumentContext');
  }
  if (!xml.includes('ExchangedDocument')) {
    issues.push('Missing ExchangedDocument');
  }
  if (!xml.includes('SupplyChainTradeTransaction')) {
    issues.push('Missing SupplyChainTradeTransaction');
  }
  if (!xml.includes('SellerTradeParty')) {
    issues.push('Missing SellerTradeParty');
  }
  if (!xml.includes('BuyerTradeParty')) {
    issues.push('Missing BuyerTradeParty');
  }
  if (!xml.includes('SpecifiedTradeSettlementHeaderMonetarySummation')) {
    issues.push('Missing monetary summation');
  }

  // Check Factur-X profile
  if (!xml.includes('urn:factur-x.eu:1p0:minimum')) {
    issues.push('Missing Factur-X profile identifier');
  }

  if (issues.length > 0) {
    return err(validationError('Invalid Factur-X XML structure', { issues }));
  }

  return ok(true);
}
