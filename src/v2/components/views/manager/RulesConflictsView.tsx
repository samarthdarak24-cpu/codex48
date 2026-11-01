import React, { useState } from 'react';
import {
  Scale,
  CheckCircle,
  AlertTriangle,
  Zap,
  ChevronDown,
  Calendar,
  MoreVertical,
  X,
  FileText,
  ExternalLink,
  ShieldAlert,
  Check,
  Megaphone,
  Box,
  Plus,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { RuleConflict } from '../../../types';
import { api } from '@/services/api';

export const RulesConflictsView: React.FC = () => {
  const {
    ruleConflicts,
    selectedConflict,
    setSelectedConflict,
    resolveRuleConflict,
    searchQuery,
    showToast,
    refresh,
  } = useApp();

  const totalCount = ruleConflicts.length;
  const activeCount = ruleConflicts.filter((rc) => rc.status === 'Active').length;
  const conflictCount = ruleConflicts.filter((rc) => rc.status === 'Conflict').length;
  const pendingCount = ruleConflicts.filter((rc) => rc.status === 'Review Required').length;
  const exceptionCount = ruleConflicts.filter((rc) => rc.category === 'Exceptions').length;

  const [filterTab, setFilterTab] = useState<'All' | 'Active' | 'Archived' | 'Conflicts' | 'Exceptions'>('All');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // New Rule Modal
  const [isNewRuleOpen, setIsNewRuleOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleCode, setRuleCode] = useState('');
  const [ruleCategory, setRuleCategory] = useState<'Logo & Identity' | 'Color & Typography' | 'Claim & Disclosure' | 'Layout & Spacing' | 'Prohibited Content'>('Logo & Identity');
  const [ruleSeverity, setRuleSeverity] = useState<'BLOCK' | 'WARN' | 'INFO'>('BLOCK');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleSourceDoc, setRuleSourceDoc] = useState('Brand Guidelines 2026');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeConflict = selectedConflict || ruleConflicts[0];

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim() || !ruleCode.trim()) {
      showToast('Please fill in Rule Name and Rule Code.', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      await api.addRule({
        title: ruleName.trim(),
        summary: ruleDescription.trim() || ruleName.trim(),
        subject: ruleCategory,
        condition: ruleCode.trim(),
        action: ruleSeverity === 'BLOCK' ? 'block' : ruleSeverity === 'WARN' ? 'flag' : 'notify',
        scope: 'Global',
        priority: ruleSeverity === 'BLOCK' ? 'High' : ruleSeverity === 'WARN' ? 'Medium' : 'Low',
        sourceDocId: '',
        sourcePassage: ruleSourceDoc.trim(),
        sourcePage: 1,
      });
      showToast(`Rule ${ruleCode} created successfully!`, 'success');
      setIsNewRuleOpen(false);
      setRuleName('');
      setRuleCode('');
      setRuleDescription('');
      await refresh();
    } catch {
      showToast('Failed to create rule.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = ruleConflicts.filter((rc) => {
    if (filterTab === 'Active' && rc.status !== 'Active') return false;
    if (filterTab === 'Conflicts' && rc.status !== 'Conflict') return false;
    if (filterTab === 'Exceptions' && rc.category !== 'Exceptions') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        rc.title.toLowerCase().includes(q) ||
        rc.description.toLowerCase().includes(q) ||
        rc.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-7 space-y-6 bg-[#F7F3EA]">
        {/* Title & Subtitle */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink-900">Rules &amp; Conflicts</h2>
            <p className="text-sm text-muted mt-0.5">
              Monitor rule conflicts, detect contradictions and manage brand policy rules.
            </p>
          </div>
          <button
            onClick={() => setIsNewRuleOpen(true)}
            className="py-2 px-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Create Rule
          </button>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Rules */}
          <div className="bg-white p-4 rounded-2xl border border-line/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted">Total Rules</p>
                  <p className="text-2xl font-bold text-ink-900 mt-0.5">{totalCount}</p>
                </div>
              </div>
              <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <div className="mt-3 h-5 w-full">
              <svg className="w-full h-full stroke-brand-400 fill-none" viewBox="0 0 100 20">
                <path d="M 0,15 Q 25,5 50,14 T 100,5" strokeLinecap="round" strokeWidth="2.2" />
              </svg>
            </div>
          </div>

          {/* Active Rules */}
          <div className="bg-white p-4 rounded-2xl border border-line/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted">Active Rules</p>
                  <p className="text-2xl font-bold text-ink-900 mt-0.5">{activeCount}</p>
                </div>
              </div>
              <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {totalCount > 0 ? `${Math.round((activeCount / totalCount) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="mt-3 h-5 w-full">
              <svg className="w-full h-full stroke-emerald-500 fill-none" viewBox="0 0 100 20">
                <path d="M 0,16 Q 25,14 50,8 T 100,6" strokeLinecap="round" strokeWidth="2.2" />
              </svg>
            </div>
          </div>

          {/* Conflicts Detected */}
          <div className="bg-white p-4 rounded-2xl border border-line/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-orange-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted">Conflicts Detected</p>
                  <p className="text-2xl font-bold text-ink-900 mt-0.5">{conflictCount}</p>
                </div>
              </div>
              <span className="inline-flex items-center text-xs font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                {conflictCount > 0 ? 'Action Needed' : 'Zero'}
              </span>
            </div>
            <div className="mt-3 h-5 w-full">
              <svg className="w-full h-full stroke-amber-500 fill-none" viewBox="0 0 100 20">
                <path d="M 0,18 Q 30,17 60,11 T 100,12" strokeLinecap="round" strokeWidth="2.2" />
              </svg>
            </div>
          </div>

          {/* Pending Review */}
          <div className="bg-white p-4 rounded-2xl border border-line/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-grape-50 text-grape-600 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-grape-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted">Pending Review</p>
                  <p className="text-2xl font-bold text-ink-900 mt-0.5">{pendingCount}</p>
                </div>
              </div>
              <span className="inline-flex items-center text-xs font-semibold text-grape-600 bg-grape-50 px-2 py-0.5 rounded-full">
                Draft
              </span>
            </div>
            <div className="mt-3 h-5 w-full">
              <svg className="w-full h-full stroke-grape-500 fill-none" viewBox="0 0 100 20">
                <path d="M 0,15 Q 35,16 65,10 T 100,11" strokeLinecap="round" strokeWidth="2.2" />
              </svg>
            </div>
          </div>
        </div>

        {/* Filter Badges and Date Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {[
              { id: 'All', label: `All Rules (${totalCount})` },
              { id: 'Active', label: `Active (${activeCount})` },
              { id: 'Archived', label: `Archived (${ruleConflicts.filter((rc) => (rc.status as string) === 'Archived').length})` },
              { id: 'Conflicts', label: `Conflicts (${conflictCount})` },
              { id: 'Exceptions', label: `Exceptions (${exceptionCount})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterTab(t.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                  filterTab === t.id
                    ? 'bg-brand-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-[#FAF7EF] text-ink-600 border border-line'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-medium text-ink-700 hover:bg-[#FAF7EF]">
              <span>Sort by: <strong className="font-semibold text-ink-900">Newest First</strong></span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-light" />
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-medium text-ink-700 hover:bg-[#FAF7EF]">
              <Calendar className="w-3.5 h-3.5 text-muted-light" />
              <span>Last 30 Days</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-light" />
            </button>
          </div>
        </div>

        {/* Rules & Conflicts List */}
        <div className="space-y-3">
          {filtered.map((item) => {
            const isSelected = activeConflict?.id === item.id;
            const isConflict = item.status === 'Conflict';
            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedConflict(item);
                  setIsDrawerOpen(true);
                }}
                className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-4 ${
                  isConflict
                    ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                    : 'bg-white border-line/80 hover:border-line-strong shadow-2xs'
                } ${isSelected ? 'ring-2 ring-brand-500' : ''}`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isConflict
                        ? 'bg-rose-100 text-rose-600'
                        : item.status === 'Review Required'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {isConflict ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-ink-900 text-sm">{item.title}</h4>
                      {isConflict && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-1">
                          ● Conflict
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5">{item.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] font-medium text-ink-600 bg-[#F1ECE0] px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                      <span className="text-[11px] font-medium text-ink-600 bg-[#F1ECE0] px-2 py-0.5 rounded">
                        Rule {item.ruleVersion}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        item.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : item.status === 'Conflict'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      }`}
                    >
                      {item.status}
                    </span>
                    <p className="text-[10px] text-muted-light mt-1">{item.date}</p>
                  </div>
                  <button className="text-muted-light hover:text-ink-600 p-1">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Right Drawer: Rule Conflict Details */}
      {isDrawerOpen && activeConflict && (
        <aside className="w-[390px] bg-white border-l border-line flex flex-col justify-between shrink-0 z-20 overflow-y-auto shadow-lg">
          <div className="p-5 flex flex-col space-y-5">
            {/* Drawer Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-bold text-ink uppercase tracking-wider">
                    Rule Conflict Details
                  </span>
                  {activeConflict.status === 'Conflict' && (
                    <span className="bg-rose-100 text-rose-700 font-bold text-[10px] px-2 py-0.5 rounded-full">
                      Conflict
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-ink-900 text-base mt-2">{activeConflict.title}</h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  {activeConflict.description}
                </p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="text-muted-light hover:text-ink-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conflict Source Box */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-ink">Conflict Source</span>
              <div className="grid grid-cols-11 items-center gap-1.5 p-3 rounded-xl border border-line bg-[#FAF7EF]/70">
                {/* Source 1 */}
                <div className="col-span-5 text-center p-2 rounded-lg bg-white border border-line/80 shadow-2xs">
                  <div className="w-7 h-7 mx-auto rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mb-1">
                    <Megaphone className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-bold text-ink text-xs">Marketing Guidelines</div>
                  <div className="text-[11px] text-muted font-medium mt-0.5">
                    {activeConflict.source1?.requirement || 'Min. 24px (for digital)'}
                  </div>
                </div>

                {/* Lightning Bolt */}
                <div className="col-span-1 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                  </div>
                </div>

                {/* Source 2 */}
                <div className="col-span-5 text-center p-2 rounded-lg bg-white border border-line/80 shadow-2xs">
                  <div className="w-7 h-7 mx-auto rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mb-1">
                    <Box className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-bold text-ink text-xs">Product Guidelines</div>
                  <div className="text-[11px] text-muted font-medium mt-0.5">
                    {activeConflict.source2?.requirement || 'Min. 32px (for product)'}
                  </div>
                </div>
              </div>
            </div>

            {/* Impact section */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-ink">Impact</span>
              <p className="text-xs text-ink-600 leading-relaxed">
                {activeConflict.impact || 'May result in inconsistent logo usage across campaigns and products.'}
              </p>
            </div>

            {/* Recommended Action Box */}
            <div className="p-3.5 rounded-xl bg-brand-50/60 border border-brand-100 space-y-1">
              <div className="flex items-center gap-1.5 text-brand-700 font-bold text-xs">
                <Zap className="w-3.5 h-3.5 text-brand-600" />
                <span>Recommended Action</span>
              </div>
              <p className="text-xs text-ink-700 leading-relaxed">
                {activeConflict.recommendedAction ||
                  'Follow Product Guidelines for product assets, and raise a policy review if needed.'}
              </p>
            </div>

            {/* Related Documents */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-ink">Related Documents</span>
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-line bg-white hover:bg-[#FAF7EF] transition cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-brand-600" />
                  <span className="font-semibold text-ink text-xs">
                    {activeConflict.relatedDoc || 'Brand Visual Standards v2.0'}
                  </span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-light" />
              </div>
            </div>
          </div>

          {/* Drawer Actions */}
          <div className="p-4 border-t border-line bg-[#FAF7EF]/50 flex items-center gap-2.5">
            <button
              onClick={() => showToast(`Opening specifications for ${activeConflict.title}`, 'info')}
              className="flex-1 py-2.5 px-3 bg-white border border-line hover:bg-[#FAF7EF] text-ink rounded-xl font-semibold text-xs transition text-center shadow-2xs"
            >
              View Details
            </button>
            <button
              onClick={() => resolveRuleConflict(activeConflict.id)}
              className="flex-1 py-2.5 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs transition text-center shadow-xs flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Resolve Conflict
            </button>
          </div>
        </aside>
      )}

      {/* Create New Rule Modal */}
      {isNewRuleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-line overflow-hidden">
            <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-[#FAF7EF]">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-ink text-sm">Create Brand Governance Rule</h3>
              </div>
              <button
                onClick={() => setIsNewRuleOpen(false)}
                className="text-muted-light hover:text-ink p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-800 mb-1">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Logo Minimum Clearspace"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-800 mb-1">
                    Rule Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LOGO-CLR-004"
                    value={ruleCode}
                    onChange={(e) => setRuleCode(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-800 mb-1">
                    Category
                  </label>
                  <select
                    value={ruleCategory}
                    onChange={(e) => setRuleCategory(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                  >
                    <option value="Logo & Identity">Logo & Identity</option>
                    <option value="Color & Typography">Color & Typography</option>
                    <option value="Claim & Disclosure">Claim & Disclosure</option>
                    <option value="Layout & Spacing">Layout & Spacing</option>
                    <option value="Prohibited Content">Prohibited Content</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-800 mb-1">
                    Severity
                  </label>
                  <select
                    value={ruleSeverity}
                    onChange={(e) => setRuleSeverity(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                  >
                    <option value="BLOCK">BLOCK (Hard violation)</option>
                    <option value="WARN">WARN (Warning flag)</option>
                    <option value="INFO">INFO (Advisory note)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">
                  Description / Verification Criteria *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain exact visual or copy criteria that this rule enforces..."
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">
                  Source Document Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. PureGlow Brand Visual Standards v2.1"
                  value={ruleSourceDoc}
                  onChange={(e) => setRuleSourceDoc(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsNewRuleOpen(false)}
                  className="px-4 py-2 border border-line rounded-lg text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  {isSubmitting ? 'Creating Rule...' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
