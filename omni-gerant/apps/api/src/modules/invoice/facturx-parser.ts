// BUSINESS RULE [CDC-2.1]: Parser Factur-X entrant - Extraction et interpretation XML CII
// Supporte les 5 profils : MINIMUM, BASIC WL, BASIC, EN16931 (COMFORT), EXTENDED

import type { Result } from '@omni-gerant/shared';
import { ok, err } from '@omni-gerant/shared';

// --- Output interface ---

export interface ParsedFacturXSeller {
  name: string;
  siret: string;
  tvaNumber?: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
}

export interface ParsedFacturXBuyer {
  name: string;
  siret: string;
  tvaNumber?: string;
}

export interface ParsedFacturXLine {
  description: string;
  quantity: number;
  unitPriceCents: number;
  tvaRate: number;           // percentage (20, 10, 5.5, 2.1)
  totalHtCents: number;
  totalTvaCents: number;
}

export interface TvaBreakdownEntry {
  rate: number;
  baseHtCents: number;
  tvaCents: number;
}

export type FacturxProfile = 'minimum' | 'basic_wl' | 'basic' | 'en16931' | 'extended';

export interface ParsedFacturXInvoice {
  invoiceNumber: string;
  issueDate: Date;
  dueDate?: Date;
  invoiceType: 'standard' | 'credit_note' | 'corrective';
  seller: ParsedFacturXSeller;
  buyer: ParsedFacturXBuyer;
  // BUSINESS RULE [CDC-2.1]: Montants en centimes — JAMAIS de float
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
  lines: ParsedFacturXLine[];
  tvaBreakdown: TvaBreakdownEntry[];
  paymentTerms?: string;
  paymentMeans?: string;
  iban?: string;
  bic?: string;
  facturxProfile: FacturxProfile;
  rawXml: string;
  coherenceWarnings: CoherenceError[];
}

export interface CoherenceError {
  type: 'line_sum_mismatch' | 'tva_calculation_mismatch' | 'ttc_mismatch';
  message: string;
  expected: number;
  actual: number;
}

export type FacturXParseError =
  | { code: 'NO_XML_FOUND'; message: string }
  | { code: 'INVALID_XML'; message: string; details: string }
  | { code: 'UNKNOWN_PROFILE'; message: string }
  | { code: 'MISSING_REQUIRED_FIELD'; field: string; message: string };

// --- XML extraction from PDF ---

const FACTURX_ATTACHMENT_NAMES = ['factur-x.xml', 'zugferd-invoice.xml', 'xrechnung.xml'];

/**
 * Extract Factur-X XML attachment from a PDF buffer.
 * Looks for embedded files with known Factur-X names.
 * Uses a lightweight approach: scan PDF binary for embedded XML streams.
 */
export function extractXmlFromPdf(pdfBuffer: Buffer): Result<string, FacturXParseError> {
  const pdfString = pdfBuffer.toString('latin1');

  // Strategy 1: Look for embedded file streams by searching for XML content between stream markers
  // PDF embedded files are stored in stream objects
  for (const attachmentName of FACTURX_ATTACHMENT_NAMES) {
    const nameIndex = pdfString.indexOf(attachmentName);
    if (nameIndex !== -1) {
      // Found a reference to a known Factur-X file name, now find the XML stream
      const xmlContent = extractXmlStream(pdfString);
      if (xmlContent) {
        return ok(xmlContent);
      }
    }
  }

  // Strategy 2: Look for CII XML directly in the PDF stream data
  const xmlContent = extractXmlStream(pdfString);
  if (xmlContent) {
    return ok(xmlContent);
  }

  return err({ code: 'NO_XML_FOUND', message: 'No Factur-X XML attachment found in PDF' });
}

