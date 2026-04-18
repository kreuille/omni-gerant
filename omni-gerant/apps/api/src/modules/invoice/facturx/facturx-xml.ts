// BUSINESS RULE [CDC-2.1]: Generation XML CII (CrossIndustryInvoice) Factur-X
// BUSINESS RULE [CDC-2.1]: Conformite reforme facturation electronique 2026
// Profil : Factur-X MINIMUM / BASIC

export interface FacturxParty {
  name: string;
  siret?: string;
  vat_number?: string;
  address_line: string;
  zip_code: string;
  city: string;
  country_code: string; // ISO 3166-1 alpha-2
}

export interface FacturxTaxGroup {
  tva_rate: number; // percentage (20 = 20%)
  base_ht_cents: number;
  tva_cents: number;
}

export interface FacturxLine {
  position: number;
  label: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  tva_rate: number;
  total_ht_cents: number;
}

export interface FacturxInvoiceData {
  number: string;
  type_code: string; // 380 = Invoice, 381 = Credit Note, 386 = Deposit
  issue_date: Date;
  due_date: Date;
  currency: string;
  seller: FacturxParty;
  buyer: FacturxParty;
  lines: FacturxLine[];
  tax_groups: FacturxTaxGroup[];
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  payment_terms_days: number;
  notes?: string;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatPercent(rate: number): string {
  return rate.toFixed(2);
}

// Map internal unit codes to UN/ECE Rec 20 codes
const UNIT_MAP: Record<string, string> = {
  unit: 'C62',  // One (unit)
  h: 'HUR',     // Hour
  j: 'DAY',     // Day
  m: 'MTR',     // Metre
  m2: 'MTK',    // Square metre
  kg: 'KGM',    // Kilogram
  l: 'LTR',     // Litre
  forfait: 'C62',
};

function mapUnit(unit: string): string {
  return UNIT_MAP[unit.toLowerCase()] ?? 'C62';
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateFacturxXml(data: FacturxInvoiceData): string {
  const lines = data.lines.map((line) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${line.position}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXml(line.label)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${centsToDecimal(line.unit_price_cents)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="${mapUnit(line.unit)}">${line.quantity}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>${formatPercent(line.tva_rate)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${centsToDecimal(line.total_ht_cents)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`).join('');

  const taxGroups = data.tax_groups.map((tg) => `
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${centsToDecimal(tg.tva_cents)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${centsToDecimal(tg.base_ht_cents)}</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>${formatPercent(tg.tva_rate)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(data.number)}</ram:ID>
    <ram:TypeCode>${data.type_code}</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${formatDate(data.issue_date)}</udt:DateTimeString>
    </ram:IssueDateTime>${data.notes ? `
    <ram:IncludedNote>
      <ram:Content>${escapeXml(data.notes)}</ram:Content>
    </ram:IncludedNote>` : ''}
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>${lines}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(data.seller.name)}</ram:Name>${data.seller.siret ? `
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${data.seller.siret}</ram:ID>
        </ram:SpecifiedLegalOrganization>` : ''}
        <ram:PostalTradeAddress>
          <ram:LineOne>${escapeXml(data.seller.address_line)}</ram:LineOne>
          <ram:PostcodeCode>${data.seller.zip_code}</ram:PostcodeCode>
          <ram:CityName>${escapeXml(data.seller.city)}</ram:CityName>
          <ram:CountryID>${data.seller.country_code}</ram:CountryID>
        </ram:PostalTradeAddress>${data.seller.vat_number ? `
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${data.seller.vat_number}</ram:ID>
        </ram:SpecifiedTaxRegistration>` : ''}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(data.buyer.name)}</ram:Name>${data.buyer.siret ? `
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${data.buyer.siret}</ram:ID>
        </ram:SpecifiedLegalOrganization>` : ''}
        <ram:PostalTradeAddress>
          <ram:LineOne>${escapeXml(data.buyer.address_line)}</ram:LineOne>
          <ram:PostcodeCode>${data.buyer.zip_code}</ram:PostcodeCode>
          <ram:CityName>${escapeXml(data.buyer.city)}</ram:CityName>
          <ram:CountryID>${data.buyer.country_code}</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${data.currency}</ram:InvoiceCurrencyCode>${taxGroups}
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formatDate(data.due_date)}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${centsToDecimal(data.total_ht_cents)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${centsToDecimal(data.total_ht_cents)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${data.currency}">${centsToDecimal(data.total_tva_cents)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${centsToDecimal(data.total_ttc_cents)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${centsToDecimal(data.total_ttc_cents)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

// Map internal invoice type to UN/CEFACT type code
export function getTypeCode(type: string): string {
  switch (type) {
    case 'credit_note': return '381';
    case 'deposit': return '386';
    default: return '380'; // Standard invoice
  }
}
