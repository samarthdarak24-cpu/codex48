import React, { useState } from 'react';
import {
  X,
  SplitSquareVertical,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Eye
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AiCompareModal: React.FC = () => {
  const { isCompareOpen, setIsCompareOpen, selectedSubmission, submissions, addToast, updateSubmissionStatus } = useApp();
  const [sliderPos, setSliderPos] = useState(50);
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side'>('side-by-side');

  if (!isCompareOpen) return null;

  const current = selectedSubmission || submissions[0];
  if (!current) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-line p-6 text-center space-y-4">
          <p className="text-sm text-ink-800 font-semibold">No submissions available to compare.</p>
          <button
            onClick={() => setIsCompareOpen(false)}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const findings = current.findings ?? [];
  const failedFindings = findings.filter(f => f.type === 'error' || f.type === 'warning');
  const currentScore = current.complianceScore ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-line overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1ECE0] bg-[#FAF7EF]/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <SplitSquareVertical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink-900">AI Visual Diff &amp; Revision Comparison</h2>
              <p className="text-xs text-muted">
                Comparing flagged vs resolved view for {current.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCompareOpen(false)}
              className="p-1.5 text-muted-light hover:text-ink-600 rounded-lg hover:bg-[#F1ECE0]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Toggle Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#F1ECE0] border-b border-line text-xs">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-ink-700">Display Mode:</span>
            <div className="flex bg-white rounded-lg p-0.5 border border-line">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                  viewMode === 'side-by-side' ? 'bg-emerald-700 text-white shadow-xs' : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                Side by Side
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                  viewMode === 'split' ? 'bg-emerald-700 text-white shadow-xs' : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                Slider Diff
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-rose-600 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Before · {failedFindings.length} flagged
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              After · Score {currentScore}%
            </span>
          </div>
        </div>

        {/* Main Canvas */}
        <div className="p-6 overflow-y-auto flex-1 bg-ink-900 flex items-center justify-center">
          {viewMode === 'side-by-side' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
              {/* Before */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-white">
                  <span className="font-bold flex items-center gap-1.5 text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                    {failedFindings.length > 0 ? `Original Version · ${failedFindings.length} flagged` : 'Original Version'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-900/60 text-rose-300 text-[10px] font-bold">
                    Open: {failedFindings.length}
                  </span>
                </div>
                <div className="relative rounded-xl overflow-hidden border-2 border-rose-500/60 bg-black aspect-video flex items-center justify-center">
                  <img
                    src={current.thumbnail}
                    alt="Before"
                    className="w-full h-full object-cover opacity-85"
                  />
                  <div className="absolute top-3 left-3 border border-rose-500 bg-rose-950/80 px-2 py-1 rounded text-[10px] text-rose-200 font-mono">
                    {failedFindings[0]?.title ?? 'No detected issues'}
                  </div>
                </div>
              </div>

              {/* After */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-white">
                  <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Revised Version · Score {currentScore}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 text-[10px] font-bold">
                    Score: {currentScore}%
                  </span>
                </div>
                <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-black aspect-video flex items-center justify-center">
                  <img
                    src={current.thumbnail}
                    alt="After"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 border border-emerald-500 bg-emerald-950/80 px-2 py-1 rounded text-[10px] text-emerald-200 font-mono">
                    Compliance: {currentScore}%
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Split Slider View */
            <div className="relative w-full max-w-3xl aspect-video rounded-xl overflow-hidden border border-ink-700">
              <img
                src={current.thumbnail}
                alt="After"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPos}%` }}
              >
                <img
                  src={current.thumbnail}
                  alt="Before"
                  className="w-full h-full object-cover max-w-none grayscale-[40%] contrast-125"
                  style={{ width: '100%', height: '100%' }}
                />
              </div>

              {/* Slider bar */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize flex items-center justify-center"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-lg text-xs font-bold">
                  ↔
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={e => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-line">
          <div className="text-xs text-muted">
            {failedFindings.length} flagged issue{failedFindings.length === 1 ? '' : 's'} detected by automated brand-rule checks
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCompareOpen(false)}
              className="px-4 py-2 border border-line hover:bg-[#FAF7EF] text-ink-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={async () => {
                try {
                  updateSubmissionStatus(current.id, 'Approved', 'Approved via AI visual diff review');
                  addToast(`${current.title} marked as Approved`, 'success');
                  setIsCompareOpen(false);
                } catch {
                  addToast('Could not update submission status.', 'error');
                }
              }}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve Submission</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
