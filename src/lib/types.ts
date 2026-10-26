export type ColumnType = 'number' | 'string' | 'date' | 'boolean';

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  missingCount: number;
  missingPercent: number;
  uniqueCount: number;
  // numeric
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  q1?: number;
  q3?: number;
  sum?: number;
  // categorical / general
  topValues?: { value: string; count: number; percent: number }[];
  // date
  minDate?: string;
  maxDate?: string;
  // quality
  duplicates?: number;
}

export interface Dataset {
  id: string;
  name: string;
  rows: Record<string, string | number | boolean | null>[];
  columns: string[];
  columnProfiles: ColumnProfile[];
  rowCount: number;
  columnCount: number;
  totalMissing: number;
  totalMissingPercent: number;
  duplicateRowCount: number;
  createdAt: number;
}

export interface NumericStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  q1: number;
  q3: number;
  sum: number;
}

export interface Correlation {
  colA: string;
  colB: string;
  value: number;
  strength: 'strong' | 'moderate' | 'weak' | 'negligible';
  direction: 'positive' | 'negative';
}

export interface DistributionBin {
  label: string;
  count: number;
  rangeLabel: string;
}

export interface CategoryBucket {
  value: string;
  count: number;
  percent: number;
}

export interface TrendPoint {
  label: string;
  raw: string;
  value: number;
  count: number;
}

export interface AnomalyPoint {
  rowIndex: number;
  column: string;
  value: number;
  zScore: number;
  severity: 'high' | 'medium' | 'low';
  method: string;
}

export interface Finding {
  id: string;
  title: string;
  category: 'distribution' | 'correlation' | 'trend' | 'anomaly' | 'quality' | 'composition' | 'summary';
  what: string;
  evidence: string;
  why: string;
  significance: 'high' | 'medium' | 'low';
  metricRefs: { label: string; value: string }[];
  chartKind?: 'bar' | 'line' | 'scatter' | 'histogram' | 'donut';
  chartData?: Record<string, unknown>[];
  chartConfig?: Record<string, string>;
}

export interface DataStory {
  executiveSummary: string;
  findings: Finding[];
  recommendations: string[];
  limitations: string[];
  methods: string[];
}

export type View = 'overview' | 'preview' | 'charts' | 'insights' | 'story' | 'report';