function extractXmlStream(pdfContent: string): string | null {
  // Look for CrossIndustryInvoice XML within stream objects
  const ciiStart = pdfContent.indexOf('<?xml');
  if (ciiStart === -1) return null;

  // Find all XML declarations and check each one
  let searchPos = 0;
  while (searchPos < pdfContent.length) {
    const xmlDeclPos = pdfContent.indexOf('<?xml', searchPos);
    if (xmlDeclPos === -1) break;

    // Check if this XML contains CrossIndustryInvoice
    const endSearchArea = pdfContent.indexOf('endstream', xmlDeclPos);
    const endPos = endSearchArea !== -1 ? endSearchArea : pdfContent.length;
    const candidate = pdfContent.substring(xmlDeclPos, endPos);

    if (candidate.includes('CrossIndustryInvoice')) {
      // Find the closing tag
      const closingTag = '</rsm:CrossIndustryInvoice>';
      const closingPos = candidate.indexOf(closingTag);
      if (closingPos !== -1) {
        return candidate.substring(0, closingPos + closingTag.length);
      }
    }

    searchPos = xmlDeclPos + 1;
  }

  return null;
}

/**
 * Parse raw Factur-X XML string into structured data.
 * Supports all 5 profiles: MINIMUM, BASIC WL, BASIC, EN16931, EXTENDED.
 */
export function parseFacturXXml(xml: string): Result<ParsedFacturXInvoice, FacturXParseError> {
  // Validate it's a CII document
  if (!xml.includes('CrossIndustryInvoice')) {
    return err({
      code: 'INVALID_XML',
      message: 'Not a valid Factur-X/CII document',
      details: 'Missing CrossIndustryInvoice root element',
    });
  }

  if (!xml.includes('urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100') &&
      !xml.includes('CrossIndustryInvoice')) {
    return err({
      code: 'INVALID_XML',
      message: 'Invalid CII namespace',
      details: 'Missing required CII namespace declaration',
    });
  }

  // Detect profile
  const profile = detectProfile(xml);
  if (!profile) {
    return err({
      code: 'UNKNOWN_PROFILE',
      message: 'Could not detect Factur-X profile from guideline ID',
    });
  }

  // Extract invoice number — must be in rsm:ExchangedDocument, NOT ExchangedDocumentContext
  const exchangedDocSection = findSection(xml, 'rsm:ExchangedDocument');
  const invoiceNumber = exchangedDocSection ? extractTagContent(exchangedDocSection, 'ram:ID') : null;
  if (!invoiceNumber) {
    return err({
      code: 'MISSING_REQUIRED_FIELD',
      field: 'invoiceNumber',
      message: 'Invoice number (ram:ID in ExchangedDocument) is required',
    });
  }

  // Extract type code
  const typeCodeStr = exchangedDocSection ? extractTagContent(exchangedDocSection, 'ram:TypeCode') : null;
  const invoiceType = mapTypeCode(typeCodeStr ?? '380');

  // Extract dates
  const issueDateStr = extractDateTimeString(xml, 'ram:IssueDateTime');
  if (!issueDateStr) {
    return err({
      code: 'MISSING_REQUIRED_FIELD',
      field: 'issueDate',
      message: 'Issue date is required',
    });
  }
  const issueDate = parseCiiDate(issueDateStr);

  const dueDateStr = extractDateTimeString(xml, 'ram:DueDateDateTime');
  const dueDate = dueDateStr ? parseCiiDate(dueDateStr) : undefined;

  // Extract seller
  const sellerSection = findSection(xml, 'ram:SellerTradeParty');
  if (!sellerSection) {
    return err({
      code: 'MISSING_REQUIRED_FIELD',
      field: 'seller',
      message: 'Seller (SellerTradeParty) is required',
    });
  }
  const seller = parseParty(sellerSection);

  // Extract buyer
  const buyerSection = findSection(xml, 'ram:BuyerTradeParty');
  if (!buyerSection) {
    return err({
      code: 'MISSING_REQUIRED_FIELD',
      field: 'buyer',
      message: 'Buyer (BuyerTradeParty) is required',
    });
  }
  const buyerParty = parseParty(buyerSection);
  const buyer: ParsedFacturXBuyer = {
    name: buyerParty.name,
    siret: buyerParty.siret,
    tvaNumber: buyerParty.tvaNumber,
  };

  // Extract monetary summation
  const summationSection = findSection(xml, 'ram:SpecifiedTradeSettlementHeaderMonetarySummation');
  const totalHtCents = decimalToCents(extractTagContent(summationSection ?? '', 'ram:TaxBasisTotalAmount') ?? '0');
  const totalTvaCents = decimalToCents(extractTagContent(summationSection ?? '', 'ram:TaxTotalAmount') ?? '0');
  const totalTtcCents = decimalToCents(extractTagContent(summationSection ?? '', 'ram:GrandTotalAmount') ?? '0');

  // Extract tax breakdown
  const tvaBreakdown = parseTaxBreakdown(xml);

  // Extract line items (BASIC and above profiles)
  const lines = parseLineItems(xml);

  // Extract payment info
  const paymentTerms = extractPaymentTerms(xml);
  const paymentMeans = extractPaymentMeans(xml);
  const iban = extractIban(xml);
  const bic = extractBic(xml);

  // Coherence validation
  const coherenceWarnings = validateCoherence(totalHtCents, totalTvaCents, totalTtcCents, lines, tvaBreakdown);

  return ok({
    invoiceNumber,
    issueDate,
    dueDate,
    invoiceType,
    seller,
    buyer,
    totalHtCents,
    totalTvaCents,
    totalTtcCents,
    lines,
    tvaBreakdown,
    paymentTerms,
    paymentMeans,
    iban,
    bic,
    facturxProfile: profile,
    rawXml: xml,
    coherenceWarnings,
  });
}

