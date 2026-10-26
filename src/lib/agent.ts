import type { Correlation, Dataset, AnomalyPoint, Finding, DataStory, ColumnProfile } from './types';
import {
  toNumber,
  numericStats,
  categoryDistribution,
  timeTrend,
  detectAnomalies,
  fmt,
  fmtFull,
  fmtPct,
} from './stats';

export interface AgentContext {
  dataset: Dataset;
  correlations: Correlation[];
  anomalies: AnomalyPoint[];
  findings: Finding[];
  story: DataStory;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  refs?: { label: string; view?: import('./types').View }[];
  createdAt: number;
}

export interface AgentAnswer {
  text: string;
  refs?: { label: string; view?: import('./types').View }[];
  /** false when the local engine did not understand the question (caller should try the AI fallback). */
  handled?: boolean;
}

let idCounter = 0;
export function newId(prefix = 'm'): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

function findColumn(dataset: Dataset, query: string): ColumnProfile | undefined {
  const q = query.toLowerCase();
  // exact-ish match first
  let best: ColumnProfile | undefined;
  let bestScore = 0;
  for (const c of dataset.columnProfiles) {
    const name = c.name.toLowerCase();
    let score = 0;
    if (name === q) score = 100;
    else if (q.includes(name) && name.length > 2) score = 60 + name.length;
    else if (name.includes(q) && q.length > 2) score = 40 + q.length;
    // word-level match
    else {
      const words = q.split(/[^a-z0-9]+/i).filter((w) => w.length > 2);
      for (const w of words) {
        if (name.includes(w)) score = Math.max(score, 25 + w.length);
      }
    }
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return bestScore >= 25 ? best : undefined;
}

function findColumns(query: string, dataset: Dataset): ColumnProfile[] {
  const q = query.toLowerCase();
  return dataset.columnProfiles.filter((c) => {
    const n = c.name.toLowerCase();
    return q.includes(n) && n.length > 2;
  });
}

function answerLocal(query: string, ctx: AgentContext): AgentAnswer {
  const q = query.toLowerCase().trim();
  const { dataset, correlations, anomalies, findings, story } = ctx;

  if (!q) return { text: 'Ask me about your data — columns, statistics, correlations, anomalies, trends, or the overall findings.', handled: true };

  // Greetings
  if (/^(hi|hello|hey|yo|sup|thanks|thank you|cool|nice|ok)\b/.test(q) && q.length < 25) {
    return {
      text: `Hi! I'm the DataStory agent. I've analyzed "${dataset.name}" (${dataset.rowCount.toLocaleString()} rows, ${dataset.columnCount} columns). Ask me things like "What's the average revenue?", "Which columns are correlated?", or "What anomalies did you find?"`,
      refs: [{ label: 'See the data story', view: 'story' }],
      handled: true,
    };
  }

  // Help / what can you do
  if (/(what can you|help|how do you work|what do you do|capab|suggest)/.test(q)) {
    return {
      text: `I answer questions about your dataset using the analysis already computed from your data. Try asking about:\n• A specific column's statistics — "What's the average units_sold?"\n• Correlations — "Which columns are correlated?"\n• Anomalies — "Are there any outliers?"\n• Trends — "How did revenue change over time?"\n• Overall findings — "What are the main insights?"\n• Data quality — "How clean is the data?"`,
    };
  }

  // Overall summary / what did you find
  if (/(overall|summary|what did you find|main findings|key findings|top findings|insights|what.*learn|tell me about|describe.*(dataset|data)|overview)/.test(q)) {
    const top = findings.slice(0, 3).map((f, i) => `${i + 1}. ${f.title} — ${f.evidence}`).join('\n');
    return {
      text: `${story.executiveSummary}\n\nTop findings:\n${top}`,
      refs: [{ label: 'Read the full data story', view: 'story' }, { label: 'See all insights', view: 'insights' }],
    };
  }

  // Recommendations
  if (/(recommend|suggest|next step|what should i|advice|action)/.test(q)) {
    return {
      text: `Based on the analysis, here's what I'd recommend:\n${story.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`,
      refs: [{ label: 'See recommendations in the story', view: 'story' }],
    };
  }

  // Limitations / caveats
  if (/(limitation|caveat|caveats|reliable|trust|accurate|confident|assumption)/.test(q)) {
    return {
      text: `A few things to keep in mind:\n${story.limitations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`,
      refs: [{ label: 'See methods & limitations', view: 'story' }],
    };
  }

  // Data quality
  if (/(quality|clean|missing|duplicate|empty|sparse|complet)/.test(q)) {
    const sparse = dataset.columnProfiles.filter((p) => p.missingPercent > 0).sort((a, b) => b.missingPercent - a.missingPercent);
    const parts: string[] = [];
    parts.push(`Data quality: ${dataset.totalMissingPercent < 5 ? 'high' : dataset.totalMissingPercent < 20 ? 'moderate' : 'needs attention'}.`);
    parts.push(`${dataset.totalMissing.toLocaleString()} missing cells (${fmtPct(dataset.totalMissingPercent)} of the dataset) and ${dataset.duplicateRowCount} duplicate row${dataset.duplicateRowCount === 1 ? '' : 's'}.`);
    if (sparse.length > 0) {
      parts.push(`Most sparse column: "${sparse[0].name}" at ${fmtPct(sparse[0].missingPercent)} missing.`);
    } else {
      parts.push(`No column has missing values.`);
    }
    return {
      text: parts.join('\n'),
      refs: [{ label: 'See column profiles', view: 'overview' }],
    };
  }

  // Anomalies / outliers
  if (/(anomal|outlier|unusual|extreme|abnormal|spike|odd value)/.test(q)) {
    if (anomalies.length === 0) {
      return { text: `No potential outliers were detected. Every numeric column was checked with z-scores (|z| ≥ 2.5) and none crossed the threshold.`, refs: [{ label: 'See insights', view: 'insights' }] };
    }
    const byCol = new Map<string, AnomalyPoint[]>();
    for (const a of anomalies) {
      const arr = byCol.get(a.column) ?? [];
      arr.push(a);
      byCol.set(a.column, arr);
    }
    const lines: string[] = [];
    lines.push(`${anomalies.length} potential outlier${anomalies.length === 1 ? '' : 's'} found across ${byCol.size} column${byCol.size === 1 ? '' : 's'}:`);
    for (const [col, pts] of Array.from(byCol.entries()).slice(0, 4)) {
      const top = pts[0];
      lines.push(`• ${col}: ${pts.length} outlier${pts.length === 1 ? '' : 's'} — most extreme is ${fmtFull(top.value)} (z = ${top.zScore.toFixed(2)}, row ${top.rowIndex + 1}, ${top.severity} severity)`);
    }
    return { text: lines.join('\n'), refs: [{ label: 'See anomaly findings', view: 'insights' }] };
  }

  // Correlations
  if (/(correlat|relat|connect|associat|depend|linked|together|driver|which.*affect|influence)/.test(q)) {
    const strong = correlations.filter((c) => c.strength === 'strong' || c.strength === 'moderate');
    if (correlations.length === 0) {
      return { text: `I couldn't compute correlations — you need at least two numeric columns with at least 5 paired values.`, refs: [{ label: 'See charts', view: 'charts' }] };
    }
    if (strong.length === 0) {
      return { text: `I checked every pair of numeric columns. The strongest is ${correlations[0].colA} ↔ ${correlations[0].colB} (r = ${correlations[0].value.toFixed(2)}), but it's only a ${correlations[0].strength} relationship. No strong or moderate correlations were found.`, refs: [{ label: 'See correlation chart', view: 'charts' }] };
    }
    const lines = strong.slice(0, 5).map((c) => `• ${c.colA} ↔ ${c.colB}: r = ${c.value.toFixed(2)} (${c.strength} ${c.direction})`);
    return {
      text: `Here are the meaningful correlations I found:\n${lines.join('\n')}\n\nRemember, correlation isn't causation — a third factor could drive both.`,
      refs: [{ label: 'See correlation chart', view: 'charts' }],
    };
  }

  // Trends over time
  if (/(trend|over time|change over|time series|growth|decline|increase|decrease|season|monthly|weekly|daily|yearly)/.test(q)) {
    const dateCols = dataset.columnProfiles.filter((p) => p.type === 'date');
    const numericCols = dataset.columnProfiles.filter((p) => p.type === 'number');
    if (dateCols.length === 0) {
      return { text: `No date column was detected, so I can't compute a time trend. Date columns are auto-detected when ≥80% of values parse as dates.` };
    }
    // find a relevant numeric column mentioned, else pick the first numeric
    const mentioned = findColumns(q, dataset).find((c) => c.type === 'number');
    const valueCol = mentioned ?? numericCols[0];
    if (!valueCol) {
      return { text: `I found a date column (${dateCols[0].name}) but no numeric column to trend.`, refs: [{ label: 'See charts', view: 'charts' }] };
    }
    const trend = timeTrend(dataset, dateCols[0].name, valueCol.name);
    if (trend.length < 2) {
      return { text: `Not enough distinct time points to plot a trend for ${valueCol.name} over ${dateCols[0].name}.` };
    }
    const first = trend[0].value;
    const last = trend[trend.length - 1].value;
    const change = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
    const peak = trend.reduce((p, t) => (t.value > p.value ? t : p), trend[0]);
    const dir = change >= 0 ? 'rose' : 'declined';
    return {
      text: `Across ${trend.length} periods (${trend[0].label} → ${trend[trend.length - 1].label}), ${valueCol.name} ${dir} from ${fmt(first)} to ${fmt(last)} — a ${change >= 0 ? '+' : ''}${change.toFixed(1)}% change. It peaked at ${fmt(peak.value)} in ${peak.label}.`,
      refs: [{ label: 'See trend chart', view: 'charts' }],
    };
  }

  // Distribution / spread of a specific column
  if (/(distribut|spread|range|histogram|skew|shape|how.*(distributed|spread))/.test(q)) {
    const col = findColumn(dataset, q);
    if (!col) return { text: `Which column distribution would you like? I can describe the spread of any numeric column — try "What is the distribution of revenue?"` };
    if (col.type !== 'number') {
      const dist = categoryDistribution(dataset, col.name, 6);
      return {
        text: `"${col.name}" is a ${col.type} column with ${col.uniqueCount} unique values. Top values:\n${dist.map((d) => `• ${d.value}: ${d.count} (${d.percent.toFixed(1)}%)`).join('\n')}`,
        refs: [{ label: 'See charts', view: 'charts' }],
      };
    }
    const vals = dataset.rows.map((r) => toNumber(r[col.name])).filter((v): v is number => v !== null);
    const s = numericStats(vals);
    const skewRel = s.std > 0 ? (s.mean - s.median) / s.std : 0;
    const shape = skewRel > 0.2 ? 'right-skewed' : skewRel < -0.2 ? 'left-skewed' : 'roughly symmetric';
    return {
      text: `"${col.name}" is ${shape}. Mean ${fmt(s.mean)}, median ${fmt(s.median)}, range ${fmt(s.min)}–${fmt(s.max)}, std dev ${fmt(s.std)}. ${Math.abs(skewRel) > 0.4 ? "Because it's skewed, the median is a better 'typical value' than the mean." : 'Mean and median are close, so the mean is a fair summary.'}`,
      refs: [{ label: 'See distribution chart', view: 'charts' }],
    };
  }

  // Top / most common values for a column
  if (/(top|most common|frequent|popular|biggest|largest category|mode|breakdown|how many.*per)/.test(q)) {
    const col = findColumn(dataset, q);
    if (!col) return { text: `Which column top values? Try "What are the top products?" or "Breakdown by region."` };
    const dist = categoryDistribution(dataset, col.name, 8);
    if (dist.length === 0) return { text: `"${col.name}" has no non-empty values to summarize.` };
    return {
      text: `Top values in "${col.name}":\n${dist.slice(0, 6).map((d) => `• ${d.value}: ${d.count} (${d.percent.toFixed(1)}%)`).join('\n')}`,
      refs: [{ label: 'See category chart', view: 'charts' }],
    };
  }

  // Specific column statistics — average/mean/median/min/max/sum/count/std
  const statMatch = q.match(/(average|mean|median|min(?:imum)?|max(?:imum)?|sum|total|std|standard deviation|count|range|quartile|q1|q3)\b/);
  if (statMatch) {
    const col = findColumn(dataset, q);
    if (!col) return { text: `Which column would you like the ${statMatch[1]} for? Try "What is the average revenue?"` };
    if (col.type !== 'number') {
      return { text: `"${col.name}" is a ${col.type} column, so numeric statistics like ${statMatch[1]} do not apply. It has ${col.uniqueCount} unique values.`, refs: [{ label: 'See overview', view: 'overview' }] };
    }
    const vals = dataset.rows.map((r) => toNumber(r[col.name])).filter((v): v is number => v !== null);
    const s = numericStats(vals);
    const stat = statMatch[1];
    let value = '';
    let label = stat;
    if (/average|mean/.test(stat)) { value = `The average ${col.name} is ${fmt(s.mean)}.`; label = 'mean'; }
    else if (/median/.test(stat)) { value = `The median ${col.name} is ${fmt(s.median)}.`; label = 'median'; }
    else if (/^min/.test(stat)) { value = `The minimum ${col.name} is ${fmt(s.min)}.`; label = 'min'; }
    else if (/^max/.test(stat)) { value = `The maximum ${col.name} is ${fmt(s.max)}.`; label = 'max'; }
    else if (/sum|total/.test(stat)) { value = `The total ${col.name} is ${fmt(s.sum)}.`; label = 'sum'; }
    else if (/std|standard deviation/.test(stat)) { value = `The standard deviation of ${col.name} is ${fmt(s.std)}.`; label = 'std'; }
    else if (/count/.test(stat)) { value = `${s.count} non-missing values in ${col.name}.`; label = 'count'; }
    else if (/range/.test(stat)) { value = `${col.name} ranges from ${fmt(s.min)} to ${fmt(s.max)}.`; label = 'range'; }
    else if (/q1/.test(stat)) { value = `Q1 (25th percentile) of ${col.name} is ${fmt(s.q1)}.`; label = 'Q1'; }
    else if (/q3/.test(stat)) { value = `Q3 (75th percentile) of ${col.name} is ${fmt(s.q3)}.`; label = 'Q3'; }
    return {
      text: `${value} For reference: mean ${fmt(s.mean)}, median ${fmt(s.median)}, min ${fmt(s.min)}, max ${fmt(s.max)}, std ${fmt(s.std)}.`,
      refs: [{ label: 'See column profile', view: 'overview' }],
    };
  }

  // "What columns" / schema
  if (/(what.*column|list.*column|which column|schema|fields|variables|what.*in.*(data|dataset)|column type)/.test(q)) {
    const lines = dataset.columnProfiles.map((c) => `• ${c.name} — ${c.type}${c.type === 'number' && c.mean !== undefined ? ` (mean ${fmt(c.mean)})` : ''}${c.missingCount > 0 ? `, ${fmtPct(c.missingPercent)} missing` : ''}`);
    return {
      text: `Your dataset has ${dataset.columnCount} columns:\n${lines.join('\n')}`,
      refs: [{ label: 'See column profiles', view: 'overview' }],
    };
  }

  // Rows / how many
  if (/(how many.*row|number of row|row count|size of|how big|how much data)/.test(q)) {
    return { text: `The dataset has ${dataset.rowCount.toLocaleString()} rows and ${dataset.columnCount} columns. That is ${dataset.rowCount * dataset.columnCount} total cells, of which ${dataset.totalMissing.toLocaleString()} (${fmtPct(dataset.totalMissingPercent)}) are missing.`, refs: [{ label: 'See overview', view: 'overview' }] };
  }

  // Detect anomalies for a specific column
  const colMatch = findColumn(dataset, q);
  if (colMatch && colMatch.type === 'number' && /(anomal|outlier|unusual|spike|extreme)/.test(q)) {
    const pts = detectAnomalies(dataset, colMatch.name);
    if (pts.length === 0) return { text: `No outliers found in ${colMatch.name} using z-scores.` };
    return { text: `${pts.length} outlier${pts.length === 1 ? '' : 's'} in ${colMatch.name}. Most extreme: ${fmtFull(pts[0].value)} (z = ${pts[0].zScore.toFixed(2)}, row ${pts[0].rowIndex + 1}).` };
  }

  // Specific column general description
  if (colMatch) {
    const c = colMatch;
    if (c.type === 'number') {
      const vals = dataset.rows.map((r) => toNumber(r[c.name])).filter((v): v is number => v !== null);
      const s = numericStats(vals);
      return {
        text: `"${c.name}" is a numeric column with ${s.count} values. Mean ${fmt(s.mean)}, median ${fmt(s.median)}, range ${fmt(s.min)}–${fmt(s.max)}, std ${fmt(s.std)}. ${c.missingCount > 0 ? `${fmtPct(c.missingPercent)} of values are missing.` : 'No missing values.'}`,
        refs: [{ label: 'See column profile', view: 'overview' }],
      };
    }
    if (c.type === 'date') {
      return { text: `"${c.name}" is a date column spanning ${c.minDate} to ${c.maxDate}, with ${c.uniqueCount} distinct values.`, refs: [{ label: 'See trend chart', view: 'charts' }] };
    }
    return {
      text: `"${c.name}" is a ${c.type} column with ${c.uniqueCount} unique values.${c.topValues?.length ? ` Most common: "${c.topValues[0].value}" (${c.topValues[0].percent.toFixed(0)}%).` : ''}${c.missingCount > 0 ? ` ${fmtPct(c.missingPercent)} missing.` : ''}`,
      refs: [{ label: 'See category chart', view: 'charts' }],
    };
  }

  // Fallback — not handled locally; caller should try the AI fallback.
  return {
    text: '',
    handled: false,
  };
}

export function answer(query: string, ctx: AgentContext): AgentAnswer {
  const result = answerLocal(query, ctx);
  // Every non-fallback return is considered handled unless explicitly false.
  if (result.handled === false) return result;
  return { ...result, handled: true };
}

/**
 * Builds a compact text summary of the computed analysis to send to the AI.
 * Contains column profiles, key stats, findings, correlations, anomalies,
 * and quality metrics — NOT raw CSV rows. Capped to stay well under token limits.
 */
export function buildDataSummary(ctx: AgentContext): string {
  const { dataset, correlations, anomalies, findings, story } = ctx;
  const lines: string[] = [];

  lines.push(`DATASET: "${dataset.name}"`);
  lines.push(`Rows: ${dataset.rowCount} | Columns: ${dataset.columnCount} | Missing cells: ${dataset.totalMissing} (${dataset.totalMissingPercent.toFixed(1)}%) | Duplicate rows: ${dataset.duplicateRowCount}`);
  lines.push('');

  lines.push('COLUMNS:');
  for (const c of dataset.columnProfiles) {
    let line = `- ${c.name} (${c.type}, ${c.uniqueCount} unique`;
    if (c.missingCount > 0) line += `, ${c.missingPercent.toFixed(1)}% missing`;
    line += ')';
    if (c.type === 'number' && c.mean !== undefined) {
      line += ` | min=${fmt(c.min ?? 0)} max=${fmt(c.max ?? 0)} mean=${fmt(c.mean)} median=${fmt(c.median ?? 0)} std=${fmt(c.std ?? 0)} sum=${fmt(c.sum ?? 0)}`;
    }
    if (c.type === 'date' && c.minDate) {
      line += ` | range=${c.minDate} to ${c.maxDate}`;
    }
    if (c.topValues && c.topValues.length > 0) {
      line += ` | top: ${c.topValues.slice(0, 4).map((t) => `${t.value}(${t.percent.toFixed(0)}%)`).join(', ')}`;
    }
    lines.push(line);
  }
  lines.push('');

  if (correlations.length > 0) {
    lines.push('CORRELATIONS:');
    for (const c of correlations.slice(0, 8)) {
      lines.push(`- ${c.colA} vs ${c.colB}: r=${c.value.toFixed(3)} (${c.strength} ${c.direction})`);
    }
    lines.push('');
  }

  if (anomalies.length > 0) {
    lines.push(`ANOMALIES (${anomalies.length} total):`);
    const byCol = new Map<string, typeof anomalies>();
    for (const a of anomalies) {
      const arr = byCol.get(a.column) ?? [];
      arr.push(a);
      byCol.set(a.column, arr);
    }
    for (const [col, pts] of Array.from(byCol.entries()).slice(0, 5)) {
      lines.push(`- ${col}: ${pts.length} outliers, most extreme=${fmtFull(pts[0].value)} (z=${pts[0].zScore.toFixed(2)}, row ${pts[0].rowIndex + 1})`);
    }
    lines.push('');
  }

  if (findings.length > 0) {
    lines.push('FINDINGS:');
    for (const f of findings.slice(0, 8)) {
      lines.push(`- [${f.category}, ${f.significance}] ${f.title}`);
      lines.push(`  Evidence: ${f.evidence}`);
    }
    lines.push('');
  }

  lines.push('EXECUTIVE SUMMARY:');
  lines.push(story.executiveSummary);

  if (story.recommendations.length > 0) {
    lines.push('');
    lines.push('RECOMMENDATIONS:');
    for (const r of story.recommendations.slice(0, 5)) {
      lines.push(`- ${r}`);
    }
  }

  return lines.join('\n');
}

export function buildSuggestions(ctx: AgentContext): string[] {
  const { dataset, correlations, anomalies } = ctx;
  const numericCols = dataset.columnProfiles.filter((p) => p.type === 'number');
  const dateCols = dataset.columnProfiles.filter((p) => p.type === 'date');
  const catCols = dataset.columnProfiles.filter((p) => p.type === 'string' && p.uniqueCount > 1 && p.uniqueCount <= 30);

  const suggestions: string[] = [];
  if (numericCols.length > 0) suggestions.push(`What is the average ${numericCols[0].name}?`);
  if (correlations.length > 0 && (correlations[0].strength === 'strong' || correlations[0].strength === 'moderate')) {
    suggestions.push(`Which columns are correlated?`);
  }
  if (dateCols.length > 0 && numericCols.length > 0) {
    suggestions.push(`How did ${numericCols[0].name} change over time?`);
  }
  if (anomalies.length > 0) suggestions.push(`What anomalies did you find?`);
  if (catCols.length > 0) suggestions.push(`What are the top ${catCols[0].name} values?`);
  suggestions.push(`What are the main findings?`);
  suggestions.push(`How clean is the data?`);

  return suggestions.slice(0, 5);
}
