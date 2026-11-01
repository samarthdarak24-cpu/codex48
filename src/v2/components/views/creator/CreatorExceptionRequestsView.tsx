import React, { useState } from 'react';
import { Plus, Clock, CheckCircle2, XCircle, FileText, ChevronRight, X, BookOpen, MessageSquare, ArrowUpRight, ArrowDownRight, MoreHorizontal, Scale } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import { StatCardGrid } from '../../ui/StatCard';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    Approved: 'badge-approved',
    Pending: 'badge-pending',
    'Pending Review': 'badge-pending',
    Rejected: 'badge-rejected',
  };
  const dot: Record<string, string> = { Approved: 'bg-emerald-500', Pending: 'bg-amber-500', 'Pending Review': 'bg-amber-500', Rejected: 'bg-red-500' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${map[status] ?? 'badge-draft'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] ?? 'bg-slate-400'}`} />{status}
    </span>
  );
};

export const CreatorExceptionRequestsView: React.FC = () => {
  const { addToast, exceptions, addNewException, submissions, addComment, guidelines, setSelectedGuideline, setCurrentPage } = useApp();
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newCampaign, setNewCampaign] = useState('');
  const [newReason, setNewReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalCount = exceptions.length;
  const approvedCount = exceptions.filter((e) => e.status === 'Approved').length;
  const pendingCount = exceptions.filter((e) => e.status === 'Pending').length;
  const rejectedCount = exceptions.filter((e) => e.status === 'Rejected').length;

  const selectedRequest = exceptions.find((e) => e.id === selectedRequestId) || exceptions[0];

  const filtered = exceptions.filter((ex) => {
    if (activeTab === 'Pending' && ex.status !== 'Pending') return false;
    if (activeTab === 'Approved' && ex.status !== 'Approved') return false;
    if (activeTab === 'Rejected' && ex.status !== 'Rejected') return false;
    return true;
  });

  const handleSubmit = async () => {
    if (!newReason.trim()) { addToast('Please enter a reason for the exception.', 'error'); return; }
    setIsSubmitting(true);
    try {
      await addNewException({ campaign: newCampaign, requestTitle: newTitle, reason: newReason });
      setIsNewModalOpen(false); setNewTitle(''); setNewCampaign(''); setNewReason('');
    } catch { /* handled by context */ }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-5 bg-canvas">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">Exception Requests</h1>
            <p className="text-xs text-muted mt-0.5">Request exceptions for specific content, claims, or use cases that fall outside standard brand rules.</p>
          </div>
          <button onClick={() => setIsNewModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer shadow-2xs transition-colors cursor-pointer shrink-0">
            <Plus className="w-4 h-4" />Request Exception
          </button>
        </div>

        {/* KPI Cards */}
        <StatCardGrid cards={[
    { label: 'Total Requests', value: totalCount, icon: <FileText className="w-5 h-5" />, variant: 'blue', trend: 12, sparkPathIndex: 0 },
    { label: 'Approved', value: approvedCount, icon: <CheckCircle2 className="w-5 h-5" />, variant: 'green', trend: 8, sparkPathIndex: 1 },
    { label: 'Pending Review', value: pendingCount, icon: <Clock className="w-5 h-5" />, variant: 'amber', trend: -33, sparkPathIndex: 2 },
    { label: 'Rejected', value: rejectedCount, icon: <XCircle className="w-5 h-5" />, variant: 'red', trend: 50, sparkPathIndex: 3 },
  ]} />

        {/* Filters */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((tab) => {
              const cnt = tab === 'All' ? totalCount : tab === 'Pending' ? pendingCount : tab === 'Approved' ? approvedCount : rejectedCount;
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${activeTab === tab ? 'bg-gradient-to-r from-brand-600 to-blue-600 text-white shadow-sm' : 'bg-white border border-line text-ink-600 hover:bg-[#FAF7EF]'}`}>
                  {tab === 'All' ? 'All Requests' : tab} ({cnt})
                </button>
              );
            })}
          </div>
          <select className="bg-white border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none cursor-pointer"><option>Newest First</option></select>
        </div>

        {/* List */}
        <div className="space-y-3">
          {filtered.length === 0 && <div className="bg-white rounded-2xl border border-line p-10 text-center text-xs text-muted">No exception requests found.</div>}
          {filtered.map((ex) => {
            const isSelected = selectedRequest?.id === ex.id;
            return (
              <div key={ex.id} onClick={() => { setSelectedRequestId(ex.id); setIsDetailOpen(true); }}
                className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${isSelected ? 'selected-brand shadow-sm' : 'border-line shadow-2xs hover:border-line-strong hover:shadow-xs'}`}>
                <img src={ex.thumbnail} alt="" className="w-14 h-14 rounded-xl object-cover border border-line shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-ink-900">{ex.requestTitle}</p>
                    <StatusBadge status={ex.status} />
                  </div>
                  <p className="text-xs text-muted mt-0.5 line-clamp-1">{ex.reason}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-light">
                    <span className="flex items-center gap-1"><Scale className="w-3 h-3" />{ex.campaign}</span>
                    <span className="flex items-center gap-1"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>{ex.submittedOn}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer">View Details <ChevronRight className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 rounded-lg text-muted hover:text-ink-700 hover:bg-[#FAF7EF]"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Right detail panel */}
      {isDetailOpen && selectedRequest && (
        <aside className="w-[320px] bg-white border-l border-line flex flex-col shrink-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
            <h3 className="text-sm font-bold text-ink-900">Request Details</h3>
            <button onClick={() => setIsDetailOpen(false)} className="p-1 rounded-lg text-muted-light hover:text-ink-700"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="relative rounded-xl overflow-hidden border border-line">
              <img src={selectedRequest.thumbnail} alt="" className="w-full h-36 object-cover" />
              <div className="absolute top-2 right-2"><StatusBadge status={selectedRequest.status} /></div>
            </div>
            <div>
              <p className="font-bold text-ink-900 text-sm">{selectedRequest.requestTitle}</p>
              <p className="text-xs text-muted mt-1 leading-relaxed">{selectedRequest.reason}</p>
            </div>
            <div className="space-y-0">
              <p className="text-xs font-bold text-ink-900 mb-2">Request Information</p>
              {[['Campaign', selectedRequest.campaign], ['Submitted', selectedRequest.submittedOn], ['Requested By', selectedRequest.creator || 'You'], ['Reason', selectedRequest.reason?.slice(0, 50) + (selectedRequest.reason?.length > 50 ? '…' : '')]].map(([label, val]) => (
                <div key={String(label)} className="flex items-start justify-between py-1.5 border-b border-[#F5F0E8] last:border-0 text-xs">
                  <span className="text-muted shrink-0">{label}</span>
                  <span className="font-medium text-ink text-right ml-3 max-w-[160px]">{val}</span>
                </div>
              ))}
            </div>
            {selectedRequest.managerNotes && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-xs">
                <span className="text-blue-500 shrink-0 mt-0.5">ℹ</span>
                <p className="text-blue-800 leading-relaxed">{selectedRequest.managerNotes}</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-line space-y-2 shrink-0">
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors cursor-pointer">
                <BookOpen className="w-3.5 h-3.5" />View Guideline
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors cursor-pointer">
                <MessageSquare className="w-3.5 h-3.5" />Add Comment
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* New Request Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-line">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <h3 className="font-bold text-ink-900 text-sm">New Exception Request</h3>
              <button onClick={() => setIsNewModalOpen(false)} className="p-1 rounded-lg text-muted-light hover:text-ink-700"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-semibold text-ink-700 mb-1">Request Title</label><input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder='Use of "Best in Class" Claim' className="w-full px-3 py-2 text-xs border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20" /></div>
              <div><label className="block text-xs font-semibold text-ink-700 mb-1">Campaign</label><input value={newCampaign} onChange={(e) => setNewCampaign(e.target.value)} placeholder="Summer Product Launch" className="w-full px-3 py-2 text-xs border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20" /></div>
              <div><label className="block text-xs font-semibold text-ink-700 mb-1">Reason *</label><textarea value={newReason} onChange={(e) => setNewReason(e.target.value)} rows={3} placeholder="Explain why this exception is needed..." className="w-full px-3 py-2 text-xs border border-line rounded-xl focus:outline-none resize-none focus:ring-2 focus:ring-brand-500/20" /></div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setIsNewModalOpen(false)} className="flex-1 py-2 border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 py-2 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer transition-colors disabled:opacity-50 cursor-pointer">
                  {isSubmitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
