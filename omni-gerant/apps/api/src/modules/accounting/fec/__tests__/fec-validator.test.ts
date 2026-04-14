import { describe, it, expect, beforeEach } from 'vitest';
import { validateFecEntries } from '../fec-validator.js';
import { mapSaleInvoice, mapPurchaseInvoice, resetEntryCounter } from '../fec-mapper.js';

beforeEach(() => {
  resetEntryCounter();
});

describe('validateFecEntries', () => {
  it('validates correct entries', () => {
    const entries = mapSaleInvoice({
      number: 'FAC-001',
      date: new Date('2026-03-15'),
      client_name: 'Client A',
      client_code: '001',
      amount_ht_cents: 100000,
      tva_cents: 20000,
      amount_ttc_cents: 120000,
    });

    const result = validateFecEntries(entries);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.entry_count).toBe(3);
    expect(result.balanced).toBe(true);
  });

  it('validates multiple balanced entries', () => {
    const sale = mapSaleInvoice({
      number: 'FAC-001',
      date: new Date('2026-03-15'),
      client_name: 'Client',
      client_code: '001',
      amount_ht_cents: 100000,
      tva_cents: 20000,
      amount_ttc_cents: 120000,
    });

    const purchase = mapPurchaseInvoice({
      number: 'ACH-001',
      date: new Date('2026-03-20'),
      supplier_name: 'Supplier',
      supplier_code: '010',
      amount_ht_cents: 50000,
      tva_cents: 10000,
      amount_ttc_cents: 60000,
    });

    const result = validateFecEntries([...sale, ...purchase]);
    expect(result.valid).toBe(true);
    expect(result.entry_count).toBe(6);
    expect(result.balanced).toBe(true);
  });

  it('detects missing required fields', () => {
    const result = validateFecEntries([{
      JournalCode: '',
      JournalLib: '',
      EcritureNum: '',
      EcritureDate: 'invalid',
      CompteNum: '',
      CompteLib: '',
      CompAuxNum: '',
      CompAuxLib: '',
      PieceRef: '',
      PieceDate: '',
      EcritureLib: '',
      Debit: '0.00',
      Credit: '0.00',
      EcritureLet: '',
      DateLet: '',
      ValidDate: '',
      Montantdevise: '',
      Idevise: '',
    }]);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.field === 'JournalCode')).toBe(true);
    expect(result.errors.some((e) => e.field === 'EcritureNum')).toBe(true);
    expect(result.errors.some((e) => e.field === 'EcritureDate')).toBe(true);
    expect(result.errors.some((e) => e.field === 'CompteNum')).toBe(true);
  });

  it('detects unbalanced entries', () => {
    const result = validateFecEntries([
      {
        JournalCode: 'VE',
        JournalLib: 'Ventes',
        EcritureNum: 'EC000001',
        EcritureDate: '20260315',
        CompteNum: '411001',
        CompteLib: 'Client',
        CompAuxNum: '',
        CompAuxLib: '',
        PieceRef: 'FAC-001',
        PieceDate: '20260315',
        EcritureLib: 'Facture FAC-001',
        Debit: '1200.00',
        Credit: '0.00',
        EcritureLet: '',
        DateLet: '',
        ValidDate: '20260315',
        Montantdevise: '',
        Idevise: 'EUR',
      },
      {
        JournalCode: 'VE',
        JournalLib: 'Ventes',
        EcritureNum: 'EC000001',
        EcritureDate: '20260315',
        CompteNum: '706000',
        CompteLib: 'Produits',
        CompAuxNum: '',
        CompAuxLib: '',
        PieceRef: 'FAC-001',
        PieceDate: '20260315',
        EcritureLib: 'Facture FAC-001',
        Debit: '0.00',
        Credit: '1000.00', // Missing TVA credit = unbalanced
        EcritureLet: '',
        DateLet: '',
        ValidDate: '20260315',
        Montantdevise: '',
        Idevise: 'EUR',
      },
    ]);

    expect(result.valid).toBe(false);
    expect(result.balanced).toBe(false);
    expect(result.errors.some((e) => e.message.includes('non equilibree'))).toBe(true);
  });

  it('handles empty entries list', () => {
    const result = validateFecEntries([]);
    expect(result.valid).toBe(true);
    expect(result.entry_count).toBe(0);
    expect(result.balanced).toBe(true);
  });

  it('calculates correct totals', () => {
    const entries = mapSaleInvoice({
      number: 'FAC-001',
      date: new Date('2026-01-01'),
      client_name: 'Client',
      client_code: '001',
      amount_ht_cents: 100000,
      tva_cents: 20000,
      amount_ttc_cents: 120000,
    });

    const result = validateFecEntries(entries);
    expect(result.total_debit_cents).toBe(120000);
    expect(result.total_credit_cents).toBe(120000); // 100000 + 20000
  });
});
