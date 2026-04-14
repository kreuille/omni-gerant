import type { FecEntry } from './fec-mapper.js';
import { getFecColumns } from './fec-validator.js';

// BUSINESS RULE [CDC-3.2]: Generateur FEC (Fichier des Ecritures Comptables)
// Format texte tabule (TSV), colonnes obligatoires

export function generateFecFile(entries: FecEntry[]): string {
  const columns = getFecColumns();
  const header = columns.join('\t');

  const rows = entries.map((entry) =>
    columns.map((col) => entry[col as keyof FecEntry] ?? '').join('\t'),
  );

  if (rows.length === 0) return header;
  return `${header}\n${rows.join('\n')}`;
}

export function generateFecFilename(siret: string, from: Date, to: Date): string {
  const fromStr = from.toISOString().split('T')[0]!.replace(/-/g, '');
  const toStr = to.toISOString().split('T')[0]!.replace(/-/g, '');
  const cleanSiret = siret.replace(/\s/g, '') || '00000000000000';
  return `${cleanSiret}FEC${fromStr}_${toStr}.txt`;
}