// --- Profile detection ---

const PROFILE_PATTERNS: { pattern: string; profile: FacturxProfile }[] = [
  { pattern: 'extended', profile: 'extended' },
  { pattern: 'en16931', profile: 'en16931' },
  { pattern: 'comfort', profile: 'en16931' },       // Alias
  { pattern: 'basic_wl', profile: 'basic_wl' },
  { pattern: 'basicwl', profile: 'basic_wl' },
  { pattern: 'basic', profile: 'basic' },
  { pattern: 'minimum', profile: 'minimum' },
];

function detectProfile(xml: string): FacturxProfile | null {
  // Look for guideline ID
  const guidelineSection = findSection(xml, 'ram:GuidelineSpecifiedDocumentContextParameter');
  const guidelineId = extractTagContent(guidelineSection ?? '', 'ram:ID');

  if (guidelineId) {
    const lower = guidelineId.toLowerCase();
    for (const { pattern, profile } of PROFILE_PATTERNS) {
      if (lower.includes(pattern)) return profile;
    }
  }

  // Fallback: detect from content presence
  const hasLines = xml.includes('IncludedSupplyChainTradeLineItem');
  const hasSeller = xml.includes('SellerTradeParty');
  const hasBuyer = xml.includes('BuyerTradeParty');

  if (hasLines && hasSeller && hasBuyer) {
    // Has lines + parties — at least BASIC
    if (xml.includes('AdditionalReferencedDocument') || xml.includes('DesignatedProductClassification')) {
      return 'extended';
    }
    return 'basic';
  }

  if (hasSeller && hasBuyer) return 'basic_wl';
  return 'minimum';
}

// --- XML helpers ---

