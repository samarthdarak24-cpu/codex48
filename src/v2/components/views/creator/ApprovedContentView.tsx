import React, { useState } from 'react';
import {
  Download, ExternalLink, Search, CheckCircle2, Eye, Star, Calendar,
  TrendingUp, FileText, X, ArrowUpRight, ArrowDownRight, MoreHorizontal,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Submission } from '../../../types';
import { api } from '@/services/api';
import { StatCardGrid } from '../../ui/StatCard';

export const ApprovedContentView: React.FC = () => {
  const { submissions, addToast, setCurrentPage, setSelectedSubmission } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'All' | 'Social Media' | 'Product Launch' | 'Campaign' | 'Others'>('All');
  const [sortBy, setSortBy] = useState('Latest Approved');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [isDetailOpen, setIsDetailOpen] = useState(true);

  const approvedList = submissions.filter((s) => s.status === 'Approved');
  const selectedItem = approvedList.find((s) => s.id === selectedItemId) || approvedList[0];

  const totalViews = approvedList.reduce((n, s) => n + (s.findingsCount ?? 0) + 1000, 0);
  const avgScore = approvedList.length > 0 ? Math.round(approvedList.reduce((acc, s) => acc + (s.complianceScore || 100), 0) / approvedList.length) : 100;
  const lastApproved = approvedList[0]?.submittedDate || approvedList[0]?.submittedAt || '—';

  const categoryMap: Record<string, (s: Submission) => boolean> = {
    'Social Media': (s) => s.assetType?.toLowerCase().includes('social') || s.campaign?.toLowerCase().includes('social'),
    'Product Launch': (s) => s.campaign?.toLowerCase().includes('launch') || s.title?.toLowerCase().includes('product'),
    'Campaign': (s) => s.campaign?.toLowerCase().includes('campaign') || s.campaign?.toLowerCase().includes('sale'),
    'Others': (s) => true,
  };

  const filtered = approvedList.filter((item) => {
    if (activeCategory !== 'All') {
      const matcher = categoryMap[activeCategory];
      if (matcher && !matcher(item)) return false;
    }
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && !item.campaign.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const cats = {
    'Social Media': approvedList.filter(categoryMap['Social Media']).length,
    'Product Launch': approvedList.filter(categoryMap['Product Launch']).length,
    'Campaign': approvedList.filter(categoryMap['Campaign']).length,
    'Others': approvedList.length,
  };

  return (
    <div className="flex h-full overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-5 bg-canvas">
        {/* Header */}
        <div>
          <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">Approved Content</h1>
          <p className="text-xs text-muted mt-0.5">View and manage all your approved content, ready for publication.</p>
        </div>

        {/* KPI Cards */}
        <StatCardGrid cards={[
    { label: 'Approved Content', value: approvedList.length, icon: <CheckCircle2 className="w-5 h-5" />, variant: 'green', trend: 12, sparkPathIndex: 0 },
    { label: 'Total Views', value: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : String(totalViews), icon: <FileText className="w-5 h-5" />, variant: 'blue', trend: 18, sparkPathIndex: 1 },
    { label: 'Avg Compliance Score', value: `${avgScore}%`, icon: <Star className="w-5 h-5" />, variant: 'amber', trend: 1, sparkPathIndex: 2 },
    { label: 'Last Approved', value: lastApproved, icon: <Calendar className="w-5 h-5" />, variant: 'purple', trend: 0, sparkPathIndex: 3 },
  ]} />

        {/* Filters + Sort */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All', 'Social Media', 'Product Launch', 'Campaign', 'Others'] as const).map((tab) => {
              const cnt = tab === 'All' ? approvedList.length : cats[tab] || 0;
              return (
                <button key={tab} onClick={() => setActiveCategory(tab)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${activeCategory === tab ? 'bg-gradient-to-r from-brand-600 to-blue-500 text-white shadow-sm font-bold' : 'bg-white border border-line text-ink-600 hover:bg-[#FAF7EF]'}`}>
                  {tab} ({cnt})
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-white border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none cursor-pointer">
              <option>Latest Approved</option><option>Highest Score</option>
            </select>
            <div className="flex items-center gap-1 bg-white border border-line rounded-lg px-2 py-1.5 cursor-pointer text-ink-700">Last 30 Days <svg className="w-3 h-3 text-muted-light ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg></div>
          </div>
        </div>

        {/* Content list */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl border border-line p-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-ink-900">No approved content yet.</p>
              <p className="text-xs text-muted mt-1">Submit content for review to see approvals here.</p>
            </div>
          )}
          {filtered.map((item) => {
            const isSelected = selectedItem?.id === item.id;
            return (
              <div key={item.id} onClick={() => { setSelectedItemId(item.id); setIsDetailOpen(true); }}
                className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${isSelected ? 'selected-brand shadow-sm' : 'border-line shadow-2xs hover:border-line-strong hover:shadow-xs'}`}>
                <img src={item.thumbnail} alt={item.title} className="w-14 h-14 rounded-xl object-cover border border-line shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink-900">{item.title}</p>
                  <p className="text-xs text-muted mt-0.5">{item.description}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                    <span className="px-2 py-0.5 bg-[#F1ECE0] rounded-full text-ink-700 font-medium">{item.campaign}</span>
                    <span className="px-2 py-0.5 bg-[#F1ECE0] rounded-full text-ink-700 font-medium">{item.version || 'v1.0'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full badge-approved text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Approved
                  </span>
                  <span className="text-xs text-muted whitespace-nowrap">{item.submittedDate || item.submittedAt || '—'}</span>
                  <button className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer">View Details <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg></button>
                  <button className="p-1.5 rounded-lg text-muted hover:text-ink-700 hover:bg-[#FAF7EF]"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
          {filtered.length > 0 && (
            <p className="text-xs text-muted text-center">Showing 1–{filtered.length} of {filtered.length} approved content</p>
          )}
        </div>
      </main>

      {/* Right detail panel */}
      {isDetailOpen && selectedItem && (
        <aside className="w-[320px] bg-white border-l border-line flex flex-col shrink-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink-900">Content Details</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full badge-approved text-[10px] font-semibold">✓ Approved</span>
            </div>
            <button onClick={() => setIsDetailOpen(false)} className="p-1 rounded-lg text-muted-light hover:text-ink-700"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="rounded-xl overflow-hidden border border-line">
              <img src={selectedItem.thumbnail} alt={selectedItem.title} className="w-full h-40 object-cover" />
            </div>
            <div>
              <p className="font-bold text-ink-900 text-sm">{selectedItem.title}</p>
              <p className="text-xs text-muted mt-0.5">{selectedItem.description}</p>
            </div>

            {/* Approval Summary */}
            <div className="p-3 bg-[#FAF7EF] border border-line rounded-xl space-y-2">
              <p className="text-xs font-bold text-ink-900">Approval Summary</p>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-muted">Approved by:</span>
                <span className="font-medium text-ink">Riya Sharma (Brand Manager)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="w-4 h-4 text-muted shrink-0" />
                <span className="text-muted">Approved on:</span>
                <span className="font-medium text-ink">{selectedItem.submittedDate || selectedItem.submittedAt || '—'}</span>
              </div>
            </div>

            {/* Compliance Score Donut */}
            <div className="p-3 bg-[#FAF7EF] border border-line rounded-xl">
              <p className="text-xs font-bold text-ink-900 mb-3">Compliance Score</p>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="-rotate-90" width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#F1ECE0" strokeWidth="7" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#10b981" strokeWidth="7"
                      strokeDasharray={`${(selectedItem.complianceScore / 100) * (2 * Math.PI * 32)} ${2 * Math.PI * 32}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-base font-bold text-ink-900">{selectedItem.complianceScore}%</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-[10px]">
                  {['Brand Guidelines', 'Claims Compliance', 'Visual Standards', 'Legal & Compliance'].map((label) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-muted">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-line space-y-2 shrink-0">
            <button onClick={async () => { try { await api.downloadSubmissionReport(selectedItem.id, 'text'); addToast('Report downloaded.'); } catch { addToast('Download failed.', 'error'); } }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors cursor-pointer">
              <Download className="w-4 h-4" />Download Report
            </button>
            <button onClick={() => { setSelectedSubmission(selectedItem); setCurrentPage('ai-review'); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer transition-colors cursor-pointer">
              <ExternalLink className="w-4 h-4" />View Submission
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};
