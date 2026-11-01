import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ExternalLink,
  Check,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Eye,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const CreatorSentinelTasksView: React.FC = () => {
  const { addToast, setCurrentPage, sentinelAlerts, resolveSentinelAlert } = useApp();
  const [activeFilter, setActiveFilter] = useState<'All' | 'High Priority' | 'In Progress' | 'Resolved'>('All');
  const [isResolving, setIsResolving] = useState(false);

  // Derived from the real Sentinel tasks returned by the API.
  const tasks = sentinelAlerts.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description || a.subtitle,
    channel: 'Workspace',
    severity: a.severity,
    status: a.status === 'Resolved' ? 'Resolved' : a.status === 'Investigating' ? 'In Progress' : 'Open',
    due: a.detectedOn,
    campaign: a.category,
    image: a.thumbnail,
    recommendedAction: a.recommendedAction,
  }));

  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];

  const handleResolveTask = async (id: string, title: string) => {
    setIsResolving(true);
    addToast(`Re-evaluating compliance and resolving task: "${title}"...`, 'info');
    try {
      await resolveSentinelAlert(id);
      addToast(`Task verified and resolved: "${title}"`, 'success');
    } catch {
      addToast('Resolution failed. Could not verify compliance.', 'error');
    } finally {
      setIsResolving(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (activeFilter === 'High Priority') return t.severity === 'High';
    if (activeFilter === 'In Progress') return t.status === 'In Progress';
    if (activeFilter === 'Resolved') return t.status === 'Resolved';
    return true;
  });

  if (tasks.length === 0) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="rounded-2xl border border-line bg-white p-10 text-center shadow-2xs">
          <ShieldAlert className="mx-auto h-8 w-8 text-muted-light" />
          <h1 className="mt-3 text-lg font-bold text-ink-900">No reassessment tasks</h1>
          <p className="mt-1 text-sm text-muted">
            Sentinel will create a task here when a policy change affects your published content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Sentinel Remediation Tasks</h1>
          <p className="text-xs text-muted mt-0.5">
            Automated compliance scanner flagged these published or scheduled creatives for remediation.
          </p>
        </div>
        <button
          onClick={() => setCurrentPage('creator-exceptions')}
          className="flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Request Exception</span>
        </button>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Total Tasks</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">{tasks.length}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-medium text-muted-light">live</span>
            <svg className="w-16 h-6 text-brand-400 stroke-current" fill="none" viewBox="0 0 64 24">
              <path d="M0 18 Q 16 8, 32 14 T 64 6" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* High Priority */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">High Priority</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">
                {tasks.filter(t => t.severity === 'High').length}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] font-bold text-rose-600 flex items-center gap-0.5">
              Requires Action
            </span>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">In Progress</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">
                {tasks.filter(t => t.status === 'In Progress').length}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] font-bold text-amber-600 flex items-center gap-0.5">
              Active
            </span>
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Resolved</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">
                {tasks.filter(t => t.status === 'Resolved').length}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-medium text-muted-light">live</span>
            <svg className="w-16 h-6 text-emerald-400 stroke-current" fill="none" viewBox="0 0 64 24">
              <path d="M0 20 Q 16 16, 32 8 T 64 4" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['All', 'High Priority', 'In Progress', 'Resolved'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              activeFilter === tab
                ? 'bg-ink-900 text-white shadow-2xs'
                : 'bg-white text-ink-600 hover:bg-[#FAF7EF] border border-line/80'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Task Cards List */}
        <div className="lg:col-span-7 space-y-3.5">
          {filteredTasks.map(task => {
            const isResolved = task.status === 'Resolved';
            const isSelected = selectedTask?.id === task.id;

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                  isSelected
                    ? 'bg-brand-50/30 border-brand-400 shadow-xs ring-1 ring-brand-300'
                    : isResolved
                    ? 'bg-white border-line/80 opacity-60'
                    : 'bg-white border-line/90 shadow-2xs hover:border-line-strong'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <img
                    src={task.image}
                    alt={task.title}
                    className="w-14 h-14 rounded-xl object-cover border border-line flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          task.severity === 'High'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                            : task.severity === 'Medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : 'bg-brand-50 text-brand-700 border border-brand-200/60'
                        }`}
                      >
                        {task.severity} Priority
                      </span>
                      <span className="text-xs text-muted font-medium">
                        {task.channel} • {task.campaign}
                      </span>
                    </div>

                    <h3 className={`text-sm font-bold mt-1 tracking-tight ${isResolved ? 'line-through text-muted-light' : 'text-ink-900'}`}>
                      {task.title}
                    </h3>

                    <p className="text-xs text-muted mt-0.5 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>

                    <div className="text-[11px] text-muted-light mt-1.5">
                      Due: {task.due}
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 self-center">
                  <ChevronRight className="w-4 h-4 text-muted-light" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Task Details */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-line/90 shadow-2xs p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                  selectedTask.severity === 'High'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                    : selectedTask.severity === 'Medium'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                    : 'bg-brand-50 text-brand-700 border border-brand-200/60'
                }`}
              >
                {selectedTask.severity} Priority Issue
              </span>
              <div className="text-xs text-muted-light mt-2">{selectedTask.channel} • {selectedTask.campaign}</div>
            </div>
            {selectedTask.status === 'Resolved' && (
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Resolved
              </span>
            )}
          </div>

          <div>
            <h2 className="text-base font-bold text-ink-900 tracking-tight">{selectedTask.title}</h2>
            <p className="text-xs text-ink-600 mt-1 leading-relaxed">{selectedTask.description}</p>
          </div>

          {/* Large Image Preview */}
          <div className="relative rounded-xl overflow-hidden border border-line bg-[#FAF7EF] max-h-[220px] flex items-center justify-center">
            <img
              src={selectedTask.image}
              alt={selectedTask.title}
              className="w-full h-[200px] object-cover"
            />
          </div>

          {/* Remediation Details */}
          <div className="p-3.5 rounded-xl border border-amber-200/70 bg-amber-50/40 space-y-1.5 text-xs">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Recommended Remediation</span>
            </div>
            <p className="text-ink-600 leading-relaxed">
              {selectedTask.recommendedAction ||
                'Review the flagged content against the active guideline and correct it, then mark the task as resolved to trigger re-evaluation.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            {selectedTask.status !== 'Resolved' ? (
              <>
                <button
                  onClick={() => setCurrentPage('creator-exceptions')}
                  className="flex-1 py-2 px-3 bg-white border border-line text-ink-700 rounded-lg text-xs font-semibold hover:bg-[#FAF7EF] shadow-2xs cursor-pointer text-center"
                >
                  Request Exception
                </button>
                <button
                  onClick={() => handleResolveTask(selectedTask.id, selectedTask.title)}
                  disabled={isResolving}
                  className="flex-1 py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer text-center flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isResolving ? 'Evaluating…' : 'Mark as Corrected'}</span>
                </button>
              </>
            ) : (
              <div className="w-full py-2 px-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Issue marked as resolved</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
