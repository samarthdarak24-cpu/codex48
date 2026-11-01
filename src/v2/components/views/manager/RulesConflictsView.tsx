import React, { useState } from 'react';
import {
  Scale, CheckCircle, AlertTriangle, Zap, ChevronDown, Calendar,
  MoreVertical, X, FileText, ExternalLink, Check, Eye, Box, Plus, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { RuleConflict } from '../../../types';
import { api } from '@/services/api';
import { StatCardGrid } from '../../ui/StatCard';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    Active: 'badge-approved',
    Conflict: 'badge-rejected',
    'Review Required': 'badge-pending',
    Archived: 'badge-draft',
  };
  const dot: Record<string, string> = { Active: 'bg-emerald-500', Conflict: 'bg-red-500', 'Review Required': 'bg-amber-500', Archived: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${map[status] ?? 'badge-draft'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] ?? 'bg-slate-400'}`} />
      {status}
    </span>
  );
};

const iconBg = ['bg-blue-100 text-blue-700', 'badge-rejected', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700', 'badge-changes'];

export const RulesConflictsView: React.FC = () => {
  const { ruleConflicts, selectedConflict, setSelectedConflict, resolveRuleConflict, searchQuery, showToast, refresh } = useApp();

  const totalCount = ruleConflicts.length;
  const activeCount = ruleConflicts.filter((rc) => rc.status === 'Active').length;
  const conflictCount = ruleConflicts.filter((rc) => rc.status === 'Conflict').length;
  const pendingCount = ruleConflicts.filter((rc) => rc.status === 'Review Required').length;
  const exceptionCount = ruleConflicts.filter((rc) => rc.category === 'Exceptions').length;

  const [filterTab, setFilterTab] = useState<'All' | 'Active' | 'Archived' | 'Conflicts' | 'Exceptions'>('All');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isNewRuleOpen, setIsNewRuleOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleCode, setRuleCode] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeConflict = selectedConflict || ruleConflicts[0];

  const filtered = ruleConflicts.filter((rc) => {
    if (filterTab === 'Active' && rc.status !== 'Active') return false;
    if (filterTab === 'Archived' && (rc.status as string) !== 'Archived') return false;
    if (filterTab === 'Conflicts' && rc.status !== 'Conflict') return false;
    if (filterTab === 'Exceptions' && rc.category !== 'Exceptions') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return rc.title.toLowerCase().includes(q) || rc.description.toLowerCase().includes(q) || rc.category.toLowerCase().includes(q);
    }
    return true;
  });

  const handleResolve = () => {
    if (activeConflict) resolveRuleConflict(activeConflict.id);
  };

  return (
    <div className="flex h-full overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-5 bg-canvas">
        {/* Header */}
        <div>
          <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">Rules & Conflicts</h1>
          <p className="text-xs text-muted mt-0.5">Monitor rule conflicts, detect contradictions and manage brand policy rules.</p>
        </div>

        {/* KPI Cards */}
        <StatCardGrid cards={[
    { label: 'Total Rules', value: totalCount, icon: <Scale className="w-5 h-5" />, variant: 'blue', trend: 5, sparkPathIndex: 0 },
    { label: 'Active Rules', value: activeCount, icon: <CheckCircle className="w-5 h-5" />, variant: 'green', trend: 2, sparkPathIndex: 1 },
    { label: 'Conflicts Detected', value: conflictCount, icon: <AlertTriangle className="w-5 h-5" />, variant: 'amber', trend: -30, sparkPathIndex: 2 },
    { label: 'Pending Review', value: pendingCount, icon: <Zap className="w-5 h-5" />, variant: 'purple', trend: 0, sparkPathIndex: 3 },
  ]} />

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All Rules', 'Active', 'Archived', 'Conflicts', 'Exceptions'] as const).map((tab) => {
              const key = tab === 'All Rules' ? 'All' : tab as any;
              const cnt = tab === 'All Rules' ? totalCount : tab === 'Active' ? activeCount : tab === 'Archived' ? 0 : tab === 'Conflicts' ? conflictCount : exceptionCount;
              return (
                <button key={tab} onClick={() => setFilterTab(key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${filterTab === key ? 'bg-gradient-to-r from-brand-600 to-blue-500 text-white shadow-sm font-bold' : 'bg-white border border-line text-ink-600 hover:bg-[#FAF7EF]'}`}>
                  {tab} ({cnt})
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>Sort by:</span>
            <select className="bg-white border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none cursor-pointer"><option>Newest First</option></select>
            <div className="flex items-center gap-1 bg-white border border-line rounded-lg px-2 py-1.5">
              <span className="text-ink font-medium">Last 30 Days</span><ChevronDown className="w-3 h-3 text-muted-light" />
            </div>
          </div>
        </div>

        {/* Rules list */}
        <div className="space-y-2.5">
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl border border-line p-10 text-center text-xs text-muted">No rules or conflicts found.</div>
          )}
          {filtered.map((rc, i) => (
            <div key={rc.id} onClick={() => { setSelectedConflict(rc); setIsDrawerOpen(true); }}
              className={`bg-white rounded-2xl border p-4 flex items-start gap-4 cursor-pointer transition-all hover:shadow-xs ${selectedConflict?.id === rc.id ? 'ring-2 ring-brand-500 border-transparent shadow-xs' : 'border-line hover:border-line-strong'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg[i % iconBg.length]}`}>
                {rc.status === 'Conflict' ? <AlertTriangle className="w-4.5 h-4.5" /> : rc.status === 'Review Required' ? <Zap className="w-4.5 h-4.5" /> : <CheckCircle className="w-4.5 h-4.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink-900 text-sm">{rc.title}</p>
                <p className="text-xs text-muted mt-0.5">{rc.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  {rc.ruleVersion && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F1ECE0] text-ink-700 text-[10px] font-medium"><Box className="w-3 h-3" />{rc.category}</span>}
                  {rc.ruleVersion && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F1ECE0] text-ink-700 text-[10px] font-medium">Rule {rc.ruleVersion}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <StatusBadge status={rc.status} />
                <span className="text-[11px] text-muted-light flex items-center gap-1"><Calendar className="w-3 h-3" />{rc.date}</span>
              </div>
              <button className="p-1 text-muted hover:text-ink-700 shrink-0"><MoreVertical className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </main>

      {/* Right panel */}
      {isDrawerOpen && activeConflict && (
        <aside className="w-[360px] bg-white border-l border-line flex flex-col shrink-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-ink-900">Rule Conflict Details</h3>
            </div>
            <div className="flex items-center gap-2">
              {activeConflict.status === 'Conflict' && <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold border border-red-200">⚡ Conflict</span>}
              <button onClick={() => setIsDrawerOpen(false)} className="p-1 rounded-lg text-muted-light hover:text-ink-700 hover:bg-[#F1ECE0]"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <h4 className="font-bold text-ink-900 text-base">{activeConflict.title}</h4>
              <p className="text-xs text-muted mt-1">{activeConflict.description}</p>
            </div>

            {/* Conflict source */}
            {activeConflict.status === 'Conflict' && (
              <div>
                <p className="text-xs font-bold text-ink-900 mb-2">Conflict Source</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-center">
                    <div className="font-semibold text-blue-800 text-[11px] mb-1">{activeConflict.source1?.name?.split('·')[0]?.trim() || 'Marketing Guidelines'}</div>
                    <p className="text-blue-700 text-[10px]">{activeConflict.source1?.requirement || 'Min. 24px'}</p>
                    <p className="text-blue-600 text-[10px]">(for digital)</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="flex-1 p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-center">
                    <div className="font-semibold text-purple-800 text-[11px] mb-1">{activeConflict.source2?.name?.split('·')[0]?.trim() || 'Product Guidelines'}</div>
                    <p className="text-purple-700 text-[10px]">{activeConflict.source2?.requirement || 'Min. 32px'}</p>
                    <p className="text-purple-600 text-[10px]">(for product)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Impact */}
            <div className="p-3 bg-[#FAF7EF] border border-line rounded-xl text-xs">
              <p className="font-bold text-ink-900 mb-1">Impact</p>
              <p className="text-muted leading-relaxed">{activeConflict.impact || 'May result in inconsistent usage across campaigns and products.'}</p>
            </div>

            {/* Recommended action */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs flex items-start gap-2">
              <span className="text-amber-600 shrink-0 mt-0.5">💡</span>
              <div>
                <p className="font-semibold text-amber-900 mb-0.5">Recommended Action</p>
                <p className="text-amber-800 leading-relaxed">{activeConflict.recommendedAction || 'Review both rules and confirm a single authoritative scope.'}</p>
              </div>
            </div>

            {/* Related docs */}
            {activeConflict.relatedDoc && (
              <div>
                <p className="text-xs font-bold text-ink-900 mb-2">Related Documents</p>
                <div className="flex items-center gap-2 p-2 bg-[#FAF7EF] border border-line rounded-xl">
                  <FileText className="w-4 h-4 text-brand-600 shrink-0" />
                  <span className="text-xs font-medium text-brand-700 flex-1">Brand Visual Standards v2.0</span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted" />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-line space-y-2 shrink-0">
            <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors cursor-pointer">
              <Eye className="w-4 h-4" />View Details
            </button>
            {activeConflict.status === 'Conflict' && !activeConflict.reviewed && (
              <button onClick={handleResolve} className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer transition-colors cursor-pointer">
                <Check className="w-4 h-4" />Resolve Conflict
              </button>
            )}
            {activeConflict.reviewed && (
              <div className="flex items-center gap-2 justify-center py-2 text-xs text-emerald-700 font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-600" />Reviewed by {activeConflict.reviewedBy || 'Manager'}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
};
