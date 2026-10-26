import { useState } from 'react';
import {
  ArrowRight,
  Sparkles,
  Upload,
  Search,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  FileText,
  LineChart as LineChartIcon,
  ShieldCheck,
  Lightbulb,
  Github,
  Twitter,
  Linkedin,
} from 'lucide-react';
import { UploadDropzone } from '@/components/UploadDropzone';
import { Badge } from '@/components/ui';
import { BarChartView, DonutChartView } from '@/components/charts';
import { SAMPLE_CSV } from '@/lib/sampleData';

const previewChart = [
  { label: 'Jan', value: 4280 },
  { label: 'Feb', value: 5210 },
  { label: 'Mar', value: 6190 },
  { label: 'Apr', value: 7320 },
  { label: 'May', value: 8410 },
  { label: 'Jun', value: 9650 },
];
const previewDonut = [
  { name: 'Electronics', value: 58, fill: '#4f5ef5' },
  { name: 'Home', value: 22, fill: '#139e83' },
  { name: 'Office', value: 20, fill: '#e2830a' },
];

export function Landing({
  onFile,
  onDemo,
  loading,
  error,
}: {
  onFile: (file: File) => void;
  onDemo: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper-50">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-paper-300/70 bg-paper-50/85 backdrop-blur-md">
        <div className="container-editorial flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#how" className="text-sm font-medium text-ink-600 transition hover:text-ink-900">How it works</a>
            <a href="#features" className="text-sm font-medium text-ink-600 transition hover:text-ink-900">Features</a>
            <a href="#story" className="text-sm font-medium text-ink-600 transition hover:text-ink-900">Data Story</a>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={onDemo} className="btn-ghost hidden sm:inline-flex">Live demo</button>
            <a href="#upload" className="btn-accent">
              <Sparkles className="h-4 w-4" /> Get started
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-radial">
        <div className="absolute inset-0 bg-paper-grain [background-size:18px_18px] opacity-60" />
        <div className="container-editorial relative grid gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="flex flex-col justify-center">
            <span className="eyebrow animate-fade-up">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
              Editorial Intelligence for your data
            </span>
            <h1 className="mt-5 animate-fade-up font-display text-5xl font-semibold leading-[1.05] tracking-tightest text-ink-900 sm:text-6xl lg:text-7xl" style={{ animationDelay: '60ms' }}>
              Your data has a story.
              <br />
              <span className="text-indigo-600">Let's find it.</span>
            </h1>
            <p className="mt-6 max-w-xl animate-fade-up text-pretty text-lg leading-relaxed text-ink-600" style={{ animationDelay: '120ms' }}>
              DataStory AI turns messy spreadsheets into clear, interactive, evidence-backed briefings.
              Upload a CSV and get descriptive statistics, charts, anomaly detection, and a readable analyst's report — in seconds.
            </p>
            <div className="mt-8 flex animate-fade-up flex-wrap items-center gap-3" style={{ animationDelay: '180ms' }}>
              <a href="#upload" className="btn-accent">
                <Upload className="h-4 w-4" /> Upload your CSV
              </a>
              <button onClick={onDemo} className="btn-outline">
                <LineChartIcon className="h-4 w-4" /> Explore a live demo
                <ArrowRight className="h-4 w-4 opacity-60" />
              </button>
            </div>
            <div className="mt-8 flex animate-fade-up flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-500" style={{ animationDelay: '240ms' }}>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-teal-600" /> Analyzed locally in your browser</span>
              <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-indigo-600" /> No account required</span>
            </div>
          </div>

          {/* Preview card */}
          <div className="relative animate-scale-in" style={{ animationDelay: '200ms' }}>
            <div className="surface-elevated overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-paper-300 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-300" />
                </div>
                <Badge tone="indigo"><Sparkles className="h-3 w-3" /> Sample insight</Badge>
              </div>
              <div className="p-5">
                <p className="font-display text-lg font-semibold text-ink-900">Revenue rose 126% across the period</p>
                <p className="mt-1 text-sm text-ink-600">
                  Monthly revenue increased steadily from Jan to Jun, with Electronics driving the majority of growth.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-[1.4fr_1fr]">
                  <BarChartView data={previewChart} xKey="label" yKey="value" color="#4f5ef5" height={180} />
                  <DonutChartView data={previewDonut} height={180} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { k: 'Rows', v: '128' },
                    { k: 'Columns', v: '10' },
                    { k: 'Findings', v: '6' },
                  ].map((s) => (
                    <div key={s.k} className="rounded-xl border border-paper-300 bg-paper-50 px-3 py-2.5">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-ink-500">{s.k}</p>
                      <p className="font-display text-xl font-semibold text-ink-900">{s.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-200/40 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-teal-200/40 blur-2xl" />
          </div>
        </div>
      </section>

      {/* Upload + 3-step */}
      <section id="upload" className="container-editorial py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <span className="eyebrow">Start now</span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              Bring your spreadsheet. Leave with a story.
            </h2>
            <p className="mt-4 max-w-lg text-pretty text-ink-600">
              Drop a CSV and we'll infer column types, compute statistics, surface anomalies, and write it up as a briefing you can actually read.
            </p>
            <div className="mt-8">
              <UploadDropzone onFile={onFile} loading={loading} error={error} />
              <div className="mt-4 flex items-center justify-between gap-3">
                <button onClick={onDemo} className="btn-ghost text-indigo-700 hover:bg-indigo-50">
                  No file handy? Load the sample dataset <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div id="how" className="flex flex-col gap-4">
            {[
              { icon: Upload, n: '01', t: 'Upload', d: "Drop a CSV with headers. We parse it locally and infer each column's type — number, date, category, or text." },
              { icon: Search, n: '02', t: 'Discover', d: 'Descriptive statistics, distributions, correlations, time trends, and anomaly detection run automatically across your real data.' },
              { icon: CheckCircle2, n: '03', t: 'Decide', d: 'Read a structured data story: what was found, the evidence behind it, why it matters, and what to do next.' },
            ].map((s, i) => (
              <div key={s.n} className="surface flex gap-4 p-5 animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-indigo-500">{s.n}</span>
                    <h3 className="font-display text-lg font-semibold text-ink-900">{s.t}</h3>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-paper-300 bg-white/60">
        <div className="container-editorial py-16 lg:py-24">
          <div className="max-w-2xl">
            <span className="eyebrow">What you get</span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              An analyst's toolkit, automated.
            </h2>
            <p className="mt-4 text-ink-600">
              Every figure is computed from your actual data — no placeholder metrics, no invented findings.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BarChart3, t: 'Automatic analysis', d: 'Descriptive statistics, category distributions, and numeric summaries for every column — typed and computed the moment you upload.' },
              { icon: AlertTriangle, t: 'Anomaly detection', d: 'Outliers are flagged with z-scores and severity ratings so you can spot data errors or genuine spikes before they skew conclusions.' },
              { icon: TrendingUp, t: 'Interactive charts', d: 'Bar, line, scatter, histogram, and donut charts with tooltips, consistent colors, and meaningful labels.' },
              { icon: FileText, t: 'Evidence-backed reports', d: 'A readable data story with findings, supporting evidence, recommendations, and limitations — ready to print or download.' },
            ].map((f) => (
              <div key={f.t} className="surface group p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-paper-100 text-indigo-600 transition group-hover:from-indigo-100 group-hover:to-indigo-50">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-ink-900">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Story preview */}
      <section id="story" className="container-editorial py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="eyebrow">The signature feature</span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              A briefing, not a wall of text.
            </h2>
            <p className="mt-4 text-ink-600">
              Each finding answers three questions: <strong className="text-ink-800">What did we discover?</strong>{' '}
              <strong className="text-ink-800">What evidence supports it?</strong>{' '}
              <strong className="text-ink-800">Why might it matter?</strong>
            </p>
            <ul className="mt-6 space-y-3">
              {[
                { icon: FileText, t: 'Executive summary', d: 'A plain-English overview of the dataset and its headline patterns.' },
                { icon: Lightbulb, t: '3–5 meaningful findings', d: 'Ranked by significance, each tied to real calculations.' },
                { icon: CheckCircle2, t: 'Practical recommendations', d: 'Next steps grounded in the evidence, not generic advice.' },
                { icon: AlertTriangle, t: 'Limitations & caveats', d: 'Honest about what the analysis can and cannot tell you.' },
              ].map((x) => (
                <li key={x.t} className="flex gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <x.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink-900">{x.t}</p>
                    <p className="text-sm text-ink-600">{x.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface-elevated overflow-hidden">
            <div className="border-b border-paper-300 bg-paper-50/60 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="font-display text-base font-semibold text-ink-900">Data Story — sample_dataset.csv</p>
                <Badge tone="teal"><CheckCircle2 className="h-3 w-3" /> Ready</Badge>
              </div>
            </div>
            <div className="max-h-[420px] space-y-5 overflow-y-auto p-6">
              <div>
                <p className="eyebrow">Executive summary</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">
                  This dataset contains 128 records across 10 columns. Revenue rose steadily month over month, driven primarily by Electronics. Six findings are summarized below.
                </p>
              </div>
              <div className="divider" />
              <div>
                <p className="eyebrow">Finding 1 — Trend</p>
                <p className="mt-1.5 font-display text-base font-semibold text-ink-900">Revenue rose 126% over six months</p>
                <p className="mt-1 text-sm text-ink-600"><strong className="text-ink-800">Evidence:</strong> average monthly revenue increased from 4,280 to 9,650.</p>
                <p className="mt-1 text-sm text-ink-600"><strong className="text-ink-800">Why it matters:</strong> a sustained upward trend may reflect growing demand worth doubling down on.</p>
              </div>
              <div className="divider" />
              <div>
                <p className="eyebrow">Finding 2 — Correlation</p>
                <p className="mt-1.5 font-display text-base font-semibold text-ink-900">Units sold and revenue move together</p>
                <p className="mt-1 text-sm text-ink-600"><strong className="text-ink-800">Evidence:</strong> Pearson r = 0.98, a strong positive relationship.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-y border-paper-300 bg-ink-900 text-white">
        <div className="container-editorial flex flex-col items-center gap-6 py-16 text-center lg:py-20">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Turn your next spreadsheet into a decision.
          </h2>
          <p className="max-w-xl text-ink-300">
            No sign-up, no setup. Upload a CSV or load the sample dataset and see your data story in seconds.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="#upload" className="btn-accent"><Upload className="h-4 w-4" /> Upload a CSV</a>
            <button onClick={onDemo} className="btn border border-ink-600 bg-transparent px-5 py-3 text-white hover:bg-ink-800">
              <LineChartIcon className="h-4 w-4" /> Try the live demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-paper-100">
        <div className="container-editorial py-12">
          <div className="flex flex-col justify-between gap-8 md:flex-row">
            <div className="max-w-sm">
              <Logo />
              <p className="mt-4 text-sm text-ink-600">
                DataStory AI transforms messy spreadsheets into clear, evidence-backed data stories — so ordinary people can make better decisions.
              </p>
              <div className="mt-4 flex gap-3">
                {[Twitter, Github, Linkedin].map((Icon, i) => (
                  <a key={i} href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-paper-300 bg-white text-ink-600 transition hover:border-indigo-300 hover:text-indigo-600" aria-label="social link">
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              {[
                { h: 'Product', links: ['How it works', 'Features', 'Data Story', 'Live demo'] },
                { h: 'Resources', links: ['Sample dataset', 'Methods', 'Documentation', 'Changelog'] },
                { h: 'Company', links: ['About', 'Privacy', 'Terms', 'Contact'] },
              ].map((col) => (
                <div key={col.h}>
                  <p className="font-display text-sm font-semibold text-ink-900">{col.h}</p>
                  <ul className="mt-3 space-y-2">
                    {col.links.map((l) => (
                      <li key={l}><a href="#" className="text-sm text-ink-600 transition hover:text-ink-900">{l}</a></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-paper-300 pt-6 text-sm text-ink-500 sm:flex-row">
            <p>© {new Date().getFullYear()} DataStory AI. Editorial Intelligence.</p>
            <p className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-teal-600" /> Your data stays in your browser.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900 text-white shadow-soft">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-600/30 to-teal-500/20" />
        <span className="relative font-display text-lg font-bold">D</span>
      </div>
      <div className="leading-none">
        <p className={`font-display text-lg font-semibold tracking-tight ${light ? 'text-white' : 'text-ink-900'}`}>DataStory<span className="text-indigo-500"> AI</span></p>
        <p className={`mt-0.5 text-[0.65rem] font-medium uppercase tracking-[0.18em] ${light ? 'text-ink-300' : 'text-ink-500'}`}>Editorial Intelligence</p>
      </div>
    </div>
  );
}
