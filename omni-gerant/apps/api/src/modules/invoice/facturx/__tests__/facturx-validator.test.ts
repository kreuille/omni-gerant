import { describe, it, expect } from 'vitest';
import { validateFacturxData, validateFacturxXml } from '../facturx-validator.js';
import { generateFacturxXml, type FacturxInvoiceData } from '../facturx-xml.js';

function createValidData(): FacturxInvoiceData {
  return {
    number: 'FAC-2026-00001',
    type_code: '380',
    issue_date: new Date('2026-04-14'),
    due_date: new Date('2026-05-14'),
    currency: 'EUR',
    seller: {
      name: 'Test SARL',
      siret: '12345678901234',
      address_line: '1 rue Test',
      zip_code: '75001',
      city: 'Paris',
      country_code: 'FR',
    },
    buyer: {
      name: 'Client SAS',
      address_line: '2 avenue Client',
      zip_code: '69001',
      city: 'Lyon',
      country_code: 'FR',
    },
    lines: [
      { position: 1, label: 'Service', quantity: 1, unit: 'unit', unit_price_cents: 10000, tva_rate: 2000, total_ht_cents: 10000 },
    ],
    tax_groups: [
      { tva_rate: 2000, base_ht_cents: 10000, tva_cents: 2000 },
    ],
    total_ht_cents: 10000,
    total_tva_cents: 2000,
    total_ttc_cents: 12000,
    payment_terms_days: 30,
  };
}

describe('validateFacturxData', () => {
  it('accepts valid data', () => {
    const result = validateFacturxData(createValidData());
    expect(result.ok).toBe(true);
  });

  it('rejects missing invoice number', () => {
    const data = createValidData();
    data.number = '';
    const result = validateFacturxData(data);
    expect(result.ok).toBe(false);
  });

  it('rejects invalid type code', () => {
    const data = createValidData();
    data.type_code = '999';
    const result = validateFacturxData(data);
    expect(result.ok).toBe(false);
  });

  it('rejects non-EUR currency', () => {
    const data = createValidData();
    data.currency = 'USD';
    const result = validateFacturxData(data);
    expect(result.ok).toBe(false);
  });

  it('rejects missing seller name', () => {
    const data = createValidData();
    data.seller.name = '';
    const result = validateFacturxData(data);
    expect(result.ok).toBe(false);
  });

  it('rejects missing buyer name', () => {
    const data = createValidData();
    data.buyer.name = '';
    const result = validateFacturxData(data);
    expect(result.ok).toBe(false);
  });

  it('rejects empty lines', () => {
    const data = createValidData();
    data.lines = [];
    const result = validateFacturxData(data);
    expect(result.ok).toBe(false);
  });

  it('rejects inconsistent HT totals', () => {
    const data = createValidData();
    data.total_ht_cents = 5000; // mismatch with tax_groups
    const result = validateFacturxData(data);
    expect(result.ok).toBe(false);
  });

  it('rejects inconsistent TTC total', () => {
    const data = createValidData();
    data.total_ttc_cents = 99999; // HT + TVA != TTC
    const result = validateFacturxData(data);
    expect(result.ok).toBe(false);
  });
});

describe('validateFacturxXml', () => {
  it('accepts valid XML', () => {
    const xml = generateFacturxXml(createValidData());
    const result = validateFacturxXml(xml);
    expect(result.ok).toBe(true);
  });

  it('rejects XML without root element', () => {
    const result = validateFacturxXml('<Invalid>content</Invalid>');
    expect(result.ok).toBe(false);
  });

  it('rejects XML without required sections', () => {
    const result = validateFacturxXml(`<?xml version="1.0"?>
      <rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
        xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100">
      </rsm:CrossIndustryInvoice>`);
    expect(result.ok).toBe(false);
  });
});
