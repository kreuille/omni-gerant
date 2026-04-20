import type { Result, AppError } from '@zenadmin/shared';
import { ok, err, validationError } from '@zenadmin/shared';
import type { FacturxInvoiceData, FacturxProfile } from './facturx-xml.js';

// BUSINESS RULE [CDC-2.1 / F3]: Validation Factur-X conforme EN 16931 + spec 1.0
//
// Regles appliquees (BR = Business Rule EN 16931) :
//   BR-01..BR-07 : champs obligatoires
//   BR-CO-10, BR-CO-15, BR-CO-16 : coherence totaux
//   BT-3, BT-9, BT-81, BT-84, BT-129, BT-152, BT-153 : contraintes champs

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  rule?: string;
}

export interface ValidationReport {
  valid: boolean;
  profile: FacturxProfile;
  issues: ValidationIssue[];
}

const VALID_CURRENCIES = new Set(['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'JPY']);
const VALID_PAYMENT_MEANS = new Set(['10', '20', '30', '42', '48', '49', '57', '58', '59']);
const VALID_TYPE_CODES = ['380', '381', '384', '386', '389'];
const IBAN_REGEX = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

export function validateFacturxData(data: FacturxInvoiceData): Result<true, AppError> {
  const report = validateFacturxDataDetailed(data);
  const errors = report.issues.filter((i) => i.severity === 'error');
  if (errors.length > 0) {
    return err(validationError('Factur-X validation failed', {
      profile: report.profile,
      errors: errors.map((e) => ({ field: e.field, rule: e.rule, message: e.message })),
    }));
  }
  return ok(true);
}

export function validateFacturxDataDetailed(data: FacturxInvoiceData): ValidationReport {
  const issues: ValidationIssue[] = [];
  const profile: FacturxProfile = data.profile ?? 'MINIMUM';
  const isEn16931 = profile === 'EN 16931' || profile === 'EXTENDED';

  // BR-01
  if (!data.number || data.number.trim().length === 0) {
    issues.push({ severity: 'error', rule: 'BR-01', field: 'number', message: 'Numero facture obligatoire' });
  }
  // BT-3 type code
  if (!data.type_code || !VALID_TYPE_CODES.includes(data.type_code)) {
    issues.push({ severity: 'error', rule: 'BT-3', field: 'type_code', message: `Type code invalide. Attendu : ${VALID_TYPE_CODES.join(', ')}` });
  }
  // BR-02
  if (!data.issue_date || isNaN(data.issue_date.getTime())) {
    issues.push({ severity: 'error', rule: 'BR-02', field: 'issue_date', message: 'Date emission obligatoire' });
  }
  // BT-9
  if (!data.due_date || isNaN(data.due_date.getTime())) {
    issues.push({ severity: isEn16931 ? 'error' : 'warning', rule: 'BT-9', field: 'due_date', message: 'Date echeance requise' });
  }
  // BR-05
  if (!data.currency) {
    issues.push({ severity: 'error', rule: 'BR-05', field: 'currency', message: 'Devise obligatoire' });
  } else if (!VALID_CURRENCIES.has(data.currency)) {
    issues.push({ severity: 'warning', rule: 'BR-05', field: 'currency', message: `Devise non standard : ${data.currency}` });
  }

  // BR-03/06/09 Seller
  if (!data.seller) {
    issues.push({ severity: 'error', rule: 'BR-03', field: 'seller', message: 'Vendeur obligatoire' });
  } else {
    if (!data.seller.name) issues.push({ severity: 'error', rule: 'BR-06', field: 'seller.name', message: 'Nom vendeur obligatoire' });
    if (!data.seller.country_code) issues.push({ severity: 'error', rule: 'BR-09', field: 'seller.country_code', message: 'Pays vendeur obligatoire' });
    else if (!/^[A-Z]{2}$/.test(data.seller.country_code)) issues.push({ severity: 'error', rule: 'BR-09', field: 'seller.country_code', message: 'Code pays ISO 3166-1 alpha-2 requis' });
  }
  // BR-04/07/11 Buyer
  if (!data.buyer) {
    issues.push({ severity: 'error', rule: 'BR-04', field: 'buyer', message: 'Acheteur obligatoire' });
  } else {
    if (!data.buyer.name) issues.push({ severity: 'error', rule: 'BR-07', field: 'buyer.name', message: 'Nom acheteur obligatoire' });
    if (!data.buyer.country_code) issues.push({ severity: 'error', rule: 'BR-11', field: 'buyer.country_code', message: 'Pays acheteur obligatoire' });
  }

  // Lines (required sauf MINIMUM/BASIC WL)
  if (profile !== 'MINIMUM' && profile !== 'BASIC WL' && data.lines.length === 0) {
    issues.push({ severity: 'error', rule: 'BR-16', field: 'lines', message: 'Au moins une ligne requise' });
  }
  for (const [i, line] of data.lines.entries()) {
    if (!line.label || line.label.trim().length === 0) {
      issues.push({ severity: 'error', rule: 'BT-153', field: `lines[${i}].label`, message: 'Designation obligatoire' });
    }
    if (line.quantity <= 0) {
      issues.push({ severity: 'error', rule: 'BT-129', field: `lines[${i}].quantity`, message: 'Quantite > 0' });
    }
    if (line.tva_rate < 0) {
      issues.push({ severity: 'error', rule: 'BT-152', field: `lines[${i}].tva_rate`, message: 'Taux TVA negatif interdit' });
    }
  }

  // Tax groups
  if (data.tax_groups.length === 0) {
    issues.push({ severity: 'error', rule: 'BR-53', field: 'tax_groups', message: 'Au moins un groupe TVA requis' });
  }
  for (const [i, tg] of data.tax_groups.entries()) {
    if (tg.tva_rate < 0) {
      issues.push({ severity: 'error', rule: 'BT-152', field: `tax_groups[${i}].tva_rate`, message: 'Taux TVA negatif interdit' });
    }
  }
  const tgHt = data.tax_groups.reduce((s, t) => s + t.base_ht_cents, 0);
  const tgTva = data.tax_groups.reduce((s, t) => s + t.tva_cents, 0);
  if (Math.abs(tgHt - data.total_ht_cents) > 2) {
    issues.push({ severity: 'error', rule: 'BR-CO-TAX', field: 'tax_groups', message: `Somme bases TVA (${tgHt}) != total HT (${data.total_ht_cents})` });
  }
  if (Math.abs(tgTva - data.total_tva_cents) > 2) {
    issues.push({ severity: 'error', rule: 'BR-CO-TAX', field: 'tax_groups', message: `Somme TVA (${tgTva}) != total TVA (${data.total_tva_cents})` });
  }

  // BR-CO-10 : somme lignes = total HT (tolerance arrondi 2 cents)
  if (data.lines.length > 0) {
    const sumLines = data.lines.reduce((s, l) => s + l.total_ht_cents, 0);
    if (Math.abs(sumLines - data.total_ht_cents) > 2) {
      issues.push({ severity: 'error', rule: 'BR-CO-10', field: 'total_ht_cents', message: `Somme lignes (${sumLines}) != total HT (${data.total_ht_cents})` });
    }
  }

  // BR-CO-15 : HT + TVA = TTC
  if (Math.abs((data.total_ht_cents + data.total_tva_cents) - data.total_ttc_cents) > 2) {
    issues.push({ severity: 'error', rule: 'BR-CO-15', field: 'total_ttc_cents', message: 'HT + TVA != TTC' });
  }

  // EN 16931 specific
  if (isEn16931) {
    if (data.payment_means_code && !VALID_PAYMENT_MEANS.has(data.payment_means_code)) {
      issues.push({ severity: 'warning', rule: 'BT-81', field: 'payment_means_code', message: `Code paiement non standard : ${data.payment_means_code}` });
    }
    if (data.iban && !IBAN_REGEX.test(data.iban.replace(/\s/g, ''))) {
      issues.push({ severity: 'error', rule: 'BT-84', field: 'iban', message: 'IBAN invalide' });
    }
  }

  return { valid: issues.filter((i) => i.severity === 'error').length === 0, profile, issues };
}

/**
 * Validate generated XML structure (verifie bien-forme + presence elements cles).
 * Une validation XSD complete necessite libxml2/xmllint serveur.
 */
export function validateFacturxXml(xml: string): Result<true, AppError> {
  const issues: string[] = [];

  if (!xml.includes('CrossIndustryInvoice')) issues.push('Missing CrossIndustryInvoice root element');
  if (!xml.includes('urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100')) issues.push('Missing rsm namespace');
  if (!xml.includes('urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100')) issues.push('Missing ram namespace');
  if (!xml.includes('ExchangedDocumentContext')) issues.push('Missing ExchangedDocumentContext');
  if (!xml.includes('ExchangedDocument')) issues.push('Missing ExchangedDocument');
  if (!xml.includes('SupplyChainTradeTransaction')) issues.push('Missing SupplyChainTradeTransaction');
  if (!xml.includes('SellerTradeParty')) issues.push('Missing SellerTradeParty');
  if (!xml.includes('BuyerTradeParty')) issues.push('Missing BuyerTradeParty');
  if (!xml.includes('SpecifiedTradeSettlementHeaderMonetarySummation')) issues.push('Missing monetary summation');

  // Check at least one profil Factur-X present (minimum, basicwl, basic, en16931, extended)
  const hasProfile = /urn:factur-x\.eu:1p0:(minimum|basicwl|basic|extended)|urn:cen\.eu:en16931:2017/.test(xml);
  if (!hasProfile) issues.push('Missing Factur-X / EN16931 profile identifier');

  // Balances tags
  const openCount = (xml.match(/<(rsm|ram):/g) || []).length;
  const closeCount = (xml.match(/<\/(rsm|ram):/g) || []).length;
  if (openCount !== closeCount) issues.push(`Unbalanced tags : ${openCount} open vs ${closeCount} close`);

  if (issues.length > 0) return err(validationError('Invalid Factur-X XML structure', { issues }));
  return ok(true);
}
