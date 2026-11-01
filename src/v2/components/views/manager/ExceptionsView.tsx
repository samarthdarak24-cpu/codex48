import React, { useState } from 'react';
import {
  Scale,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  Calendar,
  MoreVertical,
  X,
  Plus,
  ArrowRight,
  MessageSquare,
  BookOpen,
  Check,
  User,
  Shield,
  Ban,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { ExceptionItem } from '../../../types';
import { api } from '@/services/api';

export const ExceptionsView: React.FC = () => {
  const {
    exceptions,
    selectedException,
    setSelectedException,
    updateExceptionStatus,
    addNewException,
    searchQuery,
    showToast,
    loading,
  } = useApp();

  const [filterTab, setFilterTab] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState('Summer Sale 2026');
  const [newTitle, setNewTitle] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newScope, setNewScope] = useState('');
  const [sortOrder, setSortOrder] = useState<'campaign-az' | 'campaign-za' | 'status'>('campaign-az');
  const [isRevoking, setIsRevoking] = useState(false);

  // Derived counts — never hardcoded.
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
      return (
        ex.campaign.toLowerCase().includes(q) ||
        ex.requestTitle.toLowerCase().includes(q) ||
        ex.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === 'campaign-az') return a.campaign.localeCompare(b.campaign);
    if (sortOrder === 'campaign-za') return b.campaign.localeCompare(a.campaign);
    // status: Pending first, then Approved, then Rejected
    const order: Record<ExceptionItem['status'], number> = { Pending: 0, Approved: 1, Rejected: 2 };
    return order[a.status] - order[b.status];
  });

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('Please enter a request title', 'warning');
      return;
    }
    addNewException({
      campaign: newCampaign,
      requestTitle: newTitle,
      reason: newReason || 'Seasonal brand exception',
      scope: newScope || 'Promotional materials only',
    });
    setIsRequestModalOpen(false);
    setNewTitle('');
    setNewReason('');
    setNewScope('');
  };

  const handleRevoke = (id: string) => {
    setIsRevoking(true);
    api
      .revokeException(id, 'Revoked by brand manager')
      .then(() => {
        showToast('Exception revoked.');
      })
      .catch((err: unknown) =>
        showToast(err instanceof Error ? err.message : 'Could not revoke the exception.', 'error'),
      )
      .finally(() => setIsRevoking(false));
  };

  const StatCard: React.FC<{
    label: string;
    value: number;
    icon: React.ReactNode;
    tone: string;
  }> = ({ label, value, icon, tone }) => (
    <div className="bg-white p-4 rounded-xl border border-line/80 shadow-2xs flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl ${tone} flex items-center justify-center shrink-0`}>{icon}</div>
        <div>
          <p className="text-[11px] font-medium text-muted">{label}</p>
          <h3 className="text-2xl font-bold text-ink-900 leading-tight">{value}</h3>
        </div>
      </div>
      <div className="text-right">
        <span className="text-[10px] font-medium text-muted-light">live</span>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main Table Content */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F7F3EA]">
        {/* Title and Top Action */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink-900">Exceptions</h2>
            <p className="text-xs text-muted mt-0.5">
              Manage exception requests and track their status.
            </p>
          </div>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="py-2 px-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
          >
            <Plus className="w-3.5 h-3.5" /> Request Exception
          </button>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Requests"
            value={totalCount}
            tone="bg-brand-50 text-brand-600"
            icon={<Scale className="w-5 h-5 text-brand-600" />}
          />
          <StatCard
            label="Approved"
            value={approvedCount}
            tone="bg-emerald-50 text-emerald-600"
            icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
          />
          <StatCard
            label="Pending Review"
            value={pendingCount}
            tone="bg-amber-50 text-amber-500"
            icon={<Clock className="w-5 h-5 text-amber-500" />}
          />
          <StatCard
            label="Rejected"
            value={rejectedCount}
            tone="bg-rose-50 text-rose-500"
            icon={<XCircle className="w-5 h-5 text-rose-500" />}
          />
        </div>

        {/* Filter Pills and Dropdowns */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {[
              { id: 'All', label: `All Requests (${totalCount})` },
              { id: 'Pending', label: `Pending (${pendingCount})` },
              { id: 'Approved', label: `Approved (${approvedCount})` },
              { id: 'Rejected', label: `Rejected (${rejectedCount})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterTab(f.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  filterTab === f.id
                    ? 'bg-brand-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-[#FAF7EF] text-ink-600 border border-line'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="pl-3 pr-8 py-1.5 bg-white border border-line rounded-lg text-xs font-medium text-ink-700 hover:bg-[#FAF7EF] cursor-pointer appearance-none"
              >
                <option value="campaign-az">Sort: Campaign (A–Z)</option>
                <option value="campaign-za">Sort: Campaign (Z–A)</option>
                <option value="status">Sort: Status</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-light absolute right-2.5 top-2 pointer-events-none" />
            </div>
            <button
              disabled
              title="Date-range filtering is not available for exception requests."
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-medium text-ink-700 opacity-50 cursor-not-allowed"
            >
              <Calendar className="w-3.5 h-3.5 text-muted-light" />
              <span>Last 30 Days</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-light" />
            </button>
          </div>
        </div>

        {/* Exceptions Table */}
        <div className="bg-white rounded-xl border border-line shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#F1ECE0] bg-[#FAF7EF]/60 text-[11px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-3 px-4 w-10">
                  <input type="checkbox" className="rounded border-line-strong text-brand-600 focus:ring-brand-500 h-4 w-4" />
                </th>
                <th className="py-3 px-3">Campaign</th>
                <th className="py-3 px-3">Request Title</th>
                <th className="py-3 px-3">Reason</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Submitted On</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1ECE0]">
              {loading && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted">
                    Loading exceptions…
                  </td>
                </tr>
              )}
              {!loading && sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted">
                    No exception requests match this filter.
                  </td>
                </tr>
              )}
              {sorted.map((item) => {
                const isSelected = activeException?.id === item.id;
                return (
                  <tr
                    key={item.id}
                    onClick={() => {
                      setSelectedException(item);
                      setIsDrawerOpen(true);
                    }}
                    className={`hover:bg-[#FAF7EF]/80 transition cursor-pointer ${
                      isSelected ? 'bg-brand-50/30' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-line-strong text-brand-600 focus:ring-brand-500 h-4 w-4" />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <img
                          alt={item.campaign}
                          className="w-10 h-10 rounded-lg object-cover border border-line shrink-0"
                          src={item.thumbnail}
                        />
                        <div>
                          <div className="font-semibold text-ink-900">{item.campaign}</div>
                          <div className="text-[11px] text-muted-light">{item.status === 'Approved' ? 'Active exception' : 'Pending review'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-ink">{item.requestTitle}</td>
                    <td className="py-3.5 px-3 text-ink-600 max-w-xs truncate">{item.reason}</td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          item.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                            : item.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200/60'
                            : 'bg-amber-50 text-amber-700 border-amber-200/60'
                        }`}
                      >
                        {item.status === 'Approved' ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : item.status === 'Rejected' ? (
                          <X className="w-3 h-3 text-rose-600" />
                        ) : (
                          <Clock className="w-3 h-3 text-amber-500" />
                        )}
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-[11px] text-muted">{item.submittedOn}</td>
                    <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button className="text-muted-light hover:text-ink-600 p-1">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* Right Drawer: Exception Request Details */}
      {isDrawerOpen && activeException && (
        <aside className="w-[390px] bg-white border-l border-line flex flex-col justify-between shrink-0 z-20 overflow-y-auto shadow-lg">
          <div className="p-5 flex flex-col space-y-5">
            {/* Drawer Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-ink-900 text-sm">Exception Request Details</h3>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                  {activeException.status}
                </span>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="text-muted-light hover:text-ink-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Asset Hero Image */}
            <div className="rounded-xl overflow-hidden border border-line h-36 bg-[#FAF7EF]">
              <img
                alt={activeException.requestTitle}
                className="w-full h-full object-cover"
                src={activeException.thumbnail}
              />
            </div>

            {/* Title & Campaign */}
            <div>
              <h4 className="font-bold text-ink-900 text-base">{activeException.requestTitle}</h4>
              <p className="text-xs text-muted mt-0.5">{activeException.campaign}</p>
            </div>

            {/* Request Information Table */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-ink text-xs">Request Information</div>
              <div className="p-3 rounded-xl bg-[#FAF7EF] border border-line/70 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-light">Campaign:</span>
                  <span className="font-medium text-ink">{activeException.campaign}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-light">Submitted:</span>
                  <span className="font-medium text-ink">{activeException.submittedOn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-light">Creator:</span>
                  <span className="font-medium text-ink">{activeException.creator}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-light">Reason:</span>
                  <span className="font-medium text-ink text-right max-w-[200px]">{activeException.reason}</span>
                </div>
              </div>
            </div>

            {/* Exception Details */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-ink text-xs">Exception Details</div>
              <div className="p-3 rounded-xl bg-[#FAF7EF] border border-line/70 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-light">Scope:</span>
                  <span className="font-medium text-ink">{activeException.scope || 'Headlines and descriptions'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-light">Conditions:</span>
                  <span className="font-medium text-ink">{activeException.conditions || 'Must include disclaimer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-light">Expiry Date:</span>
                  <span className="font-semibold text-ink-900">{activeException.expiryDate || 'No expiry'}</span>
                </div>
              </div>
            </div>

            {/* Manager Notes */}
            <div className="p-3 rounded-xl bg-brand-50/60 border border-brand-100 text-xs text-brand-700 space-y-1">
              <div className="font-bold text-[11px] text-brand-700">Manager Notes</div>
              <p className="text-[11px] text-ink-700 leading-relaxed">
                {activeException.managerNotes || 'No notes recorded yet.'}
              </p>
            </div>
          </div>

          {/* Drawer Actions */}
          <div className="p-4 border-t border-line bg-[#FAF7EF]/50 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled
                title="Comments are not available on exception requests in this workspace."
                className="py-2 px-3 bg-white border border-line text-ink-700 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition opacity-50 cursor-not-allowed"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Add Comment
              </button>
              <button
                disabled
                title="Linked guideline view is not available for exception requests."
                className="py-2 px-3 bg-white border border-line text-ink-700 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition opacity-50 cursor-not-allowed"
              >
                <BookOpen className="w-3.5 h-3.5" /> View Guideline
              </button>
            </div>
            {activeException.status === 'Approved' ? (
              <button
                onClick={() => handleRevoke(activeException.id)}
                disabled={isRevoking}
                className="w-full py-2.5 px-3 bg-white border border-rose-300 hover:bg-rose-50 text-rose-600 font-bold rounded-lg text-xs transition disabled:opacity-50"
              >
                <Ban className="w-3.5 h-3.5 inline mr-1" /> Revoke Exception
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateExceptionStatus(activeException.id, 'Rejected')}
                  className="py-2.5 px-3 bg-white border border-rose-300 hover:bg-rose-50 text-rose-600 font-bold rounded-lg text-xs transition"
                >
                  ✕ Reject
                </button>
                <button
                  onClick={() => updateExceptionStatus(activeException.id, 'Approved')}
                  className="py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs transition shadow-2xs"
                >
                  ✓ Approve Exception
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* New Exception Request Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreateRequest}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-line space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#F1ECE0]">
              <h3 className="font-bold text-ink-900 text-sm">New Brand Exception Request</h3>
              <button type="button" onClick={() => setIsRequestModalOpen(false)} className="text-muted-light hover:text-ink-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="font-semibold text-ink-700 block mb-1">Campaign</label>
              <input
                type="text"
                value={newCampaign}
                onChange={(e) => setNewCampaign(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-lg text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-ink-700 block mb-1">Request Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Use of luxury superlatives in headlines"
                className="w-full px-3 py-2 border border-line rounded-lg text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-ink-700 block mb-1">Business Rationale</label>
              <textarea
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                rows={3}
                placeholder="Explain why this exception is justified and verified by legal..."
                className="w-full px-3 py-2 border border-line rounded-lg text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#F1ECE0]">
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="py-2 px-3 border border-line text-ink-600 font-semibold rounded-lg hover:bg-[#FAF7EF]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg"
              >
                Submit Exception
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
