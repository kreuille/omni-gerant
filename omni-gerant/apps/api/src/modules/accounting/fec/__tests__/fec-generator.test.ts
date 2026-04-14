import { describe, it, expect, beforeEach } from 'vitest';
import { generateFecFile, generateFecFilename } from '../fec-generator.js';
import { mapSaleInvoice, mapPurchaseInvoice, resetEntryCounter } from '../fec-mapper.js';

beforeEach(() => {
  resetEntryCounter();
});

describe('generateFecFile', () => {
  it('generates TSV with correct header columns', () => {
    const content = generateFecFile([]);
    const header = content.split('\n')[0]!;
    const columns = header.split('\t');

    expect(columns).toContain('JournalCode');
    expect(columns).toContain('JournalLib');
    expect(columns).toContain('EcritureNum');
    expect(columns).toContain('EcritureDate');
    expect(columns).toContain('CompteNum');
    expect(columns).toContain('CompteLib');
    expect(columns).toContain('CompAuxNum');
    expect(columns).toContain('CompAuxLib');
    expect(columns).toContain('PieceRef');
    expect(columns).toContain('PieceDate');
    expect(columns).toContain('EcritureLib');
    expect(columns).toContain('Debit');
    expect(columns).toContain('Credit');
    expect(columns).toContain('EcritureLet');
    expect(columns).toContain('DateLet');
    expect(columns).toContain('ValidDate');
    expect(columns).toContain('Montantdevise');
    expect(columns).toContain('Idevise');
    expect(columns).toHaveLength(18);
  });

  it('generates content with sale and purchase entries', () => {
    const saleEntries = mapSaleInvoice({
      number: 'FAC-001',
      date: new Date('2026-03-15'),
      client_name: 'Client A',
      client_code: '001',
      amount_ht_cents: 100000,
      tva_cents: 20000,
      amount_ttc_cents: 120000,
    });

    const purchaseEntries = mapPurchaseInvoice({
      number: 'ACH-001',
      date: new Date('2026-03-20'),
      supplier_name: 'Fournisseur B',
      supplier_code: '010',
      amount_ht_cents: 50000,
      tva_cents: 10000,
      amount_ttc_cents: 60000,
    });

    const content = generateFecFile([...saleEntries, ...purchaseEntries]);
    const lines = content.split('\n');

    // 1 header + 3 sale + 3 purchase = 7
    expect(lines).toHaveLength(7);

    // Check VE journal entries
    expect(lines.filter((l) => l.startsWith('VE'))).toHaveLength(3);
    // Check AC journal entries
    expect(lines.filter((l) => l.startsWith('AC'))).toHaveLength(3);
  });

  it('handles empty entries (no error)', () => {
    const content = generateFecFile([]);
    const lines = content.split('\n');
    expect(lines).toHaveLength(1); // header only
  });
});

describe('generateFecFilename', () => {
  it('generates correct filename format', () => {
    const filename = generateFecFilename(
      '12345678901234',
      new Date('2026-01-01'),
      new Date('2026-12-31'),
    );
    expect(filename).toBe('12345678901234FEC20260101_20261231.txt');
  });

  it('strips spaces from SIRET', () => {
    const filename = generateFecFilename(
      '123 456 789 01234',
      new Date('2026-01-01'),
      new Date('2026-06-30'),
    );
    expect(filename).toBe('12345678901234FEC20260101_20260630.txt');
  });

  it('uses default SIRET when empty', () => {
    const filename = generateFecFilename(
      '',
      new Date('2026-01-01'),
      new Date('2026-12-31'),
    );
    expect(filename).toContain('00000000000000');
  });
});
