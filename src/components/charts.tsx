import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  ReferenceLine,
} from 'recharts';
import { fmt, fmtFull } from '@/lib/stats';

const AXIS = { fontSize: 11, fill: '#5a6aae' as const, fontFamily: 'Inter, system-ui, sans-serif' };
const GRID = 'rgba(11,20,55,0.08)';

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #ded8c8',
  background: '#ffffff',
  fontSize: 12,
  fontFamily: 'Inter, system-ui, sans-serif',
  boxShadow: '0 8px 24px -12px rgba(11,20,55,0.25)',
  padding: '8px 12px',
  color: '#0b1437',
} as const;

interface BaseProps {
  height?: number;
  title?: string;
  subtitle?: string;
}

export function BarChartView({
  data,
  xKey,
  yKey,
  color = '#4f5ef5',
  height = 280,
  horizontal = false,
  title,
  subtitle,
}: BaseProps & {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  horizontal?: boolean;
}) {
  return (
    <ChartFrame title={title} subtitle={subtitle} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke={GRID} vertical={!horizontal} horizontal={horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tick={AXIS} stroke={GRID} />
              <YAxis type="category" dataKey={xKey} tick={AXIS} stroke={GRID} width={110} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={AXIS} stroke={GRID} tickLine={false} axisLine={false} interval={0} angle={data.length > 8 ? -25 : 0} textAnchor={data.length > 8 ? 'end' : 'middle'} height={data.length > 8 ? 50 : 30} />
              <YAxis tick={AXIS} stroke={GRID} tickLine={false} axisLine={false} />
            </>
          )}
          <Tooltip cursor={{ fill: 'rgba(79,94,245,0.06)' }} contentStyle={tooltipStyle} />
          <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function HistogramView({
  data,
  xKey,
  yKey,
  color = '#4f5ef5',
  height = 280,
  title,
  subtitle,
}: BaseProps & {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
}) {
  return (
    <ChartFrame title={title} subtitle={subtitle} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS} stroke={GRID} tickLine={false} axisLine={false} angle={data.length > 8 ? -25 : 0} textAnchor={data.length > 8 ? 'end' : 'middle'} height={data.length > 8 ? 60 : 30} />
          <YAxis tick={AXIS} stroke={GRID} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: 'rgba(79,94,245,0.06)' }} contentStyle={tooltipStyle} />
          <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={56} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function LineChartView({
  data,
  xKey,
  yKey,
  color = '#4f5ef5',
  height = 280,
  title,
  subtitle,
  showMean,
  meanValue,
}: BaseProps & {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  showMean?: boolean;
  meanValue?: number;
}) {
  return (
    <ChartFrame title={title} subtitle={subtitle} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <defs>
            <linearGradient id={`grad-${yKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS} stroke={GRID} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} stroke={GRID} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(Number(v))} />
          <Tooltip cursor={{ stroke: color, strokeDasharray: '4 4' }} contentStyle={tooltipStyle} />
          {showMean && meanValue !== undefined && (
            <ReferenceLine y={meanValue} stroke="#139e83" strokeDasharray="6 4" label={{ value: 'mean', fill: '#139e83', fontSize: 10, position: 'right' }} />
          )}
          <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function ScatterChartView({
  data,
  xKey = 'x',
  yKey = 'y',
  color = '#4f5ef5',
  height = 280,
  title,
  subtitle,
  xLabel,
  yLabel,
}: BaseProps & {
  data: Record<string, unknown>[];
  xKey?: string;
  yKey?: string;
  color?: string;
  xLabel?: string;
  yLabel?: string;
}) {
  return (
    <ChartFrame title={title} subtitle={subtitle} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke={GRID} />
          <XAxis type="number" dataKey={xKey} name={xLabel} tick={AXIS} stroke={GRID} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(Number(v))} />
          <YAxis type="number" dataKey={yKey} name={yLabel} tick={AXIS} stroke={GRID} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(Number(v))} />
          <ZAxis range={[60, 60]} />
          <Tooltip cursor={{ strokeDasharray: '4 4', stroke: GRID }} contentStyle={tooltipStyle} formatter={(val) => fmtFull(Number(val))} />
          <Scatter data={data} fill={color} fillOpacity={0.55} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function DonutChartView({
  data,
  height = 280,
  title,
  subtitle,
}: BaseProps & {
  data: { name: string; value: number; fill?: string }[];
}) {
  const colors = ['#4f5ef5', '#139e83', '#e2830a', '#c52e34', '#2b3d83', '#5a6aae', '#2bba9d', '#f7a11f'];
  return (
    <ChartFrame title={title} subtitle={subtitle} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={2} stroke="white" strokeWidth={2}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={d.fill ?? colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(val, name) => [`${fmtFull(Number(val))} (${((Number(val) / data.reduce((s, d) => s + d.value, 0)) * 100).toFixed(1)}%)`, name]} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: '#5a6aae' }} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function ChartFrame({
  children,
  title,
  subtitle,
  height = 280,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  height?: number;
}) {
  return (
    <div className="flex flex-col">
      {(title || subtitle) && (
        <div className="mb-3 flex flex-col gap-0.5">
          {title && <h4 className="font-display text-base font-semibold text-ink-900">{title}</h4>}
          {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
        </div>
      )}
      <div style={{ height }}>{children}</div>
    </div>
  );
}
