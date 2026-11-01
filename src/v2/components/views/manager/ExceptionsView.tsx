import React, { useState } from 'react';
import {
  Scale, CheckCircle, Clock, XCircle, ChevronDown, Calendar, MoreVertical, X, Plus,
  ArrowRight, MessageSquare, BookOpen, Check, Ban, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { ExceptionItem } from '../../../types';
import { api } from '@/services/api';
import { StatCardGrid } from '../../ui/StatCard';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    Approved: 'badge-approved',
    Pending: 'badge-pending',
    Rejected: 'badge-rejected',
    Expired: 'badge-draft',
  };
  const dot: Record<string, string> = { Approved: 'bg-emerald-500', Pending: 'bg-amber-500', Rejected: 'bg-red-500', Expired: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${map[status] ?? 'badge-draft'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] ?? 'bg-slate-400'}`} />
      {status}
    </span>
  );
};

export const ExceptionsView: React.FC = () => {
  const { exceptions, selectedException, setSelectedException, updateExceptionStatus, addNewException, searchQuery, showToast, loading } = useApp();

  const [filterTab, setFilterTab] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newScope, setNewScope] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const countBy = (s: ExceptionItem['status']) => exceptions.filter((e) => e.status === s).length;
  const totalCount = exceptions.length;
  const pendingCount = countBy('Pending');
  const approvedCount = countBy('Approved');
  const rejectedCount = countBy('Rejected');

  const activeException = selectedException || exceptions[0];

  const filtered = exceptions.filter((ex) => {
    if (filterTab === 'Pending' && ex.status !== 'Pending') return false;
    if (filterTab === 'Approved' && ex.status !== 'Approved') return false;
    if (filterTab === 'Rejected' && ex.status !== 'Rejected') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return ex.campaign?.toLowerCase().includes(q) || ex.requestTitle?.toLowerCase().includes(q) || ex.reason?.toLowerCase().includes(q);
    }
    return true;
  });

  const toggleSelect = (id: string) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleSubmitRequest = () => {
    if (!newReason.trim()) { showToast('Please enter a reason.', 'error'); return; }
    addNewException({ campaign: newCampaign, requestTitle: newTitle, reason: newReason, scope: newScope });
    setIsRequestModalOpen(false); setNewCampaign(''); setNewTitle(''); setNewReason(''); setNewScope('');
  };

  return (
    <div className="flex h-full overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-5 bg-canvas">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">Exceptions</h1>
            <p className="text-xs text-muted mt-0.5">Manage exception requests and track their status.</p>
          </div>
        </div>

        {/* KPI Cards */}
        <StatCardGrid cards={[
    { label: 'Total Requests', value: totalCount, icon: <Scale className="w-5 h-5" />, variant: 'blue', trend: 8, sparkPathIndex: 0 },
    { label: 'Approved', value: approvedCount, icon: <CheckCircle className="w-5 h-5" />, variant: 'green', trend: 6, sparkPathIndex: 1 },
    { label: 'Pending Review', value: pendingCount, icon: <Clock className="w-5 h-5" />, variant: 'amber', trend: 2, sparkPathIndex: 2 },
    { label: 'Rejected', value: rejectedCount, icon: <XCircle className="w-5 h-5" />, variant: 'red', trend: 1, sparkPathIndex: 3 },
  ]} />

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((tab) => {
              const cnt = tab === 'All' ? totalCount : tab === 'Pending' ? pendingCount : tab === 'Approved' ? approvedCount : rejectedCount;
              return (
                <button key={tab} onClick={() => setFilterTab(tab)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${filterTab === tab ? 'bg-gradient-to-r from-brand-600 to-blue-600 text-white' : 'bg-white border border-line text-ink-600 hover:bg-[#FAF7EF]'}`}>
                  {tab === 'All' ? `All Requests` : tab} ({cnt})
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <select className="bg-white border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none cursor-pointer"><option>Newest First</option></select>
            <div className="flex items-center gap-1 bg-white border border-line rounded-lg px-2 py-1.5 text-xs text-ink-700 cursor-pointer">
              Last 30 Days <ChevronDown className="w-3 h-3 text-muted-light ml-1" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-line shadow-2xs overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 via-blue-50/40 to-pink-50/30 border-b border-slate-200">
                <th className="py-3 px-4 w-8"><input type="checkbox" className="rounded" /></th>
                <th className="py-3 px-4 text-[11px] font-semibold text-muted uppercase tracking-wide">Campaign</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-muted uppercase tracking-wide">Request Title</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-muted uppercase tracking-wide">Reason</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-muted uppercase tracking-wide">Status</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-muted uppercase tracking-wide">Submitted On</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-muted uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F0E8]">
              {filtered.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-xs text-muted">No exception requests found.</td></tr>}
              {filtered.map((ex) => (
                <tr key={ex.id} onClick={() => { setSelectedException(ex); setIsDrawerOpen(true); }}
                  className={`cursor-pointer transition-colors ${selectedException?.id === ex.id ? 'bg-brand-50/40' : 'hover:bg-[#FAF7EF]/60'}`}>
                  <td className="py-3 px-4"><input type="checkbox" checked={selectedIds.includes(ex.id)} onChange={() => toggleSelect(ex.id)} onClick={(e) => e.stopPropagation()} className="rounded" /></td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <img src={ex.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover border border-line shrink-0" />
                      <div>
                        <p className="font-semibold text-ink-900 text-xs">{ex.campaign}</p>
                        <p className="text-[10px] text-muted-light">{ex.expiryDate}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-ink-700 font-medium">{ex.requestTitle}</td>
                  <td className="py-3 px-4 text-xs text-muted max-w-[180px] truncate">{ex.reason}</td>
                  <td className="py-3 px-4"><StatusBadge status={ex.status} /></td>
                  <td className="py-3 px-4 text-xs text-muted whitespace-nowrap">{ex.submittedOn}</td>
                  <td className="py-3 px-4">
                    <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg text-muted hover:text-ink-700 hover:bg-[#FAF7EF] transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-line">
            <p className="text-xs text-muted">Showing 1–{filtered.length} of {filtered.length} exception requests</p>
            <div className="flex items-center gap-1 text-xs">
              {[1,2,3,4,5].map((p) => <button key={p} className={`w-7 h-7 rounded-lg font-semibold transition-colors ${p === 1 ? 'bg-gradient-to-r from-brand-600 to-blue-500 text-white shadow-sm font-bold' : 'border border-line text-muted hover:bg-[#FAF7EF]'}`}>{p}</button>)}
            </div>
          </div>
        </div>
      </main>

      {/* Right panel */}
      {isDrawerOpen && activeException && (
        <aside className="w-[340px] bg-white border-l border-line flex flex-col shrink-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
            <h3 className="text-sm font-bold text-ink-900">Exception Request Details</h3>
            <button onClick={() => setIsDrawerOpen(false)} className="p-1 rounded-lg text-muted-light hover:text-ink-700 hover:bg-[#F1ECE0]"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="relative rounded-xl overflow-hidden border border-line">
              <img src={activeException.thumbnail} alt="" className="w-full h-36 object-cover" />
              <div className="absolute top-2 right-2"><StatusBadge status={activeException.status} /></div>
            </div>
            <div>
              <p className="font-bold text-ink-900 text-sm">{activeException.requestTitle}</p>
              <p className="text-xs text-muted mt-1 leading-relaxed">{activeException.reason}</p>
            </div>
            {/* Request Info */}
            <div className="space-y-0">
              <p className="text-xs font-bold text-ink-900 mb-2">Request Information</p>
              {[['Campaign', activeException.campaign], ['Submitted', activeException.submittedOn], ['Creator', activeException.creator], ['Reason', activeException.reason?.slice(0, 60) + (activeException.reason?.length > 60 ? '…' : '')]].map(([label, val]) => (
                <div key={String(label)} className="flex items-start justify-between py-1.5 border-b border-[#F5F0E8] last:border-0 text-xs">
                  <span className="text-muted shrink-0">{label}</span>
                  <span className="font-medium text-ink text-right ml-4 max-w-[170px]">{val}</span>
                </div>
              ))}
            </div>
            {/* Exception details */}
            {(activeException.scope || activeException.conditions || activeException.expiryDate) && (
              <div className="space-y-0">
                <p className="text-xs font-bold text-ink-900 mb-2">Exception Details</p>
                {[['Scope', activeException.scope], ['Conditions', activeException.conditions], ['Expiry Date', activeException.expiryDate]].filter(([, v]) => v).map(([label, val]) => (
                  <div key={String(label)} className="flex items-start justify-between py-1.5 border-b border-[#F5F0E8] last:border-0 text-xs">
                    <span className="text-muted shrink-0">{label}</span>
                    <span className="font-medium text-ink text-right ml-4 max-w-[170px]">{val}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Manager notes */}
            {activeException.managerNotes && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-xs">
                <span className="text-blue-500 shrink-0 mt-0.5">ℹ</span>
                <p className="text-blue-800 leading-relaxed">{activeException.managerNotes}</p>
              </div>
            )}
          </div>
          {/* Action buttons */}
          <div className="p-4 border-t border-line space-y-2 shrink-0">
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors cursor-pointer">
                <MessageSquare className="w-3.5 h-3.5" />Add Comment
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors cursor-pointer">
                <BookOpen className="w-3.5 h-3.5" />View Guideline
              </button>
            </div>
            {activeException.status === 'Pending' && (
              <div className="flex gap-2">
                <button onClick={() => updateExceptionStatus(activeException.id, 'Rejected', '')} className="flex-1 py-2 bg-white border border-red-300 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                  Reject
                </button>
                <button onClick={() => updateExceptionStatus(activeException.id, 'Approved', '')} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer">
                  Approve Exception
                </button>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
};
