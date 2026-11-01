import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  ChevronRight,
  X,
  BookOpen,
  MessageSquare,
  Layers
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import type { ExceptionRequest, Rule } from '@/lib/types';

export const CreatorExceptionRequestsView: React.FC = () => {
  const {
    addToast,
    exceptions,
    addNewException,
    submissions,
    addComment,
    guidelines,
    setSelectedGuideline,
    setCurrentPage,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [sortBy, setSortBy] = useState('Newest First');

  // New Request Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCampaign, setNewCampaign] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedContentId, setSelectedContentId] = useState<string>('');
  const [selectedRuleCode, setSelectedRuleCode] = useState<string>('');

  // Comment composer state (the action posts to the linked submission).
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);

  // Rules and the raw exception rows are needed to resolve the real guideline
  // document and the real submission a comment belongs to.
  const [rules, setRules] = useState<Rule[]>([]);
  const [rawExceptions, setRawExceptions] = useState<
    Record<string, { contentId?: string; ruleCode?: string; effectiveFrom?: string }>
  >({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.rules().catch(() => [] as Rule[]),
      api.exceptions().catch(() => [] as ExceptionRequest[]),
    ]).then(([ruleRows, exceptionRows]) => {
      if (cancelled) return;
      setRules(ruleRows);
      const map: Record<string, { contentId?: string; ruleCode?: string; effectiveFrom?: string }> = {};
      exceptionRows.forEach((e) => {
        map[e.id] = { contentId: e.contentId, ruleCode: e.ruleCode, effectiveFrom: e.effectiveFrom };
      });
      setRawExceptions(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const requests = useMemo(
    () =>
      exceptions.map((e) => {
        const raw = rawExceptions[e.id];
        const parsed = raw?.effectiveFrom ? Date.parse(raw.effectiveFrom) : NaN;
        const fallback = Date.parse(e.submittedOn);
        return {
          id: e.id,
          title: e.requestTitle,
          description: e.reason,
          fullDescription: e.reason,
          campaign: e.campaign,
          submittedOn: e.submittedOn,
          requestedBy: e.creator,
          reason: e.reason,
          managerNotes: e.managerNotes,
          status: e.status === 'Pending' ? 'Pending Review' : e.status,
          thumbnail: e.thumbnail,
          scope: e.scope,
          conditions: e.conditions,
          expiryDate: e.expiryDate,
          time: Number.isNaN(parsed) ? (Number.isNaN(fallback) ? 0 : fallback) : parsed,
        };
      }),
    [exceptions, rawExceptions],
  );

  const approvedCount = exceptions.filter((e) => e.status === 'Approved').length;
  const pendingCount = exceptions.filter((e) => e.status === 'Pending').length;
  const rejectedCount = exceptions.filter((e) => e.status === 'Rejected').length;

  const filtered = useMemo(() => {
    const rows = requests.filter((r) => {
      if (activeTab === 'Pending') return r.status === 'Pending Review';
      if (activeTab === 'Approved') return r.status === 'Approved';
      if (activeTab === 'Rejected') return r.status === 'Rejected';
      return true;
    });
    const sorted = [...rows];
    if (sortBy === 'Campaign') {
      sorted.sort((a, b) => (a.campaign || '').localeCompare(b.campaign || ''));
    } else {
      const direction = sortBy === 'Oldest First' ? 1 : -1;
      sorted.sort((a, b) => (a.time - b.time) * direction);
    }
    return sorted;
  }, [requests, activeTab, sortBy]);

  const selectedRequest = requests.find((r) => r.id === selectedRequestId) || requests[0];

  // The submission this exception was raised against (real id from the server).
  const linkedSubmission = useMemo(() => {
    const contentId = selectedRequest ? rawExceptions[selectedRequest.id]?.contentId : undefined;
    if (!contentId) return undefined;
    return submissions.find((s) => s.id === contentId);
  }, [rawExceptions, selectedRequest, submissions]);

  // The guideline document that owns the rule this exception targets.
  const linkedGuideline = useMemo(() => {
    const code = selectedRequest ? rawExceptions[selectedRequest.id]?.ruleCode : undefined;
    if (!code) return undefined;
    const rule = rules.find((r) => r.code === code);
    if (!rule?.sourceDocId) return undefined;
    return guidelines.find((g) => g.id === rule.sourceDocId);
  }, [guidelines, rawExceptions, rules, selectedRequest]);

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addNewException({
      campaign: newCampaign,
      requestTitle: newTitle,
      reason: newReason || newDescription || 'Campaign-specific strategic requirement.',
      scope: 'Campaign',
      contentId: selectedContentId || submissions[0]?.id,
      ruleCode: selectedRuleCode || rules[0]?.code || 'CL-04',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    setIsNewModalOpen(false);
    setNewTitle('');
    setNewReason('');
    setNewDescription('');
    setSelectedContentId('');
    setSelectedRuleCode('');
  };

  const handleSendComment = async () => {
    if (!linkedSubmission) return;
    if (!commentBody.trim()) {
      addToast('Write a comment before sending.', 'error');
      return;
    }
    setCommentSaving(true);
    try {
      await addComment(linkedSubmission.id, commentBody.trim());
      setCommentBody('');
      setCommentOpen(false);
    } finally {
      setCommentSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Exception Requests</h1>
          <p className="text-sm text-muted mt-0.5">
            Request exceptions for specific content, claims, or use cases that fall outside standard brand rules.
          </p>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Request Exception</span>
        </button>
      </div>

      {/* 4 KPI Cards matching image 10content.png */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted">Total Requests</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">{exceptions.length}</div>
            <div className="mt-1 text-[10px] font-medium text-muted-light">live</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted">Approved</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">{approvedCount}</div>
            <div className="mt-1 text-[10px] font-medium text-muted-light">live</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted">Pending Review</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">{pendingCount}</div>
            <div className="mt-1 text-[10px] font-medium text-muted-light">live</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted">Rejected</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">{rejectedCount}</div>
            <div className="mt-1 text-[10px] font-medium text-muted-light">live</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-grape-50 text-grape-600 flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs matching 10content.png */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {[
            { id: 'All', label: `All Requests (${exceptions.length})` },
            { id: 'Pending', label: `Pending (${pendingCount})` },
            { id: 'Approved', label: `Approved (${approvedCount})` },
            { id: 'Rejected', label: `Rejected (${rejectedCount})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-white border border-line text-ink-600 hover:bg-[#FAF7EF]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-semibold text-ink-700 shadow-xs cursor-pointer"
          >
            <option>Sort by: Newest First</option>
            <option>Sort by: Oldest First</option>
            <option>Sort by: Campaign</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Card List + Right Rail Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Request Cards List (7 Cols) */}
        <div className="lg:col-span-7 space-y-3.5">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-line shadow-xs p-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-light" />
              <h3 className="mt-3 text-sm font-bold text-ink-900">No exception requests</h3>
              <p className="mt-1 text-xs text-muted">
                {exceptions.length === 0
                  ? 'Raise one with “Request Exception” — it is routed to the governance team.'
                  : 'No request matches this filter.'}
              </p>
            </div>
          ) : (
            filtered.map(req => {
              const isSelected = selectedRequest?.id === req.id;
              return (
                <div
                  key={req.id}
                  onClick={() => {
                    setSelectedRequestId(req.id);
                    setDetailsOpen(true);
                    setCommentOpen(false);
                  }}
                  className={`bg-white rounded-xl border p-4 shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isSelected ? 'border-brand-500 ring-2 ring-brand-500/10' : 'border-line hover:border-line-strong'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={req.thumbnail}
                      alt={req.title}
                      className="w-16 h-16 rounded-lg object-cover border border-line flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-ink-900 truncate">{req.title}</h3>
                      <p className="text-xs text-muted mt-0.5 line-clamp-1">{req.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-light mt-2">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-muted-light" />
                          {req.campaign}
                        </span>
                        <span>•</span>
                        <span>{req.submittedOn}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        req.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : req.status === 'Pending Review'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {req.status}
                    </span>
                    <button className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer">
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Rail: Request Details matching 10content.png (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-line shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1ECE0]">
            <h2 className="text-sm font-bold text-ink-900">Request Details</h2>
            {detailsOpen && selectedRequest && (
              <button
                onClick={() => setDetailsOpen(false)}
                title="Close details"
                className="text-muted-light hover:text-ink-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {!detailsOpen || !selectedRequest ? (
            <div className="py-10 text-center text-xs text-muted-light">
              Select a request to view its details.
            </div>
          ) : (
            <>
              {/* Banner Thumbnail */}
              <div className="rounded-xl overflow-hidden border border-line">
                <img
                  src={selectedRequest.thumbnail}
                  alt={selectedRequest.title}
                  className="w-full h-44 object-cover"
                />
              </div>

              {/* Title & Status */}
              <div>
                <h3 className="text-base font-bold text-ink-900">{selectedRequest.title}</h3>
                <div className="mt-1.5">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      selectedRequest.status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : selectedRequest.status === 'Pending Review'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {selectedRequest.status}
                  </span>
                </div>
                <p className="text-xs text-ink-600 mt-2.5 leading-relaxed">
                  {selectedRequest.fullDescription}
                </p>
              </div>

              {/* Request Information */}
              <div className="space-y-2.5 pt-2 border-t border-[#F1ECE0] text-xs">
                <div className="text-xs font-bold text-ink-900">Request Information</div>
                <div className="flex justify-between py-1 border-b border-[#FAF7EF]">
                  <span className="text-muted">Campaign</span>
                  <span className="font-semibold text-ink-900">{selectedRequest.campaign}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#FAF7EF]">
                  <span className="text-muted">Submitted On</span>
                  <span className="font-semibold text-ink-900">{selectedRequest.submittedOn}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#FAF7EF]">
                  <span className="text-muted">Requested By</span>
                  <span className="font-semibold text-ink-900">{selectedRequest.requestedBy}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted">Reason</span>
                  <span className="font-medium text-ink text-right max-w-[220px]">{selectedRequest.reason}</span>
                </div>
              </div>

              {/* Manager Notes */}
              <div className="p-3 bg-brand-50/70 border border-brand-100 rounded-lg text-xs space-y-1">
                <div className="font-bold text-brand-700 flex items-center gap-1.5">
                  <span>Manager Notes</span>
                </div>
                <p className="text-brand-700 text-[11px] leading-relaxed">
                  {selectedRequest.managerNotes || 'No decision recorded yet.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  disabled={!linkedGuideline}
                  onClick={() => {
                    if (!linkedGuideline) return;
                    setSelectedGuideline(linkedGuideline);
                    setCurrentPage('creator-guidelines');
                  }}
                  title={
                    linkedGuideline
                      ? `Open “${linkedGuideline.title}”`
                      : 'No linked guideline document on this server'
                  }
                  className="flex items-center justify-center gap-1.5 py-2 bg-white border border-line text-ink-700 rounded-lg text-xs font-semibold hover:bg-[#FAF7EF] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <BookOpen className="w-3.5 h-3.5 text-muted" />
                  <span>View Guideline</span>
                </button>
                <button
                  disabled={!linkedSubmission}
                  onClick={() => setCommentOpen((prev) => !prev)}
                  title={
                    linkedSubmission
                      ? `Comment on “${linkedSubmission.title}”`
                      : 'This exception has no linked submission to comment on'
                  }
                  className="flex items-center justify-center gap-1.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Add Comment</span>
                </button>
              </div>

              {/* Real comment composer — posts to the linked submission */}
              {commentOpen && linkedSubmission && (
                <div className="space-y-2 pt-1">
                  <textarea
                    rows={3}
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder={`Comment on “${linkedSubmission.title}”…`}
                    className="w-full px-3 py-2 bg-white border border-line rounded-lg text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCommentOpen(false);
                        setCommentBody('');
                      }}
                      className="px-3 py-1.5 border border-line rounded-lg text-[11px] font-semibold text-ink-700 hover:bg-[#FAF7EF] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!commentBody.trim() || commentSaving}
                      onClick={handleSendComment}
                      className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[11px] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {commentSaving ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* New Request Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-line space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1ECE0]">
              <h2 className="text-base font-bold text-ink-900">New Brand Policy Exception Request</h2>
              <button onClick={() => setIsNewModalOpen(false)} className="text-muted-light hover:text-ink-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-ink-900 mb-1">Request Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Use of 'Best in Class' claim"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-ink-900 mb-1">Campaign</label>
                <select
                  value={newCampaign}
                  onChange={e => setNewCampaign(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select a campaign</option>
                  {Array.from(new Set(submissions.map(s => s.campaign).filter(Boolean))).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-ink-900 mb-1">Target Submission</label>
                <select
                  value={selectedContentId}
                  onChange={e => setSelectedContentId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select a submission (default first)</option>
                  {submissions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.campaign})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-ink-900 mb-1">Governing Rule Exception</label>
                <select
                  value={selectedRuleCode}
                  onChange={e => setSelectedRuleCode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select rule code (default first active rule)</option>
                  {rules.map(r => (
                    <option key={r.id} value={r.code}>
                      {r.code} • {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-ink-900 mb-1">Business Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Highlight product superiority in a competitive market"
                  value={newReason}
                  onChange={e => setNewReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-ink-900 mb-1">Detailed Description &amp; Scope</label>
                <textarea
                  rows={3}
                  placeholder="Provide context, target deliverables, and rationale..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#F1ECE0]">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-line rounded-lg text-ink-700 font-semibold hover:bg-[#FAF7EF] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submissions.length === 0}
                  title={submissions.length === 0 ? 'Create a submission first' : undefined}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
