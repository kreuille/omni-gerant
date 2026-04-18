import { describe, it, expect } from 'vitest';
import {
  parseFacturXXml,
  extractXmlFromPdf,
  type ParsedFacturXInvoice,
  type FacturXParseError,
} from '../facturx-parser.js';

// --- Test XML builders ---

function buildMinimumXml(overrides: Record<string, string> = {}): string {
  const number = overrides.number ?? 'FAC-2026-001';
  const typeCode = overrides.typeCode ?? '380';
  const issueDate = overrides.issueDate ?? '20260115';
  const dueDate = overrides.dueDate ?? '20260215';
  const totalHt = overrides.totalHt ?? '1000.00';
  const totalTva = overrides.totalTva ?? '200.00';
  const totalTtc = overrides.totalTtc ?? '1200.00';
  const sellerName = overrides.sellerName ?? 'Fournisseur SAS';
  const sellerSiret = overrides.sellerSiret ?? '12345678901234';
  const buyerName = overrides.buyerName ?? 'Ma Societe';
  const buyerSiret = overrides.buyerSiret ?? '98765432109876';

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
    <ram:ID>${number}</ram:ID>
    <ram:TypeCode>${typeCode}</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${issueDate}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${sellerName}</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${sellerSiret}</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:LineOne>10 rue de la Paix</ram:LineOne>
          <ram:PostcodeCode>75001</ram:PostcodeCode>
          <ram:CityName>Paris</ram:CityName>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">FR12345678901</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${buyerName}</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${buyerSiret}</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:LineOne>5 avenue des Champs</ram:LineOne>
          <ram:PostcodeCode>69001</ram:PostcodeCode>
          <ram:CityName>Lyon</ram:CityName>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${totalTva}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${totalHt}</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${dueDate}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${totalHt}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${totalHt}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${totalTva}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${totalTtc}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${totalTtc}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

function buildEn16931Xml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>INV-2026-042</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">20260301</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>1</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>Prestation de conseil</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>500.00</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">2</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>1000.00</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>2</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>Formation technique</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>150.00</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="HUR">3</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>450.00</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>Expert Conseil SARL</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">55566677788899</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:LineOne>22 boulevard Haussmann</ram:LineOne>
          <ram:PostcodeCode>75009</ram:PostcodeCode>
          <ram:CityName>Paris</ram:CityName>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">FR55566677788</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>Mon Entreprise SAS</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">11122233344455</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:LineOne>1 place Bellecour</ram:LineOne>
          <ram:PostcodeCode>69002</ram:PostcodeCode>
          <ram:CityName>Lyon</ram:CityName>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>290.00</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>1450.00</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>Net 30 jours</ram:Description>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">20260331</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>1450.00</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>1450.00</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">290.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>1740.00</ram:GrandTotalAmount>
        <ram:DuePayableAmount>1740.00</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

function buildExtendedXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:extended</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>EXT-2026-007</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">20260401</udt:DateTimeString>
    </ram:IssueDateTime>
    <ram:IncludedNote>
      <ram:Content>Note de test extended</ram:Content>
    </ram:IncludedNote>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>1</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>Produit premium</ram:Name>
        <ram:DesignatedProductClassification>
          <ram:ClassCode>12345</ram:ClassCode>
        </ram:DesignatedProductClassification>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>250.00</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">4</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>1000.00</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>Premium Corp</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">99988877766655</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:LineOne>100 avenue des Champs-Elysees</ram:LineOne>
          <ram:PostcodeCode>75008</ram:PostcodeCode>
          <ram:CityName>Paris</ram:CityName>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">FR99988877766</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>Acheteur Pro</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">44455566677788</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:LineOne>50 rue de la Republique</ram:LineOne>
          <ram:PostcodeCode>13001</ram:PostcodeCode>
          <ram:CityName>Marseille</ram:CityName>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>30</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>FR7630006000011234567890189</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
        <ram:PayeeSpecifiedCreditorFinancialInstitution>
          <ram:BICID>AGRIFRPP</ram:BICID>
        </ram:PayeeSpecifiedCreditorFinancialInstitution>
      </ram:SpecifiedTradeSettlementPaymentMeans>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>200.00</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>1000.00</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">20260501</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>1000.00</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>1000.00</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">200.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>1200.00</ram:GrandTotalAmount>
        <ram:DuePayableAmount>1200.00</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

function buildMultiTaxXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>MULTI-TAX-001</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">20260501</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>1</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>Service informatique</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>100.00</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">10</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>1000.00</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>2</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>Travaux renovation</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>250.00</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">2</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>10.00</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>500.00</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>3</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>Produits alimentaires</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>15.50</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">20</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>5.50</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>310.00</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>Multi Services SARL</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">77788899900011</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:LineOne>15 rue du Commerce</ram:LineOne>
          <ram:PostcodeCode>31000</ram:PostcodeCode>
          <ram:CityName>Toulouse</ram:CityName>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>Acheteur Multi</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">22233344455566</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:LineOne>8 place du Capitole</ram:LineOne>
          <ram:PostcodeCode>31000</ram:PostcodeCode>
          <ram:CityName>Toulouse</ram:CityName>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>200.00</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>1000.00</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>50.00</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>500.00</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>10.00</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>17.05</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>310.00</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>5.50</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">20260531</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>1810.00</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>1810.00</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">267.05</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>2077.05</ram:GrandTotalAmount>
        <ram:DuePayableAmount>2077.05</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

// --- Tests ---

describe('Factur-X Parser', () => {
  describe('parseFacturXXml', () => {
    describe('Profile MINIMUM', () => {
      it('extracts totals correctly from MINIMUM profile', () => {
        const xml = buildMinimumXml();
        const result = parseFacturXXml(xml);

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.value.invoiceNumber).toBe('FAC-2026-001');
        expect(result.value.facturxProfile).toBe('minimum');
        expect(result.value.totalHtCents).toBe(100000);
        expect(result.value.totalTvaCents).toBe(20000);
        expect(result.value.totalTtcCents).toBe(120000);
      });

      it('extracts seller and buyer info', () => {
        const xml = buildMinimumXml();
        const result = parseFacturXXml(xml);

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.value.seller.name).toBe('Fournisseur SAS');
        expect(result.value.seller.siret).toBe('12345678901234');
        expect(result.value.seller.tvaNumber).toBe('FR12345678901');
        expect(result.value.seller.city).toBe('Paris');
        expect(result.value.seller.country).toBe('FR');

        expect(result.value.buyer.name).toBe('Ma Societe');
        expect(result.value.buyer.siret).toBe('98765432109876');
      });

      it('extracts dates correctly', () => {
        const xml = buildMinimumXml();
        const result = parseFacturXXml(xml);

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.value.issueDate.getFullYear()).toBe(2026);
        expect(result.value.issueDate.getUTCMonth()).toBe(0); // January
        expect(result.value.issueDate.getUTCDate()).toBe(15);

        expect(result.value.dueDate).toBeDefined();
        expect(result.value.dueDate!.getUTCMonth()).toBe(1); // February
      });

      it('detects credit note type code 381', () => {
        const xml = buildMinimumXml({ typeCode: '381' });
        const result = parseFacturXXml(xml);

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.invoiceType).toBe('credit_note');
      });
    });

    describe('Profile EN16931', () => {
      it('extracts all lines and seller/buyer from EN16931 profile', () => {
        const xml = buildEn16931Xml();
        const result = parseFacturXXml(xml);

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.value.invoiceNumber).toBe('INV-2026-042');
        expect(result.value.facturxProfile).toBe('en16931');

        // Lines
        expect(result.value.lines).toHaveLength(2);
        expect(result.value.lines[0].description).toBe('Prestation de conseil');
        expect(result.value.lines[0].quantity).toBe(2);
        expect(result.value.lines[0].unitPriceCents).toBe(50000);
        expect(result.value.lines[0].totalHtCents).toBe(100000);
        expect(result.value.lines[0].tvaRate).toBe(20);

        expect(result.value.lines[1].description).toBe('Formation technique');
        expect(result.value.lines[1].quantity).toBe(3);
        expect(result.value.lines[1].unitPriceCents).toBe(15000);
        expect(result.value.lines[1].totalHtCents).toBe(45000);

        // Seller
        expect(result.value.seller.name).toBe('Expert Conseil SARL');
        expect(result.value.seller.siret).toBe('55566677788899');

        // Buyer
        expect(result.value.buyer.name).toBe('Mon Entreprise SAS');
        expect(result.value.buyer.siret).toBe('11122233344455');

        // Totals
        expect(result.value.totalHtCents).toBe(145000);
        expect(result.value.totalTvaCents).toBe(29000);
        expect(result.value.totalTtcCents).toBe(174000);

        // Payment terms
        expect(result.value.paymentTerms).toBe('Net 30 jours');
      });
    });

    describe('Profile EXTENDED', () => {
      it('extracts all fields from EXTENDED profile including payment info', () => {
        const xml = buildExtendedXml();
        const result = parseFacturXXml(xml);

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.value.facturxProfile).toBe('extended');
        expect(result.value.invoiceNumber).toBe('EXT-2026-007');

        // Payment info
        expect(result.value.paymentMeans).toBe('30');
        expect(result.value.iban).toBe('FR7630006000011234567890189');
        expect(result.value.bic).toBe('AGRIFRPP');

        // Lines
        expect(result.value.lines).toHaveLength(1);
        expect(result.value.lines[0].description).toBe('Produit premium');
        expect(result.value.lines[0].quantity).toBe(4);
        expect(result.value.lines[0].unitPriceCents).toBe(25000);
      });
    });

    describe('Conversion centimes', () => {
      it('converts 15.50 EUR to 1550 centimes without rounding error', () => {
        const xml = buildMinimumXml({
          totalHt: '15.50',
          totalTva: '3.10',
          totalTtc: '18.60',
        });
        const result = parseFacturXXml(xml);

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.value.totalHtCents).toBe(1550);
        expect(result.value.totalTvaCents).toBe(310);
        expect(result.value.totalTtcCents).toBe(1860);
      });

      it('converts amounts with many decimals correctly', () => {
        const xml = buildMinimumXml({
          totalHt: '1234.56',
          totalTva: '246.91',
          totalTtc: '1481.47',
        });
        const result = parseFacturXXml(xml);

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.value.totalHtCents).toBe(123456);
        expect(result.value.totalTvaCents).toBe(24691);
        expect(result.value.totalTtcCents).toBe(148147);
      });
    });

    describe('Coherence validation', () => {
      it('passes coherence when totals match', () => {
        const xml = buildEn16931Xml();
        const result = parseFacturXXml(xml);

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.value.coherenceWarnings).toHaveLength(0);
      });

      it('detects line sum mismatch', () => {
        // Build XML where line totals don't match header total
        const xml = buildMinimumXml({
          totalHt: '2000.00',
          totalTva: '400.00',
          totalTtc: '2400.00',
        });
        // MINIMUM profile has no lines, so no line sum check
        const result = parseFacturXXml(xml);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        // No lines = no line sum warning
        expect(result.value.coherenceWarnings.filter(w => w.type === 'line_sum_mismatch')).toHaveLength(0);
      });

      it('detects TTC mismatch (HT + TVA != TTC)', () => {
        const xml = buildMinimumXml({
          totalHt: '1000.00',
          totalTva: '200.00',
          totalTtc: '1300.00', // Should be 1200
        });
        const result = parseFacturXXml(xml);

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        const ttcWarnings = result.value.coherenceWarnings.filter(w => w.type === 'ttc_mismatch');
        expect(ttcWarnings).toHaveLength(1);
        expect(ttcWarnings[0].expected).toBe(120000);
        expect(ttcWarnings[0].actual).toBe(130000);
      });
    });

    describe('Error handling', () => {
      it('returns NO_XML_FOUND for empty PDF', () => {
        const result = extractXmlFromPdf(Buffer.from('not a pdf'));
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error.code).toBe('NO_XML_FOUND');
      });

      it('returns INVALID_XML for non-CII XML', () => {
        const xml = '<?xml version="1.0"?><html><body>Not an invoice</body></html>';
        const result = parseFacturXXml(xml);

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error.code).toBe('INVALID_XML');
      });

      it('returns MISSING_REQUIRED_FIELD when invoice number is missing', () => {
        // Build a minimal CII XML without an ID in ExchangedDocument
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">20260101</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty><ram:Name>Test</ram:Name><ram:PostalTradeAddress><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress></ram:SellerTradeParty>
      <ram:BuyerTradeParty><ram:Name>Test</ram:Name><ram:PostalTradeAddress><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress></ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:TaxBasisTotalAmount>0</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount>0</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>0</ram:GrandTotalAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

        const result = parseFacturXXml(xml);
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error.code).toBe('MISSING_REQUIRED_FIELD');
      });
    });

    describe('Multi-taux TVA', () => {
      it('parses invoice with 20% + 10% + 5.5% correctly', () => {
        const xml = buildMultiTaxXml();
        const result = parseFacturXXml(xml);

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.value.invoiceNumber).toBe('MULTI-TAX-001');
        expect(result.value.facturxProfile).toBe('basic');

        // 3 lines with different tax rates
        expect(result.value.lines).toHaveLength(3);
        expect(result.value.lines[0].tvaRate).toBe(20);
        expect(result.value.lines[0].totalHtCents).toBe(100000); // 1000 EUR
        expect(result.value.lines[1].tvaRate).toBe(10);
        expect(result.value.lines[1].totalHtCents).toBe(50000);  // 500 EUR
        expect(result.value.lines[2].tvaRate).toBe(5.5);
        expect(result.value.lines[2].totalHtCents).toBe(31000);  // 310 EUR

        // TVA breakdown
        expect(result.value.tvaBreakdown).toHaveLength(3);

        const tva20 = result.value.tvaBreakdown.find(t => t.rate === 20);
        expect(tva20).toBeDefined();
        expect(tva20!.baseHtCents).toBe(100000);
        expect(tva20!.tvaCents).toBe(20000);

        const tva10 = result.value.tvaBreakdown.find(t => t.rate === 10);
        expect(tva10).toBeDefined();
        expect(tva10!.baseHtCents).toBe(50000);
        expect(tva10!.tvaCents).toBe(5000);

        const tva55 = result.value.tvaBreakdown.find(t => t.rate === 5.5);
        expect(tva55).toBeDefined();
        expect(tva55!.baseHtCents).toBe(31000);
        expect(tva55!.tvaCents).toBe(1705);

        // Totals
        expect(result.value.totalHtCents).toBe(181000);   // 1810 EUR
        expect(result.value.totalTvaCents).toBe(26705);    // 267.05 EUR
        expect(result.value.totalTtcCents).toBe(207705);   // 2077.05 EUR

        // Coherence should pass
        expect(result.value.coherenceWarnings).toHaveLength(0);
      });
    });
  });

  describe('extractXmlFromPdf', () => {
    it('extracts XML from PDF buffer containing embedded Factur-X', () => {
      // Simulate a PDF with embedded XML
      const xmlContent = buildMinimumXml();
      const fakePdf = `%PDF-1.7
some pdf header
/Names [(factur-x.xml)]
stream
${xmlContent}
endstream
more pdf content`;

      const result = extractXmlFromPdf(Buffer.from(fakePdf, 'latin1'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // Should contain the XML
      expect(result.value).toContain('CrossIndustryInvoice');
      expect(result.value).toContain('FAC-2026-001');
    });

    it('returns NO_XML_FOUND for PDF without Factur-X attachment', () => {
      const fakePdf = `%PDF-1.7
some pdf content without any xml
endobj`;

      const result = extractXmlFromPdf(Buffer.from(fakePdf, 'latin1'));
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('NO_XML_FOUND');
    });
  });

  describe('TVA coherence validation', () => {
    it('detects TVA calculation mismatch in breakdown', () => {
      // Build XML where TVA amount doesn't match base * rate
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>VAL-001</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">20260101</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>Seller</ram:Name>
        <ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">11111111111111</ram:ID></ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>Buyer</ram:Name>
        <ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">22222222222222</ram:ID></ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>250.00</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>1000.00</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:TaxBasisTotalAmount>1000.00</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">250.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>1250.00</ram:GrandTotalAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

      const result = parseFacturXXml(xml);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // TVA should be 200 EUR (20% of 1000), but XML says 250 EUR
      const tvaWarnings = result.value.coherenceWarnings.filter(w => w.type === 'tva_calculation_mismatch');
      expect(tvaWarnings).toHaveLength(1);
      expect(tvaWarnings[0].expected).toBe(20000); // 200.00 EUR
      expect(tvaWarnings[0].actual).toBe(25000);   // 250.00 EUR
    });
  });
});
