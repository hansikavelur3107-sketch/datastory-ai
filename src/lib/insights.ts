import type { Correlation, Dataset, Finding, DataStory, AnomalyPoint, ColumnProfile } from './types';
import {
  correlations,
  detectAnomalies,
  distribution,
  categoryDistribution,
  timeTrend,
  numericStats,
  toNumber,
  fmt,
  fmtPct,
  fmtFull,
} from './stats';

const CATEGORY_COLORS = ['#4f5ef5', '#139e83', '#e2830a', '#c52e34', '#2b3d83', '#5a6aae', '#2bba9d', '#f7a11f'];

function finId() { return `f_${Math.random().toString(36).slice(2, 9)}`; }

export function analyze(dataset: Dataset): {
  correlations: Correlation[];
  anomalies: AnomalyPoint[];
  findings: Finding[];
  story: DataStory;
} {
  const corrs = correlations(dataset);

  const numericCols = dataset.columnProfiles.filter((p) => p.type === 'number');
  const dateCols = dataset.columnProfiles.filter((p) => p.type === 'date');
  const catCols = dataset.columnProfiles.filter((p) => p.type === 'string' && p.uniqueCount > 1 && p.uniqueCount <= 30);
  const highCardCats = dataset.columnProfiles.filter((p) => p.type === 'string' && p.uniqueCount > 30);

  const anomaliesByCol: Record<string, AnomalyPoint[]> = {};
  for (const c of numericCols) {
    const a = detectAnomalies(dataset, c.name);
    if (a.length > 0) anomaliesByCol[c.name] = a;
  }
  const allAnomalies = Object.values(anomaliesByCol).flat().slice(0, 50);

  const findings: Finding[] = [];

  // 1) Composition / dominant category
  for (const c of catCols.slice(0, 3)) {
    const dist = categoryDistribution(dataset, c.name, 8);
    if (dist.length === 0) continue;
    const top = dist[0];
    if (top.percent >= 40 && dist.length > 1) {
      findings.push({
        id: finId(),
        title: `${c.name} is dominated by "${top.value}"`,
        category: 'composition',
        what: `"${top.value}" accounts for ${top.percent.toFixed(1)}% of all ${c.name} values, making it the single largest group in the dataset.`,
        evidence: `Out of ${dist.reduce((s, b) => s + b.count, 0)} non-empty records, ${top.count} belong to "${top.value}". The next largest group is "${dist[1]?.value ?? '—'}" at ${dist[1]?.percent.toFixed(1) ?? 0}%.`,
        why: top.percent >= 70
          ? `When one category is this dominant, averages and totals will mostly reflect this group's behavior. Segmenting by ${c.name} before drawing conclusions avoids over-generalizing.`
          : `A leading category this large shapes the baseline for any comparison. It is worth checking whether outcomes differ meaningfully across the smaller groups.`,
        significance: top.percent >= 60 ? 'high' : 'medium',
        metricRefs: [
          { label: 'Top share', value: `${top.percent.toFixed(1)}%` },
          { label: 'Categories', value: String(dist.length) },
        ],
        chartKind: 'donut',
        chartData: dist.slice(0, 6).map((b, i) => ({ name: b.value, value: b.count, fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length] })),
        chartConfig: { title: `${c.name} composition` },
      });
    }
  }

  // 2) Strongest correlations
  for (const corr of corrs.slice(0, 3)) {
    if (corr.strength === 'negligible' || corr.strength === 'weak') break;
    findings.push({
      id: finId(),
      title: `${corr.colA} and ${corr.colB} move ${corr.direction === 'positive' ? 'together' : 'in opposite directions'}`,
      category: 'correlation',
      what: `There is a ${corr.strength} ${corr.direction} relationship (r = ${corr.value.toFixed(2)}) between ${corr.colA} and ${corr.colB}.`,
      evidence: `Pearson correlation across paired non-missing values is ${corr.value.toFixed(3)}. Values near +1 or −1 indicate a tight linear relationship; this one is considered ${corr.strength}.`,
      why: corr.direction === 'positive'
        ? `When ${corr.colA} rises, ${corr.colB} tends to rise too. This can reveal a driver worth investigating — but correlation is not causation; a third factor may influence both.`
        : `When ${corr.colA} rises, ${corr.colB} tends to fall. Such inverse relationships often point to a trade-off or competing factor in the data.`,
      significance: corr.strength === 'strong' ? 'high' : 'medium',
      metricRefs: [
        { label: 'Correlation', value: corr.value.toFixed(2) },
        { label: 'Strength', value: corr.strength },
      ],
      chartKind: 'scatter',
      chartData: buildScatter(dataset, corr.colA, corr.colB),
      chartConfig: { x: corr.colA, y: corr.colB, title: `${corr.colA} vs ${corr.colB}` },
    });
  }

  // 3) Trends over time
  for (const d of dateCols.slice(0, 2)) {
    const valueCol = numericCols.find((n) => /sales|revenue|amount|total|count|price|value|score|rating/i.test(n.name)) ?? numericCols[0];
    if (!valueCol) continue;
    const trend = timeTrend(dataset, d.name, valueCol.name);
    if (trend.length < 3) continue;
    const first = trend[0].value;
    const last = trend[trend.length - 1].value;
    const change = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
    const peak = trend.reduce((p, t) => (t.value > p.value ? t : p), trend[0]);
    findings.push({
      id: finId(),
      title: `${valueCol.name} ${change >= 0 ? 'rose' : 'declined'} ${fmtPct(Math.abs(change), 1)} over the ${trend.length} periods to ${d.name}`,
      category: 'trend',
      what: `Across ${trend.length} time periods, average ${valueCol.name} ${change >= 0 ? 'increased' : 'decreased'} from ${fmt(first)} to ${fmt(last)} — a ${change >= 0 ? 'rise' : 'drop'} of ${fmtPct(Math.abs(change), 1)}.`,
      evidence: `The series peaked at ${fmt(peak.value)} in ${peak.label}. The overall direction is ${change >= 0 ? 'upward' : 'downward'} across the observed window.`,
      why: change >= 0
        ? `A sustained upward trend may reflect growing demand, seasonality, or a successful change. Confirming the cause — and whether it is likely to continue — is the natural next step.`
        : `A sustained decline deserves attention. It may signal churn, a seasonal dip, or a one-time event; comparing against a longer history will separate trend from noise.`,
      significance: Math.abs(change) >= 25 ? 'high' : 'medium',
      metricRefs: [
        { label: 'Start', value: fmt(first) },
        { label: 'End', value: fmt(last) },
        { label: 'Change', value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%` },
        { label: 'Peak', value: fmt(peak.value) },
      ],
      chartKind: 'line',
      chartData: trend.map((t) => ({ label: t.label, value: t.value })),
      chartConfig: { title: `${valueCol.name} over ${d.name}`, x: d.name, y: valueCol.name },
    });
  }

  // 4) Anomalies
  for (const [col, points] of Object.entries(anomaliesByCol)) {
    if (points.length === 0) continue;
    const top = points[0];
    const highs = points.filter((p) => p.zScore > 0).length;
    const lows = points.filter((p) => p.zScore < 0).length;
    findings.push({
      id: finId(),
      title: `${points.length} potential outlier${points.length === 1 ? '' : 's'} detected in ${col}`,
      category: 'anomaly',
      what: `Using z-scores (mean ± 2.5σ), ${points.length} value${points.length === 1 ? ' is' : 's are'} statistically unusual in ${col}: ${highs} unusually high and ${lows} unusually low.`,
      evidence: `The most extreme point is ${fmtFull(top.value)} (z = ${top.zScore.toFixed(2)}) at row ${top.rowIndex + 1}. Detection uses the column mean and standard deviation after dropping missing values.`,
      why: `Outliers can be genuine signal (a spike worth investigating) or data-entry errors worth correcting. Reviewing these rows before summarizing prevents them from skewing averages.`,
      significance: top.severity === 'high' ? 'high' : 'medium',
      metricRefs: [
        { label: 'Outliers', value: String(points.length) },
        { label: 'Most extreme', value: fmtFull(top.value) },
        { label: 'z-score', value: top.zScore.toFixed(2) },
      ],
      chartKind: 'histogram',
      chartData: distribution(dataset, col, 12).map((b) => ({ label: b.label, count: b.count })),
      chartConfig: { title: `${col} distribution with outliers` },
    });
  }

  // 5) Distribution skew / center
  for (const c of numericCols.slice(0, 2)) {
    const stats = numericStats(dataset.rows.map((r) => toNumber(r[c.name])).filter((v): v is number => v !== null));
    if (stats.count < 5) continue;
    const skew = stats.mean - stats.median;
    const skewRel = stats.std > 0 ? skew / stats.std : 0;
    let shape = 'roughly symmetric';
    if (skewRel > 0.2) shape = 'right-skewed (a long tail of high values)';
    else if (skewRel < -0.2) shape = 'left-skewed (a long tail of low values)';
    findings.push({
      id: finId(),
      title: `${c.name} is ${shape}`,
      category: 'distribution',
      what: `The distribution of ${c.name} has a mean of ${fmt(stats.mean)} and a median of ${fmt(stats.median)}, suggesting a ${shape} shape.`,
      evidence: `Range: ${fmt(stats.min)} to ${fmt(stats.max)}. Standard deviation: ${fmt(stats.std)}. The gap between mean and median is ${fmt(skew)} (${(skewRel * 100).toFixed(0)}% of one standard deviation).`,
      why: `When data is skewed, the median is usually a fairer "typical value" than the mean. The mean is pulled toward the long tail and can mislead if reported alone.`,
      significance: Math.abs(skewRel) > 0.4 ? 'medium' : 'low',
      metricRefs: [
        { label: 'Mean', value: fmt(stats.mean) },
        { label: 'Median', value: fmt(stats.median) },
        { label: 'Range', value: `${fmt(stats.min)} – ${fmt(stats.max)}` },
      ],
      chartKind: 'histogram',
      chartData: distribution(dataset, c.name, 12).map((b) => ({ label: b.label, count: b.count })),
      chartConfig: { title: `${c.name} distribution` },
    });
  }

  // 6) Data quality
  const qualityFindings = buildQualityFindings(dataset);
  findings.push(...qualityFindings);

  // Sort by significance then category priority
  const sigOrder = { high: 0, medium: 1, low: 2 } as const;
  findings.sort((a, b) => sigOrder[a.significance] - sigOrder[b.significance]);
  const topFindings = findings.slice(0, 6);

  const story = buildStory(dataset, topFindings, corrs, allAnomalies);
  return { correlations: corrs, anomalies: allAnomalies, findings, story };
}

function buildScatter(dataset: Dataset, a: string, b: string, max = 200): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const step = Math.max(1, Math.floor(dataset.rowCount / max));
  dataset.rows.forEach((r, i) => {
    if (i % step !== 0) return;
    const va = toNumber(r[a]); const vb = toNumber(r[b]);
    if (va !== null && vb !== null) out.push({ x: va, y: vb });
  });
  return out;
}

function buildQualityFindings(dataset: Dataset): Finding[] {
  const out: Finding[] = [];
  if (dataset.duplicateRowCount > 0) {
    out.push({
      id: finId(),
      title: `${dataset.duplicateRowCount} duplicate row${dataset.duplicateRowCount === 1 ? '' : 's'} found`,
      category: 'quality',
      what: `${dataset.duplicateRowCount} of ${dataset.rowCount} rows (${fmtPct((dataset.duplicateRowCount / dataset.rowCount) * 100)}) are exact duplicates of another row.`,
      evidence: `Duplicate detection compares all ${dataset.columnCount} columns. Each duplicate row matches a previously seen row exactly.`,
      why: `Duplicates inflate counts and can bias totals. Removing or de-duplicating them before analysis gives more accurate figures.`,
      significance: dataset.duplicateRowCount / dataset.rowCount > 0.1 ? 'high' : 'medium',
      metricRefs: [
        { label: 'Duplicates', value: String(dataset.duplicateRowCount) },
        { label: 'Share', value: fmtPct((dataset.duplicateRowCount / dataset.rowCount) * 100) },
      ],
    });
  }

  const sparse = dataset.columnProfiles
    .filter((p) => p.missingPercent >= 10)
    .sort((a, b) => b.missingPercent - a.missingPercent);
  if (sparse.length > 0) {
    const c = sparse[0];
    out.push({
      id: finId(),
      title: `${c.name} is missing ${c.missingPercent.toFixed(0)}% of its values`,
      category: 'quality',
      what: `${c.name} has the highest gap rate in the dataset: ${c.missingCount} of ${dataset.rowCount} values are missing (${c.missingPercent.toFixed(1)}%).`,
      evidence: `Across all ${dataset.columnCount} columns, ${dataset.totalMissing} cells are missing in total (${dataset.totalMissingPercent.toFixed(1)}% of the dataset).`,
      why: `A column this sparse can undermine any analysis that relies on it. Consider whether the gaps are meaningful (e.g. optional fields) or a data-collection problem to fix upstream.`,
      significance: c.missingPercent >= 40 ? 'high' : 'medium',
      metricRefs: [
        { label: 'Missing', value: `${c.missingPercent.toFixed(1)}%` },
        { label: 'Cells empty', value: String(c.missingCount) },
      ],
    });
  }

  return out;
}

function buildStory(
  dataset: Dataset,
  findings: Finding[],
  corrs: Correlation[],
  anomalies: AnomalyPoint[],
): DataStory {
  const numericCols = dataset.columnProfiles.filter((p) => p.type === 'number');
  const dateCols = dataset.columnProfiles.filter((p) => p.type === 'date');
  const catCols = dataset.columnProfiles.filter((p) => p.type === 'string' && p.uniqueCount <= 30);

  const summaryParts: string[] = [];
  summaryParts.push(
    `This dataset contains ${dataset.rowCount.toLocaleString()} records across ${dataset.columnCount} columns — ${numericCols.length} numeric, ${dateCols.length} date, ${catCols.length} categorical, and ${dataset.columnCount - numericCols.length - dateCols.length - catCols.length} other.`,
  );

  if (dataset.totalMissingPercent > 0) {
    summaryParts.push(
      `Data quality is ${dataset.totalMissingPercent < 5 ? 'high' : dataset.totalMissingPercent < 20 ? 'moderate' : 'a concern'}: ${dataset.totalMissingPercent.toFixed(1)}% of all cells are missing${dataset.duplicateRowCount > 0 ? ` and ${dataset.duplicateRowCount} duplicate rows were detected` : ''}.`,
    );
  } else if (dataset.duplicateRowCount > 0) {
    summaryParts.push(`No missing values were found, but ${dataset.duplicateRowCount} duplicate rows were detected.`);
  } else {
    summaryParts.push(`No missing values or duplicate rows were detected — the dataset is complete.`);
  }

  const topCorr = corrs.find((c) => c.strength === 'strong' || c.strength === 'moderate');
  if (topCorr) {
    summaryParts.push(
      `The strongest relationship is between ${topCorr.colA} and ${topCorr.colB} (r = ${topCorr.value.toFixed(2)}), a ${topCorr.strength} ${topCorr.direction} correlation.`,
    );
  }

  if (anomalies.length > 0) {
    summaryParts.push(`${anomalies.length} potential outlier${anomalies.length === 1 ? '' : 's'} stood out and should be reviewed before final conclusions.`);
  }

  const recommendations: string[] = [];
  if (dataset.duplicateRowCount > 0) recommendations.push(`Remove the ${dataset.duplicateRowCount} duplicate row${dataset.duplicateRowCount === 1 ? '' : 's'} before computing totals or counts.`);
  const sparse = dataset.columnProfiles.filter((p) => p.missingPercent >= 20);
  if (sparse.length > 0) recommendations.push(`Investigate why "${sparse[0].name}" is missing ${sparse[0].missingPercent.toFixed(0)}% of values — decide whether to impute, drop, or fix collection upstream.`);
  if (topCorr) recommendations.push(`Investigate the ${topCorr.strength} ${topCorr.direction} link between ${topCorr.colA} and ${topCorr.colB}; design an analysis that can tell correlation from causation.`);
  if (anomalies.length > 0) recommendations.push(`Review the ${anomalies.length} flagged outlier${anomalies.length === 1 ? '' : 's'} individually — confirm whether each is a real event or a data error.`);
  const skewed = findings.find((f) => f.category === 'distribution' && f.significance !== 'low');
  if (skewed) recommendations.push(`For skewed numeric columns, prefer the median over the mean when describing a "typical" value.`);
  if (recommendations.length === 0) recommendations.push(`The dataset is clean and well-structured. Explore the charts and segment by categorical columns to find actionable differences between groups.`);

  const limitations: string[] = [
    `All statistics are computed from the ${dataset.rowCount} rows provided. If this is a sample of a larger population, figures may not generalize.`,
    `Correlations measure linear relationships only; non-linear patterns may be missed.`,
    `Outliers are flagged using z-scores, which assume an approximately normal distribution. Extreme but legitimate values may be flagged.`,
    `Date trend granularity is chosen automatically based on the time span; very short or very long spans may aggregate differently than expected.`,
  ];

  const methods: string[] = [
    `Column types are inferred by sampling values: ≥80% parseable as numbers → numeric; ≥80% as dates → date; ≥80% as true/false → boolean; otherwise string.`,
    `Descriptive statistics (mean, median, standard deviation, quartiles) are computed on non-missing numeric values.`,
    `Correlations use Pearson's r across paired non-missing values; strength bands: ≥0.7 strong, ≥0.4 moderate, ≥0.2 weak, otherwise negligible.`,
    `Potential anomalies use z-scores (value − mean) / std; |z| ≥ 2.5 is flagged, ≥3 medium severity, ≥3.5 high.`,
    `Time trends are auto-bucketed by day, week, month, quarter, or year based on the span of the date column.`,
  ];

  return {
    executiveSummary: summaryParts.join(' '),
    findings,
    recommendations,
    limitations,
    methods,
  };
}

export { CATEGORY_COLORS };
