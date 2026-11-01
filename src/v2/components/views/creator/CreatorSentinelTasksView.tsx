import React, { useState } from 'react';
import {
  ShieldAlert, CheckCircle2, AlertTriangle, Clock, ChevronRight, Check,
  Sparkles, Eye, FileText, AlertCircle, X, ArrowUpRight, ArrowDownRight,
  Activity, Loader2, MoreHorizontal,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { StatCardGrid } from '../../ui/StatCard';

const SeverityBadge = ({ severity }: { severity: string }) => {
  const map: Record<string, string> = {
    Critical: 'badge-rejected',
    High: 'badge-changes',
    Medium: 'badge-pending',
    Low: 'badge-approved',
  };
  const dot: Record<string, string> = { Critical: 'bg-red-500', High: 'bg-orange-500', Medium: 'bg-amber-500', Low: 'bg-emerald-500' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[severity] ?? 'badge-draft'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[severity] ?? 'bg-slate-400'}`} />{severity}
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    Open: 'badge-rejected',
    'In Progress': 'badge-inreview',
    Resolved: 'badge-approved',
  };
  const dot: Record<string, string> = { Open: 'bg-red-500', 'In Progress': 'bg-blue-500', Resolved: 'bg-emerald-500' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${map[status] ?? 'badge-draft'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] ?? 'bg-slate-400'}`} />{status}
    </span>
  );
};