function findSection(xml: string, tagName: string): string | null {
  // Handle both namespaced and non-namespaced tags
  // Must match exact tag name (followed by > or space), not a prefix
  const openPattern = `<${tagName}`;
  let searchPos = 0;

  while (searchPos < xml.length) {
    const startIdx = xml.indexOf(openPattern, searchPos);
    if (startIdx === -1) return null;

    // Verify exact tag match: next char after tag name must be > or space or /
    const charAfter = xml[startIdx + openPattern.length];
    if (charAfter !== '>' && charAfter !== ' ' && charAfter !== '/' && charAfter !== '\n' && charAfter !== '\r' && charAfter !== '\t') {
      searchPos = startIdx + 1;
      continue;
    }

    // Find the closing tag — handle self-closing and nested
    const closingTag = `</${tagName}>`;
    const closeIdx = xml.indexOf(closingTag, startIdx);
    if (closeIdx === -1) {
      // Try self-closing
      const tagEndPos = xml.indexOf('>', startIdx);
      if (tagEndPos !== -1 && xml[tagEndPos - 1] === '/') {
        return xml.substring(startIdx, tagEndPos + 1);
      }
      return null;
    }

    return xml.substring(startIdx, closeIdx + closingTag.length);
  }

  return null;
}

function extractTagContent(xml: string, tagName: string, section?: string | null): string | null {
  const searchIn = section ?? xml;
  const openPattern = `<${tagName}`;
  const startIdx = searchIn.indexOf(openPattern);
  if (startIdx === -1) return null;

  // Find the end of the opening tag
  const tagEnd = searchIn.indexOf('>', startIdx);
  if (tagEnd === -1) return null;

  // Check for self-closing tag
  if (searchIn[tagEnd - 1] === '/') return null;

  const contentStart = tagEnd + 1;
  const closingTag = `</${tagName}>`;
  const contentEnd = searchIn.indexOf(closingTag, contentStart);
  if (contentEnd === -1) return null;

  const content = searchIn.substring(contentStart, contentEnd).trim();
  // Strip any nested tags to get text content only
  return content.replace(/<[^>]+>/g, '').trim();
}

function extractDateTimeString(xml: string, parentTag: string): string | null {
  const section = findSection(xml, parentTag);
  if (!section) return null;
  return extractTagContent(section, 'udt:DateTimeString');
}

function parseCiiDate(dateStr: string): Date {
  // Format 102: YYYYMMDD
  if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1;
    const day = parseInt(dateStr.substring(6, 8), 10);
    return new Date(Date.UTC(year, month, day));
  }
  // Try ISO format
  return new Date(dateStr);
}

// BUSINESS RULE [CDC-2.1]: Conversion decimaux → centimes sans perte de precision
function decimalToCents(value: string): number {
  const cleaned = value.replace(/\s/g, '').replace(',', '.');
  return Math.round(parseFloat(cleaned) * 100);
}

function percentFromBasisPoints(bpStr: string): number {
  // CII XML stores percentages as decimals (e.g., "20.00" for 20%)
  const val = parseFloat(bpStr.replace(',', '.'));
  return val;
}

function mapTypeCode(code: string): 'standard' | 'credit_note' | 'corrective' {
  switch (code) {
    case '381': return 'credit_note';
    case '384': return 'corrective';
    default: return 'standard';
  }
}

// --- Party parsing ---

function parseParty(section: string): ParsedFacturXSeller {
  const name = extractTagContent(section, 'ram:Name') ?? '';

  // SIRET: schemeID="0002"
  let siret = '';
  const legalOrgSection = findSection(section, 'ram:SpecifiedLegalOrganization');
  if (legalOrgSection) {
    // Look for ID with schemeID="0002"
    const idMatch = legalOrgSection.match(/<ram:ID[^>]*schemeID="0002"[^>]*>([^<]+)<\/ram:ID>/);
    if (idMatch) {
      siret = idMatch[1].trim();
    } else {
      siret = extractTagContent(legalOrgSection, 'ram:ID') ?? '';
    }
  }

  // TVA number: schemeID="VA"
  let tvaNumber: string | undefined;
  const taxRegSection = findSection(section, 'ram:SpecifiedTaxRegistration');
  if (taxRegSection) {
    const vatMatch = taxRegSection.match(/<ram:ID[^>]*schemeID="VA"[^>]*>([^<]+)<\/ram:ID>/);
    if (vatMatch) {
      tvaNumber = vatMatch[1].trim();
    } else {
      tvaNumber = extractTagContent(taxRegSection, 'ram:ID') ?? undefined;
    }
  }

  // Address
  const addressSection = findSection(section, 'ram:PostalTradeAddress');
  const address = extractTagContent(addressSection ?? '', 'ram:LineOne') ?? '';
  const postalCode = extractTagContent(addressSection ?? '', 'ram:PostcodeCode') ?? '';
  const city = extractTagContent(addressSection ?? '', 'ram:CityName') ?? '';
  const country = extractTagContent(addressSection ?? '', 'ram:CountryID') ?? '';

  return { name, siret, tvaNumber, address, postalCode, city, country };
}

