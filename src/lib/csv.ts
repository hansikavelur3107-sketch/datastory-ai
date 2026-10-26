import Papa from 'papaparse';
import type { ColumnProfile, ColumnType, Dataset } from './types';
import { profileColumn } from './stats';

export interface ParsedCsv {
  rows: Record<string, string>[];
  columns: string[];
}

export async function parseCsv(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          const fatal = results.errors.find((e) => e.type === 'Delimiter');
          if (fatal) {
            reject(new Error(`CSV parsing issue: ${fatal.message}`));
            return;
          }
        }
        const columns = results.meta.fields ?? [];
        if (columns.length === 0) {
          reject(new Error('No columns detected. Make sure your file has a header row.'));
          return;
        }
        if (results.data.length === 0) {
          reject(new Error('No data rows found in the file.'));
          return;
        }
        resolve({ rows: results.data as Record<string, string>[], columns });
      },
      error: (err: Error) => reject(err),
    });
  });
}

export function parseCsvText(text: string): ParsedCsv {
  const results = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  const columns = results.meta.fields ?? [];
  if (columns.length === 0) {
    throw new Error('No columns detected. Make sure your file has a header row.');
  }
  if (results.data.length === 0) {
    throw new Error('No data rows found in the file.');
  }
  return { rows: results.data as Record<string, string>[], columns };
}

function inferType(values: (string | null)[]): ColumnType {
  const sample = values.filter((v): v is string => v !== null && v !== '' && v !== undefined).slice(0, 200);
  if (sample.length === 0) return 'string';

  let numericCount = 0;
  let dateCount = 0;
  let boolCount = 0;

  for (const v of sample) {
    const trimmed = v.trim();
    if (/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(trimmed) || /^-?\.\d+([eE][-+]?\d+)?$/.test(trimmed)) {
      numericCount++;
      continue;
    }
    if (/^\$?-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(trimmed) || /^-?\d+(\.\d+)?%$/.test(trimmed)) {
      numericCount++;
      continue;
    }
    if (isMaybeDate(trimmed)) {
      dateCount++;
      continue;
    }
    if (/^(true|false|yes|no|y|n)$/i.test(trimmed)) {
      boolCount++;
      continue;
    }
  }

  const n = sample.length;
  if (numericCount / n >= 0.8) return 'number';
  if (dateCount / n >= 0.8) return 'date';
  if (boolCount / n >= 0.8) return 'boolean';
  return 'string';
}

function isMaybeDate(v: string): boolean {
  if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?Z?)?$/.test(v)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(v)) return true;
  if (/^\d{1,2}-\d{1,2}-\d{2,4}$/.test(v)) return true;
  if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s*\d{2,4}$/i.test(v)) return true;
  const d = new Date(v);
  return !isNaN(d.getTime()) && v.length >= 8 && /\d{4}/.test(v);
}

function cleanValue(v: string | undefined): string | null {
  if (v === undefined || v === null) return null;
  const t = v.trim();
  if (t === '' || t.toLowerCase() === 'na' || t.toLowerCase() === 'n/a' || t === '-' || t.toLowerCase() === 'null') {
    return null;
  }
  return t;
}

export function buildDataset(
  parsed: ParsedCsv,
  name: string,
): Dataset {
  const { rows: rawRows, columns } = parsed;

  const typedRows = rawRows.map((r) => {
    const out: Record<string, string | number | boolean | null> = {};
    for (const c of columns) {
      const cleaned = cleanValue(r[c]);
      out[c] = cleaned;
    }
    return out;
  });

  const columnProfiles: ColumnProfile[] = columns.map((col) => {
    const values = typedRows.map((r) => (r[col] === null || r[col] === undefined ? null : String(r[col])));
    const type = inferType(values);
    return profileColumn(col, type, typedRows.map((r) => r[col]));
  });

  const totalMissing = columnProfiles.reduce((s, p) => s + p.missingCount, 0);
  const totalCells = rows(rawRows) * columns.length;

  const duplicateRowCount = countDuplicateRows(typedRows, columns);

  return {
    id: `ds_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    rows: typedRows,
    columns,
    columnProfiles,
    rowCount: typedRows.length,
    columnCount: columns.length,
    totalMissing,
    totalMissingPercent: totalCells > 0 ? (totalMissing / totalCells) * 100 : 0,
    duplicateRowCount,
    createdAt: Date.now(),
  };
}

function rows(r: Record<string, unknown>[]): number {
  return r.length;
}

function countDuplicateRows(
  data: Record<string, string | number | boolean | null>[],
  columns: string[],
): number {
  const seen = new Map<string, number>();
  let dupes = 0;
  for (const r of data) {
    const key = columns.map((c) => String(r[c] ?? '')).join('\u0001');
    const n = seen.get(key) ?? 0;
    if (n > 0) dupes++;
    seen.set(key, n + 1);
  }
  return dupes;
}
