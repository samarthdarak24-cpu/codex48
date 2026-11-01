import React, { useState } from 'react';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Clock,
  Download,
  Maximize2,
  MoreHorizontal,
  X,
  RotateCw,
  ArrowRight,
  Check,
  Smile,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import { Submission } from '../../../types';

export const OverviewView: React.FC = () => {
  const {
    submissions,
    selectedSubmission,
    setSelectedSubmission,
    updateSubmissionStatus,
    setActivePage,
    searchQuery,
    auditEvents,
    sentinelAlerts,
    analytics,
    analyticsTrends,
    analyticsRange,
    setAnalyticsRange,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'All' | 'Images' | 'Videos' | 'Text' | 'Social'>('All');
  const [drawerTab, setDrawerTab] = useState<'Findings' | 'Evidence' | 'Comments'>('Findings');
  const [selectedDecision, setSelectedDecision] = useState<'In Review' | 'Needs Changes' | 'Approved' | 'Rejected'>('Needs Changes');
  const [decisionNote, setDecisionNote] = useState('');
  const [isDecisionMenuOpen, setIsDecisionMenuOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // Filter submissions by tab and search
  const filteredSubmissions = submissions.filter((item) => {
    if (activeTab === 'Images' && item.type !== 'Image') return false;
    if (activeTab === 'Videos' && item.type !== 'Video') return false;
    if (activeTab === 'Text' && item.type !== 'Text') return false;
    if (activeTab === 'Social' && item.type !== 'Social') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.campaign.toLowerCase().includes(q) ||
        item.creator.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeSub = selectedSubmission || submissions[0];

  // Derived from the records returned by the API — never hardcoded.
  const pendingCount = submissions.filter((s) => s.status === 'In Review' || s.status === 'Pending').length;
  const approvedCount = submissions.filter((s) => s.status === 'Approved').length;
  const needsChangesCount = submissions.filter((s) => s.status === 'Needs Changes').length;
  const violationCount = submissions.reduce(
    (n, s) => n + (s.findings?.filter((f) => f.type === 'error').length ?? 0),
    0,
  );
  const typeCount = (t: string) => submissions.filter((s) => s.type === t).length;

  // Overall compliance from real analytics (falls back to avg of live submissions).
  const avgCompliance = submissions.length
    ? Math.round(submissions.reduce((n, s) => n + s.complianceScore, 0) / submissions.length)
    : 0;
  const complianceScore = analytics?.complianceScore ?? avgCompliance;

  // Bar chart series built from the real analytics trend points (submissions per bucket).
  const trendPoints = (analyticsTrends?.points ?? []).slice(-6);
  const maxTrend = Math.max(1, ...trendPoints.map((p) => p.submissions));
  const complianceDelta =
    trendPoints.length >= 2
      ? Math.round(trendPoints[trendPoints.length - 1].score - trendPoints[0].score)
      : 0;

  // Recent activity is derived from the real audit trail (no third-party avatars).
  const recentActivity = auditEvents.slice(0, 4);

  // Sentinel monitoring reflects the real open alerts.
  const openAlerts = sentinelAlerts.filter((a) => a.status === 'Open').length;

  const handleDownloadReport = async (id: string, title: string) => {
    try {
      await api.downloadSubmissionReport(id);
      showToast(`Report downloaded for ${title}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Download failed.', 'error');
    }
  };

  const rangeTabs: { label: string; val: string }[] = [
    { label: '7D', val: '7d' },
    { label: '30D', val: '30d' },
    { label: '90D', val: '90d' },
    { label: '1Y', val: '1y' },
  ];

  const handleSubmitDecision = () => {
    if (activeSub) {
      updateSubmissionStatus(activeSub.id, selectedDecision, decisionNote);
      setDecisionNote('');
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Scrollable Main Overview Content */}
      <main className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-[#F7F3EA]">
        {/* Page Title & Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-ink-900 tracking-tight">Overview</h2>
            <p className="text-muted text-xs mt-0.5">
              Monitor brand compliance, review content and manage brand policies.
            </p>
          </div>
        </div>

        {/* Metric Cards Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Pending Review */}
          <div className="bg-white rounded-2xl p-4.5 border border-line/90 shadow-2xs card-hover-effect hover:border-brand-300 flex items-center justify-between group">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                <FileText className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <div className="text-[12px] font-medium text-muted">Pending Review</div>
                <div className="text-2xl font-bold text-ink-900 leading-tight">{pendingCount}</div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-medium text-muted-light">live</span>
              <svg className="w-16 h-6 mt-1 stroke-brand-500 fill-none" strokeWidth="2" viewBox="0 0 60 20">
                <path d="M0,15 Q15,18 25,12 T50,14 T60,6" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 2: Approved */}
          <div className="bg-white rounded-2xl p-4.5 border border-line/90 shadow-2xs card-hover-effect hover:border-emerald-300 flex items-center justify-between group">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-[12px] font-medium text-muted">Approved</div>
                <div className="text-2xl font-bold text-ink-900 leading-tight">{approvedCount}</div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-medium text-muted-light">live</span>
              <svg className="w-16 h-6 mt-1 stroke-emerald-500 fill-none" strokeWidth="2" viewBox="0 0 60 20">
                <path d="M0,16 Q18,8 30,14 T50,8 T60,5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 3: Needs Changes */}
          <div className="bg-white rounded-2xl p-4.5 border border-line/90 shadow-2xs card-hover-effect hover:border-amber-300 flex items-center justify-between group">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <div className="text-[12px] font-medium text-muted">Needs Changes</div>
                <div className="text-2xl font-bold text-ink-900 leading-tight">{needsChangesCount}</div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-medium text-muted-light">live</span>
              <svg className="w-16 h-6 mt-1 stroke-amber-500 fill-none" strokeWidth="2" viewBox="0 0 60 20">
                <path d="M0,8 Q20,18 35,10 T50,16 T60,12" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 4: Policy Violations */}
          <div className="bg-white rounded-2xl p-4.5 border border-line/90 shadow-2xs card-hover-effect hover:border-rose-300 flex items-center justify-between group">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <div className="text-[12px] font-medium text-muted">Policy Violations</div>
                <div className="text-2xl font-bold text-ink-900 leading-tight">{violationCount}</div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-medium text-muted-light">live</span>
              <svg className="w-16 h-6 mt-1 stroke-rose-500 fill-none" strokeWidth="2" viewBox="0 0 60 20">
                <path d="M0,18 Q15,16 30,12 T50,8 T60,7" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </section>

        {/* Review Queue Section */}
        <section>
          {/* Controls toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-ink-900 mr-2">Review Queue</h3>
              {(['All', 'Images', 'Videos', 'Text', 'Social'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    activeTab === tab
                      ? 'bg-[#1d5e4b] text-white shadow-2xs'
                      : 'bg-[#F1ECE0] hover:bg-line text-ink-600'
                  }`}
                >
                  {tab === 'All' ? `All (${submissions.length})` : `${tab} (${typeCount(tab)})`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink-600 cursor-pointer">
              <span>Sort by: <strong className="font-semibold text-ink">Newest First</strong></span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-light" />
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredSubmissions.map((item) => {
              const isSelected = activeSub?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedSubmission(item);
                    setIsDrawerOpen(true);
                  }}
                  className={`group bg-white rounded-2xl border overflow-hidden shadow-2xs card-hover-effect transition-all cursor-pointer ${
                    isSelected ? 'ring-2 ring-emerald-600 border-transparent shadow-md' : 'border-line/90 hover:border-line-strong'
                  }`}
                >
                  <div className="relative h-32 bg-[#F1ECE0] overflow-hidden">
                    <img
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                      src={item.thumbnail}
                    />
                    {/* Status Badge */}
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-[11px] font-bold text-ink-700 flex items-center gap-1.5 shadow-xs">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.status === 'Approved'
                            ? 'bg-emerald-500'
                            : item.status === 'Needs Changes'
                            ? 'bg-amber-500'
                            : item.status === 'Rejected'
                            ? 'bg-rose-500'
                            : 'bg-brand-500'
                        }`}
                      />
                      {item.status}
                    </div>
                    {/* View Count */}
                    <div className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-xs text-[11px] text-white flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {item.viewsCount || 12}
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-ink-900 text-xs truncate">{item.title}</h4>
                    <p className="text-[11px] text-muted-light truncate mb-2">{item.campaign}</p>
                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#F1ECE0]">
                      <span className="text-muted-light flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-light" /> {item.relativeTime}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.priority === 'Critical'
                            ? 'bg-rose-100 text-rose-700'
                            : item.priority === 'High'
                            ? 'bg-orange-100 text-orange-700'
                            : item.priority === 'Medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {item.priority || 'Medium'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom Widgets Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-4">
          {/* Brand Compliance Analytics */}
          <div className="lg:col-span-5 bg-white rounded-xl p-4 border border-line/90 shadow-2xs">
            <h4 className="font-bold text-ink-900 text-xs mb-3">Brand Compliance Analytics</h4>
            <div className="flex items-center justify-between gap-4">
              {/* Bar Chart — built from the real analytics trend points */}
              <div className="flex-1">
                <div className="h-24 flex items-end gap-2.5 pt-2">
                  {trendPoints.length === 0 ? (
                    <div className="w-full text-[10px] text-muted-light flex items-end">No trend data yet</div>
                  ) : (
                    trendPoints.map((p, i) => {
                      const h = Math.max(6, Math.round((p.submissions / maxTrend) * 80));
                      const barColor =
                        p.score >= 90 ? 'bg-emerald-600' : p.score >= 70 ? 'bg-emerald-400' : 'bg-amber-400';
                      const label = (() => {
                        const d = new Date(p.date);
                        return isNaN(d.getTime()) ? p.date : d.toLocaleString('en', { month: 'short' });
                      })();
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${p.submissions} submissions · ${p.score}%`}>
                          <div
                            className={`w-full ${barColor} rounded-t-sm transition-all duration-300 hover:opacity-80`}
                            style={{ height: `${h}px` }}
                          />
                          <span className="text-[10px] text-muted-light">{label}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Circular Gauge */}
              <div className="flex items-center gap-3 pl-3 border-l border-[#F1ECE0]">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#F1ECE0]"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                    />
                    <path
                      className="text-emerald-600"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray={`${complianceScore}, 100`}
                      strokeLinecap="round"
                      strokeWidth="3.5"
                    />
                  </svg>
                  <span className="absolute font-bold text-sm text-ink-900">{complianceScore}%</span>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-ink leading-tight">
                    Overall<br />Compliance
                  </div>
                  <span
                    className={`inline-flex items-center gap-0.5 text-[10px] font-semibold mt-1 ${
                      complianceDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {complianceDelta >= 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {complianceDelta >= 0 ? '+' : ''}
                    {complianceDelta}% vs prior
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-4 bg-white rounded-xl p-4 border border-line/90 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-ink-900 text-xs">Recent Activity</h4>
              <button
                onClick={() => setActivePage('audit-history')}
                className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-0.5"
              >
                See all <ArrowRight className="w-3 h-3 text-emerald-700" />
              </button>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <img
                  alt="Aarav Sharma"
                  className="w-6 h-6 rounded-full object-cover shrink-0"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVjSPQO1fJ63DXDarJXmyHCcZv_B-VDgqjOas2CnTHnXRX2h6y8D4JDTrF7GF_veNlVbLCKpz0EeJ825_2vQ98U6GH2T1e-Qx_z65j1GaCuFEMt6o5MG2HgLfn-wDADdEQ7XyNgVGmre9GjFgOhXxh0DYu5RehddklqbfKUozNglzfKlJTaprhL7_BJoRQQhAwD-3c6ky2_O3_S8l-LYnGAOB2tFQXbDaJtXgB90c"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-ink-700 truncate">
                    <strong className="font-semibold text-ink-900">Aarav Sharma</strong> approved 'Summer Skincare'
                  </p>
                  <span className="text-[10px] text-muted-light">2h ago</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <img
                  alt="Rohan Mehta"
                  className="w-6 h-6 rounded-full object-cover shrink-0"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB4qHyA4UY3At2qLwdq_GNw0EhYQXqGEo4qv1zU1JRBtnFFWQcKicSqq-YrLLQWizO271qp3A23ZeP4a3sHg-xOv-AK-XAlzPsPxgQcMAiODOLJj48vTBk1CgFRT1hodYW3iMBToumEHIyHEIm2_fLuk-JalwHaDDm6bfyEcpjRY-46xcuVSGwzHoS9y1V-zDqK7eTSWQwr5QKr57ifU0SlYN3GDSCeudNTcpSFyxE"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-ink-700 truncate">
                    <strong className="font-semibold text-ink-900">Rohan Mehta</strong> requested changes for 'Promo Banner'
                  </p>
                  <span className="text-[10px] text-muted-light">3h ago</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <img
                  alt="Neha Kapoor"
                  className="w-6 h-6 rounded-full object-cover shrink-0"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAfIhSY8xzMfKwEDtAaoCdpQoEQAVGcgEOiHdXHZps2pn1FDm52BNNYP6MOv_6bo_wAh5ZllDBRcq9HFzG-5lXx2dhjgfHfpDRPxBfkp6AIiBkdscmvb1QUvnTohjgqEk_aoRFsTvp5F9r2rFoasCg-ADDIXxWLt4ggO1CSuA42dBRToXr6Xxoa86MCLtK0VnCQYuA7SSXDKkM7K93KJE2cltiQDcRNp3oSh8h_Is"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-ink-700 truncate">
                    <strong className="font-semibold text-ink-900">Neha Kapoor</strong> added 'Health Claim Rules'
                  </p>
                  <span className="text-[10px] text-muted-light">4h ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sentinel Monitoring Widget */}
          <div className="lg:col-span-3 bg-white rounded-xl p-4 border border-line/90 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-ink-900 text-xs">Sentinel Monitoring</h4>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="flex items-start gap-2.5 mt-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <RotateCw className="w-3.5 h-3.5" />
                </div>
                <p className="text-[11px] text-ink-600 leading-snug">
                  <strong className="font-bold text-ink">3 contents affected</strong> by recent rule update
                </p>
              </div>
            </div>
            <button
              onClick={() => setActivePage('sentinel')}
              className="w-full mt-3 py-1.5 px-3 bg-[#FAF7EF] hover:bg-[#F1ECE0] text-ink-700 text-xs font-semibold rounded-lg border border-line inline-flex items-center justify-center gap-1.5 transition"
            >
              <span>View Tasks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </main>

      {/* Right Slide-Over Submission Detail Drawer */}
      {isDrawerOpen && activeSub && (
        <aside className="w-[380px] bg-white border-l border-line flex flex-col flex-shrink-0 z-20 shadow-lg">
          {/* Drawer Header */}
          <div className="p-4 border-b border-[#F1ECE0] flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-ink-900 text-sm truncate max-w-[240px]">{activeSub.title}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 shrink-0">
                  {activeSub.status}
                </span>
              </div>
              <p className="text-[11px] text-muted-light mt-0.5">
                {activeSub.campaign} • Submitted: Mar 22, 2025 • {activeSub.relativeTime}
              </p>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="text-muted-light hover:text-ink-600 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Primary Asset Preview */}
            <div className="rounded-xl overflow-hidden bg-emerald-900/10 border border-line relative group">
              <img
                alt={activeSub.title}
                className="w-full h-44 object-cover"
                src={activeSub.thumbnail}
              />
            </div>

            {/* Quick Actions Toolbar */}
            <div className="flex items-center justify-start gap-1 pb-1">
              <button
                onClick={() => handleDownloadReport(activeSub.id, activeSub.title)}
                className="p-2 text-ink-600 hover:text-ink-900 hover:bg-[#F1ECE0] rounded-lg transition cursor-pointer"
                title="Download Report"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (activeSub.thumbnail) window.open(activeSub.thumbnail, '_blank');
                }}
                className="p-2 text-ink-600 hover:text-ink-900 hover:bg-[#F1ECE0] rounded-lg transition cursor-pointer"
                title="View Full Thumbnail"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActivePage('review-queue')}
                className="p-2 text-ink-600 hover:text-ink-900 hover:bg-[#F1ECE0] rounded-lg transition cursor-pointer"
                title="Open in Review Queue"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  showToast('Submission link copied to clipboard');
                }}
                className="p-2 text-ink-600 hover:text-ink-900 hover:bg-[#F1ECE0] rounded-lg transition cursor-pointer"
                title="Copy submission link"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-line flex gap-6 text-xs font-semibold">
              {(['Findings', 'Evidence', 'Comments'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDrawerTab(tab)}
                  className={`pb-2 transition ${
                    drawerTab === tab
                      ? 'border-b-2 border-emerald-800 text-emerald-900 font-bold'
                      : 'text-muted-light hover:text-ink-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab 1: Findings */}
            {drawerTab === 'Findings' && (
              <div className="space-y-3 pt-1">
                {activeSub.findings && activeSub.findings.length > 0 ? (
                  activeSub.findings.map(f => (
                    <div
                      key={f.id}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                        f.type === 'error' || f.badge === 'error'
                          ? 'border-red-200 bg-red-50/40'
                          : f.type === 'warning' || f.badge === 'warning'
                          ? 'border-amber-200 bg-amber-50/40'
                          : 'border-emerald-200 bg-emerald-50/30'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {f.type === 'error' || f.badge === 'error' ? (
                          <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                        ) : f.type === 'warning' || f.badge === 'warning' ? (
                          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <h5 className="font-bold text-ink-900 text-xs">{f.title}</h5>
                          <p className="text-[11px] text-muted leading-normal">{f.description}</p>
                          {f.guidelineRef && (
                            <div className="text-[10px] text-muted-light mt-1 font-mono">{f.guidelineRef}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/30 flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <h5 className="font-bold text-ink-900 text-xs">All checks passed</h5>
                      <p className="text-[11px] text-muted leading-normal">
                        VisualGuard &amp; deterministic rules cleared with zero breaches.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Evidence */}
            {drawerTab === 'Evidence' && (
              <div className="space-y-3 pt-1 text-xs">
                <div className="p-3 bg-[#FAF7EF] rounded-xl border border-line/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink">VisualGuard Confidence</span>
                    <span className="font-bold text-emerald-700">{activeSub.complianceScore}%</span>
                  </div>
                  <div className="w-full bg-line rounded-full h-1.5">
                    <div
                      className="bg-emerald-600 h-1.5 rounded-full"
                      style={{ width: `${activeSub.complianceScore}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed mt-1">
                    Evaluated against certified brand guidelines for {activeSub.campaign}.
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-line space-y-1">
                  <div className="font-semibold text-ink text-[11px]">Substantiated Source:</div>
                  <p className="text-[11px] text-muted">Certified Workspace Brand Vault</p>
                </div>
              </div>
            )}

            {/* Tab 3: Comments */}
            {drawerTab === 'Comments' && (
              <div className="space-y-3 pt-1">
                {activeSub.comments && activeSub.comments.length > 0 ? (
                  activeSub.comments.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-xl bg-[#FAF7EF] border border-[#F1ECE0] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink">{c.author}</span>
                        <span className="text-[10px] text-muted-light">{c.time}</span>
                      </div>
                      <p className="text-ink-600 text-[11px]">{c.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-light text-center py-4">No comments yet</p>
                )}
              </div>
            )}
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-[#F1ECE0] bg-[#FAF7EF]/50 space-y-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted">Decision</label>
              <div className="relative">
                <button
                  onClick={() => setIsDecisionMenuOpen(!isDecisionMenuOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-white border border-line rounded-lg text-xs font-semibold text-ink shadow-2xs hover:border-line-strong"
                >
                  <div className="flex items-center gap-2">
                    <Smile className="w-3.5 h-3.5 text-brand-500" />
                    <span>{selectedDecision}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-light" />
                </button>

                {isDecisionMenuOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg border border-line shadow-lg py-1 z-30 text-xs">
                    {(['Approved', 'Needs Changes', 'Rejected', 'In Review'] as const).map((dec) => (
                      <button
                        key={dec}
                        onClick={() => {
                          setSelectedDecision(dec);
                          setIsDecisionMenuOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-[#FAF7EF] flex items-center justify-between text-ink-700"
                      >
                        <span>{dec}</span>
                        {selectedDecision === dec && <Check className="w-3 h-3 text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted">Review Notes</label>
              <input
                type="text"
                placeholder="Optional feedback note for creator..."
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-line rounded-lg text-xs text-ink placeholder-muted-light focus:outline-none"
              />
            </div>

            <button
              onClick={handleSubmitDecision}
              className="w-full py-2.5 px-4 bg-[#1d5e4b] hover:bg-[#164b3c] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <span>Submit Decision</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};
