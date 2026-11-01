import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Check,
  Trash2,
  ExternalLink,
  MessageSquare,
  BookOpen,
  ShieldAlert,
  ArrowRight,
  Archive,
  Eye,
  FileText
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { NotificationItem } from '../../../types';
import { api } from '@/services/api';

export const NotificationsView: React.FC = () => {
  const { notifications, markNotificationRead, addToast, setCurrentPage, refresh } = useApp();
  const [activeFilter, setActiveFilter] = useState<'All' | 'Unread' | 'Action Required' | 'System' | 'Updates'>('All');
  const [selectedNotifId, setSelectedNotifId] = useState<string>('');
  const selectedNotif = notifications.find((n) => n.id === selectedNotifId) || notifications[0];

  const isNotifUnread = (n: NotificationItem) => (n.isUnread !== undefined ? n.isUnread : !n.read);

  const totalCount = notifications.length;
  const unreadCount = notifications.filter(isNotifUnread).length;
  const actionRequiredCount = notifications.filter(n => n.type === 'action_required' || n.type === 'action').length;
  const systemCount = notifications.filter(n => n.type === 'system' || n.type === 'guideline').length;
  const updatesCount = notifications.filter(n => n.type === 'approval' || n.type === 'comment').length;

  const filtered = notifications.filter(n => {
    if (activeFilter === 'Unread') return isNotifUnread(n);
    if (activeFilter === 'Action Required') return n.type === 'action_required' || n.type === 'action';
    if (activeFilter === 'System') return n.type === 'system';
    if (activeFilter === 'Updates') return n.type === 'approval' || n.type === 'comment' || n.type === 'guideline';
    return true;
  });

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      notifications.forEach((n) => markNotificationRead(n.id));
      await refresh();
      addToast('All notifications marked as read', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Could not mark all as read.', 'error');
    }
  };

  const getNotifIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'approval':
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'action_required':
      case 'action':
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      case 'comment':
        return (
          <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
        );
      case 'guideline':
      case 'system':
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-grape-100 text-grape-700 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Notifications</h1>
          <p className="text-xs text-muted mt-0.5">
            Stay updated with reviews, comments, and brand guideline changes.
          </p>
        </div>
        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-line text-ink-700 rounded-lg text-xs font-semibold hover:bg-[#FAF7EF] shadow-2xs cursor-pointer transition-colors"
        >
          <Check className="w-3.5 h-3.5 text-muted" />
          <span>Mark All as Read</span>
        </button>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Notifications */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Total Notifications</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">{totalCount}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-medium text-muted-light">live</span>
            <svg className="w-16 h-6 text-brand-400 stroke-current" fill="none" viewBox="0 0 64 24">
              <path d="M0 18 Q 16 8, 32 14 T 64 6" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Unread */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Unread</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">{unreadCount}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-medium text-amber-600">Pending</span>
            <svg className="w-16 h-6 text-amber-400 stroke-current" fill="none" viewBox="0 0 64 24">
              <path d="M0 12 Q 16 18, 32 10 T 64 14" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Action Required */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-grape-50 text-grape-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Action Required</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">{actionRequiredCount}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-medium text-grape-600">Requires Action</span>
            <svg className="w-16 h-6 text-grape-500 stroke-current" fill="none" viewBox="0 0 64 24">
              <path d="M0 6 Q 16 12, 32 18 T 64 20" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* System Alerts */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">System Alerts</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">{systemCount}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-medium text-emerald-600">Monitored</span>
            <svg className="w-16 h-6 text-emerald-400 stroke-current" fill="none" viewBox="0 0 64 24">
              <path d="M0 20 Q 16 16, 32 8 T 64 4" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['All', 'Unread', 'Action Required', 'System', 'Updates'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              activeFilter === tab
                ? 'bg-ink-900 text-white shadow-2xs'
                : 'bg-white text-ink-600 hover:bg-[#FAF7EF] border border-line/80'
            }`}
          >
            {tab} (
            {tab === 'All'
              ? totalCount
              : tab === 'Unread'
              ? unreadCount
              : tab === 'Action Required'
              ? actionRequiredCount
              : tab === 'System'
              ? systemCount
              : updatesCount}
            )
          </button>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Notification Cards List */}
        <div className="lg:col-span-7 space-y-3">
          {filtered.map(notif => {
            const isUnread = isNotifUnread(notif);
            const isSelected = selectedNotif?.id === notif.id;

            return (
              <div
                key={notif.id}
                onClick={() => {
                  setSelectedNotifId(notif.id);
                  if (isUnread) markNotificationRead(notif.id);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3.5 ${
                  isSelected
                    ? 'bg-brand-50/40 border-brand-400 shadow-xs ring-1 ring-brand-300'
                    : isUnread
                    ? 'bg-white border-brand-200/70 shadow-2xs hover:border-line-strong'
                    : 'bg-white border-line/90 shadow-2xs hover:border-line-strong opacity-90'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  {getNotifIcon(notif.type)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm tracking-tight truncate ${isUnread ? 'font-bold text-ink-900' : 'font-medium text-ink'}`}>
                        {notif.title}
                      </h3>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="text-[11px] text-muted-light mt-1.5 flex items-center gap-2">
                      <span>{notif.timestamp}</span>
                      {notif.actionUrl && (
                        <>
                          <span>•</span>
                          <span className="text-brand-600 font-semibold flex items-center gap-0.5">
                            Action link available
                          </span>
                        </>
                      )}
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

        {/* Right Column: Notification Details */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-line/90 shadow-2xs p-6 space-y-5">
          {selectedNotif ? (
            <>
              {/* Status Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {selectedNotif.badgeText ?? selectedNotif.type}
                  </span>
                  <div className="text-xs text-muted-light mt-2">{selectedNotif.timestamp}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled
                    title="Archiving is not available in this build."
                    className="p-1.5 rounded-lg text-muted-light cursor-not-allowed"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-base font-bold text-ink-900 tracking-tight">{selectedNotif.title}</h2>
                <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                  {selectedNotif.message || selectedNotif.description}
                </p>
              </div>

              {/* Related Content Item */}
              <div className="p-3.5 rounded-xl border border-line/80 bg-[#FAF7EF]/60 flex items-center gap-3">
                {selectedNotif.thumbnail ? (
                  <img
                    src={selectedNotif.thumbnail}
                    alt={selectedNotif.title}
                    className="w-14 h-14 rounded-lg object-cover border border-line"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-ink-900">{selectedNotif.title}</div>
                  <div className="text-[11px] text-muted">
                    {selectedNotif.campaign ? `${selectedNotif.campaign} • ` : ''}
                    {selectedNotif.type}
                  </div>
                </div>
              </div>

              {/* Details (real metadata only) */}
              <div className="space-y-2.5 text-xs border-t border-[#F1ECE0] pt-3">
                <div className="flex justify-between py-1 text-muted">
                  <span>Type</span>
                  <span className="font-semibold text-ink">{selectedNotif.type}</span>
                </div>
                {selectedNotif.campaign && (
                  <div className="flex justify-between py-1 text-muted">
                    <span>Campaign</span>
                    <span className="font-semibold text-ink">{selectedNotif.campaign}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 text-muted">
                  <span>Status</span>
                  <span className="font-semibold text-ink">
                    {isNotifUnread(selectedNotif) ? 'Unread' : 'Read'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() =>
                    setCurrentPage(
                      selectedNotif.type === 'action_required' || selectedNotif.type === 'action'
                        ? 'creator-exceptions'
                        : 'my-submissions',
                    )
                  }
                  className="flex-1 py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>View Submission</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-xs text-muted-light">
              Select a notification to view its full review metadata.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
