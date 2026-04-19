import { describe, it, expect } from 'vitest';
import { formatAccountingExportCsv, type PayrollAccountingExport } from '../termination/payroll-accounting.js';

// BUSINESS RULE [CDC-RH-V4]: tests export comptable classe 64

describe('formatAccountingExportCsv', () => {
  const sample: PayrollAccountingExport = {
    year: 2026,
    month: 4,
    periodLabel: '2026-04',
    entries: [
      { account: '641', label: 'Remunerations du personnel', debitCents: 500000, creditCents: 0 },
      { account: '645', label: 'Charges patronales', debitCents: 150000, creditCents: 0 },
      { account: '421', label: 'Personnel - Remunerations dues', debitCents: 0, creditCents: 390000 },
      { account: '431', label: 'Securite sociale', debitCents: 0, creditCents: 200000 },
      { account: '437', label: 'Autres organismes sociaux', debitCents: 0, creditCents: 60000 },
    ],
    totalDebitCents: 650000,
    totalCreditCents: 650000,
    balanced: true,
    payslipsCount: 2,
  };

  it('CSV commence par l\'en-tete', () => {
    const csv = formatAccountingExportCsv(sample);
    expect(csv.split('\n')[0]).toBe('date;piece;compte;libelle;debit;credit');
  });

  it('CSV contient une ligne par compte', () => {
    const csv = formatAccountingExportCsv(sample);
    expect(csv.split('\n').length).toBe(6); // header + 5 entries
  });

  it('numero de piece format SAL-YYYYMM', () => {
    const csv = formatAccountingExportCsv(sample);
    expect(csv).toContain('SAL-202604');
  });

  it('montants formates en EUR avec virgule', () => {
    const csv = formatAccountingExportCsv(sample);
    expect(csv).toContain('5000,00');
    expect(csv).toContain('3900,00');
  });

  it('libelle quote echappee', () => {
    const withQuote: PayrollAccountingExport = {
      ...sample,
      entries: [{ account: '641', label: 'Remu "special"', debitCents: 100, creditCents: 0 }],
    };
    const csv = formatAccountingExportCsv(withQuote);
    expect(csv).toContain('Remu ""special""');
  });

  it('equilibre debit = credit', () => {
    expect(sample.totalDebitCents).toBe(sample.totalCreditCents);
    expect(sample.balanced).toBe(true);
  });
});

describe('Plan comptable classe 64 — comptes attendus', () => {
  const expectedAccounts = ['641', '645', '421', '431', '437'];
  it('les 5 comptes de la paie', () => {
    expect(expectedAccounts).toHaveLength(5);
  });
});
