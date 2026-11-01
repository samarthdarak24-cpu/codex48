/**
 * StatCard — exactly matches the reference screenshot style:
 * pastel colored background, lighter icon circle, label text,
 * large bold number, trend % top-right, sparkline curve.
 */
import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export type StatCardVariant = 'blue' | 'green' | 'amber' | 'pink' | 'purple' | 'teal' | 'orange' | 'red' | 'indigo' | 'rose' | 'brand';

interface Theme {
  card: string;       // card background + border
  iconRing: string;   // icon circle bg
  iconText: string;   // icon color
  label: string;      // label text color
  value: string;      // big number color
  sparkStroke: string;
  trendUp: string;
  trendDown: string;
}

const T: Record<StatCardVariant, Theme> = {
  blue:   { card:'bg-blue-100 border-blue-200',     iconRing:'bg-white',  iconText:'text-blue-600',   label:'text-blue-700',   value:'text-blue-900',   sparkStroke:'#3b82f6', trendUp:'text-emerald-600', trendDown:'text-red-500' },
  green:  { card:'bg-emerald-100 border-emerald-200',iconRing:'bg-white', iconText:'text-emerald-600',label:'text-emerald-700',value:'text-emerald-900',sparkStroke:'#10b981', trendUp:'text-emerald-700', trendDown:'text-red-500' },
  amber:  { card:'bg-amber-100 border-amber-200',   iconRing:'bg-white',  iconText:'text-amber-600',  label:'text-amber-700',  value:'text-amber-900',  sparkStroke:'#f59e0b', trendUp:'text-emerald-600', trendDown:'text-red-500' },
  pink:   { card:'bg-pink-100 border-pink-200',     iconRing:'bg-white',  iconText:'text-pink-600',   label:'text-pink-700',   value:'text-pink-900',   sparkStroke:'#ec4899', trendUp:'text-emerald-600', trendDown:'text-red-500' },
  purple: { card:'bg-purple-100 border-purple-200', iconRing:'bg-white',  iconText:'text-purple-600', label:'text-purple-700', value:'text-purple-900', sparkStroke:'#8b5cf6', trendUp:'text-emerald-600', trendDown:'text-red-500' },
  teal:   { card:'bg-teal-100 border-teal-200',     iconRing:'bg-white',  iconText:'text-teal-600',   label:'text-teal-700',   value:'text-teal-900',   sparkStroke:'#14b8a6', trendUp:'text-emerald-600', trendDown:'text-red-500' },
  orange: { card:'bg-orange-100 border-orange-200', iconRing:'bg-white',  iconText:'text-orange-600', label:'text-orange-700', value:'text-orange-900', sparkStroke:'#f97316', trendUp:'text-emerald-600', trendDown:'text-red-500' },
  red:    { card:'bg-red-100 border-red-200',       iconRing:'bg-white',  iconText:'text-red-600',    label:'text-red-700',    value:'text-red-900',    sparkStroke:'#ef4444', trendUp:'text-emerald-600', trendDown:'text-red-500' },
  indigo: { card:'bg-indigo-100 border-indigo-200', iconRing:'bg-white',  iconText:'text-indigo-600', label:'text-indigo-700', value:'text-indigo-900', sparkStroke:'#6366f1', trendUp:'text-emerald-600', trendDown:'text-red-500' },
  rose:   { card:'bg-rose-100 border-rose-200',     iconRing:'bg-white',  iconText:'text-rose-600',   label:'text-rose-700',   value:'text-rose-900',   sparkStroke:'#f43f5e', trendUp:'text-emerald-600', trendDown:'text-red-500' },
  brand:  { card:'bg-green-100 border-green-200',   iconRing:'bg-white',  iconText:'text-green-700',  label:'text-green-700',  value:'text-green-900',  sparkStroke:'#4E7A3D', trendUp:'text-emerald-700', trendDown:'text-red-500' },
};

const PATHS = [
  'M0,15 Q12,9 22,12 T44,10 T60,6',
  'M0,16 Q16,7 28,13 T48,7 T60,5',
  'M0,9  Q18,17 32,11 T50,15 T60,13',
  'M0,17 Q14,11 26,15 T48,8  T60,7',
  'M0,12 Q18,5  32,12 T50,6  T60,10',
  'M0,11 Q14,18 28,12 T50,16 T60,8',
];

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: StatCardVariant;
  trend?: number;
  sparkPathIndex?: number;
  stagger?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  label, value, icon,
  variant = 'blue',
  trend,
  sparkPathIndex = 0,
  stagger = 0,
}) => {
  const theme = T[variant];
  const path = PATHS[sparkPathIndex % PATHS.length];
  const delay = stagger > 0 ? { animationDelay: `${(stagger - 1) * 0.06}s` } : {};

  return (
    <div
      className={`${theme.card} border rounded-2xl p-4 flex flex-col gap-0 animate-view-fade-in`}
      style={{ ...delay, transition: 'transform .22s, box-shadow .22s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 20px rgba(0,0,0,.10)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
    >
      {/* Row 1: icon + trend + sparkline */}
      <div className="flex items-start justify-between gap-2 mb-3">
        {/* Icon in a white pill */}
        <div className={`${theme.iconRing} ${theme.iconText} w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm`}>
          {icon}
        </div>

        {/* Trend % + sparkline */}
        <div className="flex flex-col items-end gap-0.5">
          {trend !== undefined && (
            <span className={`text-[11px] font-bold flex items-center gap-0.5 ${trend >= 0 ? theme.trendUp : theme.trendDown}`}>
              {trend >= 0
                ? <ArrowUpRight className="w-3 h-3" />
                : <ArrowDownRight className="w-3 h-3" />}
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
          <svg width="70" height="22" viewBox="0 0 60 20" fill="none">
            <path d={path} stroke={theme.sparkStroke} strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Label */}
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${theme.label}`}>{label}</p>

      {/* Value */}
      <p className={`text-[32px] font-black leading-none ${theme.value}`} style={{ letterSpacing: '-0.02em' }}>
        {value}
      </p>
    </div>
  );
};

export const StatCardGrid: React.FC<{ cards: Omit<StatCardProps, 'stagger'>[] }> = ({ cards }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {cards.map((card, i) => (
      <StatCard key={card.label} {...card} stagger={i + 1} />
    ))}
  </div>
);
