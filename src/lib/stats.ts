import type {
  AnomalyPoint,
  CategoryBucket,
  ColumnProfile,
  ColumnType,
  Correlation,
  Dataset,
  DistributionBin,
  NumericStats,
  TrendPoint,
} from './types';

export function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const s = String(v).trim().replace(/[$,%\s]/g, '');
  if (s === '' || s === '-') return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
}

function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  // try dd/mm/yyyy
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10) - 1;
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    const dd = new Date(year, mon, day);
    if (!isNaN(dd.getTime())) return dd;
  }
  return null;
}

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function numericStats(values: number[]): NumericStats {
  const n = values.length;
  if (n === 0) {
    return { count: 0, min: 0, max: 0, mean: 0, median: 0, std: 0, q1: 0, q3: 0, sum: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = sum / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  return {
    count: n,
    min: sorted[0],
    max: sorted[n - 1],
    mean,
    median: quantile(sorted, 0.5),
    std,
    q1: quantile(sorted, 0.25),
    q3: quantile(sorted, 0.75),
    sum,
  };
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  const ma = sa / n, mb = sb / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma, xb = b[i] - mb;
    num += xa * xb; da += xa * xa; db += xb * xb;
  }
  if (da === 0 || db === 0) return 0;
  return num / Math.sqrt(da * db);
}

export function correlations(dataset: Dataset): Correlation[] {
  const numericCols = dataset.columnProfiles.filter((p) => p.type === 'number').map((p) => p.name);
  const out: Correlation[] = [];
  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const a = numericCols[i], b = numericCols[j];
      const pairs: [number, number][] = [];
      for (const row of dataset.rows) {
        const va = toNumber(row[a]); const vb = toNumber(row[b]);
        if (va !== null && vb !== null) pairs.push([va, vb]);
      }
      if (pairs.length < 5) continue;
      const r = pearson(pairs.map((p) => p[0]), pairs.map((p) => p[1]));
      const abs = Math.abs(r);
      const strength: Correlation['strength'] =
        abs >= 0.7 ? 'strong' : abs >= 0.4 ? 'moderate' : abs >= 0.2 ? 'weak' : 'negligible';
      out.push({ colA: a, colB: b, value: r, strength, direction: r >= 0 ? 'positive' : 'negative' });
    }
  }
  return out.sort((x, y) => Math.abs(y.value) - Math.abs(x.value));
}

export function distribution(dataset: Dataset, col: string, bins = 10): DistributionBin[] {
  const values = dataset.rows.map((r) => toNumber(r[col])).filter((v): v is number => v !== null);
  if (values.length === 0) return [];
  const { min, max } = numericStats(values);
  if (min === max) {
    return [{ label: col, count: values.length, rangeLabel: `${fmt(min)}` }];
  }
  const width = (max - min) / bins;
  const out: DistributionBin[] = [];
  for (let i = 0; i < bins; i++) {
    const lo = min + i * width;
    const hi = i === bins - 1 ? max : lo + width;
    const count = values.filter((v) => v >= lo && (i === bins - 1 ? v <= hi : v < hi)).length;
    out.push({
      label: `${fmt(lo)}–${fmt(hi)}`,
      count,
      rangeLabel: `${fmt(lo)} – ${fmt(hi)}`,
    });
  }
  return out;
}

