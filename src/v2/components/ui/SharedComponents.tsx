/**
 * Shared UI primitives for the Precedent v2 workspace.
 * These components implement the reference design system.
 */
import React from 'react';
import { ArrowUpRight, ArrowDownRight, CheckCircle2, Clock, AlertCircle, XCircle, X } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* KPI Stat Card                                                       */
/* ------------------------------------------------------------------ */

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  trend?: number;
  trendLabel?: string;
  sparkColor?: string;
  sparkPath?: string;
  borderHover?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  trend,
  trendLabel,
  sparkColor = 'stroke-brand-500',
  sparkPath = 'M0,15 Q15,18 25,12 T50,14 T60,6',
  borderHover = 'hover:border-brand-300',
}) => (
  <div className={`bg-white p-4 rounded-2xl border border-line shadow-2xs card-hover-effect ${borderHover} transition-all`}>
    <div className="flex items-start justify-between">
      <div className={`w-11 h-11 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex flex-col items-end gap-1">
        {trend !== undefined && (
          <span className={`text-[11px] font-bold flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
        <svg className={`w-16 h-5 ${sparkColor} fill-none`} strokeWidth="2" viewBox="0 0 60 20">
          <path d={sparkPath} strokeLinecap="round" />
        </svg>
      </div>
    </div>
    <div className="mt-3">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">{value}</div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Status Badge                                                        */
/* ------------------------------------------------------------------ */

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const px = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';
  const text = size === 'sm' ? 'text-[10px]' : 'text-xs';

  const variants: Record<string, string> = {
    Approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    Active: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    'In Review': 'bg-blue-50 text-blue-700 border border-blue-200/80',
    Pending: 'bg-amber-50 text-amber-700 border border-amber-200/80',
    'Pending Review': 'bg-amber-50 text-amber-700 border border-amber-200/80',
    'Needs Changes': 'bg-orange-50 text-orange-700 border border-orange-200/80',
    Rejected: 'bg-red-50 text-red-600 border border-red-200/80',
    Conflict: 'bg-red-50 text-red-700 border border-red-200/80',
    Draft: 'bg-slate-50 text-slate-600 border border-slate-200/80',
    Archived: 'bg-purple-50 text-purple-700 border border-purple-200/80',
    Open: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    Resolved: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    'In Progress': 'bg-blue-50 text-blue-700 border border-blue-200/80',
    Critical: 'bg-red-50 text-red-700 border border-red-200/80',
    High: 'bg-orange-50 text-orange-700 border border-orange-200/80',
    Medium: 'bg-amber-50 text-amber-700 border border-amber-200/80',
    Low: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    Flagged: 'bg-red-50 text-red-700 border border-red-200/80',
    Success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    'Action Required': 'bg-red-50 text-red-700 border border-red-200/80',
    Approval: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    Update: 'bg-blue-50 text-blue-700 border border-blue-200/80',
    Comment: 'bg-violet-50 text-violet-700 border border-violet-200/80',
    System: 'bg-slate-50 text-slate-700 border border-slate-200/80',
  };

  const dotColors: Record<string, string> = {
    Approved: 'bg-emerald-500',
    Active: 'bg-emerald-500',
    'In Review': 'bg-blue-500',
    Pending: 'bg-amber-500',
    'Pending Review': 'bg-amber-500',
    'Needs Changes': 'bg-orange-500',
    Rejected: 'bg-red-500',
    Conflict: 'bg-red-500',
    Open: 'bg-rose-500',
    Resolved: 'bg-emerald-500',
    'In Progress': 'bg-blue-500',
  };

  const cls = variants[status] ?? 'bg-slate-50 text-slate-600 border border-slate-200/80';
  const dot = dotColors[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${px} ${text} ${cls}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      {status}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Page Header                                                         */
/* ------------------------------------------------------------------ */

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold text-ink-900 tracking-tight">{title}</h1>
      {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
  </div>
);

/* ------------------------------------------------------------------ */
/* Tab Pills                                                           */
/* ------------------------------------------------------------------ */

interface TabPillsProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  size?: 'sm' | 'md';
}

export const TabPills: React.FC<TabPillsProps> = ({ tabs, active, onChange, size = 'md' }) => (
  <div className="flex items-center gap-1.5 flex-wrap">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`rounded-full text-xs font-semibold transition-colors cursor-pointer ${
          size === 'sm' ? 'px-2.5 py-1' : 'px-3.5 py-1.5'
        } ${
          active === tab.id
            ? 'bg-ink-900 text-white shadow-2xs'
            : 'bg-white text-ink-600 hover:bg-[#FAF7EF] border border-line'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/* Empty State                                                         */
/* ------------------------------------------------------------------ */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center gap-3 py-12 text-center">
    {icon && <div className="text-muted-light">{icon}</div>}
    <div>
      <p className="font-semibold text-ink-900 text-sm">{title}</p>
      {description && <p className="text-xs text-muted mt-1">{description}</p>}
    </div>
    {action}
  </div>
);

/* ------------------------------------------------------------------ */
/* Detail Panel (right slide-over)                                     */
/* ------------------------------------------------------------------ */

interface DetailPanelProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  title,
  onClose,
  children,
  width = 'w-[360px]',
}) => (
  <aside className={`${width} bg-white border-l border-line flex flex-col shrink-0 overflow-hidden`}>
    <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
      <h3 className="text-sm font-bold text-ink-900">{title}</h3>
      <button
        onClick={onClose}
        className="p-1 rounded-lg text-muted-light hover:text-ink-700 hover:bg-[#F1ECE0] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
    <div className="flex-1 overflow-y-auto">{children}</div>
  </aside>
);

/* ------------------------------------------------------------------ */
/* Thumbnail with status overlay                                       */
/* ------------------------------------------------------------------ */

interface ThumbProps {
  src: string;
  alt: string;
  status?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Thumb: React.FC<ThumbProps> = ({ src, alt, status, size = 'md', className = '' }) => {
  const sizes = { sm: 'w-10 h-10', md: 'w-14 h-14', lg: 'w-16 h-16' };
  return (
    <div className={`relative ${sizes[size]} rounded-xl overflow-hidden flex-shrink-0 bg-[#F1ECE0] border border-line ${className}`}>
      <img src={src} alt={alt} className="w-full h-full object-cover" />
      {status && (
        <div className="absolute top-1 right-1">
          <StatusBadge status={status} size="sm" />
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Sort & Filter row                                                   */
/* ------------------------------------------------------------------ */

interface SortRowProps {
  label?: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  extra?: React.ReactNode;
}

export const SortSelect: React.FC<SortRowProps> = ({ label = 'Sort by:', value, options, onChange, extra }) => (
  <div className="flex items-center gap-2">
    {extra}
    <div className="flex items-center gap-1.5 text-xs text-ink-600">
      <span className="text-muted">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none bg-white border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
      >
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Compliance / score progress bar                                     */
/* ------------------------------------------------------------------ */

interface ScoreBarProps {
  score: number;
  label?: string;
  showLabel?: boolean;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({ score, label, showLabel = true }) => (
  <div className="space-y-1">
    {showLabel && (
      <div className="flex items-center justify-between text-[11px]">
        {label && <span className="text-muted">{label}</span>}
        <span className={`font-bold ${score >= 90 ? 'text-emerald-600' : score >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
          {score}%
        </span>
      </div>
    )}
    <div className="h-1.5 bg-[#F1ECE0] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${score >= 90 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
        style={{ width: `${score}%` }}
      />
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Metadata Row                                                        */
/* ------------------------------------------------------------------ */

export const MetaRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-[#F5F0E8] last:border-0 text-xs">
    <span className="text-muted">{label}</span>
    <span className="font-medium text-ink text-right max-w-[55%] truncate">{value}</span>
  </div>
);

/* ------------------------------------------------------------------ */
/* Action Button variants                                              */
/* ------------------------------------------------------------------ */

interface BtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Btn: React.FC<BtnProps> = ({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  disabled,
  className = '',
  icon,
  fullWidth,
}) => {
  const sizes = { sm: 'px-3 py-1.5 text-[11px]', md: 'px-4 py-2 text-xs' };
  const variants = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-2xs',
    secondary: 'bg-white hover:bg-[#FAF7EF] text-ink-700 border border-line shadow-2xs',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'text-brand-600 hover:bg-brand-50 hover:text-brand-700',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
};
