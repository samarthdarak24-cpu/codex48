/**
 * Chart primitives — Recharts, dressed in the Precedent palette.
 *
 * Why these exist: every v2 chart used to be a hand-rolled SVG with no
 * tooltip, no axis and no keyboard affordance. Recharts gives us hover
 * read-outs, responsive resizing and real axis labelling for the same
 * numbers the API already returns. We deliberately do **not** invent a
 * series here — callers pass the exact rows from `/analytics` and
 * `/analytics/trends`, and render their own empty state when a series is
 * empty.
 *
 * Colour discipline: Recharts defaults to blue/purple. Every colour below
 * is an explicit token hex from `tailwind.config.js`, so no default ever
 * leaks into the product.
 */
import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

export const CHART = {
  brand: '#4E7A3D',
  brandSoft: '#74975F',
  sage: '#7A9064',
  olive: '#6B7350',
  terracotta: '#C2664A',
  amber: '#DDA22B',
  danger: '#C25446',
  grid: '#F0EBDF',
  axis: '#948E7E',
  target: '#DAD2C0',
  ink: '#23282A',
  surface: '#FFFFFF',
} as const;

const TONE_HEX: Record<string, string> = {
  brand: CHART.brand,
  sage: CHART.sage,
  olive: CHART.olive,
  terracotta: CHART.terracotta,
  amber: CHART.amber,
  danger: CHART.danger,
};

const hexFor = (tone?: string): string => TONE_HEX[tone ?? 'brand'] ?? CHART.brand;

/* ------------------------------------------------------------------ */
/* Shared tooltip                                                      */
/* ------------------------------------------------------------------ */

type TooltipRow = { name?: string; value?: number | string; color?: string; dataKey?: string };

const ChartTooltip: React.FC<{
  active?: boolean;
  payload?: TooltipRow[];
  label?: string | number;
  unit?: string;
}> = ({ active, payload, label, unit }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="pointer-events-none rounded-xl border border-line bg-white px-3 py-2 shadow-pop">
      {label !== undefined && (
        <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted-light">{label}</p>
      )}
      <ul className="mt-1 space-y-0.5">
        {payload.map((row, i) => (
          <li key={`${row.dataKey ?? row.name ?? i}`} className="flex items-center gap-2 text-xs">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: row.color ?? CHART.brand }}
            />
            <span className="text-muted">{row.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-ink">
              {row.value}
              {unit ?? ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const axisProps = {
  stroke: CHART.axis,
  tick: { fill: CHART.axis, fontSize: 10 },
  tickLine: false,
  axisLine: false,
} as const;

/* ------------------------------------------------------------------ */
/* Trend area — compliance score over time                             */
/* ------------------------------------------------------------------ */

export interface TrendPoint {
  label: string;
  score: number;
}

export const TrendArea: React.FC<{
  data: TrendPoint[];
  height?: number;
  target?: number;
  ariaLabel?: string;
  className?: string;
}> = ({ data, height = 190, target = 90, ariaLabel = 'Compliance score trend', className }) => {
  const reduce = useReducedMotion();

  return (
    <div className={cn('w-full', className)} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.brand} stopOpacity={0.22} />
              <stop offset="100%" stopColor={CHART.brand} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
          <YAxis domain={[0, 100]} {...axisProps} width={44} />
          <RechartsTooltip
            content={<ChartTooltip unit="%" />}
            cursor={{ stroke: CHART.target, strokeWidth: 1 }}
          />
          <ReferenceLine
            y={target}
            stroke={CHART.target}
            strokeDasharray="4 4"
            label={{
              value: `${target}% target`,
              position: 'insideTopRight',
              fill: CHART.axis,
              fontSize: 10,
            }}
          />
          <Area
            type="monotone"
            dataKey="score"
            name="Score"
            stroke={CHART.brand}
            strokeWidth={2.4}
            fill="url(#trend-fill)"
            dot={{ r: 2.4, fill: CHART.brand, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: CHART.brand, stroke: CHART.surface, strokeWidth: 2 }}
            isAnimationActive={!reduce}
            animationDuration={700}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Vertical bars — volume, findings by category                        */
/* ------------------------------------------------------------------ */

export interface BarDatum {
  label: string;
  value: number;
  /** Optional per-bar override, used by the status donut/bars. */
  tone?: string;
}

export const VolumeBars: React.FC<{
  data: BarDatum[];
  height?: number;
  tone?: keyof typeof TONE_HEX;
  unit?: string;
  ariaLabel?: string;
  className?: string;
}> = ({ data, height = 160, tone = 'brand', unit = '', ariaLabel = 'Bar chart', className }) => {
  const reduce = useReducedMotion();
  const fill = hexFor(tone);

  return (
    <div className={cn('w-full', className)} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }} barCategoryGap="28%">
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
          <YAxis {...axisProps} width={44} allowDecimals={false} />
          <RechartsTooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: CHART.grid, fillOpacity: 0.5 }} />
          <Bar
            dataKey="value"
            name="Count"
            radius={[4, 4, 0, 0]}
            isAnimationActive={!reduce}
            animationDuration={600}
            animationEasing="ease-out"
          >
            {data.map((row, i) => (
              <Cell key={`${row.label}-${i}`} fill={row.tone ? hexFor(row.tone) : fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Donut — status breakdown                                            */
/* ------------------------------------------------------------------ */

export interface Slice {
  name: string;
  value: number;
  tone?: keyof typeof TONE_HEX;
}

export const StatusDonut: React.FC<{
  data: Slice[];
  height?: number;
  centerLabel?: React.ReactNode;
  centerSublabel?: string;
  ariaLabel?: string;
  className?: string;
}> = ({ data, height = 180, centerLabel, centerSublabel, ariaLabel = 'Status breakdown', className }) => {
  const reduce = useReducedMotion();

  return (
    <div className={cn('relative w-full', className)} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <RechartsTooltip content={<ChartTooltip />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            stroke={CHART.surface}
            strokeWidth={2}
            isAnimationActive={!reduce}
            animationDuration={650}
          >
            {data.map((slice, i) => (
              <Cell key={`${slice.name}-${i}`} fill={hexFor(slice.tone)} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerSublabel) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerLabel && (
            <span className="text-xl font-semibold leading-none tabular-nums text-ink">{centerLabel}</span>
          )}
          {centerSublabel && <span className="mt-1 text-2xs text-muted">{centerSublabel}</span>}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Horizontal rule bar — top violated rules                            */
/* ------------------------------------------------------------------ */

export const RuleBar: React.FC<{
  label: string;
  value: number;
  max: number;
  tone?: keyof typeof TONE_HEX;
}> = ({ label, value, max, tone = 'terracotta' }) => {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-2xs">
        <span className="min-w-0 truncate text-ink-700">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums text-ink">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line-soft">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-premium"
          style={{ width: `${pct}%`, backgroundColor: hexFor(tone) }}
        />
      </div>
    </div>
  );
};
