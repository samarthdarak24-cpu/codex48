import React, { useMemo, useState } from 'react';
import {
  FileText, UserCheck, Cpu, ShieldCheck, Filter, Download, Calendar, ChevronRight,
  ChevronLeft, X, CheckCircle2, Eye, User, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { AuditEvent } from '../../../types';
import { api } from '@/services/api';
import { StatCardGrid } from '../../ui/StatCard';

const ActionBadge = ({ action }: { action: string }) => {
  const a = action.toLowerCase();
  if (/approv/i.test(a)) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full badge-approved text-[10px] font-semibold"><CheckCircle2 className="w-3 h-3" />{action}</span>;
  if (/reject/i.test(a)) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full badge-rejected text-[10px] font-semibold"><X className="w-3 h-3" />{action}</span>;
  if (/comment/i.test(a)) return <span className="px-2 py-0.5 rounded-full badge-inreview text-[10px] font-semibold">{action}</span>;
  if (/upload/i.test(a)) return <span className="px-2 py-0.5 rounded-full badge-archived text-[10px] font-semibold">{action}</span>;
  return <span className="px-2 py-0.5 rounded-full badge-draft text-[10px] font-semibold">{action}</span>;
};

const PAGE_SIZE = 8;

export const AuditHistoryView: React.FC = () => {
  const { auditEvents, addToast } = useApp();
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const selectedEvent = auditEvents.find((e) => e.id === selectedEventId) || auditEvents[0];
  const [filterModule, setFilterModule] = useState('All Modules');
  const [filterType, setFilterType] = useState('All Event Types');
  const [filterUser, setFilterUser] = useState('All Users');
  const [filterDate, setFilterDate] = useState('Last 30 Days');
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  const userOptions = useMemo(() => Array.from(new Set(auditEvents.map((e) => e.user.name))), [auditEvents]);
  const moduleOptions = useMemo(() => Array.from(new Set(auditEvents.map((e) => e.module))), [auditEvents]);

  const filtered = auditEvents.filter((evt) => {
    if (filterModule !== 'All Modules' && evt.module !== filterModule) return false;
    if (filterUser !== 'All Users' && evt.user.name !== filterUser) return false;
    const a = evt.action.toLowerCase();
    if (filterType === 'Approvals' && !/approv/i.test(a)) return false;
    if (filterType === 'Rejections' && !/reject/i.test(a)) return false;
    if (filterType === 'Rule Changes' && !/rule|update|activat/i.test(a)) return false;
    if (filterType === 'Asset Uploads' && !/upload/i.test(a)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPageNum - 1) * PAGE_SIZE, currentPageNum * PAGE_SIZE);

  const totalCount = auditEvents.length;
  const userActionCount = auditEvents.filter((e) => !e.user.isSystem).length;
  const systemCount = auditEvents.filter((e) => e.user.isSystem).length;
  const securityCount = auditEvents.filter((e) => /login|auth|password|role/i.test(e.action)).length;

  const handleExport = async () => {
    try { await api.downloadAuditCsv(); addToast('Audit log exported.'); }
    catch (err) { addToast(err instanceof Error ? err.message : 'Export failed.', 'error'); }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-5 bg-canvas">
        {/* Header */}
        <div>
          <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">Audit History</h1>
          <p className="text-xs text-muted mt-0.5">Track all platform activities, changes and decisions across your brand governance workflow.</p>
        </div>

        {/* KPI Cards */}
        <StatCardGrid cards={[
    { label: 'Total Events', value: totalCount >= 1000 ? `${(totalCount / 1000).toFixed(1)}K` : String(totalCount), icon: <FileText className="w-5 h-5" />, variant: 'blue', trend: 12, sparkPathIndex: 0 },
    { label: 'User Actions', value: userActionCount >= 1000 ? `${(userActionCount / 1000).toFixed(1)}K` : String(userActionCount), icon: <UserCheck className="w-5 h-5" />, variant: 'green', trend: 15, sparkPathIndex: 1 },
    { label: 'System Events', value: systemCount, icon: <Cpu className="w-5 h-5" />, variant: 'amber', trend: 8, sparkPathIndex: 2 },
    { label: 'Security Events', value: securityCount, icon: <ShieldCheck className="w-5 h-5" />, variant: 'red', trend: 5, sparkPathIndex: 3 },
  ]} />

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: filterDate, options: ['All Time', 'Last 7 Days', 'Last 30 Days', 'Last 90 Days'], onChange: setFilterDate },
            { label: filterType, options: ['All Event Types', 'Approvals', 'Rejections', 'Rule Changes', 'Asset Uploads'], onChange: setFilterType },
            { label: filterUser, options: ['All Users', ...userOptions], onChange: setFilterUser },
            { label: filterModule, options: ['All Modules', ...moduleOptions], onChange: setFilterModule },
          ].map((f, i) => (
            <select key={i} value={f.label} onChange={(e) => { f.onChange(e.target.value); setCurrentPageNum(1); }}
              className="bg-white border border-line rounded-xl px-3 py-1.5 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer">
              {f.options.map((o) => <option key={o}>{o}</option>)}
            </select>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-line shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-gradient-to-r from-slate-50 via-blue-50/40 to-pink-50/30 border-b border-slate-200">
                {['Date & Time', 'User', 'Action', 'Module', 'Details', 'Status', ''].map((h) => (
                  <th key={h} className="py-3 px-4 text-[11px] font-semibold text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-[#F5F0E8]">
                {paginated.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-xs text-muted">No audit events found.</td></tr>}
                {paginated.map((evt) => (
                  <tr key={evt.id} onClick={() => { setSelectedEventId(evt.id); setIsDrawerOpen(true); }}
                    className={`cursor-pointer transition-colors ${selectedEvent?.id === evt.id ? 'bg-brand-50/30' : 'hover:bg-[#FAF7EF]/60'}`}>
                    <td className="py-3 px-4 text-xs text-muted whitespace-nowrap">
                      <div>{evt.date}</div>
                      <div className="text-[10px] text-muted-light">{evt.time}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <img alt={evt.user.name} src={evt.user.avatar} className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-line" />
                        <div>
                          <p className="text-xs font-semibold text-ink-900">{evt.user.name}</p>
                          <p className="text-[10px] text-muted-light">{evt.user.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4"><ActionBadge action={evt.action} /></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-ink-700">
                        <ShieldCheck className="w-3.5 h-3.5 text-muted shrink-0" />
                        <span>{evt.module}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs font-medium text-ink-900 truncate max-w-[160px]">{evt.details}</p>
                      {evt.subDetails && <p className="text-[10px] text-muted-light truncate max-w-[160px]">{evt.subDetails}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full badge-approved text-[10px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{evt.status || 'Success'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <ChevronRight className="w-4 h-4 text-muted-light" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-line">
            <p className="text-xs text-muted">Showing {Math.min((currentPageNum - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPageNum * PAGE_SIZE, filtered.length)} of {filtered.length} events</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPageNum((p) => Math.max(1, p - 1))} disabled={currentPageNum === 1} className="p-1.5 rounded-lg border border-line text-muted hover:bg-[#FAF7EF] disabled:opacity-40 transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setCurrentPageNum(p)} className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${p === currentPageNum ? 'bg-gradient-to-r from-brand-600 to-blue-500 text-white shadow-sm font-bold' : 'border border-line text-muted hover:bg-[#FAF7EF]'}`}>{p}</button>
              ))}
              <button onClick={() => setCurrentPageNum((p) => Math.min(totalPages, p + 1))} disabled={currentPageNum === totalPages} className="p-1.5 rounded-lg border border-line text-muted hover:bg-[#FAF7EF] disabled:opacity-40 transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
      </main>

      {/* Right panel */}
      {isDrawerOpen && selectedEvent && (
        <aside className="w-[300px] bg-white border-l border-line flex flex-col shrink-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
            <h3 className="text-sm font-bold text-ink-900">Event Details</h3>
            <div className="flex items-center gap-2">
              <button onClick={handleExport} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors cursor-pointer">
                <Download className="w-3.5 h-3.5" />Export Log
              </button>
              <button onClick={() => setIsDrawerOpen(false)} className="p-1 rounded-lg text-muted-light hover:text-ink-700"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Asset preview */}
            <div className="p-3 bg-[#FAF7EF] border border-line rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-brand-600 shrink-0" />
                <p className="text-xs font-semibold text-ink-900 truncate">{selectedEvent.details}</p>
              </div>
              <div className="text-[10px] text-muted-light space-y-0.5">
                <p>📄 {selectedEvent.module}</p>
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-0">
              {[
                ['User', selectedEvent.user.name],
                ['Module', selectedEvent.module],
                ['Action', selectedEvent.action],
                ['Status', selectedEvent.status || 'Success'],
                ['Timestamp', selectedEvent.dateTime],
              ].map(([label, val]) => (
                <div key={String(label)} className="flex items-start justify-between py-2 border-b border-[#F5F0E8] last:border-0 text-xs">
                  <span className="text-muted shrink-0 flex items-center gap-1.5">
                    {label === 'User' && <User className="w-3 h-3" />}
                    {label === 'Module' && <ShieldCheck className="w-3 h-3" />}
                    {label === 'Action' && <CheckCircle2 className="w-3 h-3" />}
                    {label === 'Status' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    {label === 'Timestamp' && <Calendar className="w-3 h-3" />}
                    {label}
                  </span>
                  <span className="font-medium text-ink text-right ml-3 max-w-[150px] truncate">{val}</span>
                </div>
              ))}
            </div>

            {/* Audit trail timeline */}
            <div>
              <p className="text-xs font-bold text-ink-900 mb-3">Audit Trail</p>
              <div className="space-y-3 relative">
                <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-[#F1ECE0]" />
                {[
                  { label: `${selectedEvent.action} requested`, time: selectedEvent.time, color: 'bg-emerald-500' },
                  { label: `Reviewed and ${selectedEvent.action.toLowerCase()}`, time: selectedEvent.time, color: 'bg-emerald-500' },
                  { label: 'Rule evaluation completed', time: selectedEvent.time, color: 'bg-brand-500' },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3 relative">
                    <span className={`w-5 h-5 rounded-full ${step.color} flex items-center justify-center shrink-0 z-10`}>
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </span>
                    <div className="flex-1 pb-1">
                      <p className="text-xs font-medium text-ink-900">{step.label}</p>
                      <p className="text-[10px] text-muted-light mt-0.5">by {selectedEvent.user.name} · {step.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};
