import React, { useState } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Clock, ChevronRight, Check, ExternalLink, MessageSquare, BookOpen, ShieldAlert, ArrowUpRight, ArrowDownRight, X, Info } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { NotificationItem } from '../../../types';
import { api } from '@/services/api';
import { StatCardGrid } from '../../ui/StatCard';

const TypeBadge = ({ type }: { type: string }) => {
  const map: Record<string, string> = {
    approval: 'badge-approved',
    action_required: 'badge-rejected',
    system: 'badge-draft',
    comment: 'bg-violet-50 text-violet-700 border border-violet-200',
    warning: 'badge-pending',
    guideline: 'badge-inreview',
  };
  const labels: Record<string, string> = { approval: 'Approval', action_required: 'Action Required', system: 'System', comment: 'Comment', warning: 'Update', guideline: 'Update' };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[type] ?? 'badge-draft'}`}>{labels[type] ?? type}</span>;
};

const TypeIcon = ({ type }: { type: string }) => {
  const cls = 'w-4.5 h-4.5';
  if (type === 'approval') return <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0"><CheckCircle2 className={`${cls} text-emerald-600`} /></div>;
  if (type === 'action_required') return <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0"><AlertTriangle className={`${cls} text-amber-600`} /></div>;
  if (type === 'comment') return <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0"><MessageSquare className={`${cls} text-violet-600`} /></div>;
  if (type === 'guideline' || type === 'warning') return <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><BookOpen className={`${cls} text-blue-600`} /></div>;
  return <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><Info className={`${cls} text-slate-600`} /></div>;
};

export const NotificationsView: React.FC = () => {
  const { notifications, markNotificationRead, addToast, setCurrentPage, refresh } = useApp();
  const [activeFilter, setActiveFilter] = useState<'All' | 'Unread' | 'Action Required' | 'System' | 'Updates'>('All');
  const [selectedNotifId, setSelectedNotifId] = useState<string>('');
  const [isDetailOpen, setIsDetailOpen] = useState(true);

  const selectedNotif = notifications.find((n) => n.id === selectedNotifId) || notifications[0];
  const isUnread = (n: NotificationItem) => (n.isUnread !== undefined ? n.isUnread : !n.read);

  const totalCount = notifications.length;
  const unreadCount = notifications.filter(isUnread).length;
  const actionCount = notifications.filter((n) => n.type === 'action_required').length;
  const systemCount = notifications.filter((n) => n.type === 'system').length;
  const updatesCount = notifications.filter((n) => n.type === 'approval' || n.type === 'comment' || n.type === 'guideline' || n.type === 'warning').length;

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'Unread') return isUnread(n);
    if (activeFilter === 'Action Required') return n.type === 'action_required';
    if (activeFilter === 'System') return n.type === 'system';
    if (activeFilter === 'Updates') return n.type === 'approval' || n.type === 'comment' || n.type === 'guideline' || n.type === 'warning';
    return true;
  });

  const handleMarkAllRead = async () => {
    try { await api.markAllNotificationsRead(); notifications.forEach((n) => markNotificationRead(n.id)); await refresh(); addToast('All marked as read.'); }
    catch { addToast('Failed to mark notifications.', 'error'); }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-5 bg-canvas">
        {/* Header */}
        <div>
          <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">Notifications</h1>
          <p className="text-xs text-muted mt-0.5">Stay updated with the latest activity, approvals and important alerts.</p>
        </div>

        {/* KPI Cards */}
        <StatCardGrid cards={[
    { label: 'Total Notifications', value: totalCount, icon: <Bell className="w-5 h-5" />, variant: 'blue', trend: 12, sparkPathIndex: 0 },
    { label: 'Unread', value: unreadCount, icon: <CheckCircle2 className="w-5 h-5" />, variant: 'green', trend: 0, sparkPathIndex: 1 },
    { label: 'Action Required', value: actionCount, icon: <Clock className="w-5 h-5" />, variant: 'amber', trend: -50, sparkPathIndex: 2 },
    { label: 'System Alerts', value: systemCount, icon: <AlertTriangle className="w-5 h-5" />, variant: 'purple', trend: 0, sparkPathIndex: 3 },
  ]} />

        {/* Filters + Sort */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All', 'Unread', 'Action Required', 'System', 'Updates'] as const).map((tab) => {
              const cnt = tab === 'All' ? totalCount : tab === 'Unread' ? unreadCount : tab === 'Action Required' ? actionCount : tab === 'System' ? systemCount : updatesCount;
              return (
                <button key={tab} onClick={() => setActiveFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${activeFilter === tab ? 'bg-gradient-to-r from-brand-600 to-blue-600 text-white shadow-sm' : 'bg-white border border-line text-ink-600 hover:bg-[#FAF7EF]'}`}>
                  {tab} ({cnt})
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleMarkAllRead} className="text-xs font-semibold text-brand-600 hover:underline cursor-pointer">Mark All Read</button>
            <select className="bg-white border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none cursor-pointer"><option>Newest First</option></select>
            <div className="flex items-center gap-1 bg-white border border-line rounded-lg px-2 py-1.5 text-xs text-ink-700 cursor-pointer">Last 30 Days <svg className="w-3 h-3 text-muted-light ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg></div>
          </div>
        </div>

        {/* Notifications list */}
        <div className="space-y-2.5">
          {filtered.length === 0 && <div className="bg-white rounded-2xl border border-line p-10 text-center text-xs text-muted">No notifications found.</div>}
          {filtered.map((n) => {
            const unread = isUnread(n);
            const isSelected = selectedNotif?.id === n.id;
            return (
              <div key={n.id} onClick={() => { setSelectedNotifId(n.id); setIsDetailOpen(true); markNotificationRead(n.id); }}
                className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${isSelected ? 'selected-brand shadow-sm' : unread ? 'border-brand-100 bg-brand-50/20 hover:border-brand-200' : 'border-line hover:border-line-strong shadow-2xs hover:shadow-xs'}`}>
                <TypeIcon type={n.type} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${unread ? 'font-bold text-ink-900' : 'font-semibold text-ink-900'}`}>{n.title}</p>
                  <p className="text-xs text-muted mt-0.5 line-clamp-1">{n.description || n.message}</p>
                  <p className="text-[11px] text-muted-light mt-1 flex items-center gap-1"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>{n.time || n.timestamp}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <TypeBadge type={n.type} />
                  {unread && <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />}
                  <ChevronRight className="w-4 h-4 text-muted-light" />
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Right detail panel */}
      {isDetailOpen && selectedNotif && (
        <aside className="w-[320px] bg-white border-l border-line flex flex-col shrink-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
            <h3 className="text-sm font-bold text-ink-900">Notification Details</h3>
            <button onClick={() => setIsDetailOpen(false)} className="p-1 rounded-lg text-muted-light hover:text-ink-700"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-ink-900 text-sm">{selectedNotif.title}</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">{selectedNotif.description || selectedNotif.message}</p>
              </div>
            </div>
            {/* Thumbnail if approval */}
            {selectedNotif.type === 'approval' && (
              <div className="rounded-xl overflow-hidden border border-line">
                <div className="h-28 bg-[#F1ECE0] flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
              </div>
            )}
            {/* Metadata */}
            <div className="space-y-0">
              {[['Campaign', 'Summer Product Launch'], ['Received', selectedNotif.time || selectedNotif.timestamp || '—'], ['Type', selectedNotif.type?.replace('_', ' ') || '—']].map(([label, val]) => (
                <div key={String(label)} className="flex items-center justify-between py-1.5 border-b border-[#F5F0E8] last:border-0 text-xs">
                  <span className="text-muted">{label}</span>
                  <span className="font-medium text-ink">{val}</span>
                </div>
              ))}
            </div>
            {/* Success box */}
            {selectedNotif.type === 'approval' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-emerald-800 leading-relaxed">Great work! Your content is on track with brand guidelines.</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-line shrink-0">
            <button onClick={() => setCurrentPage('my-submissions')} className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer transition-colors cursor-pointer">
              View Submission <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};