// --- Tax breakdown ---

function parseTaxBreakdown(xml: string): TvaBreakdownEntry[] {
  const result: TvaBreakdownEntry[] = [];
  const settlementSection = findSection(xml, 'ram:ApplicableHeaderTradeSettlement');
  if (!settlementSection) return result;

  // Find all ApplicableTradeTax blocks within the settlement (not within lines)
  let searchPos = 0;
  const searchIn = settlementSection;

  while (searchPos < searchIn.length) {
    const tagStart = searchIn.indexOf('<ram:ApplicableTradeTax>', searchPos);
    if (tagStart === -1) break;

    const tagEnd = searchIn.indexOf('</ram:ApplicableTradeTax>', tagStart);
    if (tagEnd === -1) break;

    const taxBlock = searchIn.substring(tagStart, tagEnd + '</ram:ApplicableTradeTax>'.length);

    const basisAmount = extractTagContent(taxBlock, 'ram:BasisAmount');
    const calculatedAmount = extractTagContent(taxBlock, 'ram:CalculatedAmount');
    const ratePercent = extractTagContent(taxBlock, 'ram:RateApplicablePercent');

    if (basisAmount && calculatedAmount && ratePercent) {
      result.push({
        rate: percentFromBasisPoints(ratePercent),
        baseHtCents: decimalToCents(basisAmount),
        tvaCents: decimalToCents(calculatedAmount),
      });
    }

    searchPos = tagEnd + 1;
  }

  return result;
}

// --- Line items ---

function parseLineItems(xml: string): ParsedFacturXLine[] {
  const result: ParsedFacturXLine[] = [];
  let searchPos = 0;

  while (searchPos < xml.length) {
    const lineStart = xml.indexOf('<ram:IncludedSupplyChainTradeLineItem>', searchPos);
    if (lineStart === -1) break;

    const lineEnd = xml.indexOf('</ram:IncludedSupplyChainTradeLineItem>', lineStart);
    if (lineEnd === -1) break;

    const lineBlock = xml.substring(lineStart, lineEnd + '</ram:IncludedSupplyChainTradeLineItem>'.length);

    const description = extractTagContent(lineBlock, 'ram:Name') ?? '';

    // Quantity
    const quantityStr = extractBilledQuantity(lineBlock);
    const quantity = quantityStr ? parseFloat(quantityStr) : 1;

    // Unit price
    const chargeAmount = extractTagContent(lineBlock, 'ram:ChargeAmount');
    const unitPriceCents = chargeAmount ? decimalToCents(chargeAmount) : 0;

    // TVA rate
    const lineSettlement = findSection(lineBlock, 'ram:SpecifiedLineTradeSettlement');
    const lineTax = lineSettlement ? findSection(lineSettlement, 'ram:ApplicableTradeTax') : null;
    const rateStr = lineTax ? extractTagContent(lineTax, 'ram:RateApplicablePercent') : null;
    const tvaRate = rateStr ? percentFromBasisPoints(rateStr) : 0;

    // Line total
    const lineTotalStr = extractTagContent(lineBlock, 'ram:LineTotalAmount');
    const totalHtCents = lineTotalStr ? decimalToCents(lineTotalStr) : Math.round(quantity * unitPriceCents);

    // Calculate TVA for this line
    const totalTvaCents = Math.round(totalHtCents * tvaRate / 100);

    result.push({
      description,
      quantity,
      unitPriceCents,
      tvaRate,
      totalHtCents,
      totalTvaCents,
    });

    searchPos = lineEnd + 1;
  }

  return result;
}

