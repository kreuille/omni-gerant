// Vague G1 : parser CSV leger (RFC 4180 + tolere ; et \t en separateur)
// Pas de dep externe. Support :
//   - Guillemets doubles ""
//   - Separateur auto-detecte : , ; ou tab
//   - BOM UTF-8 en tete (Excel)
//   - Lignes vides ignorees

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  separator: ',' | ';' | '\t';
  row_count: number;
}

export function detectSeparator(sample: string): ',' | ';' | '\t' {
  const firstLine = sample.split(/\r?\n/)[0] ?? '';
  const counts = {
    ';': (firstLine.match(/;/g) ?? []).length,
    '\t': (firstLine.match(/\t/g) ?? []).length,
    ',': (firstLine.match(/,/g) ?? []).length,
  };
  // Priorite au point-virgule (habitude FR/Excel), puis tab, puis virgule
  if (counts[';'] >= counts[','] && counts[';'] >= counts['\t']) return ';';
  if (counts['\t'] >= counts[',']) return '\t';
  return ',';
}

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === sep && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

export function parseCsv(content: string): ParsedCsv {
  // Strip BOM
  const cleaned = content.replace(/^\uFEFF/, '');
  const sep = detectSeparator(cleaned);
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [], separator: sep, row_count: 0 };

  const headers = splitLine(lines[0]!, sep).map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]!, sep);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]!] = (cells[j] ?? '').trim();
    }
    rows.push(row);
  }
  return { headers, rows, separator: sep, row_count: rows.length };
}

// Converts a key header to a canonical lowercase underscore key for mapping
export function normalizeHeader(h: string): string {
  return h.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export interface ImportReport<T> {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{ line: number; message: string; data?: Partial<T> }>;
  created_ids: string[];
}