export function categoryDistribution(dataset: Dataset, col: string, limit = 12): CategoryBucket[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const r of dataset.rows) {
    const v = r[col];
    if (v === null || v === undefined || v === '') continue;
    const key = String(v);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    total++;
  }
  const buckets: CategoryBucket[] = Array.from(counts.entries())
    .map(([value, count]) => ({ value, count, percent: total > 0 ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
  const top = buckets.slice(0, limit);
  if (buckets.length > limit) {
    const otherCount = buckets.slice(limit).reduce((s, b) => s + b.count, 0);
    const otherPercent = buckets.slice(limit).reduce((s, b) => s + b.percent, 0);
    top.push({ value: `Other (${buckets.length - limit})`, count: otherCount, percent: otherPercent });
  }
  return top;
}

export function timeTrend(dataset: Dataset, dateCol: string, valueCol?: string): TrendPoint[] {
  const points: { date: Date; value: number }[] = [];
  for (const r of dataset.rows) {
    const d = parseDate(r[dateCol]);
    if (!d) continue;
    let value = 1;
    if (valueCol) {
      const n = toNumber(r[valueCol]);
      if (n === null) continue;
      value = n;
    }
    points.push({ date: d, value });
  }
  if (points.length === 0) return [];
  points.sort((a, b) => a.date.getTime() - b.date.getTime());

  const span = points[points.length - 1].date.getTime() - points[0].date.getTime();
  const dayMs = 86400000;
  const days = span / dayMs;

  let granularity: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'day';
  if (days > 365 * 3) granularity = 'year';
  else if (days > 365 * 1.5) granularity = 'quarter';
  else if (days > 90) granularity = 'month';
  else if (days > 21) granularity = 'week';

  const grouped = new Map<string, { sum: number; count: number; raw: string }>();
  for (const p of points) {
    const key = bucketKey(p.date, granularity);
    const existing = grouped.get(key) ?? { sum: 0, count: 0, raw: key };
    existing.sum += p.value;
    existing.count += 1;
    grouped.set(key, existing);
  }

  return Array.from(grouped.entries()).map(([label, g]) => ({
    label,
    raw: label,
    value: valueCol ? g.sum / g.count : g.count,
    count: g.count,
  }));
}

function bucketKey(d: Date, g: 'day' | 'week' | 'month' | 'quarter' | 'year'): string {
  const y = d.getFullYear();
  const m = d.getMonth();
  if (g === 'day') return `${y}-${pad(m + 1)}-${pad(d.getDate())}`;
  if (g === 'week') {
    const tmp = new Date(d);
    const day = (tmp.getDay() + 6) % 7;
    tmp.setDate(tmp.getDate() - day);
    return `${tmp.getFullYear()}-W${pad(weekOfYear(tmp))}`;
  }
  if (g === 'month') return `${y}-${pad(m + 1)}`;
  if (g === 'quarter') return `${y}-Q${Math.floor(m / 3) + 1}`;
  return `${y}`;
}

function pad(n: number): string { return n < 10 ? `0${n}` : String(n); }
function weekOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = (d.getTime() - start.getTime()) / dayMs;
  return Math.floor((diff + start.getDay() + 1) / 7) || 1;
}
const dayMs = 86400000;

export function detectAnomalies(dataset: Dataset, col: string, threshold = 2.5): AnomalyPoint[] {
  const indexed: { idx: number; v: number }[] = [];
  dataset.rows.forEach((r, i) => {
    const n = toNumber(r[col]);
    if (n !== null) indexed.push({ idx: i, v: n });
  });
  if (indexed.length < 5) return [];
  const values = indexed.map((p) => p.v);
  const { mean, std } = numericStats(values);
  if (std === 0) return [];
  const out: AnomalyPoint[] = [];
  for (const p of indexed) {
    const z = (p.v - mean) / std;
    if (Math.abs(z) >= threshold) {
      out.push({
        rowIndex: p.idx,
        column: col,
        value: p.v,
        zScore: z,
        severity: Math.abs(z) >= 3.5 ? 'high' : Math.abs(z) >= 3 ? 'medium' : 'low',
        method: `Modified z-score (mean ± ${threshold}σ)`,
      });
    }
  }
  return out.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}

export function profileColumn(
  name: string,
  type: ColumnType,
  rawValues: (string | number | boolean | null)[],
): ColumnProfile {
  const total = rawValues.length;
  const missingCount = rawValues.filter((v) => v === null || v === undefined || v === '').length;
  const present = rawValues.filter((v): v is string | number | boolean => v !== null && v !== undefined && v !== '');
  const uniqueValues = new Set(present.map((v) => String(v)));

  const base: ColumnProfile = {
    name,
    type,
    missingCount,
    missingPercent: total > 0 ? (missingCount / total) * 100 : 0,
    uniqueCount: uniqueValues.size,
  };

  if (type === 'number') {
    const nums = present.map((v) => toNumber(v)).filter((v): v is number => v !== null);
    if (nums.length > 0) {
      const s = numericStats(nums);
      return {
        ...base,
        min: s.min, max: s.max, mean: s.mean, median: s.median,
        std: s.std, q1: s.q1, q3: s.q3, sum: s.sum,
      };
    }
  }

  if (type === 'string' || type === 'boolean') {
    const counts = new Map<string, number>();
    for (const v of present) {
      const k = String(v);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const total2 = present.length || 1;
    const topValues = Array.from(counts.entries())
      .map(([value, count]) => ({ value, count, percent: (count / total2) * 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return { ...base, topValues };
  }

  if (type === 'date') {
    const dates = present.map((v) => parseDate(v)).filter((d): d is Date => d !== null);
    if (dates.length > 0) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      return {
        ...base,
        minDate: dates[0].toISOString().slice(0, 10),
        maxDate: dates[dates.length - 1].toISOString().slice(0, 10),
      };
    }
  }

  return base;
}

export function fmt(n: number, digits = 2): string {
  if (!isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function fmtPct(n: number, digits = 1): string {
  if (!isFinite(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

export function fmtFull(n: number): string {
  if (!isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
