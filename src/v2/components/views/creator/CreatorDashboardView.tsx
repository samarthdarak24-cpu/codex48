import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ChevronRight,
  Eye,
  RotateCw,
  UploadCloud,
  FileCheck,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const CreatorDashboardView: React.FC = () => {
  const { setCurrentPage, submissions, sentinelAlerts, setSelectedSubmission } = useApp();
  const [activeTab, setActiveTab] = useState<'All'>('All');

  // Every row below is derived from the workspace's real submissions.
  const approvedCount = submissions.filter((s) => s.status === 'Approved').length;
  const pendingCount = submissions.filter((s) => s.status === 'In Review' || s.status === 'Pending').length;
  const attentionCount = submissions.filter(
    (s) => s.status === 'Needs Changes' || s.status === 'Rejected' || (s.findingsCount ?? 0) > 0,
  ).length;
  const openAlerts = sentinelAlerts.filter((a) => a.status === 'Open');

  const briefs = submissions.slice(0, 5).map((s) => ({
    id: s.id,
    title: s.title,
    due: s.submittedAt ?? '—',
    progress: s.complianceScore,
    views: s.findingsCount ?? 0,
    thumbnail: s.thumbnail,
    brandCheck:
      (s.findingsCount ?? 0) === 0
        ? 'Clean'
        : `${s.findingsCount} issue${(s.findingsCount ?? 0) === 1 ? '' : 's'}`,
    evidence: (s.findingsCount ?? 0) === 0 ? 'Linked' : 'Pending',
  }));

  const recentSubmissions = submissions.slice(0, 6).map((s) => ({
    id: s.id,
    title: s.title,
    updated: s.submittedAt ?? '—',
    status:
      s.status === 'Needs Changes'
        ? 'Changes Requested'
        : s.status === 'In Review' || s.status === 'Pending'
          ? 'Pending Manager Review'
          : s.status,
    brandCheck:
      (s.findingsCount ?? 0) === 0
        ? 'Compliant'
        : `${s.findingsCount} issue${(s.findingsCount ?? 0) === 1 ? '' : 's'}`,
    thumbnail: s.thumbnail,
    action: s.status === 'Needs Changes' ? 'Review' : s.status === 'Approved' ? 'View' : 'Continue',
  }));

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Top Header matching 1content.png */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted mt-0.5">
            Create, check and track brand-compliant content.
          </p>
        </div>
        <button
          onClick={() => setCurrentPage('new-content')}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-600 hover:from-brand-700 hover:to-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 cursor-pointer transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Create Content</span>
        </button>
      </div>

      {/* 4 KPI Cards with smooth SVG sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* My Submissions */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs card-hover-effect hover:border-brand-300 flex items-center justify-between group">
          <div>
            <div className="text-xs font-medium text-muted">My Submissions</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">{submissions.length}</div>
            <div className="mt-1 text-[10px] font-medium text-muted-light">live</div>
          </div>
          <div className="flex flex-col items-end">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <FileText className="w-5 h-5" />
            </div>
            <svg className="w-16 h-5 mt-2 stroke-brand-500 fill-none" strokeWidth="2" viewBox="0 0 60 20">
              <path d="M0,15 Q15,18 25,12 T50,14 T60,6" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs card-hover-effect hover:border-emerald-300 flex items-center justify-between group">
          <div>
            <div className="text-xs font-medium text-muted">Approved</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">{approvedCount}</div>
            <div className="mt-1 text-[10px] font-medium text-muted-light">live</div>
          </div>
          <div className="flex flex-col items-end">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <svg className="w-16 h-5 mt-2 stroke-emerald-500 fill-none" strokeWidth="2" viewBox="0 0 60 20">
              <path d="M0,16 Q20,10 35,14 T60,4" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs card-hover-effect hover:border-amber-300 flex items-center justify-between group">
          <div>
            <div className="text-xs font-medium text-muted">Pending Review</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">{pendingCount}</div>
            <div className="mt-1 text-[10px] font-medium text-muted-light">live</div>
          </div>
          <div className="flex flex-col items-end">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Clock className="w-5 h-5" />
            </div>
            <svg className="w-16 h-5 mt-2 stroke-amber-500 fill-none" strokeWidth="2" viewBox="0 0 60 20">
              <path d="M0,8 Q20,18 40,12 T60,16" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Needs Attention */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs card-hover-effect hover:border-rose-300 flex items-center justify-between group">
          <div>
            <div className="text-xs font-medium text-muted">Needs Attention</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">{attentionCount}</div>
            <div className="mt-1 text-[10px] font-medium text-muted-light">live</div>
          </div>
          <div className="flex flex-col items-end">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <AlertCircle className="w-5 h-5" />
            </div>
            <svg className="w-16 h-5 mt-2 stroke-rose-500 fill-none" strokeWidth="2" viewBox="0 0 60 20">
              <path d="M0,18 Q15,8 35,16 T60,6" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Active Content & Briefs Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-ink-900">Active Content &amp; Briefs</h2>
            <div className="flex items-center gap-1.5">
              {[{ id: 'All' as const, label: `All (${submissions.length})` }].map(pill => (
                <button
                  key={pill.id}
                  onClick={() => setActiveTab(pill.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                    activeTab === pill.id
                      ? 'bg-brand-600 text-white shadow-2xs'
                      : 'bg-white border border-line text-ink-600 hover:bg-[#FAF7EF]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setCurrentPage('my-submissions')}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>See All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 5 Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {briefs.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-line/90 p-6 shadow-2xs text-xs text-muted flex flex-col items-center gap-2 text-center">
              <FileText className="w-5 h-5 text-muted-light" />
              <span className="font-semibold text-ink-900">No content yet</span>
              <span>Create your first piece of content to see it tracked here.</span>
            </div>
          )}
          {briefs.map(b => (
            <div
              key={b.id}
              onClick={() => {
                const sub = submissions.find(s => s.id === b.id);
                if (sub) setSelectedSubmission(sub);
                setCurrentPage('ai-review');
              }}
              className="bg-white rounded-2xl border border-line/90 p-3 shadow-2xs hover:border-brand-400 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-32 rounded-xl overflow-hidden bg-[#F1ECE0] mb-2.5">
                  <img
                    src={b.thumbnail}
                    alt={b.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{b.views}</span>
                  </span>
                </div>

                <h3 className="font-bold text-ink-900 text-xs truncate">{b.title}</h3>
                <div className="text-[11px] text-muted-light mt-0.5">{b.due}</div>

                <div className="space-y-1 mt-2.5 pt-2 border-t border-[#F1ECE0] text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-light">Brand Check:</span>
                    <span
                      className={`font-semibold ${
                        b.brandCheck === 'Clean' ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {b.brandCheck === 'Clean' ? '✓ Clean' : '⚠ ' + b.brandCheck}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-light">Evidence:</span>
                    <span
                      className={`font-semibold ${
                        b.evidence === 'Linked' ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {b.evidence === 'Linked' ? '🔗 Linked' : '⏳ Pending'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 mt-3">
                <div className="flex justify-end text-[10px] font-bold text-ink-700">
                  {b.progress}%
                </div>
                <div className="w-full bg-[#F1ECE0] rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      b.progress >= 90
                        ? 'bg-emerald-500'
                        : b.progress >= 75
                        ? 'bg-brand-600'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${b.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Grid: Recent Submissions (8 Cols) + Quick Actions / My Tasks (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Submissions Table (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-line/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#F1ECE0] flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink-900">Recent Submissions</h2>
            <button
              onClick={() => setCurrentPage('my-submissions')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#FAF7EF] text-[11px] font-bold text-muted-light uppercase tracking-wider border-b border-[#F1ECE0]">
                  <th className="py-3 px-4">Content</th>
                  <th className="py-3 px-4">Updated</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Brand Check</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1ECE0]">
                {recentSubmissions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-xs text-muted">
                      No submissions in this workspace yet.
                    </td>
                  </tr>
                )}
                {recentSubmissions.map(item => (
                  <tr key={item.id} className="hover:bg-[#FAF7EF]/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover border border-line"
                        />
                        <span className="font-bold text-ink-900">{item.title}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted">{item.updated}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          item.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'Changes Requested'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : item.status === 'Pending Manager Review'
                            ? 'bg-brand-50 text-brand-700 border border-brand-200'
                            : 'bg-[#F1ECE0] text-ink-600'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                          item.brandCheck === 'Compliant'
                            ? 'text-emerald-600'
                            : item.brandCheck === 'Not checked'
                            ? 'text-muted-light'
                            : 'text-amber-600'
                        }`}
                      >
                        {item.brandCheck === 'Compliant' && '✓'}
                        {item.brandCheck !== 'Compliant' && item.brandCheck !== 'Not checked' && '⚠'}
                        <span>{item.brandCheck}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          const sub = submissions.find(s => s.id === item.id);
                          if (sub) setSelectedSubmission(sub);
                          if (item.action === 'Review') setCurrentPage('ai-review');
                          else if (item.action === 'Continue') setCurrentPage('new-content');
                          else setCurrentPage('my-submissions');
                        }}
                        className="px-3 py-1 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                      >
                        {item.action}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Rail: Quick Actions & My Tasks (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-line/90 p-5 shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-ink-900">Quick Actions</h2>
            <div className="space-y-2 text-xs">
              <button
                onClick={() => setCurrentPage('new-content')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-line hover:bg-[#FAF7EF] transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <UploadCloud className="w-4 h-4 text-brand-600" />
                  <span className="font-semibold text-ink group-hover:text-brand-700">Upload Poster</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-light group-hover:text-ink-600" />
              </button>

              <button
                onClick={() => setCurrentPage('ai-review')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-line hover:bg-[#FAF7EF] transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <FileCheck className="w-4 h-4 text-brand-600" />
                  <span className="font-semibold text-ink group-hover:text-brand-700">Check Copy</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-light group-hover:text-ink-600" />
              </button>

              <button
                onClick={() => setCurrentPage('exception-requests')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-line hover:bg-[#FAF7EF] transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-4 h-4 text-brand-600" />
                  <span className="font-semibold text-ink group-hover:text-brand-700">Request Exception</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-light group-hover:text-ink-600" />
              </button>
            </div>
          </div>

          {/* My Tasks */}
          <div className="bg-white rounded-2xl border border-line/90 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink-900">My Tasks</h2>
              <button
                onClick={() => setCurrentPage('sentinel-tasks')}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                See All →
              </button>
            </div>

            {openAlerts.length > 0 ? (
              <div
                onClick={() => setCurrentPage('sentinel-tasks')}
                className="p-3 bg-grape-50/70 border border-grape-100 rounded-xl hover:bg-grape-100/60 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-grape-100 text-grape-700 flex items-center justify-center flex-shrink-0">
                    <RotateCw className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-grape-700">
                      {openAlerts.length} Sentinel reassessment task{openAlerts.length === 1 ? '' : 's'}
                    </div>
                    <div className="text-[11px] text-grape-700 mt-0.5">
                      {openAlerts[0]?.title} • {openAlerts[0]?.detectedOn || 'Active'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-grape-500" />
              </div>
            ) : (
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center gap-3 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>All Sentinel tasks resolved. Content active and compliant.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