export const CreatorSentinelTasksView: React.FC = () => {
  const { addToast, setCurrentPage, sentinelAlerts, resolveSentinelAlert } = useApp();
  const [activeFilter, setActiveFilter] = useState<'All' | 'Critical' | 'High' | 'Medium' | 'Low'>('All');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState<'activity' | 'insights'>('activity');

  const tasks = sentinelAlerts.map((a) => ({
    id: a.id, title: a.title,
    description: a.description || a.subtitle || 'Requires review.',
    severity: a.severity as 'Critical' | 'High' | 'Medium' | 'Low',
    status: (a.status === 'Resolved' ? 'Resolved' : a.status === 'Investigating' ? 'In Progress' : 'Open') as 'Open' | 'In Progress' | 'Resolved',
    due: a.detectedOn, campaign: a.category, image: a.thumbnail,
    recommendedAction: a.recommendedAction || 'Review the flagged content and take corrective action.',
  }));

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];

  const totalCount = tasks.length;
  const resolvedCount = tasks.filter((t) => t.status === 'Resolved').length;
  const inProgressCount = tasks.filter((t) => t.status === 'In Progress').length;
  const criticalCount = tasks.filter((t) => t.severity === 'Critical').length;

  const filtered = tasks.filter((t) => {
    if (activeFilter === 'Critical' && t.severity !== 'Critical') return false;
    if (activeFilter === 'High' && t.severity !== 'High') return false;
    if (activeFilter === 'Medium' && t.severity !== 'Medium') return false;
    if (activeFilter === 'Low' && t.severity !== 'Low') return false;
    return true;
  });

  const handleResolve = async () => {
    if (!selectedTask) return;
    setIsResolving(true);
    try {
      await resolveSentinelAlert(selectedTask.id);
      addToast(`Task resolved: "${selectedTask.title}"`, 'success');
    } catch { addToast('Resolution failed.', 'error'); }
    finally { setIsResolving(false); }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-5 bg-canvas">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">Sentinel Tasks</h1>
            <p className="text-xs text-muted mt-0.5">Monitor brand compliance in real-time. Review flagged content, trends and potential risks.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] shadow-2xs transition-colors cursor-pointer">
            <Eye className="w-4 h-4" />View Activity Log
          </button>
        </div>

        {/* KPI Cards */}
        <StatCardGrid cards={[
    { label: 'Total Tasks', value: totalCount, icon: <ShieldAlert className="w-5 h-5" />, variant: 'blue', trend: 12, sparkPathIndex: 0 },
    { label: 'Resolved', value: resolvedCount, icon: <CheckCircle2 className="w-5 h-5" />, variant: 'green', trend: 8, sparkPathIndex: 1 },
    { label: 'In Progress', value: inProgressCount, icon: <Clock className="w-5 h-5" />, variant: 'amber', trend: -33, sparkPathIndex: 2 },
    { label: 'Critical Alerts', value: criticalCount, icon: <AlertCircle className="w-5 h-5" />, variant: 'purple', trend: -50, sparkPathIndex: 3 },
  ]} />

        {/* Filters + Sort */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All', 'Critical', 'High', 'Medium', 'Low'] as const).map((tab) => {
              const cnt = tab === 'All' ? totalCount : tasks.filter((t) => t.severity === tab).length;
              return (
                <button key={tab} onClick={() => setActiveFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${activeFilter === tab ? 'bg-gradient-to-r from-brand-600 to-blue-600 text-white shadow-sm' : 'bg-white border border-line text-ink-600 hover:bg-[#FAF7EF]'}`}>
                  {tab === 'All' ? `All Tasks (${cnt})` : `${tab} (${cnt})`}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <select className="bg-white border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none cursor-pointer"><option>Newest First</option></select>
            <div className="flex items-center gap-1 bg-white border border-line rounded-lg px-2 py-1.5 text-ink-700 cursor-pointer">Last 30 Days <svg className="w-3 h-3 text-muted-light ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg></div>
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl border border-line p-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-ink-900">All clear!</p>
              <p className="text-xs text-muted mt-1">No Sentinel tasks match this filter.</p>
            </div>
          )}
          {filtered.map((task) => {
            const isSelected = selectedTask?.id === task.id;
            return (
              <div key={task.id} onClick={() => { setSelectedTaskId(task.id); setIsDetailOpen(true); }}
                className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${isSelected ? 'selected-brand shadow-sm' : 'border-line shadow-2xs hover:border-line-strong hover:shadow-xs'}`}>
                <img src={task.image} alt="" className="w-14 h-14 rounded-xl object-cover border border-line shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SeverityBadge severity={task.severity} />
                    <p className="text-sm font-bold text-ink-900">{task.title}</p>
                  </div>
                  <p className="text-xs text-muted mt-0.5 line-clamp-1">{task.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-light">
                    <span>{task.campaign}</span>
                    <span>·</span>
                    <span>{task.due}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={task.status} />
                  <button className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer">View Details <ChevronRight className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 rounded-lg text-muted hover:text-ink-700 hover:bg-[#FAF7EF]"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom: Recent Activity / Task Insights */}
        {filtered.length > 0 && (
          <div className="bg-white rounded-2xl border border-line shadow-2xs p-4 space-y-3">
            <div className="flex items-center gap-4 border-b border-line pb-2">
              {(['activity', 'insights'] as const).map((tab) => (
                <button key={tab} onClick={() => setBottomTab(tab)}
                  className={`pb-2 -mb-2 text-xs font-semibold capitalize transition ${bottomTab === tab ? 'border-b-2 border-brand-600 text-brand-600' : 'text-muted hover:text-ink'}`}>
                  {tab === 'activity' ? 'Recent Activity' : 'Task Insights'}
                </button>
              ))}
              <button className="ml-auto text-[11px] text-brand-600 font-semibold hover:underline cursor-pointer">View All →</button>
            </div>
            {bottomTab === 'activity' ? (
              <div className="flex items-center gap-4 overflow-x-auto pb-1 text-xs text-muted-light">
                {[
                  { icon: <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />, text: `New task generated: ${tasks[0]?.title || 'Potential Brand Claim Risk'}`, time: tasks[0]?.due || 'Recently' },
                  { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />, text: `Task resolved: ${tasks[1]?.title || 'Logo Usage Inconsistency'}`, time: tasks[1]?.due || 'Recently' },
                  { icon: <Activity className="w-3.5 h-3.5 text-purple-500 shrink-0" />, text: 'Comment added by Brand Manager', time: 'Recently' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 whitespace-nowrap shrink-0 p-2.5 bg-[#FAF7EF] rounded-xl border border-line">
                    {item.icon}
                    <span className="font-medium text-ink-700">{item.text}</span>
                    <span className="text-muted-light">{item.time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 text-xs">
                {[['Open Tasks', tasks.filter((t) => t.status === 'Open').length, 'text-red-600'], ['In Progress', inProgressCount, 'text-blue-600'], ['Resolved', resolvedCount, 'text-emerald-600']].map(([label, val, color]) => (
                  <div key={String(label)} className="p-3 bg-[#FAF7EF] rounded-xl border border-line text-center">
                    <p className={`text-xl font-bold ${color}`}>{val}</p>
                    <p className="text-muted mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Right detail panel */}
      {isDetailOpen && selectedTask && (
        <aside className="w-[320px] bg-white border-l border-line flex flex-col shrink-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
            <h3 className="text-sm font-bold text-ink-900">Task Details</h3>
            <button onClick={() => setIsDetailOpen(false)} className="p-1 rounded-lg text-muted-light hover:text-ink-700"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="relative rounded-xl overflow-hidden border border-line">
              <img src={selectedTask.image} alt="" className="w-full h-36 object-cover" />
              <div className="absolute top-2 left-2"><SeverityBadge severity={selectedTask.severity} /></div>
            </div>
            <div>
              <p className="font-bold text-ink-900 text-sm">{selectedTask.title}</p>
              <p className="text-xs text-muted mt-1 leading-relaxed">{selectedTask.description}</p>
            </div>
            <div className="space-y-0">
              <p className="text-xs font-bold text-ink-900 mb-2">Task Information</p>
              {[['Campaign', selectedTask.campaign], ['Submitted On', selectedTask.due], ['Flagged By', 'Sentinel AI'], ['Priority', selectedTask.severity]].map(([label, val]) => (
                <div key={String(label)} className="flex items-center justify-between py-1.5 border-b border-[#F5F0E8] last:border-0 text-xs">
                  <span className="text-muted flex items-center gap-1.5">
                    {label === 'Priority' && <AlertTriangle className="w-3 h-3" />}
                    {label}
                  </span>
                  <span className={`font-medium ${label === 'Priority' && val === 'Critical' ? 'text-red-600' : label === 'Priority' && val === 'High' ? 'text-orange-600' : 'text-ink'}`}>{val}</span>
                </div>
              ))}
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-xs">
              <ShieldAlert className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 mb-0.5">Recommended Action</p>
                <p className="text-blue-800 leading-relaxed">{selectedTask.recommendedAction}</p>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-line space-y-2 shrink-0">
            {selectedTask.status !== 'Resolved' && (
              <button onClick={handleResolve} disabled={isResolving}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer transition-colors cursor-pointer disabled:opacity-50">
                {isResolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isResolving ? 'Resolving…' : '✓ Mark as Resolved'}
              </button>
            )}
            {selectedTask.status === 'Resolved' && (
              <div className="flex items-center justify-center gap-2 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4" />Task Resolved
              </div>
            )}
            <button className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-muted hover:text-ink-700 transition-colors cursor-pointer">
              💬 Add Comment
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};
