import React, { useState } from 'react';
import { FileText, CheckCircle2, Clock, AlertCircle, Plus, ChevronRight, Eye, RotateCw, UploadCloud, FileCheck, ShieldAlert, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { StatCardGrid } from '../../ui/StatCard';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    Approved: 'badge-approved',
    'In Review': 'badge-inreview',
    Pending: 'badge-pending',
    'Pending Manager Review': 'badge-pending',
    'Changes Requested': 'badge-changes',
    Draft: 'badge-draft',
  };
  const dot: Record<string, string> = { Approved: 'bg-emerald-500', 'In Review': 'bg-blue-500', Pending: 'bg-amber-500', 'Pending Manager Review': 'bg-amber-500', 'Changes Requested': 'bg-orange-500', Draft: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[status] ?? 'badge-draft'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] ?? 'bg-slate-400'}`} />
      {status}
    </span>
  );
};

export const CreatorDashboardView: React.FC = () => {
  const { setCurrentPage, submissions, sentinelAlerts, setSelectedSubmission } = useApp();
  const [activeTab, setActiveTab] = useState('All');

  const approvedCount = submissions.filter((s) => s.status === 'Approved').length;
  const pendingCount = submissions.filter((s) => s.status === 'In Review' || s.status === 'Pending').length;
  const attentionCount = submissions.filter((s) => s.status === 'Needs Changes' || s.status === 'Rejected' || (s.findingsCount ?? 0) > 0).length;
  const openAlerts = sentinelAlerts.filter((a) => a.status === 'Open');

  const briefs = submissions.slice(0, 5).map((s) => ({
    id: s.id, title: s.title, due: s.submittedAt ?? '—', progress: s.complianceScore,
    views: s.findingsCount ?? 0, thumbnail: s.thumbnail,
    brandCheck: (s.findingsCount ?? 0) === 0 ? 'Clean' : `${s.findingsCount} issue${(s.findingsCount ?? 0) === 1 ? '' : 's'}`,
    evidence: (s.findingsCount ?? 0) === 0 ? 'Linked' : 'Pending',
  }));

  const recentSubmissions = submissions.slice(0, 6).map((s) => ({
    id: s.id, title: s.title, updated: s.submittedAt ?? '—',
    status: s.status === 'Needs Changes' ? 'Changes Requested' : s.status === 'In Review' || s.status === 'Pending' ? 'Pending Manager Review' : s.status,
    brandCheck: (s.findingsCount ?? 0) === 0 ? 'Compliant' : `${s.findingsCount} issue${(s.findingsCount ?? 0) === 1 ? '' : 's'}`,
    thumbnail: s.thumbnail, action: s.status === 'Needs Changes' ? 'Review' : s.status === 'Approved' ? 'View' : 'Continue',
  }));

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">Dashboard</h1>
          <p className="text-xs text-muted mt-0.5">Create, check and track brand-compliant content.</p>
        </div>
        <button onClick={() => setCurrentPage('new-content')} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-colors">
          <Plus className="w-4 h-4" />Create Content
        </button>
      </div>

      {/* KPI Cards */}
      <StatCardGrid cards={[
    { label: 'My Submissions', value: submissions.length, icon: <FileText className="w-5 h-5" />, variant: 'blue', trend: 12, sparkPathIndex: 0 },
    { label: 'Approved', value: approvedCount, icon: <CheckCircle2 className="w-5 h-5" />, variant: 'green', trend: 8, sparkPathIndex: 1 },
    { label: 'Pending Review', value: pendingCount, icon: <Clock className="w-5 h-5" />, variant: 'amber', trend: -33, sparkPathIndex: 2 },
    { label: 'Needs Attention', value: attentionCount, icon: <AlertCircle className="w-5 h-5" />, variant: 'pink', trend: 50, sparkPathIndex: 3 },
  ]} />

      {/* Active Content & Briefs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-ink-900">Active Content & Briefs</h2>
            <div className="flex items-center gap-1.5">
              {[`All (${submissions.length})`, 'Product Launch (2)', 'Social Campaign (2)', 'Offers (1)'].map((label) => (
                <button key={label} onClick={() => setActiveTab(label.split(' (')[0])}
                  className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${activeTab === label.split(' (')[0] ? 'bg-gradient-to-r from-brand-600 to-blue-500 text-white shadow-sm font-bold' : 'bg-white border border-line text-ink-600 hover:bg-[#FAF7EF]'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setCurrentPage('my-submissions')} className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer">
            See All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {briefs.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-line p-8 text-center text-xs text-muted">
              <FileText className="w-6 h-6 text-muted-light mx-auto mb-2" /><p className="font-semibold text-ink-900">No content yet</p><p>Create your first piece of content to see it tracked here.</p>
            </div>
          )}
          {briefs.map((b) => (
            <div key={b.id} onClick={() => { const sub = submissions.find((s) => s.id === b.id); if (sub) setSelectedSubmission(sub); setCurrentPage('ai-review'); }}
              className="bg-white rounded-2xl border border-line p-3 shadow-2xs hover:border-brand-400 hover:shadow-xs transition-all cursor-pointer flex flex-col group">
              <div className="relative h-32 rounded-xl overflow-hidden bg-[#F1ECE0] mb-2.5">
                <img src={b.thumbnail} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1"><Eye className="w-3 h-3" />{b.views}</span>
              </div>
              <p className="font-bold text-ink-900 text-xs truncate">{b.title}</p>
              <p className="text-[11px] text-muted-light mt-0.5">{b.due}</p>
              <div className="space-y-1 mt-2 pt-2 border-t border-[#F1ECE0] text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-light">Brand Check:</span>
                  <span className={`font-semibold ${b.brandCheck === 'Clean' ? 'text-emerald-600' : 'text-amber-600'}`}>{b.brandCheck === 'Clean' ? '✓ Clean' : '⚠ ' + b.brandCheck}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-light">Evidence:</span>
                  <span className={`font-semibold ${b.evidence === 'Linked' ? 'text-emerald-600' : 'text-amber-600'}`}>{b.evidence === 'Linked' ? '🔗 Linked' : '⏳ Pending'}</span>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-end text-[10px] font-bold text-ink-700">{b.progress}%</div>
                <div className="w-full bg-[#F1ECE0] rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full rounded-full ${b.progress >= 90 ? 'bg-emerald-500' : b.progress >= 75 ? 'bg-brand-600' : 'bg-amber-500'}`} style={{ width: `${b.progress}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: Recent Submissions + Quick Actions + My Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Submissions */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-line shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#F1ECE0]">
            <h2 className="text-sm font-bold text-ink-900">Recent Submissions</h2>
            <button onClick={() => setCurrentPage('my-submissions')} className="text-xs font-semibold text-brand-600 hover:underline cursor-pointer">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#FAF7EF] border-b border-[#F1ECE0] text-[11px] font-semibold text-muted uppercase tracking-wide">
                  <th className="py-2.5 px-4">Content</th>
                  <th className="py-2.5 px-4">Updated</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Brand Check</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F0E8]">
                {recentSubmissions.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-xs text-muted">No submissions yet.</td></tr>}
                {recentSubmissions.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAF7EF]/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img src={item.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover border border-line shrink-0" />
                        <span className="font-semibold text-ink-900">{item.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted">{item.updated}</td>
                    <td className="py-3 px-4"><StatusBadge status={item.status} /></td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${item.brandCheck === 'Compliant' ? 'text-emerald-600' : item.brandCheck === 'Not checked' ? 'text-muted-light' : 'text-amber-600'}`}>
                        {item.brandCheck === 'Compliant' && '✓ '}
                        {item.brandCheck !== 'Compliant' && item.brandCheck !== 'Not checked' && '⚠ '}
                        {item.brandCheck}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => { const sub = submissions.find((s) => s.id === item.id); if (sub) setSelectedSubmission(sub); if (item.action === 'Review') setCurrentPage('ai-review'); else if (item.action === 'Continue') setCurrentPage('new-content'); else setCurrentPage('my-submissions'); }}
                        className="px-3 py-1 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer">
                        {item.action}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right rail */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-line p-4 shadow-2xs space-y-2">
            <h2 className="text-sm font-bold text-ink-900">Quick Actions</h2>
            {[{ icon: <UploadCloud className="w-4 h-4 text-brand-600" />, label: 'Upload Poster', page: 'new-content' as const },
              { icon: <FileCheck className="w-4 h-4 text-brand-600" />, label: 'Check Copy', page: 'ai-review' as const },
              { icon: <ShieldAlert className="w-4 h-4 text-brand-600" />, label: 'Request Exception', page: 'exception-requests' as const },
            ].map((a) => (
              <button key={a.label} onClick={() => setCurrentPage(a.page)} className="w-full flex items-center justify-between p-3 rounded-xl border border-line hover:bg-[#FAF7EF] transition-colors text-left cursor-pointer group">
                <div className="flex items-center gap-3">{a.icon}<span className="text-xs font-semibold text-ink group-hover:text-brand-700">{a.label}</span></div>
                <ChevronRight className="w-4 h-4 text-muted-light group-hover:text-ink-600" />
              </button>
            ))}
          </div>

          {/* My Tasks */}
          <div className="bg-white rounded-2xl border border-line p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink-900">My Tasks</h2>
              <button onClick={() => setCurrentPage('sentinel-tasks')} className="text-xs font-semibold text-brand-600 hover:underline cursor-pointer">See All →</button>
            </div>
            {openAlerts.length > 0 ? (
              <div onClick={() => setCurrentPage('sentinel-tasks')} className="p-3 bg-purple-50 border border-purple-100 rounded-xl hover:bg-purple-100/60 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0"><RotateCw className="w-4 h-4" /></div>
                  <div>
                    <p className="font-bold text-purple-800">{openAlerts.length} Sentinel reassessment task{openAlerts.length > 1 ? 's' : ''}</p>
                    <p className="text-[11px] text-purple-600 mt-0.5">{openAlerts[0]?.title} • {openAlerts[0]?.detectedOn || 'Active'}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-400" />
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All Sentinel tasks resolved. Content active and compliant.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
