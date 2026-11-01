import React, { useState } from 'react';
import {
  Download,
  Copy,
  ExternalLink,
  Search,
  CheckCircle2,
  Eye,
  Layers,
  Sparkles,
  Share2,
  FileCheck,
  Check,
  Maximize2,
  Clock,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Submission } from '../../../types';
import { api } from '@/services/api';

export const ApprovedContentView: React.FC = () => {
  const { submissions, addToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'All' | 'Social Media' | 'Product Launch' | 'Campaign' | 'Others'>('All');
  const [sortBy, setSortBy] = useState('Newest First');

  // Filter approved items strictly — only approved versions are shown
  const approvedList = submissions.filter(s => s.status === 'Approved');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const selectedItem = approvedList.find(s => s.id === selectedItemId) || approvedList[0] || submissions[0];

  const activeCampaignsCount = new Set(approvedList.map(s => s.campaign)).size;
  const avgComplianceScore = approvedList.length > 0
    ? Math.round(approvedList.reduce((acc, s) => acc + (s.complianceScore || 100), 0) / approvedList.length)
    : 100;

  const filteredItems = approvedList.filter(item => {
    if (activeCategory === 'Social Media' && !item.campaign.toLowerCase().includes('social') && !item.assetType?.includes('social')) return false;
    if (activeCategory === 'Product Launch' && !item.campaign.toLowerCase().includes('launch') && !item.title.toLowerCase().includes('product')) return false;
    if (activeCategory === 'Campaign' && !item.campaign.toLowerCase().includes('campaign') && !item.campaign.toLowerCase().includes('sale')) return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && !item.campaign.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleCopyLink = (title: string) => {
    const url = selectedItem?.thumbnail || `${window.location.origin}/approved/${encodeURIComponent(title)}`;
    navigator.clipboard?.writeText(url);
    addToast('Approved asset link copied to clipboard', 'success');
  };

  const handleDownload = async (title: string) => {
    try {
      if (selectedItem) {
        await api.downloadSubmissionReport(selectedItem.id, 'text');
        addToast(`Downloaded approved compliance package for "${title}"`, 'success');
      }
    } catch {
      addToast('Download failed.', 'error');
    }
  };

  const handleDownloadAll = async () => {
    try {
      await api.downloadSubmissionsCsv('Approved');
      addToast('Downloaded approved content export package (CSV)', 'success');
    } catch {
      addToast('Export failed.', 'error');
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Approved Content</h1>
          <p className="text-xs text-muted mt-0.5">
            Browse, download, and utilize pre-approved brand assets and campaigns.
          </p>
        </div>
        <button
          onClick={handleDownloadAll}
          className="flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export All Approved (CSV)</span>
        </button>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Approved Content */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs card-hover-effect hover:border-brand-300 flex items-center justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Approved Content</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">{approvedList.length}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-medium text-emerald-600">Certified</span>
            <svg className="w-16 h-6 text-brand-500 stroke-current" fill="none" viewBox="0 0 64 24">
              <path d="M0 18 Q 16 8, 32 14 T 64 6" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs card-hover-effect hover:border-emerald-300 flex items-center justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Active Campaigns</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">{activeCampaignsCount}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-medium text-emerald-600">Active</span>
            <svg className="w-16 h-6 text-emerald-500 stroke-current" fill="none" viewBox="0 0 64 24">
              <path d="M0 20 Q 16 16, 32 8 T 64 4" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Avg Compliance Score */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs card-hover-effect hover:border-amber-300 flex items-center justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Avg Compliance Score</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">{avgComplianceScore}%</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-medium text-amber-600">Audit Score</span>
            <svg className="w-16 h-6 text-amber-500 stroke-current" fill="none" viewBox="0 0 64 24">
              <path d="M0 12 Q 16 18, 32 10 T 64 14" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Last Approved */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs card-hover-effect hover:border-grape-200 flex items-center justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-grape-50 text-grape-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Latest Approved</div>
              <div className="text-sm font-bold text-ink-900 tracking-tight mt-1.5">
                {approvedList[0]?.submittedDate || approvedList[0]?.submittedAt || 'Active'}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-medium text-grape-600">Certified</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {(['All', 'Social Media', 'Product Launch', 'Campaign', 'Others'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveCategory(tab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                activeCategory === tab
                  ? 'bg-ink-900 text-white shadow-2xs'
                  : 'bg-white text-ink-600 hover:bg-[#FAF7EF] border border-line/80'
              }`}
            >
              {tab} (
              {tab === 'All'
                ? approvedList.length
                : tab === 'Social Media'
                ? approvedList.filter(i => i.campaign.toLowerCase().includes('social') || i.assetType?.includes('social')).length
                : tab === 'Product Launch'
                ? approvedList.filter(i => i.campaign.toLowerCase().includes('launch') || i.title.toLowerCase().includes('product')).length
                : tab === 'Campaign'
                ? approvedList.filter(i => i.campaign.toLowerCase().includes('campaign') || i.campaign.toLowerCase().includes('sale')).length
                : approvedList.filter(i => !i.campaign.toLowerCase().includes('social') && !i.campaign.toLowerCase().includes('launch')).length}
              )
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-muted-light absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search approved content..."
              className="w-full pl-8.5 pr-3 py-1.5 bg-white border border-line rounded-lg text-xs text-ink placeholder-muted-light focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-medium text-ink shadow-2xs cursor-pointer focus:outline-hidden"
          >
            <option>Sort by: Newest First</option>
            <option>Sort by: Most Viewed</option>
            <option>Sort by: Highest Score</option>
          </select>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Approved Cards List */}
        <div className="lg:col-span-7 space-y-3.5">
          {filteredItems.map(item => {
            const isSelected = selectedItem?.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-brand-50/30 border-brand-400 shadow-xs ring-1 ring-brand-300'
                    : 'bg-white border-line/90 shadow-2xs hover:border-line-strong'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-14 h-14 rounded-xl object-cover border border-line flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-ink-900 truncate">{item.title}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Approved
                      </span>
                    </div>
                    <div className="text-xs text-muted mt-0.5 truncate">
                      {item.campaign} • {item.submittedDate}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-light mt-1">
                      <span>45K views</span>
                      <span>•</span>
                      <span className="text-emerald-600 font-semibold">{item.complianceScore}% Score</span>
                      <span>•</span>
                      <span className="capitalize">{item.assetType}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    <span>View Details</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Content Details */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-line/90 shadow-2xs p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-ink-900 tracking-tight">{selectedItem.title}</h2>
              <p className="text-xs text-muted mt-0.5">{selectedItem.campaign}</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Approved
            </span>
          </div>

          {/* Large Image Preview */}
          <div className="relative rounded-xl overflow-hidden border border-line bg-[#FAF7EF] max-h-[260px] flex items-center justify-center">
            <img
              src={selectedItem.thumbnail}
              alt={selectedItem.title}
              className="w-full h-[240px] object-cover"
            />
          </div>

          {/* Action icon bar */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF7EF] border border-line/80">
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleDownload(selectedItem.title)}
                className="p-1.5 rounded-lg text-ink-600 hover:bg-white hover:text-ink-900 transition-colors cursor-pointer"
                title="Download asset"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleCopyLink(selectedItem.title)}
                className="p-1.5 rounded-lg text-ink-600 hover:bg-white hover:text-ink-900 transition-colors cursor-pointer"
                title="Copy CDN link"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => addToast('Opening full-screen high-res preview', 'info')}
                className="p-1.5 rounded-lg text-ink-600 hover:bg-white hover:text-ink-900 transition-colors cursor-pointer"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs font-semibold text-ink-600">
              Score: <span className="text-emerald-600 font-bold">{selectedItem.complianceScore}%</span>
            </div>
          </div>

          {/* Approval Summary with 98% Gauge */}
          <div className="p-4 rounded-xl border border-line/80 bg-[#FAF7EF]/50 space-y-3">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center relative shadow-xs flex-shrink-0"
                style={{
                  background: `conic-gradient(#10b981 0% ${selectedItem.complianceScore}%, #e2e8f0 ${selectedItem.complianceScore}% 100%)`,
                }}
              >
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[11px] font-extrabold text-ink-900">
                  {selectedItem.complianceScore}%
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-ink-900">Approval Summary</div>
                <div className="text-[11px] text-muted">Certified by VisualGuard and Brand Manager</div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs pt-1">
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Brand Tone &amp; Style</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Passed
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Logo &amp; Clear Space</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Passed
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Colors &amp; Contrast</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Passed
                </span>
              </div>
            </div>
          </div>

          {/* Asset Specs Details */}
          <div className="space-y-2 text-xs border-t border-[#F1ECE0] pt-3">
            <div className="flex justify-between py-1 text-muted">
              <span>Dimensions</span>
              <span className="font-medium text-ink">1920 × 1080 px</span>
            </div>
            <div className="flex justify-between py-1 text-muted">
              <span>File Size &amp; Format</span>
              <span className="font-medium text-ink">4.2 MB • PNG</span>
            </div>
            <div className="flex justify-between py-1 text-muted">
              <span>Approved On</span>
              <span className="font-medium text-ink">{selectedItem.submittedDate} • 10:24 AM</span>
            </div>
            <div className="flex justify-between py-1 text-muted">
              <span>Approved By</span>
              <span className="font-medium text-ink">Brand Manager</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => handleCopyLink(selectedItem.title)}
              className="flex-1 py-2 px-3 bg-white border border-line text-ink-700 rounded-lg text-xs font-semibold hover:bg-[#FAF7EF] shadow-2xs cursor-pointer text-center"
            >
              Copy Link
            </button>
            <button
              onClick={() => handleDownload(selectedItem.title)}
              className="flex-1 py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer text-center"
            >
              Download Asset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
