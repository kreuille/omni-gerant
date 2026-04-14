import { describe, it, expect, beforeEach } from 'vitest';
import {
  mapSaleInvoice,
  mapPurchaseInvoice,
  mapPayment,
  resetEntryCounter,
} from '../fec-mapper.js';

beforeEach(() => {
  resetEntryCounter();
});

describe('mapSaleInvoice', () => {
  it('generates 3 entries (client debit, product credit, TVA credit)', () => {
    const entries = mapSaleInvoice({
      number: 'FAC-2026-001',
      date: new Date('2026-03-15'),
      client_name: 'Client Martin',
      client_code: '001',
      amount_ht_cents: 100000,  // 1000.00 EUR HT
      tva_cents: 20000,          // 200.00 EUR TVA
      amount_ttc_cents: 120000,  // 1200.00 EUR TTC
    });

    expect(entries).toHaveLength(3);

    // Entry 1: Debit client 411001 for TTC
    expect(entries[0]!.JournalCode).toBe('VE');
    expect(entries[0]!.CompteNum).toBe('411001');
    expect(entries[0]!.Debit).toBe('1200.00');
    expect(entries[0]!.Credit).toBe('0.00');
    expect(entries[0]!.EcritureDate).toBe('20260315');

    // Entry 2: Credit product 706000 for HT
    expect(entries[1]!.CompteNum).toBe('706000');
    expect(entries[1]!.Debit).toBe('0.00');
    expect(entries[1]!.Credit).toBe('1000.00');

    // Entry 3: Credit TVA 445710
    expect(entries[2]!.CompteNum).toBe('445710');
    expect(entries[2]!.Credit).toBe('200.00');
  });

  it('is balanced (debit = credit)', () => {
    const entries = mapSaleInvoice({
      number: 'FAC-001',
      date: new Date('2026-01-01'),
      client_name: 'Test',
      client_code: '001',
      amount_ht_cents: 50000,
      tva_cents: 10000,
      amount_ttc_cents: 60000,
    });

    const totalDebit = entries.reduce((s, e) => s + parseFloat(e.Debit), 0);
    const totalCredit = entries.reduce((s, e) => s + parseFloat(e.Credit), 0);
    expect(totalDebit).toBeCloseTo(totalCredit, 2);
  });
});

describe('mapPurchaseInvoice', () => {
  it('generates 3 entries (charge debit, TVA debit, supplier credit)', () => {
    const entries = mapPurchaseInvoice({
      number: 'ACH-2026-001',
      date: new Date('2026-04-01'),
      supplier_name: 'Fournisseur A',
      supplier_code: '010',
      amount_ht_cents: 80000,
      tva_cents: 16000,
      amount_ttc_cents: 96000,
    });

    expect(entries).toHaveLength(3);

    // Charge debit
    expect(entries[0]!.JournalCode).toBe('AC');
    expect(entries[0]!.CompteNum).toBe('606000');
    expect(entries[0]!.Debit).toBe('800.00');

    // TVA debit
    expect(entries[1]!.CompteNum).toBe('445660');
    expect(entries[1]!.Debit).toBe('160.00');

    // Supplier credit
    expect(entries[2]!.CompteNum).toBe('401010');
    expect(entries[2]!.Credit).toBe('960.00');
  });

  it('is balanced', () => {
    const entries = mapPurchaseInvoice({
      number: 'ACH-001',
      date: new Date('2026-01-01'),
      supplier_name: 'Test',
      supplier_code: '001',
      amount_ht_cents: 30000,
      tva_cents: 6000,
      amount_ttc_cents: 36000,
    });

    const totalDebit = entries.reduce((s, e) => s + parseFloat(e.Debit), 0);
    const totalCredit = entries.reduce((s, e) => s + parseFloat(e.Credit), 0);
    expect(totalDebit).toBeCloseTo(totalCredit, 2);
  });
});

describe('mapPayment', () => {
  it('maps client payment (bank debit, client credit)', () => {
    const entries = mapPayment({
      number: 'PAY-001',
      date: new Date('2026-04-10'),
      amount_cents: 120000,
      entity_name: 'Client Martin',
      entity_code: '001',
      type: 'client',
      invoice_ref: 'FAC-2026-001',
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]!.JournalCode).toBe('BQ');
    expect(entries[0]!.CompteNum).toBe('512000');
    expect(entries[0]!.Debit).toBe('1200.00');
    expect(entries[1]!.CompteNum).toBe('411001');
    expect(entries[1]!.Credit).toBe('1200.00');
  });

  it('maps supplier payment (supplier debit, bank credit)', () => {
    const entries = mapPayment({
      number: 'PAY-002',
      date: new Date('2026-04-12'),
      amount_cents: 96000,
      entity_name: 'Fournisseur A',
      entity_code: '010',
      type: 'supplier',
      invoice_ref: 'ACH-2026-001',
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]!.CompteNum).toBe('401010');
    expect(entries[0]!.Debit).toBe('960.00');
    expect(entries[1]!.CompteNum).toBe('512000');
    expect(entries[1]!.Credit).toBe('960.00');
  });

  it('is balanced', () => {
    const entries = mapPayment({
      number: 'PAY-001',
      date: new Date('2026-01-01'),
      amount_cents: 50000,
      entity_name: 'Test',
      entity_code: '001',
      type: 'client',
      invoice_ref: 'FAC-001',
    });

    const totalDebit = entries.reduce((s, e) => s + parseFloat(e.Debit), 0);
    const totalCredit = entries.reduce((s, e) => s + parseFloat(e.Credit), 0);
    expect(totalDebit).toBeCloseTo(totalCredit, 2);
  });
});
