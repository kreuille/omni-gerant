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

export type FacturxProfile = 'MINIMUM' | 'BASIC WL' | 'BASIC' | 'EN 16931' | 'EXTENDED';

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

  // EN 16931 champs additionnels
  profile?: FacturxProfile;
  buyer_reference?: string;        // BT-10 : reference acheteur
  purchase_order_ref?: string;     // BT-13
  delivery_date?: Date;            // BT-72
  payment_means_code?: string;     // BT-81 : 30=virement, 42=SEPA, 48=carte, 59=CB
  iban?: string;                   // BT-84
  bic?: string;                    // BT-86
  payment_reference?: string;      // BT-83
  payment_terms_description?: string; // BT-20
  seller_email?: string;           // BT-34
  buyer_email?: string;            // BT-49
  allowance_total_cents?: number;  // BT-107
  charge_total_cents?: number;     // BT-108
  paid_amount_cents?: number;      // BT-113
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

function profileToGuidelineId(profile: FacturxProfile = 'MINIMUM'): string {
  switch (profile) {
    case 'MINIMUM': return 'urn:factur-x.eu:1p0:minimum';
    case 'BASIC WL': return 'urn:factur-x.eu:1p0:basicwl';
    case 'BASIC': return 'urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic';
    case 'EN 16931': return 'urn:cen.eu:en16931:2017';
    case 'EXTENDED': return 'urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended';
  }
}

export function generateFacturxXml(data: FacturxInvoiceData): string {
  const profile = data.profile ?? 'MINIMUM';
  const isEn16931 = profile === 'EN 16931' || profile === 'EXTENDED';
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

  const buyerRef = isEn16931 && data.buyer_reference ? `
    <ram:BuyerReference>${escapeXml(data.buyer_reference)}</ram:BuyerReference>` : '';
  const purchaseOrder = isEn16931 && data.purchase_order_ref ? `
      <ram:BuyerOrderReferencedDocument>
        <ram:IssuerAssignedID>${escapeXml(data.purchase_order_ref)}</ram:IssuerAssignedID>
      </ram:BuyerOrderReferencedDocument>` : '';
  const deliveryBlock = isEn16931 && data.delivery_date ? `
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${formatDate(data.delivery_date)}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>` : '';
  const sellerEmail = isEn16931 && data.seller_email ? `
        <ram:URIUniversalCommunication>
          <ram:URIID schemeID="EM">${escapeXml(data.seller_email)}</ram:URIID>
        </ram:URIUniversalCommunication>` : '';
  const buyerEmail = isEn16931 && data.buyer_email ? `
        <ram:URIUniversalCommunication>
          <ram:URIID schemeID="EM">${escapeXml(data.buyer_email)}</ram:URIID>
        </ram:URIUniversalCommunication>` : '';
  const paymentMeans = isEn16931 && data.payment_means_code ? `
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>${data.payment_means_code}</ram:TypeCode>${data.payment_reference ? `
        <ram:Information>${escapeXml(data.payment_reference)}</ram:Information>` : ''}${data.iban ? `
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${data.iban}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>` : ''}${data.bic ? `
        <ram:PayeeSpecifiedCreditorFinancialInstitution>
          <ram:BICID>${data.bic}</ram:BICID>
        </ram:PayeeSpecifiedCreditorFinancialInstitution>` : ''}
      </ram:SpecifiedTradeSettlementPaymentMeans>` : '';
  const paymentTermsDesc = isEn16931 && data.payment_terms_description ? `
        <ram:Description>${escapeXml(data.payment_terms_description)}</ram:Description>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>${profileToGuidelineId(profile)}</ram:ID>
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
    <ram:ApplicableHeaderTradeAgreement>${buyerRef}
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
        </ram:PostalTradeAddress>${sellerEmail}${data.seller.vat_number ? `
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
        </ram:PostalTradeAddress>${buyerEmail}${isEn16931 && data.buyer.vat_number ? `
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${data.buyer.vat_number}</ram:ID>
        </ram:SpecifiedTaxRegistration>` : ''}
      </ram:BuyerTradeParty>${purchaseOrder}
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>${deliveryBlock}</ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${data.currency}</ram:InvoiceCurrencyCode>${paymentMeans}${taxGroups}
      <ram:SpecifiedTradePaymentTerms>${paymentTermsDesc}
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formatDate(data.due_date)}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${centsToDecimal(data.total_ht_cents)}</ram:LineTotalAmount>${isEn16931 && (data.charge_total_cents ?? 0) > 0 ? `
        <ram:ChargeTotalAmount>${centsToDecimal(data.charge_total_cents ?? 0)}</ram:ChargeTotalAmount>` : ''}${isEn16931 && (data.allowance_total_cents ?? 0) > 0 ? `
        <ram:AllowanceTotalAmount>${centsToDecimal(data.allowance_total_cents ?? 0)}</ram:AllowanceTotalAmount>` : ''}
        <ram:TaxBasisTotalAmount>${centsToDecimal(data.total_ht_cents)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${data.currency}">${centsToDecimal(data.total_tva_cents)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${centsToDecimal(data.total_ttc_cents)}</ram:GrandTotalAmount>${isEn16931 && (data.paid_amount_cents ?? 0) > 0 ? `
        <ram:TotalPrepaidAmount>${centsToDecimal(data.paid_amount_cents ?? 0)}</ram:TotalPrepaidAmount>` : ''}
        <ram:DuePayableAmount>${centsToDecimal(Math.max(0, data.total_ttc_cents - (data.paid_amount_cents ?? 0)))}</ram:DuePayableAmount>
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
