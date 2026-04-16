import { describe, it, expect } from 'vitest';
import { generateInvoiceHtml, type PdfGeneratorConfig, type InvoicePdfData } from '../invoice-pdf.js';

const config: PdfGeneratorConfig = {
  company_name: 'Test SARL',
  company_address: '1 rue de Test\n75001 Paris',
  company_siret: '12345678901234',
  company_tva_number: 'FR12345678901',
};

const invoiceData: InvoicePdfData = {
  number: 'FAC-2026-00001',
  type: 'standard',
  issue_date: '14/04/2026',
  due_date: '14/05/2026',
  client_name: 'Client Test',
  client_address: '2 avenue Client\n69001 Lyon',
  lines: [
    { position: 1, label: 'Service A', quantity: 2, unit: 'h', unit_price_cents: 5000, tva_rate: 20, total_ht_cents: 10000 },
    { position: 2, label: 'Service B', quantity: 1, unit: 'unit', unit_price_cents: 3000, tva_rate: 10, total_ht_cents: 3000 },
  ],
  total_ht_cents: 13000,
  total_tva_cents: 2300,
  total_ttc_cents: 15300,
  tva_breakdown: [
    { tva_rate: 20, base_ht_cents: 10000, tva_cents: 2000 },
    { tva_rate: 10, base_ht_cents: 3000, tva_cents: 300 },
  ],
  payment_terms: 30,
  notes: 'Merci pour votre confiance',
};

describe('Invoice PDF Generator', () => {
  it('generates valid HTML', () => {
    const html = generateInvoiceHtml(config, invoiceData);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('includes company info', () => {
    const html = generateInvoiceHtml(config, invoiceData);
    expect(html).toContain('Test SARL');
    expect(html).toContain('12345678901234');
    expect(html).toContain('FR12345678901');
  });

  it('includes invoice number and type', () => {
    const html = generateInvoiceHtml(config, invoiceData);
    expect(html).toContain('FAC-2026-00001');
    expect(html).toContain('FACTURE');
  });

  it('includes client info', () => {
    const html = generateInvoiceHtml(config, invoiceData);
    expect(html).toContain('Client Test');
  });

  it('includes line items', () => {
    const html = generateInvoiceHtml(config, invoiceData);
    expect(html).toContain('Service A');
    expect(html).toContain('Service B');
  });

  it('includes totals', () => {
    const html = generateInvoiceHtml(config, invoiceData);
    expect(html).toContain('130,00');
    expect(html).toContain('153,00');
  });

  it('includes payment terms and legal mentions', () => {
    const html = generateInvoiceHtml(config, invoiceData);
    expect(html).toContain('30 jours');
    expect(html).toContain('penalite');
    expect(html).toContain('40 EUR');
  });

  it('includes notes when provided', () => {
    const html = generateInvoiceHtml(config, invoiceData);
    expect(html).toContain('Merci pour votre confiance');
  });

  it('handles deposit invoice type', () => {
    const depositData = { ...invoiceData, type: 'deposit', deposit_percent: 3000 };
    const html = generateInvoiceHtml(config, depositData);
    expect(html).toContain("FACTURE D'ACOMPTE");
    expect(html).toContain('30%');
  });

  it('handles credit note type', () => {
    const creditData = { ...invoiceData, type: 'credit_note' };
    const html = generateInvoiceHtml(config, creditData);
    expect(html).toContain('AVOIR');
  });
});
