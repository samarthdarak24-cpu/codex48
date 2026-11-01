import React, { useMemo, useState } from 'react';
import {
  FileText,
  UserCheck,
  Cpu,
  ShieldCheck,
  Filter,
  Download,
  Calendar,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Clock,
  Eye,
  MessageSquare,
  RefreshCw,
  Upload,
  User
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { AuditEvent } from '../../../types';
import { api } from '@/services/api';

export const AuditHistoryView: React.FC = () => {
  const { auditEvents, addToast } = useApp();
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const selectedEvent = auditEvents.find(e => e.id === selectedEventId) || auditEvents[0];
  const [filterModule, setFilterModule] = useState<string>('All Modules');
  const [filterType, setFilterType] = useState<string>('All Event Types');
  const [filterUser, setFilterUser] = useState<string>('All Users');
  const [filterDate, setFilterDate] = useState<string>('All Time');
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);

  const userOptions = useMemo(
    () => Array.from(new Set(auditEvents.map((e) => e.user.name))),
    [auditEvents],
  );

  const matchesType = (action: string, type: string) => {
    if (type === 'All Event Types') return true;
    const a = action.toLowerCase();
    if (type === 'Approvals') return /approv/i.test(a);
    if (type === 'Rejections') return /reject/i.test(a);
    if (type === 'Rule Changes') return /rule|update|activat/i.test(a);
    if (type === 'Asset Uploads') return /upload/i.test(a);
    return true;
  };

  const eventDate = (evt: AuditEvent): Date | null => {
    const part = evt.dateTime.split(' • ')[0].trim();
    const parsed = new Date(part);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const matchesDate = (evt: AuditEvent, range: string) => {
    if (range === 'All Time') return true;
    const days = { 'Last 7 Days': 7, 'Last 30 Days': 30, 'Last 90 Days': 90 }[range];
    if (!days) return true;
    const d = eventDate(evt);
    if (!d) return true;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return d >= cutoff;
  };

  const totalEvents = auditEvents.length;
  const userActions = auditEvents.filter(e => e.user && e.user.role !== 'System').length;
  const systemEvents = auditEvents.filter(e => e.user && (e.user.role === 'System' || e.user.name.includes('System'))).length;
  const securityEvents = auditEvents.filter(e => e.module === 'Rules & Conflicts' || e.action === 'Role Changed').length;

  const filteredEvents = auditEvents.filter((event) => {
    if (filterModule !== 'All Modules' && event.module !== filterModule) return false;
    if (!matchesType(event.action, filterType)) return false;
    if (filterUser !== 'All Users' && event.user.name !== filterUser) return false;
    if (!matchesDate(event, filterDate)) return false;
    return true;
  });

  const handleExportLog = async () => {
    try {
      addToast('Downloading audit log CSV...', 'info');
      await api.downloadAuditCsv();
      addToast('Audit log CSV exported successfully.', 'success');
    } catch {
      addToast('Failed to export audit log.', 'error');
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Rule Updated':
        return 'bg-brand-50 text-brand-700 border-brand-200';
      case 'Uploaded':
        return 'bg-brand-50 text-brand-700 border-brand-200';
      case 'Updated':
        return 'bg-grape-50 text-grape-700 border-grape-100';
      case 'Viewed':
        return 'bg-[#F1ECE0] text-ink-700 border-line';
      case 'Commented':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Role Changed':
        return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
      default:
        return 'bg-[#F1ECE0] text-ink-700 border-line';
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Audit History</h1>
        <p className="text-sm text-muted mt-0.5">
          Track all platform activities, changes and decisions across your brand governance workflow.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Events */}
        <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted">Total Events</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">{totalEvents}</div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-1">Immutable ledger</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* User Actions */}
        <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted">User Actions</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">{userActions}</div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-1">{totalEvents > 0 ? `${Math.round((userActions / totalEvents) * 100)}%` : '0%'} human activity</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* System Events */}
        <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted">System Events</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">{systemEvents}</div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-1">{totalEvents > 0 ? `${Math.round((systemEvents / totalEvents) * 100)}%` : '0%'} automated</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-grape-50 text-grape-600 flex items-center justify-center">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        {/* Security Events */}
        <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted">Security Events</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">{securityEvents}</div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-1">Verified trace</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="pl-3 pr-8 py-2 bg-white border border-line rounded-lg text-xs font-semibold text-ink-700 shadow-xs cursor-pointer appearance-none"
          >
            <option>All Time</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Last 90 Days</option>
          </select>
          <Calendar className="w-3.5 h-3.5 text-muted-light absolute right-2.5 top-3 pointer-events-none" />
        </div>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 bg-white border border-line rounded-lg text-xs font-semibold text-ink-700 shadow-xs cursor-pointer"
        >
          <option>All Event Types</option>
          <option>Approvals</option>
          <option>Rejections</option>
          <option>Rule Changes</option>
          <option>Asset Uploads</option>
        </select>

        <select
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className="px-3 py-2 bg-white border border-line rounded-lg text-xs font-semibold text-ink-700 shadow-xs cursor-pointer"
        >
          <option>All Users</option>
          {userOptions.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>

        <select
          value={filterModule}
          onChange={e => setFilterModule(e.target.value)}
          className="px-3 py-2 bg-white border border-line rounded-lg text-xs font-semibold text-ink-700 shadow-xs cursor-pointer"
        >
          <option>All Modules</option>
          <option>Exceptions</option>
          <option>Review Queue</option>
          <option>Rules & Conflicts</option>
          <option>Asset Library</option>
          <option>Guidelines</option>
          <option>Campaigns</option>
          <option>Users & Roles</option>
        </select>
      </div>

      {/* Main Content: Table + Event Details Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Table Column */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-line shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF7EF]/80 border-b border-line text-[11px] font-bold text-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1ECE0] text-xs">
                {filteredEvents.map(evt => {
                  const isSelected = selectedEvent?.id === evt.id;
                  return (
                    <tr
                      key={evt.id}
                      onClick={() => setSelectedEventId(evt.id)}
                      className={`hover:bg-[#FAF7EF]/80 cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-ink-900">{evt.dateTime.split(' • ')[0] || evt.dateTime}</div>
                        <div className="text-[11px] text-muted-light">{evt.dateTime.split(' • ')[1] || ''}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          {evt.user.avatar ? (
                            <img src={evt.user.avatar} alt={evt.user.name} className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-[11px]">
                              S
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-ink-900">{evt.user.name}</div>
                            <div className="text-[11px] text-muted-light">{evt.user.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getActionBadge(evt.action)}`}>
                          {evt.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-ink-600 font-medium">{evt.module}</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-ink truncate">{evt.details}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          {evt.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-muted-light">
                        <ChevronRight className="w-4 h-4" />
                      </td>
                    </tr>
                  );
                })}
                {filteredEvents.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-muted">
                      No audit events match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#F1ECE0] text-xs text-muted bg-[#FAF7EF]/50">
            <div>Showing 1-{filteredEvents.length} of {totalEvents} events</div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPageNum === 1}
                onClick={() => setCurrentPageNum(p => Math.max(1, p - 1))}
                className="w-7 h-7 rounded border border-line flex items-center justify-center hover:bg-white disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setCurrentPageNum(n)}
                  className={`w-7 h-7 rounded text-xs font-semibold ${
                    currentPageNum === n ? 'bg-emerald-700 text-white' : 'border border-line hover:bg-white text-ink-700'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setCurrentPageNum(p => p + 1)}
                className="w-7 h-7 rounded border border-line flex items-center justify-center hover:bg-white"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Drawer: Event Details */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-line shadow-xs p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1ECE0]">
            <h2 className="text-sm font-bold text-ink-900">Event Details</h2>
            <button
              onClick={handleExportLog}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Log</span>
            </button>
          </div>

          {!selectedEvent ? (
            <div className="p-8 text-center text-xs text-muted">
              Select an audit event from the table to view details.
            </div>
          ) : (
            <>
              {/* Event Header Banner */}
              <div className="p-3 bg-[#FAF7EF] rounded-lg border border-[#F1ECE0]">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getActionBadge(selectedEvent.action)}`}>
                    {selectedEvent.action}
                  </span>
                  <span className="text-xs font-medium text-muted">
                    {selectedEvent.dateTime}
                  </span>
                </div>
                <div className="text-sm font-bold text-ink-900 mt-2">{selectedEvent.details}</div>
              </div>

              {/* Asset Preview Thumbnail (derived, not a fabricated file) */}
              <div className="rounded-lg overflow-hidden border border-line bg-[#F1ECE0]">
                <div className="w-full h-32 flex items-center justify-center bg-brand-50 text-brand-600">
                  <FileText className="w-10 h-10" />
                </div>
                <div className="p-2.5 bg-white text-xs">
                  <div className="font-semibold text-ink-900">{selectedEvent.module}</div>
                  <div className="text-[11px] text-muted-light mt-0.5">
                    {selectedEvent.subDetails || selectedEvent.details}
                  </div>
                </div>
              </div>

              {/* Key Value Metadata */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-[#F1ECE0]">
                  <span className="text-muted">User</span>
                  <div className="flex items-center gap-1.5 font-semibold text-ink-900">
                    {selectedEvent.user?.avatar && (
                      <img src={selectedEvent.user.avatar} alt="" className="w-4 h-4 rounded-full" />
                    )}
                    <span>{selectedEvent.user?.name || 'System'} ({selectedEvent.user?.role || 'Service'})</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#F1ECE0]">
                  <span className="text-muted">Module</span>
                  <span className="font-semibold text-ink-900">{selectedEvent.module}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#F1ECE0]">
                  <span className="text-muted">Action</span>
                  <span className="font-semibold text-emerald-700">{selectedEvent.action}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#F1ECE0]">
                  <span className="text-muted">Status</span>
                  <span className="font-semibold text-ink-900">{selectedEvent.status}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted">Timestamp</span>
                  <span className="font-semibold text-ink-900">{selectedEvent.dateTime}</span>
                </div>
              </div>

              {/* Audit Trail Timeline (derived from the event itself) */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-ink-900 uppercase tracking-wider text-muted">
                  Audit Trail
                </div>
                <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
                  <div className="relative text-xs">
                    <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-white" />
                    <div className="font-semibold text-ink-900">{selectedEvent.action}</div>
                    <div className="text-[11px] text-muted-light">
                      {selectedEvent.dateTime} by {selectedEvent.user?.name || 'System'}
                    </div>
                  </div>
                  {selectedEvent.subDetails && (
                    <div className="relative text-xs">
                      <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-brand-600 ring-4 ring-white" />
                      <div className="font-semibold text-ink-900">Details</div>
                      <div className="text-[11px] text-muted-light">{selectedEvent.subDetails}</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
