import type { FecEntry } from './fec-mapper.js';

// BUSINESS RULE [CDC-3.2]: Validation conformite FEC

export interface ValidationError {
  line: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  entry_count: number;
  total_debit_cents: number;
  total_credit_cents: number;
  balanced: boolean;
}

const FEC_COLUMNS = [
  'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
  'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
  'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit',
  'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise',
] as const;

const DATE_REGEX = /^\d{8}$/;

function parseAmount(val: string): number {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

export function validateFecEntries(entries: FecEntry[]): ValidationResult {
  const errors: ValidationError[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const line = i + 1;

    // Required fields
    if (!entry.JournalCode) {
      errors.push({ line, field: 'JournalCode', message: 'JournalCode est obligatoire' });
    }
    if (!entry.EcritureNum) {
      errors.push({ line, field: 'EcritureNum', message: 'EcritureNum est obligatoire' });
    }
    if (!entry.EcritureDate || !DATE_REGEX.test(entry.EcritureDate)) {
      errors.push({ line, field: 'EcritureDate', message: 'EcritureDate doit etre au format YYYYMMDD' });
    }
    if (!entry.CompteNum) {
      errors.push({ line, field: 'CompteNum', message: 'CompteNum est obligatoire' });
    }
    if (!entry.PieceRef) {
      errors.push({ line, field: 'PieceRef', message: 'PieceRef est obligatoire' });
    }
    if (!entry.EcritureLib) {
      errors.push({ line, field: 'EcritureLib', message: 'EcritureLib est obligatoire' });
    }

    // Debit/Credit: at least one must be non-zero
    const debit = parseAmount(entry.Debit);
    const credit = parseAmount(entry.Credit);
    if (debit === 0 && credit === 0) {
      errors.push({ line, field: 'Debit/Credit', message: 'Au moins un montant (Debit ou Credit) doit etre renseigne' });
    }

    totalDebit += debit;
    totalCredit += credit;
  }

  // Check balance per EcritureNum
  const byNum = new Map<string, { debit: number; credit: number }>();
  for (const entry of entries) {
    const existing = byNum.get(entry.EcritureNum) ?? { debit: 0, credit: 0 };
    existing.debit += parseAmount(entry.Debit);
    existing.credit += parseAmount(entry.Credit);
    byNum.set(entry.EcritureNum, existing);
  }

  for (const [num, totals] of byNum) {
    if (totals.debit !== totals.credit) {
      errors.push({
        line: 0,
        field: 'EcritureNum',
        message: `Ecriture ${num} non equilibree: Debit=${(totals.debit / 100).toFixed(2)} Credit=${(totals.credit / 100).toFixed(2)}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    entry_count: entries.length,
    total_debit_cents: totalDebit,
    total_credit_cents: totalCredit,
    balanced: totalDebit === totalCredit,
  };
}

export function getFecColumns(): readonly string[] {
  return FEC_COLUMNS;
}