function extractBilledQuantity(lineBlock: string): string | null {
  const match = lineBlock.match(/<ram:BilledQuantity[^>]*>([^<]+)<\/ram:BilledQuantity>/);
  return match ? match[1].trim() : null;
}

// --- Payment info ---

function extractPaymentTerms(xml: string): string | undefined {
  const section = findSection(xml, 'ram:SpecifiedTradePaymentTerms');
  if (!section) return undefined;
  const desc = extractTagContent(section, 'ram:Description');
  return desc ?? undefined;
}

function extractPaymentMeans(xml: string): string | undefined {
  const section = findSection(xml, 'ram:SpecifiedTradeSettlementPaymentMeans');
  if (!section) return undefined;
  const typeCode = extractTagContent(section, 'ram:TypeCode');
  return typeCode ?? undefined;
}

function extractIban(xml: string): string | undefined {
  const section = findSection(xml, 'ram:PayeePartyCreditorFinancialAccount');
  if (!section) return undefined;
  const iban = extractTagContent(section, 'ram:IBANID');
  return iban ?? undefined;
}

function extractBic(xml: string): string | undefined {
  const section = findSection(xml, 'ram:PayeeSpecifiedCreditorFinancialInstitution');
  if (!section) return undefined;
  const bic = extractTagContent(section, 'ram:BICID');
  return bic ?? undefined;
}

// --- Coherence validation ---

// BUSINESS RULE [CDC-2.1]: Validation coherence Factur-X entrant
function validateCoherence(
  totalHtCents: number,
  totalTvaCents: number,
  totalTtcCents: number,
  lines: ParsedFacturXLine[],
  tvaBreakdown: TvaBreakdownEntry[],
): CoherenceError[] {
  const warnings: CoherenceError[] = [];

  // Check 1: Sum of lines HT === totalHtCents (with tolerance: 1 centime per line)
  if (lines.length > 0) {
    const sumLinesHt = lines.reduce((sum, l) => sum + l.totalHtCents, 0);
    const tolerance = lines.length; // 1 centime per line
    if (Math.abs(sumLinesHt - totalHtCents) > tolerance) {
      warnings.push({
        type: 'line_sum_mismatch',
        message: `Sum of line HT (${sumLinesHt}) differs from total HT (${totalHtCents}) beyond tolerance of ${tolerance} centimes`,
        expected: totalHtCents,
        actual: sumLinesHt,
      });
    }
  }

  // Check 2: TVA per rate: base * rate === TVA amount
  for (const entry of tvaBreakdown) {
    const expectedTva = Math.round(entry.baseHtCents * entry.rate / 100);
    if (Math.abs(expectedTva - entry.tvaCents) > 1) {
      warnings.push({
        type: 'tva_calculation_mismatch',
        message: `TVA at ${entry.rate}%: expected ${expectedTva} centimes but got ${entry.tvaCents}`,
        expected: expectedTva,
        actual: entry.tvaCents,
      });
    }
  }

  // Check 3: TTC === HT + TVA
  const expectedTtc = totalHtCents + totalTvaCents;
  if (Math.abs(expectedTtc - totalTtcCents) > 1) {
    warnings.push({
      type: 'ttc_mismatch',
      message: `TTC (${totalTtcCents}) should equal HT (${totalHtCents}) + TVA (${totalTvaCents}) = ${expectedTtc}`,
      expected: expectedTtc,
      actual: totalTtcCents,
    });
  }

  return warnings;
}
