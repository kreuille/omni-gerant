import { describe, it, expect } from 'vitest';
import { generateFacturxXml, getTypeCode, type FacturxInvoiceData } from '../facturx-xml.js';

function createTestData(overrides?: Partial<FacturxInvoiceData>): FacturxInvoiceData {
  return {
    number: 'FAC-2026-00001',
    type_code: '380',
    issue_date: new Date('2026-04-14'),
    due_date: new Date('2026-05-14'),
    currency: 'EUR',
    seller: {
      name: 'Test SARL',
      siret: '12345678901234',
      vat_number: 'FR12345678901',
      address_line: '1 rue de Test',
      zip_code: '75001',
      city: 'Paris',
      country_code: 'FR',
    },
    buyer: {
      name: 'Client SAS',
      siret: '98765432109876',
      address_line: '2 avenue Client',
      zip_code: '69001',
      city: 'Lyon',
      country_code: 'FR',
    },
    lines: [
      { position: 1, label: 'Service A', quantity: 2, unit: 'h', unit_price_cents: 5000, tva_rate: 20, total_ht_cents: 10000 },
    ],
    tax_groups: [
      { tva_rate: 20, base_ht_cents: 10000, tva_cents: 2000 },
    ],
    total_ht_cents: 10000,
    total_tva_cents: 2000,
    total_ttc_cents: 12000,
    payment_terms_days: 30,
    ...overrides,
  };
}

describe('Factur-X XML Generation', () => {
  it('generates valid CII XML', () => {
    const xml = generateFacturxXml(createTestData());
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('CrossIndustryInvoice');
    expect(xml).toContain('urn:factur-x.eu:1p0:minimum');
  });

  it('includes invoice number and type', () => {
    const xml = generateFacturxXml(createTestData());
    expect(xml).toContain('<ram:ID>FAC-2026-00001</ram:ID>');
    expect(xml).toContain('<ram:TypeCode>380</ram:TypeCode>');
  });

  it('includes issue date in YYYYMMDD format', () => {
    const xml = generateFacturxXml(createTestData());
    expect(xml).toContain('20260414');
  });

  it('includes seller info with SIRET and VAT', () => {
    const xml = generateFacturxXml(createTestData());
    expect(xml).toContain('<ram:Name>Test SARL</ram:Name>');
    expect(xml).toContain('12345678901234');
    expect(xml).toContain('FR12345678901');
    expect(xml).toContain('SellerTradeParty');
  });

  it('includes buyer info with SIRET', () => {
    const xml = generateFacturxXml(createTestData());
    expect(xml).toContain('<ram:Name>Client SAS</ram:Name>');
    expect(xml).toContain('98765432109876');
    expect(xml).toContain('BuyerTradeParty');
  });

  it('includes line items', () => {
    const xml = generateFacturxXml(createTestData());
    expect(xml).toContain('Service A');
    expect(xml).toContain('IncludedSupplyChainTradeLineItem');
    expect(xml).toContain('<ram:ChargeAmount>50.00</ram:ChargeAmount>');
    expect(xml).toContain('unitCode="HUR"');
  });

  it('includes tax groups', () => {
    const xml = generateFacturxXml(createTestData());
    expect(xml).toContain('<ram:CalculatedAmount>20.00</ram:CalculatedAmount>');
    expect(xml).toContain('<ram:BasisAmount>100.00</ram:BasisAmount>');
    expect(xml).toContain('<ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>');
  });

  it('includes monetary summation', () => {
    const xml = generateFacturxXml(createTestData());
    expect(xml).toContain('<ram:LineTotalAmount>100.00</ram:LineTotalAmount>');
    expect(xml).toContain('<ram:GrandTotalAmount>120.00</ram:GrandTotalAmount>');
    expect(xml).toContain('<ram:DuePayableAmount>120.00</ram:DuePayableAmount>');
  });

  // BUSINESS RULE [CDC-2.1]: TVA multi-taux
  it('handles multi-rate TVA', () => {
    const data = createTestData({
      lines: [
        { position: 1, label: 'Service 20%', quantity: 1, unit: 'unit', unit_price_cents: 10000, tva_rate: 20, total_ht_cents: 10000 },
        { position: 2, label: 'Service 10%', quantity: 1, unit: 'unit', unit_price_cents: 5000, tva_rate: 10, total_ht_cents: 5000 },
      ],
      tax_groups: [
        { tva_rate: 20, base_ht_cents: 10000, tva_cents: 2000 },
        { tva_rate: 10, base_ht_cents: 5000, tva_cents: 500 },
      ],
      total_ht_cents: 15000,
      total_tva_cents: 2500,
      total_ttc_cents: 17500,
    });
    const xml = generateFacturxXml(data);

    // Two tax groups
    const taxMatches = xml.match(/ApplicableTradeTax/g);
    // 2 line-level + 2 header-level = matches for ApplicableTradeTax
    expect(taxMatches!.length).toBeGreaterThanOrEqual(4);
    expect(xml).toContain('20.00');
    expect(xml).toContain('10.00');
  });

  it('handles deposit invoice type', () => {
    const data = createTestData({ type_code: '386' });
    const xml = generateFacturxXml(data);
    expect(xml).toContain('<ram:TypeCode>386</ram:TypeCode>');
  });

  it('includes notes when provided', () => {
    const data = createTestData({ notes: 'Conditions speciales' });
    const xml = generateFacturxXml(data);
    expect(xml).toContain('IncludedNote');
    expect(xml).toContain('Conditions speciales');
  });

  it('escapes XML special characters', () => {
    const data = createTestData({
      lines: [{ position: 1, label: 'A & B <test>', quantity: 1, unit: 'unit', unit_price_cents: 1000, tva_rate: 20, total_ht_cents: 1000 }],
    });
    const xml = generateFacturxXml(data);
    expect(xml).toContain('A &amp; B &lt;test&gt;');
    expect(xml).not.toContain('A & B <test>');
  });

  it('handles zero amounts', () => {
    const data = createTestData({
      lines: [{ position: 1, label: 'Free', quantity: 1, unit: 'unit', unit_price_cents: 0, tva_rate: 20, total_ht_cents: 0 }],
      tax_groups: [{ tva_rate: 20, base_ht_cents: 0, tva_cents: 0 }],
      total_ht_cents: 0,
      total_tva_cents: 0,
      total_ttc_cents: 0,
    });
    const xml = generateFacturxXml(data);
    expect(xml).toContain('<ram:GrandTotalAmount>0.00</ram:GrandTotalAmount>');
  });

  it('handles large amounts', () => {
    const data = createTestData({
      total_ht_cents: 99999999,
      total_tva_cents: 19999999,
      total_ttc_cents: 119999998,
      tax_groups: [{ tva_rate: 20, base_ht_cents: 99999999, tva_cents: 19999999 }],
    });
    const xml = generateFacturxXml(data);
    expect(xml).toContain('<ram:GrandTotalAmount>1199999.98</ram:GrandTotalAmount>');
  });
});

describe('getTypeCode', () => {
  it('maps invoice types to CII codes', () => {
    expect(getTypeCode('standard')).toBe('380');
    expect(getTypeCode('credit_note')).toBe('381');
    expect(getTypeCode('deposit')).toBe('386');
    expect(getTypeCode('situation')).toBe('380');
  });
});
