import { describe, it, expect } from 'vitest';
import { generateFacturx, type FacturxGeneratorInput } from '../facturx-generator.js';
import type { PdfGeneratorConfig } from '../../invoice-pdf.js';

const pdfConfig: PdfGeneratorConfig = {
  company_name: 'Test SARL',
  company_address: '1 rue de Test\n75001 Paris',
  company_siret: '12345678901234',
  company_tva_number: 'FR12345678901',
};

function createTestInput(): FacturxGeneratorInput {
  return {
    invoice: {
      number: 'FAC-2026-00001',
      type: 'standard',
      issue_date: new Date('2026-04-14'),
      due_date: new Date('2026-05-14'),
      payment_terms: 30,
      total_ht_cents: 10000,
      total_tva_cents: 2000,
      total_ttc_cents: 12000,
      lines: [
        { position: 1, label: 'Service A', quantity: 2, unit: 'h', unit_price_cents: 5000, tva_rate: 2000, total_ht_cents: 10000 },
      ],
    },
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
      client_name_display: 'Client SAS',
    },
    tva_breakdown: [
      { tva_rate: 2000, base_ht_cents: 10000, tva_cents: 2000 },
    ],
  };
}

describe('Factur-X Generator (orchestrator)', () => {
  it('generates complete Factur-X output', async () => {
    const result = await generateFacturx(createTestInput(), pdfConfig);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pdf_buffer).toBeInstanceOf(Buffer);
      expect(result.value.xml_content).toContain('CrossIndustryInvoice');
      expect(result.value.filename).toBe('FAC-2026-00001.pdf');
    }
  });

  it('generates valid XML within the result', async () => {
    const result = await generateFacturx(createTestInput(), pdfConfig);

    if (result.ok) {
      expect(result.value.xml_content).toContain('urn:factur-x.eu:1p0:minimum');
      expect(result.value.xml_content).toContain('Test SARL');
      expect(result.value.xml_content).toContain('Client SAS');
      expect(result.value.xml_content).toContain('120.00');
    }
  });

  it('handles deposit invoice', async () => {
    const input = createTestInput();
    input.invoice.type = 'deposit';
    input.invoice.deposit_percent = 3000;

    const result = await generateFacturx(input, pdfConfig);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.xml_content).toContain('386'); // deposit type code
    }
  });

  it('rejects invalid data', async () => {
    const input = createTestInput();
    input.seller.name = ''; // invalid

    const result = await generateFacturx(input, pdfConfig);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('handles multi-rate TVA', async () => {
    const input = createTestInput();
    input.invoice.lines = [
      { position: 1, label: 'S1', quantity: 1, unit: 'unit', unit_price_cents: 10000, tva_rate: 2000, total_ht_cents: 10000 },
      { position: 2, label: 'S2', quantity: 1, unit: 'unit', unit_price_cents: 5000, tva_rate: 550, total_ht_cents: 5000 },
    ];
    input.tva_breakdown = [
      { tva_rate: 2000, base_ht_cents: 10000, tva_cents: 2000 },
      { tva_rate: 550, base_ht_cents: 5000, tva_cents: 275 },
    ];
    input.invoice.total_ht_cents = 15000;
    input.invoice.total_tva_cents = 2275;
    input.invoice.total_ttc_cents = 17275;

    const result = await generateFacturx(input, pdfConfig);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.xml_content).toContain('172.75');
    }
  });
});
