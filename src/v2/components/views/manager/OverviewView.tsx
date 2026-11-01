import React, { useState } from 'react';
import {
  FileText, CheckCircle, AlertCircle, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Eye, Clock, Download, Maximize2, MoreHorizontal, X, RotateCw, ArrowRight, ChevronDown,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { StatCardGrid } from '../../ui/StatCard';
import { api } from '@/services/api';
import { Submission } from '../../../types';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    Approved: 'badge-approved', 'In Review': 'badge-inreview', Pending: 'badge-pending',
    'Needs Changes': 'badge-changes', Rejected: 'badge-rejected',
  };
  const dot: Record<string, string> = {
    Approved: 'bg-emerald-500', 'In Review': 'bg-blue-500', Pending: 'bg-amber-500',
    'Needs Changes': 'bg-orange-500', Rejected: 'bg-red-500',
  };
  const cls = map[status] ?? 'badge-draft';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] ?? 'bg-slate-400'}`} />{status}
    </span>
  );
};

export const OverviewView: React.FC = () => {
  const {
    submissions, selectedSubmission, setSelectedSubmission, updateSubmissionStatus,
    setActivePage, searchQuery, auditEvents, sentinelAlerts, analytics, analyticsTrends,
    analyticsRange, setAnalyticsRange, showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'All' | 'Images' | 'Videos' | 'Text' | 'Social'>('All');
  const [drawerTab, setDrawerTab] = useState<'Findings' | 'Evidence' | 'Comments'>('Findings');
  const [selectedDecision, setSelectedDecision] = useState('Request Changes');
  const [decisionNote, setDecisionNote] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  const filteredSubmissions = submissions.filter((item) => {
    if (activeTab === 'Images' && item.type !== 'Image') return false;
    if (activeTab === 'Videos' && item.type !== 'Video') return false;
    if (activeTab === 'Text' && item.type !== 'Text') return false;
    if (activeTab === 'Social' && item.type !== 'Social') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.campaign.toLowerCase().includes(q) || item.creator.name.toLowerCase().includes(q);
    }
    return true;
  });

  const activeSub = selectedSubmission || submissions[0];
  const pendingCount = submissions.filter(s => s.status === 'In Review' || s.status === 'Pending').length;
  const approvedCount = submissions.filter(s => s.status === 'Approved').length;
  const needsChangesCount = submissions.filter(s => s.status === 'Needs Changes').length;
  const violationCount = submissions.reduce((n, s) => n + (s.findings?.filter(f => f.type === 'error').length ?? 0), 0);
  const typeCount = (t: string) => submissions.filter(s => s.type === t).length;
  const avgCompliance = submissions.length ? Math.round(submissions.reduce((n, s) => n + s.complianceScore, 0) / submissions.length) : 0;
  const complianceScore = analytics?.complianceScore ?? avgCompliance;
  const trendPoints = (analyticsTrends?.points ?? []).slice(-6);
  const maxTrend = Math.max(1, ...trendPoints.map(p => p.submissions));
  const complianceDelta = trendPoints.length >= 2 ? Math.round(trendPoints[trendPoints.length - 1].score - trendPoints[0].score) : 0;
  const recentActivity = auditEvents.slice(0, 4);
  const openAlerts = sentinelAlerts.filter(a => a.status === 'Open').length;
  const rangeTabs = [{ label: '7D', val: '7d' }, { label: '30D', val: '30d' }, { label: '90D', val: '90d' }, { label: '1Y', val: '1y' }];

  const handleSubmitDecision = () => {
    if (!activeSub) return;
    const statusMap: Record<string, Submission['status']> = { 'Approve': 'Approved', 'Request Changes': 'Needs Changes', 'Reject': 'Rejected' };
    updateSubmissionStatus(activeSub.id, statusMap[selectedDecision] ?? 'Needs Changes', decisionNote);
    setDecisionNote('');
  };

  const handleDownload = async (id: string, title: string) => {
    try { await api.downloadSubmissionReport(id); showToast(`Report downloaded for ${title}`); }
    catch (err) { showToast(err instanceof Error ? err.message : 'Failed', 'error'); }
  };

  const PRIORITY_COLORS: Record<string, string> = {
    Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low',
  };

  return (
    <div className="flex h-full overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Header */}
        <div className="section-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Overview</h1>
          <p className="text-xs text-muted mt-0.5">Monitor brand compliance, review content and manage brand policies.</p>
        </div>

        {/* KPI Cards */}
        <div className="section-2">
          <StatCardGrid cards={[
            { label: 'Pending Review',    value: pendingCount,      icon: <FileText className="w-5 h-5" />,      variant: 'blue',   trend: 12,  sparkPathIndex: 0 },
            { label: 'Approved',          value: approvedCount,     icon: <CheckCircle className="w-5 h-5" />,   variant: 'green',  trend: 8,   sparkPathIndex: 1 },
            { label: 'Needs Changes',     value: needsChangesCount, icon: <AlertCircle className="w-5 h-5" />,   variant: 'amber',  trend: -18, sparkPathIndex: 2 },
            { label: 'Policy Violations', value: violationCount,    icon: <AlertTriangle className="w-5 h-5" />, variant: 'pink',   trend: -32, sparkPathIndex: 3 },
          ]} />
        </div>

        {/* Review Queue */}
        <div className="section-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-base font-black text-ink-900">Review Queue</h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['All', 'Images', 'Videos', 'Text', 'Social'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                      activeTab === tab
                        ? 'bg-gradient-to-r from-brand-600 to-blue-600 text-white shadow-sm'
                        : 'bg-white border border-line text-ink-600 hover:border-blue-300 hover:text-blue-700'
                    }`}>
                    {tab === 'All' ? `All (${submissions.length})` : `${tab} (${typeCount(tab)})`}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted cursor-pointer hover:text-ink">
              <span>Sort by: <strong className="text-ink">Newest First</strong></span>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredSubmissions.slice(0, 8).map((item, i) => {
              const isSelected = activeSub?.id === item.id;
              const borderColors = ['border-blue-300 ring-blue-300', 'border-emerald-300 ring-emerald-300', 'border-pink-300 ring-pink-300', 'border-purple-300 ring-purple-300'];
              return (
                <div key={item.id} onClick={() => { setSelectedSubmission(item); setIsDrawerOpen(true); }}
                  className={`group bg-white rounded-2xl border overflow-hidden shadow-2xs cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg ${
                    isSelected ? `ring-2 ${borderColors[i % 4]} border-transparent shadow-md` : 'border-line hover:border-blue-200'
                  }`}>
                  <div className="relative h-32 bg-[#F1ECE0] overflow-hidden">
                    <img alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src={item.thumbnail} />
                    <div className="absolute top-2 left-2"><StatusBadge status={item.status} /></div>
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                      <Eye className="w-3 h-3" />{item.viewsCount || 12}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-ink-900 text-xs truncate">{item.title}</p>
                    <p className="text-[11px] text-muted truncate mt-0.5">{item.campaign}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F1ECE0] text-[11px]">
                      <span className="text-muted-light flex items-center gap-1"><Clock className="w-3 h-3" />{item.relativeTime}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_COLORS[item.priority ?? 'Medium'] ?? 'badge-medium'}`}>
                        {item.priority || 'Medium'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom widgets */}
        <div className="section-4 grid grid-cols-1 lg:grid-cols-12 gap-4 pb-4">
          {/* Compliance Chart */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-4 border border-line shadow-2xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-black text-ink-900 text-sm">Brand Compliance Analytics</h4>
              <div className="flex items-center gap-1 bg-[#F1ECE0] rounded-xl p-1">
                {rangeTabs.map(r => (
                  <button key={r.val} onClick={() => setAnalyticsRange(r.val)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      analyticsRange === r.val
                        ? 'bg-gradient-to-r from-brand-600 to-blue-600 text-white shadow-sm'
                        : 'text-muted hover:text-ink'
                    }`}>{r.label}</button>
                ))}
              </div>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex-1 h-20 flex items-end gap-2">
                {trendPoints.length === 0
                  ? <p className="text-[10px] text-muted-light self-center w-full text-center">No trend data yet</p>
                  : trendPoints.map((p, i) => {
                    const h = Math.max(6, Math.round((p.submissions / maxTrend) * 72));
                    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500', 'bg-teal-500'];
                    const label = (() => { try { return new Date(p.date).toLocaleString('en', { month: 'short' }); } catch { return p.date; } })();
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`w-full ${colors[i % colors.length]} rounded-t hover:opacity-80 transition-all cursor-pointer`} style={{ height: `${h}px` }} />
                        <span className="text-[10px] text-muted-light">{label}</span>
                      </div>
                    );
                  })
                }
              </div>
              <div className="flex items-center gap-3 pl-3 border-l border-[#F1ECE0]">
                <div className="relative w-16 h-16">
                  <svg className="-rotate-90" viewBox="0 0 36 36" width="64" height="64">
                    <path fill="none" stroke="#F1ECE0" strokeWidth="3.5" d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831" />
                    <path fill="none" strokeWidth="3.5" strokeDasharray={`${complianceScore},100`} strokeLinecap="round"
                      style={{ stroke: complianceScore >= 80 ? '#10b981' : complianceScore >= 60 ? '#f59e0b' : '#ef4444' }}
                      d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-black text-sm text-ink-900">{complianceScore}%</span>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-ink">Overall<br />Compliance</p>
                  <span className={`flex items-center gap-0.5 text-[10px] font-bold mt-1 ${complianceDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {complianceDelta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {complianceDelta >= 0 ? '+' : ''}{complianceDelta}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-line shadow-2xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-black text-ink-900 text-sm">Recent Activity</h4>
              <button onClick={() => setActivePage('audit-history')} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5">
                See all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {recentActivity.length === 0 && <p className="text-xs text-muted">No activity yet.</p>}
              {recentActivity.map((e, i) => {
                const dotColors = ['bg-blue-500', 'bg-pink-500', 'bg-emerald-500', 'bg-purple-500'];
                return (
                  <div key={e.id} className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <img alt={e.user.name} className="w-7 h-7 rounded-full object-cover ring-2 ring-white" src={e.user.avatar} />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${dotColors[i % 4]} border-2 border-white`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-ink-700 truncate">
                        <strong className="font-bold text-ink-900">{e.user.name}</strong> {e.action} '{e.details}'
                      </p>
                      <span className="text-[10px] text-muted-light">{e.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sentinel */}
          <div className="lg:col-span-3 bg-gradient-to-br from-brand-50 to-blue-50 rounded-2xl p-4 border border-brand-200/60 shadow-2xs hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-black text-ink-900 text-sm">Sentinel Monitoring</h4>
                <span className="online-dot relative w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              </div>
              <div className="flex items-start gap-2.5 mt-2 p-2.5 bg-white/70 rounded-xl border border-brand-100">
                <RotateCw className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-ink-700 leading-snug">
                  <strong className="font-bold text-ink">{openAlerts}</strong> alert{openAlerts !== 1 ? 's' : ''} require attention
                </p>
              </div>
            </div>
            <button onClick={() => setActivePage('sentinel')} className="mt-3 w-full py-2 px-3 btn-primary-glow text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5">
              View Tasks <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </main>

      {/* Right Drawer */}
      {isDrawerOpen && activeSub && (
        <aside className="w-[360px] detail-panel flex flex-col shrink-0 overflow-hidden animate-slide-right">
          <div className="p-4 border-b border-line flex items-start justify-between shrink-0 bg-gradient-to-r from-white to-blue-50/40">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-ink-900 text-sm truncate max-w-[200px]">{activeSub.title}</h3>
                <StatusBadge status={activeSub.status} />
              </div>
              <p className="text-[11px] text-muted-light mt-0.5">{activeSub.campaign} · {activeSub.relativeTime}</p>
            </div>
            <button onClick={() => setIsDrawerOpen(false)} className="p-1.5 rounded-xl text-muted-light hover:text-ink-700 hover:bg-[#F1ECE0] shrink-0"><X className="w-4 h-4" /></button>
          </div>

          <div className="flex-1 overflow-y-auto styled-scroll p-4 space-y-4">
            <div className="rounded-2xl overflow-hidden border border-line shadow-xs">
              <img alt={activeSub.title} className="w-full h-44 object-cover" src={activeSub.thumbnail} />
            </div>

            {/* Action strip */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { icon: <Download className="w-4 h-4" />, label: 'Download', color: 'hover:bg-blue-50 hover:text-blue-700', action: () => handleDownload(activeSub.id, activeSub.title) },
                { icon: <Eye className="w-4 h-4" />, label: 'Preview', color: 'hover:bg-emerald-50 hover:text-emerald-700', action: () => activeSub.thumbnail && window.open(activeSub.thumbnail, '_blank') },
                { icon: <Maximize2 className="w-4 h-4" />, label: 'Expand', color: 'hover:bg-purple-50 hover:text-purple-700', action: () => setActivePage('review-queue') },
                { icon: <MoreHorizontal className="w-4 h-4" />, label: 'More', color: 'hover:bg-pink-50 hover:text-pink-700', action: () => {} },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action} title={btn.label}
                  className={`flex flex-col items-center gap-1 py-2 border border-line rounded-xl text-muted transition-all cursor-pointer ${btn.color}`}>
                  {btn.icon}
                  <span className="text-[9px] font-semibold">{btn.label}</span>
                </button>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-line">
              {(['Findings', 'Evidence', 'Comments'] as const).map(tab => (
                <button key={tab} onClick={() => setDrawerTab(tab)}
                  className={`pb-2 text-xs font-bold transition ${drawerTab === tab ? 'border-b-2 border-blue-500 text-blue-600' : 'text-muted hover:text-ink'}`}>
                  {tab}
                </button>
              ))}
            </div>

            {drawerTab === 'Findings' && (
              <div className="space-y-2.5">
                {activeSub.findings && activeSub.findings.length > 0 ? activeSub.findings.map(f => (
                  <div key={f.id} className={`p-3 rounded-xl border text-xs ${f.type === 'error' ? 'bg-red-50 border-red-200' : f.type === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <p className="font-bold text-ink-900">{f.title}</p>
                    <p className="text-muted mt-0.5 leading-relaxed">{f.description}</p>
                  </div>
                )) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />All compliance checks passed.
                  </div>
                )}
              </div>
            )}
            {drawerTab === 'Evidence' && (
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl"><p className="font-bold text-blue-900">Brand Guidelines v2.1</p><p className="text-blue-700 mt-0.5">Page 12 – Brand Tone & Messaging</p></div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl"><p className="font-bold text-purple-900">Visual Identity Guide</p><p className="text-purple-700 mt-0.5">Section 3 – Logo Usage Rules</p></div>
              </div>
            )}
            {drawerTab === 'Comments' && (
              <div className="space-y-3 text-xs">
                {activeSub.comments && activeSub.comments.length > 0 ? activeSub.comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <img alt={c.author} src={c.avatar} className="w-7 h-7 rounded-full object-cover shrink-0 ring-2 ring-pink-200" />
                    <div><p className="font-bold text-ink-900">{c.author} <span className="text-muted-light font-normal">{c.time}</span></p><p className="text-ink-600 mt-0.5">{c.text}</p></div>
                  </div>
                )) : <p className="text-muted">No comments yet.</p>}
              </div>
            )}
          </div>

          {/* Decision footer */}
          <div className="p-4 border-t border-line space-y-3 shrink-0 bg-gradient-to-r from-white to-blue-50/30">
            <textarea value={decisionNote} onChange={e => setDecisionNote(e.target.value)} placeholder="Add a note for this decision..." rows={2}
              className="w-full text-xs border border-line rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 bg-white/80" />
            <div className="flex items-center gap-2">
              <select value={selectedDecision} onChange={e => setSelectedDecision(e.target.value)}
                className="flex-1 text-xs border border-line rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer">
                <option>Request Changes</option><option>Approve</option><option>Reject</option>
              </select>
              <button onClick={handleSubmitDecision}
                className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md">
                Submit →
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};
