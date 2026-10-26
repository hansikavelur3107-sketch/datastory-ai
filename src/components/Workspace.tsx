import { useMemo, useState } from 'react';
import {
  LayoutGrid,
  Table2,
  BarChart3,
  Lightbulb,
  FileText,
  FileBarChart,
  Download,
  Printer,
  ChevronLeft,
  Database,
  CircleAlert,
  Sparkles,
  Hash,
  Columns3,
  TableProperties,
  Copy,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react';
import type { Dataset, View, Finding, DataStory, Correlation, AnomalyPoint, ColumnProfile } from '@/lib/types';
import type { AgentContext } from '@/lib/agent';
import { Logo } from '@/components/Landing';
import { Badge, Card, cn } from '@/components/ui';
import { fmt, fmtFull, fmtPct, toNumber } from '@/lib/stats';
import { BarChartView, DonutChartView, HistogramView, LineChartView, ScatterChartView } from '@/components/charts';
import { AgentPanel } from '@/components/AgentPanel';

const NAV: { id: View; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'preview', label: 'Data preview', icon: Table2 },
  { id: 'charts', label: 'Charts', icon: BarChart3 },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
  { id: 'story', label: 'Data Story', icon: FileText },
  { id: 'report', label: 'Report', icon: FileBarChart },
];

