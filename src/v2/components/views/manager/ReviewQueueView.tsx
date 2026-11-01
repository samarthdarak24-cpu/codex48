import React, { useState } from 'react';
import {
  Filter,
  User,
  Layers,
  AlertTriangle,
  SlidersHorizontal,
  ChevronDown,
  Wand2,
  Clock,
  CircleAlert,
  Image as ImageIcon,
  Download,
  Eye,
  GitCompare,
  MoreHorizontal,
  X,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Activity,
  Zap,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Submission, SubmissionStatus } from '../../../types';
import { api } from '@/services/api';

export const ReviewQueueView: React.FC = () => {
  const {
    submissions,
    selectedSubmission,
    setSelectedSubmission,
    updateSubmissionStatus,
    setIsAiCompareOpen,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'Findings' | 'Evidence' | 'Comments'>('Findings');
  const [decisionChoice, setDecisionChoice] = useState<SubmissionStatus>('Needs Changes');
  const [managerNote, setManagerNote] = useState('');
  const [bottomFeedTab, setBottomFeedTab] = useState<'Comments' | 'Activity'>('Comments');
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Group submissions by status for the 4 Kanban columns
  const inReviewList = submissions.filter((s) => s.status === 'In Review' || s.status === 'Pending');
  const needsChangesList = submissions.filter((s) => s.status === 'Needs Changes');
  const approvedList = submissions.filter((s) => s.status === 'Approved');
  const rejectedList = submissions.filter((s) => s.status === 'Rejected');

  const activeSub = selectedSubmission || submissions[0];

  const handleDecision = (status: SubmissionStatus) => {
    if (activeSub) {
      updateSubmissionStatus(activeSub.id, status, managerNote);
      setManagerNote('');
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Center Main Kanban Space */}
      <main className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4 bg-[#F7F3EA]">
        {/* Sub-header & Title */}
        <div>
          <h1 className="text-xl font-bold text-ink-900 tracking-tight">Review Queue</h1>
          <p className="text-xs text-muted mt-0.5">
            Review content, verify evidence, and manage brand decisions.
          </p>
        </div>

        {/* Controls & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button className="px-2.5 py-1.5 bg-white border border-line rounded-lg font-medium text-ink-700 hover:bg-[#FAF7EF] flex items-center gap-2 shadow-2xs text-xs">
              <Filter className="w-3 h-3 text-muted-light" /> All campaigns <ChevronDown className="w-3 h-3 text-muted-light" />
            </button>
            <button className="px-2.5 py-1.5 bg-white border border-line rounded-lg font-medium text-ink-700 hover:bg-[#FAF7EF] flex items-center gap-2 shadow-2xs text-xs">
              <User className="w-3 h-3 text-muted-light" /> All creators <ChevronDown className="w-3 h-3 text-muted-light" />
            </button>
            <button className="px-2.5 py-1.5 bg-white border border-line rounded-lg font-medium text-ink-700 hover:bg-[#FAF7EF] flex items-center gap-2 shadow-2xs text-xs">
              <Layers className="w-3 h-3 text-muted-light" /> All statuses <ChevronDown className="w-3 h-3 text-muted-light" />
            </button>
            <button className="px-2.5 py-1.5 bg-white border border-line rounded-lg font-medium text-ink-700 hover:bg-[#FAF7EF] flex items-center gap-2 shadow-2xs text-xs">
              <AlertTriangle className="w-3 h-3 text-muted-light" /> Risk level <ChevronDown className="w-3 h-3 text-muted-light" />
            </button>
            <button className="px-2.5 py-1.5 bg-white border border-line rounded-lg font-medium text-ink-700 hover:bg-[#FAF7EF] flex items-center gap-1.5 shadow-2xs text-xs">
              <SlidersHorizontal className="w-3 h-3 text-muted" /> Filter
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted bg-white border border-line px-2.5 py-1.5 rounded-lg shadow-2xs">
              <span>Sort by:</span>
              <span className="font-semibold text-ink">Newest first</span>
              <ChevronDown className="w-3 h-3 text-muted-light ml-0.5" />
            </div>
            <button
              onClick={() => setIsAiCompareOpen(true)}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-semibold hover:bg-emerald-100 flex items-center gap-1.5 text-xs shadow-2xs transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5 text-emerald-600" /> AI Compare
            </button>
          </div>
        </div>

        {/* Kanban Board Grid (4 Columns) */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 items-start">
          {/* Column 1: In Review */}
          <div className="bg-[#F1ECE0]/70 rounded-xl p-2.5 border border-line/80 flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-500" />
                <span className="font-semibold text-ink text-xs">In Review</span>
              </div>
              <span className="bg-brand-100 text-brand-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                {inReviewList.length}
              </span>
            </div>

            {inReviewList.map((card) => {
              const isSelected = activeSub?.id === card.id;
              return (
                <div
                  key={card.id}
                  onClick={() => {
                    setSelectedSubmission(card);
                    setIsInspectorOpen(true);
                  }}
                  className={`bg-white p-2.5 rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'border-2 border-brand-500 shadow-sm'
                      : 'border border-line hover:border-line-strong shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex gap-2.5">
                    <div className="relative w-14 h-14 rounded-md overflow-hidden bg-[#F1ECE0] shrink-0 border border-line">
                      <img alt={card.title} className="w-full h-full object-cover" src={card.thumbnail} />
                      <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[9px] px-1 rounded flex items-center gap-0.5">
                        <ImageIcon className="w-2.5 h-2.5" /> 1
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className="font-bold text-ink text-xs truncate">{card.title}</h4>
                      </div>
                      <p className="text-[10px] text-muted truncate mt-0.5">{card.campaign}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-light mt-1">
                        <User className="w-3 h-3 text-muted-light" />
                        <span className="truncate">by {card.creator.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-[#F1ECE0] flex items-center justify-between text-[10px]">
                    <span className="text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <CircleAlert className="w-2.5 h-2.5 text-rose-500" /> {card.findingsCount || 2} findings
                    </span>
                    <div className="flex items-center gap-1.5 text-muted-light">
                      <Clock className="w-3 h-3" /> {card.relativeTime}
                      <span className="bg-brand-50 text-brand-600 font-medium px-1.5 py-0.5 rounded text-[10px]">
                        In review
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Column 2: Needs Changes */}
          <div className="bg-[#F1ECE0]/70 rounded-xl p-2.5 border border-line/80 flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-semibold text-ink text-xs">Needs Changes</span>
              </div>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                {needsChangesList.length}
              </span>
            </div>

            {needsChangesList.map((card) => {
              const isSelected = activeSub?.id === card.id;
              return (
                <div
                  key={card.id}
                  onClick={() => {
                    setSelectedSubmission(card);
                    setIsInspectorOpen(true);
                  }}
                  className={`bg-white p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-2 border-amber-500 shadow-sm'
                      : 'border-line hover:border-line-strong shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex gap-2.5">
                    <div className="relative w-14 h-14 rounded-md overflow-hidden bg-[#F1ECE0] shrink-0 border border-line">
                      <img alt={card.title} className="w-full h-full object-cover" src={card.thumbnail} />
                      <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[9px] px-1 rounded flex items-center">
                        <ImageIcon className="w-2.5 h-2.5" /> 1
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-ink text-xs truncate">{card.title}</h4>
                      <p className="text-[10px] text-muted truncate mt-0.5">{card.campaign}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-light mt-1">
                        <User className="w-3 h-3 text-muted-light" />
                        <span className="truncate">by {card.creator.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-[#F1ECE0] flex items-center justify-between text-[10px]">
                    <span className="text-muted-light flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {card.relativeTime}
                    </span>
                    <span className="bg-amber-50 text-amber-700 font-medium px-1.5 py-0.5 rounded">
                      Needs Changes
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Column 3: Approved */}
          <div className="bg-[#F1ECE0]/70 rounded-xl p-2.5 border border-line/80 flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-ink text-xs">Approved</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                {approvedList.length}
              </span>
            </div>

            {approvedList.map((card) => {
              const isSelected = activeSub?.id === card.id;
              return (
                <div
                  key={card.id}
                  onClick={() => {
                    setSelectedSubmission(card);
                    setIsInspectorOpen(true);
                  }}
                  className={`bg-white p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-2 border-emerald-500 shadow-sm'
                      : 'border-line hover:border-line-strong shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex gap-2.5">
                    <div className="relative w-14 h-14 rounded-md overflow-hidden bg-[#F1ECE0] shrink-0 border border-line">
                      <img alt={card.title} className="w-full h-full object-cover" src={card.thumbnail} />
                      <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[9px] px-1 rounded flex items-center">
                        <ImageIcon className="w-2.5 h-2.5" /> 1
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-ink text-xs truncate">{card.title}</h4>
                      <p className="text-[10px] text-muted truncate mt-0.5">{card.campaign}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-light mt-1">
                        <User className="w-3 h-3 text-muted-light" />
                        <span className="truncate">by {card.creator.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-[#F1ECE0] flex items-center justify-between text-[10px]">
                    <span className="text-muted-light flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {card.relativeTime}
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 font-medium px-1.5 py-0.5 rounded">
                      Approved
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Column 4: Rejected */}
          <div className="bg-[#F1ECE0]/70 rounded-xl p-2.5 border border-line/80 flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="font-semibold text-ink text-xs">Rejected</span>
              </div>
              <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                {rejectedList.length}
              </span>
            </div>

            {rejectedList.map((card) => {
              const isSelected = activeSub?.id === card.id;
              return (
                <div
                  key={card.id}
                  onClick={() => {
                    setSelectedSubmission(card);
                    setIsInspectorOpen(true);
                  }}
                  className={`bg-white p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-2 border-rose-500 shadow-sm'
                      : 'border-line hover:border-line-strong shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex gap-2.5">
                    <div className="relative w-14 h-14 rounded-md overflow-hidden bg-[#F1ECE0] shrink-0 border border-line">
                      <img alt={card.title} className="w-full h-full object-cover" src={card.thumbnail} />
                      <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[9px] px-1 rounded flex items-center">
                        <ImageIcon className="w-2.5 h-2.5" /> 1
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-ink text-xs truncate">{card.title}</h4>
                      <p className="text-[10px] text-muted truncate mt-0.5">{card.campaign}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-light mt-1">
                        <User className="w-3 h-3 text-muted-light" />
                        <span className="truncate">by {card.creator.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-[#F1ECE0] flex items-center justify-between text-[10px]">
                    <span className="text-muted-light flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {card.relativeTime}
                    </span>
                    <span className="bg-rose-50 text-rose-600 font-medium px-1.5 py-0.5 rounded">
                      Rejected
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom Comments and Activity Card */}
        <section className="bg-white rounded-xl border border-line p-4 mt-1 shadow-2xs">
          <div className="flex items-center gap-6 border-b border-line pb-2 mb-3">
            <button
              onClick={() => setBottomFeedTab('Comments')}
              className={`font-semibold text-xs pb-2 -mb-2 transition ${
                bottomFeedTab === 'Comments'
                  ? 'border-b-2 border-brand-600 text-brand-600'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Comments (3)
            </button>
            <button
              onClick={() => setBottomFeedTab('Activity')}
              className={`font-semibold text-xs pb-2 -mb-2 transition ${
                bottomFeedTab === 'Activity'
                  ? 'border-b-2 border-brand-600 text-brand-600'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Activity
            </button>
          </div>

          {bottomFeedTab === 'Comments' ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <img
                  alt="Diya Sharma"
                  className="w-6 h-6 rounded-full object-cover shrink-0"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlDqM5aAocPVBZpg02QFpfs3bS1mDrDs2tXvpMg06TMpWmVvPzF8q6kN-im8VW6t0Ni3KbduAoo4QtG1nMT9wKoGhi2vKPo_myDGGWfHhllV0Ma8GJIq48CyBKTUdPHNyzzZ9S559TkhH3_OYlF-MTmyE7LHKTNviZ40a-XNW5VPASCkPt2_NkBNog1fxp0FMiVUcXTGvbfI1HNkgHCPjLWfwwuJa9F87zVUvDv38"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink text-xs">Diya Sharma</span>
                    <span className="text-muted-light text-[10px]">2h ago</span>
                  </div>
                  <p className="text-ink-600 text-xs mt-0.5 leading-relaxed">
                    Please adjust the logo placement as per brand guidelines. Also ensure the text is not absolute.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <img
                  alt="Rohan Mehta"
                  className="w-6 h-6 rounded-full object-cover shrink-0"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjQEOO_EvoiBNqgbva-17V6TBQjjuVYpR_FgpkyaEQkSMOQqjyVJjfkkyTBekMdBjrgq7vSM2QqPtldTD0Lo9G4lLxSsCJHZrZfe_mmkylgeuHlXrbL8B6nHqTXW3fXrAexBZ-pC6GpL7hYqAP9BHPl72joFgU4L8YbF1D37OF_lgnOcPaMQnTq7huNz6ZjJGhO1Sa6puaej5wyVhHIO0ekpsz8PKSzKzaEqwN-Oo"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink text-xs">Rohan Mehta</span>
                    <span className="text-muted-light text-[10px]">3h ago</span>
                  </div>
                  <p className="text-ink-600 text-xs mt-0.5 leading-relaxed">
                    Got it, will update the creative and resubmit.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 shrink-0">
                  <Zap className="w-3 h-3" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink text-xs">System</span>
                    <span className="text-muted-light text-[10px]">4h ago</span>
                  </div>
                  <p className="text-muted text-xs mt-0.5">
                    Version 3 submitted • VisualGuard completed • Evidence retrieved
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-xs text-ink-600">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-brand-600" />
                <span>VisualGuard automated checks completed on 4 assets.</span>
                <span className="text-muted-light text-[10px]">1h ago</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                <span>Riya Sharma assigned as lead creative for Summer Sale.</span>
                <span className="text-muted-light text-[10px]">3h ago</span>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Right Inspector Drawer */}
      {isInspectorOpen && activeSub && (
        <aside className="w-96 bg-white border-l border-line flex flex-col justify-between shrink-0 z-10 overflow-y-auto shadow-lg">
          <div className="p-4 flex flex-col">
            {/* Top Title and Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-ink-900 text-sm truncate max-w-[210px]">{activeSub.title}</h3>
                <span className="bg-brand-50 text-brand-600 font-semibold px-2 py-0.5 rounded text-[10px]">
                  {activeSub.status}
                </span>
              </div>
              <button
                onClick={() => setIsInspectorOpen(false)}
                className="text-muted-light hover:text-ink-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-muted-light mt-1">
              1600 × 1200 • Created Nov 01, 2026 • Campaign: {activeSub.campaign}
            </p>

            {/* Preview Image Hero Container */}
            <div className="mt-3 relative rounded-lg overflow-hidden border border-line bg-[#FAF7EF] shadow-inner group">
              <img
                alt="Large Preview"
                className="w-full h-44 object-cover"
                src={activeSub.thumbnail}
              />
            </div>

            {/* Action Buttons Row */}
            <div className="grid grid-cols-4 gap-1.5 mt-3">
              <button
                onClick={async () => {
                  try {
                    await api.downloadSubmissionReport(activeSub.id, 'text');
                    addToast(`Downloaded compliance report for ${activeSub.title}`, 'success');
                  } catch {
                    addToast('Download failed.', 'error');
                  }
                }}
                className="py-1 px-2 border border-line rounded-md font-medium text-ink-700 hover:bg-[#FAF7EF] flex items-center justify-center gap-1 text-[10px] cursor-pointer"
              >
                <Download className="w-3 h-3 text-muted" /> Download
              </button>
              <button
                onClick={() => {
                  if (activeSub.thumbnail) window.open(activeSub.thumbnail, '_blank');
                }}
                className="py-1 px-2 border border-line rounded-md font-medium text-ink-700 hover:bg-[#FAF7EF] flex items-center justify-center gap-1 text-[10px] cursor-pointer"
              >
                <Eye className="w-3 h-3 text-muted" /> Preview
              </button>
              <button
                onClick={() => setIsAiCompareOpen(true)}
                className="py-1 px-2 border border-line rounded-md font-medium text-ink-700 hover:bg-[#FAF7EF] flex items-center justify-center gap-1 text-[10px] cursor-pointer"
              >
                <GitCompare className="w-3 h-3 text-muted" /> Compare
              </button>
              <button className="py-1 px-2 border border-line rounded-md font-medium text-ink-700 hover:bg-[#FAF7EF] flex items-center justify-center text-[10px]">
                <MoreHorizontal className="w-3.5 h-3.5 text-muted" />
              </button>
            </div>

            {/* Inspection Tabs */}
            <div className="flex items-center gap-4 border-b border-line mt-4 mb-3">
              {(['Findings', 'Evidence', 'Comments'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-1.5 font-semibold text-xs transition ${
                    activeTab === tab
                      ? 'border-b-2 border-brand-600 text-brand-600'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Findings List */}
            {activeTab === 'Findings' && (
              <div className="space-y-3.5">
                {activeSub.findings && activeSub.findings.length > 0 ? (
                  activeSub.findings.map(f => (
                    <div key={f.id} className="p-2.5 rounded-lg border border-[#F1ECE0] bg-white text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink-900 flex items-center gap-1.5">
                          {f.type === 'error' ? (
                            <CircleAlert className="w-3.5 h-3.5 text-rose-500" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <span>{f.title}</span>
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          f.type === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {f.badge || f.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted leading-relaxed">{f.description}</p>
                      {f.guidelineRef && (
                        <div className="text-[10px] text-muted-light font-mono mt-0.5">{f.guidelineRef}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>No compliance violations found in this submission.</span>
                  </div>
                )}
                {/* Confidence Score Bar */}
                <div className="mt-2 pt-2 border-t border-[#F1ECE0]">
                  <div className="flex items-center justify-between text-[10px] font-medium text-ink-600 mb-1">
                    <span>Audit Compliance Score</span>
                    <span className="font-bold text-ink">{activeSub.complianceScore}%</span>
                  </div>
                  <div className="w-full bg-[#F1ECE0] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${activeSub.complianceScore}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Evidence' && (
              <div className="space-y-3 text-xs text-ink-600">
                <div className="p-3 bg-[#FAF7EF] rounded-lg border border-line">
                  <div className="font-semibold text-ink-900">Reference Doc</div>
                  <p className="text-[11px] text-muted mt-0.5">Precedent Brand Guidelines v2.1 • Page 12</p>
                </div>
                <div className="p-3 bg-[#FAF7EF] rounded-lg border border-line">
                  <div className="font-semibold text-ink-900">OCR Text Stream</div>
                  <p className="text-[11px] font-mono text-ink-600 mt-0.5">"LUMI ROOT SKINCARE 100% ORGANIC"</p>
                </div>
              </div>
            )}

            {activeTab === 'Comments' && (
              <div className="space-y-2.5 text-xs">
                {activeSub.comments?.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-lg bg-[#FAF7EF] border border-[#F1ECE0]">
                    <div className="font-semibold text-ink">{c.author}</div>
                    <div className="text-ink-600 text-[11px] mt-0.5">{c.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inspector Drawer Footer Actions */}
          <div className="p-4 border-t border-line bg-[#FAF7EF]/50 space-y-3">
            {/* Assigned and Due dates */}
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-muted-light block font-medium">Assigned to</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <img
                    alt={activeSub.creator.name}
                    className="w-5 h-5 rounded-full object-cover"
                    src={activeSub.creator.avatar}
                  />
                  <span className="font-semibold text-ink text-xs">{activeSub.creator.name}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-light block font-medium">Due by</span>
                <div className="flex items-center gap-1.5 mt-0.5 text-ink-700 font-semibold text-xs">
                  <Calendar className="w-3.5 h-3.5 text-muted-light" /> Nov 03, 2026
                </div>
              </div>
            </div>

            {/* Manager Feedback Note */}
            <div>
              <label className="text-[10px] text-muted-light block font-medium mb-1">
                Decision Rationale / Feedback Note
              </label>
              <textarea
                value={managerNote}
                onChange={(e) => setManagerNote(e.target.value)}
                placeholder="Add compliance notes or revision guidance for the creator..."
                rows={2}
                className="w-full text-xs text-ink-800 bg-white border border-line rounded-lg p-2 focus:ring-1 focus:ring-brand-500 focus:outline-none resize-none"
              />
            </div>

            {/* Footer Final Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => handleDecision('Needs Changes')}
                className="w-full py-2 px-1 text-center bg-white border border-brand-400 text-brand-600 rounded-lg font-semibold hover:bg-brand-50 text-xs transition-colors"
              >
                Request Changes
              </button>
              <button
                onClick={() => handleDecision('Rejected')}
                className="w-full py-2 px-1 text-center bg-white border border-rose-300 text-rose-600 rounded-lg font-semibold hover:bg-rose-50 text-xs transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => handleDecision('Approved')}
                className="w-full py-2 px-1 text-center bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 text-xs shadow-xs transition-colors"
              >
                Approve Version
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};