export function Workspace({
  dataset,
  analysis,
  view,
  onView,
  onBack,
}: {
  dataset: Dataset;
  analysis: { correlations: Correlation[]; anomalies: AnomalyPoint[]; findings: Finding[]; story: DataStory };
  view: View;
  onView: (v: View) => void;
  onBack: () => void;
}) {
  const [mobileNav, setMobileNav] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);

  const agentCtx: AgentContext = {
    dataset,
    correlations: analysis.correlations,
    anomalies: analysis.anomalies,
    findings: analysis.findings,
    story: analysis.story,
  };

  return (
    <div className="flex min-h-screen bg-paper-50">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 transform border-r border-paper-300 bg-white transition-transform duration-300 lg:static lg:translate-x-0',
          mobileNav ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center border-b border-paper-300 px-5">
          <Logo />
        </div>
        <div className="px-3 py-4">
          <button
            onClick={onBack}
            className="mb-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-paper-100 hover:text-ink-900"
          >
            <ChevronLeft className="h-4 w-4" /> New analysis
          </button>
          <p className="px-3 pb-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ink-400">Analysis</p>
          <nav className="space-y-1">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => { onView(n.id); setMobileNav(false); }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  view === n.id
                    ? 'bg-indigo-50 text-indigo-700 shadow-soft'
                    : 'text-ink-600 hover:bg-paper-100 hover:text-ink-900',
                )}
              >
                <n.icon className={cn('h-[18px] w-[18px]', view === n.id ? 'text-indigo-600' : 'text-ink-400')} />
                {n.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0 border-t border-paper-300 bg-paper-50/60 p-4">
          <div className="flex items-center gap-2 rounded-lg border border-paper-300 bg-white px-3 py-2">
            <Database className="h-4 w-4 shrink-0 text-indigo-500" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-ink-800">{dataset.name}</p>
              <p className="text-[0.65rem] text-ink-500">{dataset.rowCount.toLocaleString()} rows · {dataset.columnCount} cols</p>
            </div>
          </div>
        </div>
      </aside>

      {mobileNav && <div className="fixed inset-0 z-30 bg-ink-900/30 lg:hidden" onClick={() => setMobileNav(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top nav */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-paper-300 bg-paper-50/90 px-5 backdrop-blur-md lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMobileNav((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-paper-300 bg-white text-ink-600 lg:hidden">
              <LayoutGrid className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-semibold text-ink-900">{dataset.name}</h1>
              <div className="flex items-center gap-2 text-xs text-ink-500">
                <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3 text-indigo-500" /> {analysis.findings.length} findings</span>
                <span className="text-paper-300">·</span>
                <span className="inline-flex items-center gap-1"><CircleAlert className="h-3 w-3 text-amber-500" /> {analysis.anomalies.length} anomalies</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAgentOpen(true)}
              className="btn-accent px-3.5 py-2 text-xs sm:px-4 sm:text-sm"
            >
              <Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">Ask the agent</span><span className="sm:hidden">Ask</span>
            </button>
            <Badge tone="teal" className="hidden md:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> Analysis ready</Badge>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden px-5 py-6 lg:px-8 lg:py-8">
          {view === 'overview' && <OverviewView dataset={dataset} analysis={analysis} onView={onView} />}
          {view === 'preview' && <PreviewView dataset={dataset} />}
          {view === 'charts' && <ChartsView dataset={dataset} analysis={analysis} />}
          {view === 'insights' && <InsightsView findings={analysis.findings} />}
          {view === 'story' && <StoryView story={analysis.story} dataset={dataset} />}
          {view === 'report' && <ReportView story={analysis.story} dataset={dataset} />}
        </main>
      </div>

      <AgentPanel
        open={agentOpen}
        onOpenChange={setAgentOpen}
        ctx={agentCtx}
        onView={onView}
      />
    </div>
  );
}

/* ---------------- Overview ---------------- */

function OverviewView({ dataset, analysis, onView }: { dataset: Dataset; analysis: { findings: Finding[]; anomalies: AnomalyPoint[]; correlations: Correlation[] }; onView: (v: View) => void }) {
  const kpis = [
    { label: 'Rows', value: dataset.rowCount.toLocaleString(), icon: Hash, tone: 'indigo' as const },
    { label: 'Columns', value: String(dataset.columnCount), icon: Columns3, tone: 'teal' as const },
    { label: 'Missing values', value: dataset.totalMissing.toLocaleString(), sub: fmtPct(dataset.totalMissingPercent), icon: CircleAlert, tone: dataset.totalMissingPercent > 10 ? 'amber' as const : 'neutral' as const },
    { label: 'Duplicate rows', value: dataset.duplicateRowCount.toLocaleString(), sub: fmtPct((dataset.duplicateRowCount / Math.max(1, dataset.rowCount)) * 100), icon: Copy, tone: dataset.duplicateRowCount > 0 ? 'amber' as const : 'neutral' as const },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-ink-500">{k.label}</p>
                <p className="mt-2 stat-number">{k.value}</p>
                {k.sub && <p className="mt-1 text-xs text-ink-500">{k.sub} of total</p>}
              </div>
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', toneBg(k.tone))}>
                <k.icon className={cn('h-5 w-5', toneText(k.tone))} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold text-ink-900">Column profiles</h3>
              <p className="text-sm text-ink-500">Inferred types and key statistics for every column.</p>
            </div>
            <Badge tone="neutral">{dataset.columnCount} columns</Badge>
          </div>
          <div className="mt-5 divide-y divide-paper-200">
            {dataset.columnProfiles.map((p) => (
              <ColumnRow key={p.name} profile={p} totalRows={dataset.rowCount} />
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-indigo-600" />
              <h3 className="font-display text-lg font-semibold text-ink-900">Top findings</h3>
            </div>
            <p className="mt-1 text-sm text-ink-500">Ranked by significance from your real data.</p>
            <ul className="mt-4 space-y-3">
              {analysis.findings.slice(0, 4).map((f) => (
                <li key={f.id} className="flex gap-3 rounded-xl border border-paper-200 bg-paper-50/50 p-3">
                  <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', sigBg(f.significance))}>
                    <span className={cn('h-2 w-2 rounded-full', sigDot(f.significance))} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900">{f.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-ink-600">{f.what}</p>
                  </div>
                </li>
              ))}
            </ul>
            <button onClick={() => onView('insights')} className="mt-4 w-full btn-ghost text-indigo-700 hover:bg-indigo-50">
              View all {analysis.findings.length} findings
            </button>
          </Card>

          {analysis.correlations.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-teal-600" />
                <h3 className="font-display text-lg font-semibold text-ink-900">Correlations</h3>
              </div>
              <ul className="mt-4 space-y-2">
                {analysis.correlations.slice(0, 5).map((c) => (
                  <li key={`${c.colA}-${c.colB}`} className="flex items-center justify-between rounded-lg border border-paper-200 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-800">{c.colA} ↔ {c.colB}</p>
                      <p className="text-xs text-ink-500">{c.strength} {c.direction}</p>
                    </div>
                    <span className={cn('font-mono text-sm font-semibold', c.value >= 0 ? 'text-teal-700' : 'text-rose-700')}>
                      {c.value >= 0 ? '+' : ''}{c.value.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ColumnRow({ profile, totalRows }: { profile: ColumnProfile; totalRows: number }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink-900">{profile.name}</p>
          <TypeBadge type={profile.type} />
        </div>
        <p className="mt-0.5 text-xs text-ink-500">
          {profile.type === 'number' && profile.mean !== undefined && (
            <>mean {fmt(profile.mean)} · range {fmt(profile.min ?? 0)}–{fmt(profile.max ?? 0)} · {profile.uniqueCount} unique</>
          )}
          {profile.type === 'string' && (
            <>{profile.uniqueCount} unique{profile.topValues?.length ? ` · top: "${profile.topValues[0].value}" (${profile.topValues[0].percent.toFixed(0)}%)` : ''}</>
          )}
          {profile.type === 'date' && <>{profile.minDate} → {profile.maxDate}</>}
          {profile.type === 'boolean' && <>{profile.uniqueCount} values</>}
          {profile.missingCount > 0 && <span className="text-amber-700"> · {fmtPct(profile.missingPercent)} missing</span>}
        </p>
      </div>
      <div className="hidden w-32 sm:block">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-200">
          <div
            className={cn('h-full rounded-full', profile.missingPercent > 20 ? 'bg-amber-500' : profile.missingPercent > 0 ? 'bg-amber-300' : 'bg-teal-400')}
            style={{ width: `${100 - profile.missingPercent}%` }}
          />
        </div>
        <p className="mt-1 text-right text-[0.65rem] text-ink-400">{((totalRows - profile.missingCount) / totalRows * 100).toFixed(0)}% complete</p>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: ColumnProfile['type'] }) {
  const map: Record<ColumnProfile['type'], { label: string; cls: string }> = {
    number: { label: 'number', cls: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
    string: { label: 'text', cls: 'border-paper-300 bg-paper-100 text-ink-600' },
    date: { label: 'date', cls: 'border-teal-200 bg-teal-50 text-teal-700' },
    boolean: { label: 'bool', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  };
  const m = map[type];
  return <span className={cn('chip', m.cls)}>{m.label}</span>;
}

/* ---------------- Data preview ---------------- */

function PreviewView({ dataset }: { dataset: Dataset }) {
  const [page, setPage] = useState(0);
  const perPage = 25;
  const pages = Math.ceil(dataset.rowCount / perPage);
  const rows = dataset.rows.slice(page * perPage, (page + 1) * perPage);

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-paper-300 px-5 py-3">
          <div className="flex items-center gap-2">
            <TableProperties className="h-4 w-4 text-ink-500" />
            <h3 className="font-display text-base font-semibold text-ink-900">Data preview</h3>
            <Badge tone="neutral">{dataset.rowCount.toLocaleString()} rows</Badge>
          </div>
          <p className="text-xs text-ink-500">Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, dataset.rowCount)}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-200 bg-paper-50/60">
                <th className="sticky left-0 z-10 bg-paper-50/60 px-3 py-2.5 text-left font-mono text-[0.7rem] font-semibold text-ink-400">#</th>
                {dataset.columns.map((c) => {
                  const p = dataset.columnProfiles.find((cp) => cp.name === c)!;
                  return (
                    <th key={c} className="px-3 py-2.5 text-left align-top">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-ink-800">{c}</span>
                        <TypeBadge type={p.type} />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200">
              {rows.map((r, i) => (
                <tr key={i} className="transition hover:bg-paper-50/60">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 font-mono text-[0.7rem] text-ink-400">{page * perPage + i + 1}</td>
                  {dataset.columns.map((c) => {
                    const v = r[c];
                    const isMissing = v === null || v === undefined || v === '';
                    return (
                      <td key={c} className={cn('max-w-[240px] truncate px-3 py-2', isMissing ? 'text-ink-300' : 'text-ink-700')}>
                        {isMissing ? <span className="italic">— missing —</span> : String(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-paper-300 px-5 py-3">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-outline px-3 py-1.5 text-xs">Previous</button>
            <p className="text-xs text-ink-500">Page {page + 1} of {pages}</p>
            <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} className="btn-outline px-3 py-1.5 text-xs">Next</button>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Charts ---------------- */

function ChartsView({ dataset, analysis }: { dataset: Dataset; analysis: { correlations: Correlation[] } }) {
  const numericCols = dataset.columnProfiles.filter((p) => p.type === 'number');
  const dateCols = dataset.columnProfiles.filter((p) => p.type === 'date');
  const catCols = dataset.columnProfiles.filter((p) => p.type === 'string' && p.uniqueCount > 1 && p.uniqueCount <= 30);

  const [numericCol, setNumericCol] = useState(numericCols[0]?.name ?? '');
  const [catCol, setCatCol] = useState(catCols[0]?.name ?? '');
  const [dateCol, setDateCol] = useState(dateCols[0]?.name ?? '');
  const [trendValueCol, setTrendValueCol] = useState(numericCols.find((n) => /sales|revenue|amount|total|count|price|value|score|rating/i.test(n.name))?.name ?? numericCols[0]?.name ?? '');

  const histData = useMemo(() => {
    if (!numericCol) return [];
    // distribution() is imported lazily to keep imports tidy
    return distributionData(dataset, numericCol, 12);
  }, [dataset, numericCol]);

  const catData = useMemo(() => {
    if (!catCol) return [];
    return categoryData(dataset, catCol, 10);
  }, [dataset, catCol]);

  const trendData = useMemo(() => {
    if (!dateCol || !trendValueCol) return [];
    return trendDataFor(dataset, dateCol, trendValueCol);
  }, [dataset, dateCol, trendValueCol]);

  const topCorr = analysis.correlations[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <ChartHeader title="Distribution" subtitle={`${numericCol || '—'} — histogram of binned values`} />
          {numericCols.length > 0 ? (
            <>
              <Select options={numericCols.map((c) => c.name)} value={numericCol} onChange={setNumericCol} />
              <div className="mt-4"><HistogramView data={histData} xKey="label" yKey="count" /></div>
            </>
          ) : <EmptyChart msg="No numeric columns to chart." />}
        </Card>

        <Card className="p-6">
          <ChartHeader title="Category breakdown" subtitle={`${catCol || '—'} — share of records`} />
          {catCols.length > 0 ? (
            <>
              <Select options={catCols.map((c) => c.name)} value={catCol} onChange={setCatCol} />
              <div className="mt-4">
                {catData.length > 0 ? (
                  <DonutChartView data={catData.map((d) => ({ name: d.value, value: d.count }))} />
                ) : <EmptyChart msg="No categorical data to display." />}
              </div>
            </>
          ) : <EmptyChart msg="No suitable categorical columns (≤30 unique values)." />}
        </Card>

        <Card className="p-6">
          <ChartHeader title="Time trend" subtitle={dateCol && trendValueCol ? `${trendValueCol} over ${dateCol}` : 'Select columns'} />
          {dateCols.length > 0 && numericCols.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-3">
                <Select options={dateCols.map((c) => c.name)} value={dateCol} onChange={setDateCol} label="Date" />
                <Select options={numericCols.map((c) => c.name)} value={trendValueCol} onChange={setTrendValueCol} label="Value" />
              </div>
              <div className="mt-4">
                {trendData.length > 1 ? (
                  <LineChartView data={trendData} xKey="label" yKey="value" />
                ) : <EmptyChart msg="Not enough time points to plot a trend." />}
              </div>
            </>
          ) : <EmptyChart msg="Need at least one date and one numeric column." />}
        </Card>

        <Card className="p-6">
          <ChartHeader title="Correlation" subtitle={topCorr ? `${topCorr.colA} vs ${topCorr.colB}` : 'No strong correlations'} />
          {topCorr ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <Badge tone={topCorr.value >= 0 ? 'teal' : 'rose'}>
                  {topCorr.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  r = {topCorr.value.toFixed(2)}
                </Badge>
                <span className="text-xs text-ink-500">{topCorr.strength} {topCorr.direction} relationship</span>
              </div>
              <ScatterChartView
                data={scatterData(dataset, topCorr.colA, topCorr.colB)}
                xLabel={topCorr.colA}
                yLabel={topCorr.colB}
              />
            </>
          ) : <EmptyChart msg="No numeric column pairs with enough paired values." />}
        </Card>
      </div>
    </div>
  );
}

function ChartHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3">
      <h3 className="font-display text-lg font-semibold text-ink-900">{title}</h3>
      <p className="text-sm text-ink-500">{subtitle}</p>
    </div>
  );
}

function Select({ options, value, onChange, label }: { options: string[]; value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-ink-400">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-paper-300 bg-white px-3 py-2 text-sm text-ink-800 shadow-soft focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function EmptyChart({ msg }: { msg: string }) {
  return (
    <div className="flex h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-paper-300 bg-paper-50/40 text-center">
      <Info className="h-6 w-6 text-ink-300" />
      <p className="mt-2 max-w-xs text-sm text-ink-500">{msg}</p>
    </div>
  );
}

/* ---------------- Insights ---------------- */

function InsightsView({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return <EmptyChart msg="No findings could be generated from this dataset. Try a file with more numeric or categorical columns." />;
  }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900">Insights</h2>
          <p className="text-sm text-ink-500">{findings.length} findings ranked by significance, each backed by real calculations.</p>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {findings.map((f, i) => (
          <FindingCard key={f.id} finding={f} index={i} />
        ))}
      </div>
    </div>
  );
}

function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  return (
    <Card className="flex flex-col p-6" elevated>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-ink-400">F{String(index + 1).padStart(2, '0')}</span>
          <Badge tone={catTone(finding.category)}>{finding.category}</Badge>
        </div>
        <Badge tone={sigTone(finding.significance)}>{finding.significance} significance</Badge>
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ink-900">{finding.title}</h3>

      <div className="mt-4 space-y-3 text-sm">
        <Field label="What we discovered">{finding.what}</Field>
        <Field label="Evidence">{finding.evidence}</Field>
        <Field label="Why it might matter">{finding.why}</Field>
      </div>

      {finding.metricRefs.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {finding.metricRefs.map((m) => (
            <div key={m.label} className="rounded-lg border border-paper-200 bg-paper-50/60 px-2.5 py-2">
              <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-ink-400">{m.label}</p>
              <p className="mt-0.5 font-display text-sm font-semibold text-ink-900">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {finding.chartData && finding.chartData.length > 0 && (
        <div className="mt-5 border-t border-paper-200 pt-4">
          {finding.chartKind === 'bar' && <BarChartView data={finding.chartData} xKey="label" yKey="value" height={220} title={finding.chartConfig?.title} />}
          {finding.chartKind === 'histogram' && <HistogramView data={finding.chartData} xKey="label" yKey="count" height={220} title={finding.chartConfig?.title} />}
          {finding.chartKind === 'line' && <LineChartView data={finding.chartData} xKey="label" yKey="value" height={220} title={finding.chartConfig?.title} />}
          {finding.chartKind === 'scatter' && (
            <ScatterChartView
              data={finding.chartData as { x: number; y: number }[]}
              xLabel={finding.chartConfig?.x}
              yLabel={finding.chartConfig?.y}
              height={220}
              title={finding.chartConfig?.title}
            />
          )}
          {finding.chartKind === 'donut' && (
            <DonutChartView data={finding.chartData as { name: string; value: number; fill?: string }[]} height={220} title={finding.chartConfig?.title} />
          )}
        </div>
      )}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-0.5 leading-relaxed text-ink-700">{children}</p>
    </div>
  );
}

/* ---------------- Data Story ---------------- */

function StoryView({ story, dataset }: { story: DataStory; dataset: Dataset }) {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div className="text-center">
        <span className="eyebrow justify-center">The Data Story</span>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-900">{dataset.name}</h2>
        <p className="mt-2 text-sm text-ink-500">An analyst's briefing, generated from your data.</p>
      </div>

      <Card className="p-8" elevated>
        <p className="eyebrow">Executive summary</p>
        <p className="mt-3 text-[1.05rem] leading-[1.75] text-ink-700">{story.executiveSummary}</p>
      </Card>

      <div>
        <p className="eyebrow">Findings</p>
        <h3 className="mt-2 font-display text-2xl font-semibold text-ink-900">What the data shows</h3>
        <div className="mt-6 space-y-8">
          {story.findings.map((f, i) => (
            <article key={f.id} className="relative pl-10">
              <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-display text-sm font-semibold text-white shadow-soft">
                {i + 1}
              </div>
              <h4 className="font-display text-xl font-semibold text-ink-900">{f.title}</h4>
              <div className="mt-3 space-y-2.5 text-[0.95rem] leading-relaxed text-ink-700">
                <p><span className="font-semibold text-ink-900">What we discovered: </span>{f.what}</p>
                <p><span className="font-semibold text-ink-900">Evidence: </span>{f.evidence}</p>
                <p><span className="font-semibold text-ink-900">Why it might matter: </span>{f.why}</p>
              </div>
              {f.metricRefs.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {f.metricRefs.map((m) => (
                    <span key={m.label} className="chip border-paper-300 bg-paper-100 text-ink-700">
                      <span className="text-ink-400">{m.label}</span>
                      <span className="font-semibold">{m.value}</span>
                    </span>
                  ))}
                </div>
              )}
              {f.chartData && f.chartData.length > 0 && (
                <div className="mt-5 surface p-5">
                  {f.chartKind === 'bar' && <BarChartView data={f.chartData} xKey="label" yKey="value" height={240} title={f.chartConfig?.title} />}
                  {f.chartKind === 'histogram' && <HistogramView data={f.chartData} xKey="label" yKey="count" height={240} title={f.chartConfig?.title} />}
                  {f.chartKind === 'line' && <LineChartView data={f.chartData} xKey="label" yKey="value" height={240} title={f.chartConfig?.title} />}
                  {f.chartKind === 'scatter' && (
                    <ScatterChartView data={f.chartData as { x: number; y: number }[]} xLabel={f.chartConfig?.x} yLabel={f.chartConfig?.y} height={240} title={f.chartConfig?.title} />
                  )}
                  {f.chartKind === 'donut' && (
                    <DonutChartView data={f.chartData as { name: string; value: number; fill?: string }[]} height={240} title={f.chartConfig?.title} />
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="p-6">
          <p className="eyebrow">Recommendations</p>
          <ul className="mt-3 space-y-2.5">
            {story.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                {r}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <p className="eyebrow">Limitations & caveats</p>
          <ul className="mt-3 space-y-2.5">
            {story.limitations.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-600">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                {r}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-6">
        <p className="eyebrow">Methods</p>
        <ul className="mt-3 space-y-2">
          {story.methods.map((m, i) => (
            <li key={i} className="flex gap-2.5 text-xs leading-relaxed text-ink-600">
              <span className="font-mono text-ink-400">{String(i + 1).padStart(2, '0')}</span>
              {m}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ---------------- Report ---------------- */

function ReportView({ story, dataset }: { story: DataStory; dataset: Dataset }) {
  const handlePrint = () => window.print();
  const handleDownload = () => downloadReport(story, dataset);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="no-print flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900">Report preview</h2>
          <p className="text-sm text-ink-500">Print or download a readable briefing of your analysis.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="btn-outline"><Printer className="h-4 w-4" /> Print</button>
          <button onClick={handleDownload} className="btn-accent"><Download className="h-4 w-4" /> Download</button>
        </div>
      </div>

      <Card className="p-8 lg:p-12" elevated>
        <div className="border-b border-paper-300 pb-6">
          <p className="eyebrow">DataStory AI · Analytical Report</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-900">{dataset.name}</h2>
          <p className="mt-1 text-sm text-ink-500">
            {dataset.rowCount.toLocaleString()} rows · {dataset.columnCount} columns · generated {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <section className="mt-6">
          <h3 className="font-display text-lg font-semibold text-ink-900">Executive summary</h3>
          <p className="mt-2 text-[0.95rem] leading-[1.7] text-ink-700">{story.executiveSummary}</p>
        </section>

        <section className="mt-8">
          <h3 className="font-display text-lg font-semibold text-ink-900">Findings</h3>
          <div className="mt-4 space-y-6">
            {story.findings.map((f, i) => (
              <div key={f.id} className="border-l-2 border-indigo-300 pl-5">
                <p className="font-mono text-xs font-semibold text-indigo-500">Finding {i + 1} · {f.category}</p>
                <h4 className="mt-1 font-display text-base font-semibold text-ink-900">{f.title}</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{f.what}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600"><span className="font-semibold text-ink-800">Evidence: </span>{f.evidence}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600"><span className="font-semibold text-ink-800">Why it matters: </span>{f.why}</p>
                {f.metricRefs.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                    {f.metricRefs.map((m) => (<span key={m.label}><span className="font-semibold text-ink-700">{m.label}:</span> {m.value}</span>))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 sm:grid-cols-2 print-break">
          <div>
            <h3 className="font-display text-base font-semibold text-ink-900">Recommendations</h3>
            <ul className="mt-2 space-y-1.5">
              {story.recommendations.map((r, i) => (<li key={i} className="text-sm text-ink-700">• {r}</li>))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-ink-900">Limitations</h3>
            <ul className="mt-2 space-y-1.5">
              {story.limitations.map((r, i) => (<li key={i} className="text-sm text-ink-600">• {r}</li>))}
            </ul>
          </div>
        </section>

        <section className="mt-8 border-t border-paper-300 pt-6">
          <h3 className="font-display text-sm font-semibold text-ink-900">Methods</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-ink-600">
            {story.methods.map((m, i) => (<li key={i}>{m}</li>))}
          </ol>
        </section>
      </Card>
    </div>
  );
}

function downloadReport(story: DataStory, dataset: Dataset) {
  const lines: string[] = [];
  lines.push(`# DataStory AI — Analytical Report`);
  lines.push(`# Dataset: ${dataset.name}`);
  lines.push(`# ${dataset.rowCount.toLocaleString()} rows · ${dataset.columnCount} columns · generated ${new Date().toLocaleString()}`);
  lines.push('');
  lines.push('## Executive summary');
  lines.push(story.executiveSummary);
  lines.push('');
  lines.push('## Findings');
  story.findings.forEach((f, i) => {
    lines.push(`### Finding ${i + 1} — ${f.title}`);
    lines.push(`Category: ${f.category} · Significance: ${f.significance}`);
    lines.push(`What: ${f.what}`);
    lines.push(`Evidence: ${f.evidence}`);
    lines.push(`Why it matters: ${f.why}`);
    if (f.metricRefs.length) lines.push(`Metrics: ${f.metricRefs.map((m) => `${m.label}=${m.value}`).join(', ')}`);
    lines.push('');
  });
  lines.push('## Recommendations');
  story.recommendations.forEach((r) => lines.push(`- ${r}`));
  lines.push('');
  lines.push('## Limitations & caveats');
  story.limitations.forEach((r) => lines.push(`- ${r}`));
  lines.push('');
  lines.push('## Methods');
  story.methods.forEach((m, i) => lines.push(`${i + 1}. ${m}`));
  lines.push('');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${dataset.name.replace(/\.[^.]+$/, '')}-data-story.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------------- Helpers ---------------- */

function toneBg(t: 'indigo' | 'teal' | 'amber' | 'neutral') {
  return { indigo: 'bg-indigo-50', teal: 'bg-teal-50', amber: 'bg-amber-50', neutral: 'bg-paper-100' }[t];
}
function toneText(t: 'indigo' | 'teal' | 'amber' | 'neutral') {
  return { indigo: 'text-indigo-600', teal: 'text-teal-600', amber: 'text-amber-600', neutral: 'text-ink-500' }[t];
}
function sigBg(s: Finding['significance']) {
  return { high: 'bg-rose-100', medium: 'bg-amber-100', low: 'bg-paper-200' }[s];
}
function sigDot(s: Finding['significance']) {
  return { high: 'bg-rose-500', medium: 'bg-amber-500', low: 'bg-ink-400' }[s];
}
function sigTone(s: Finding['significance']): 'rose' | 'amber' | 'neutral' {
  return s === 'high' ? 'rose' : s === 'medium' ? 'amber' : 'neutral';
}
function catTone(c: Finding['category']): 'indigo' | 'teal' | 'amber' | 'rose' | 'neutral' {
  if (c === 'anomaly' || c === 'quality') return 'amber';
  if (c === 'correlation') return 'teal';
  if (c === 'trend') return 'indigo';
  if (c === 'composition') return 'rose';
  return 'neutral';
}

// Local chart-data builders (avoid circular imports with insights.ts)
function distributionData(dataset: Dataset, col: string, bins = 12) {
  const values = dataset.rows.map((r) => toNumber(r[col])).filter((v): v is number => v !== null);
  if (values.length === 0) return [];
  const min = Math.min(...values), max = Math.max(...values);
  if (min === max) return [{ label: fmt(min), count: values.length }];
  const width = (max - min) / bins;
  const out: { label: string; count: number }[] = [];
  for (let i = 0; i < bins; i++) {
    const lo = min + i * width, hi = i === bins - 1 ? max : lo + width;
    const count = values.filter((v) => v >= lo && (i === bins - 1 ? v <= hi : v < hi)).length;
    out.push({ label: `${fmt(lo)}–${fmt(hi)}`, count });
  }
  return out;
}
function categoryData(dataset: Dataset, col: string, limit = 10) {
  const counts = new Map<string, number>();
  let total = 0;
  for (const r of dataset.rows) {
    const v = r[col]; if (v === null || v === undefined || v === '') continue;
    const k = String(v); counts.set(k, (counts.get(k) ?? 0) + 1); total++;
  }
  return Array.from(counts.entries()).map(([value, count]) => ({ value, count, percent: total ? (count / total) * 100 : 0 })).sort((a, b) => b.count - a.count).slice(0, limit);
}
function trendDataFor(dataset: Dataset, dateCol: string, valueCol: string) {
  const pts: { date: Date; value: number }[] = [];
  for (const r of dataset.rows) {
    const d = new Date(String(r[dateCol])); if (isNaN(d.getTime())) continue;
    const v = toNumber(r[valueCol]); if (v === null) continue;
    pts.push({ date: d, value: v });
  }
  pts.sort((a, b) => a.date.getTime() - b.date.getTime());
  const span = pts.length ? pts[pts.length - 1].date.getTime() - pts[0].date.getTime() : 0;
  const days = span / 86400000;
  const g: 'day' | 'week' | 'month' | 'quarter' | 'year' = days > 365 * 3 ? 'year' : days > 365 * 1.5 ? 'quarter' : days > 90 ? 'month' : days > 21 ? 'week' : 'day';
  const map = new Map<string, { sum: number; count: number }>();
  for (const p of pts) {
    const d = p.date;
    const key = g === 'day' ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      : g === 'week' ? `${d.getFullYear()}-W${week(d)}`
      : g === 'month' ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
      : g === 'quarter' ? `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`
      : `${d.getFullYear()}`;
    const e = map.get(key) ?? { sum: 0, count: 0 }; e.sum += p.value; e.count++; map.set(key, e);
  }
  return Array.from(map.entries()).map(([label, e]) => ({ label, value: e.sum / e.count }));
}
function pad(n: number) { return n < 10 ? `0${n}` : String(n); }
function week(d: Date) { const s = new Date(d.getFullYear(), 0, 1); return Math.floor(((d.getTime() - s.getTime()) / 86400000 + s.getDay() + 1) / 7) || 1; }
function scatterData(dataset: Dataset, a: string, b: string, max = 250) {
  const out: { x: number; y: number }[] = [];
  const step = Math.max(1, Math.floor(dataset.rowCount / max));
  dataset.rows.forEach((r, i) => {
    if (i % step !== 0) return;
    const va = toNumber(r[a]), vb = toNumber(r[b]);
    if (va !== null && vb !== null) out.push({ x: va, y: vb });
  });
  return out;
}
