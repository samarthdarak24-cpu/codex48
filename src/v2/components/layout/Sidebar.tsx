import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  LogOut,
  Compass,
  Inbox,
  FolderOpen,
  BookOpen,
  Scale,
  Ban,
  Box,
  Radar,
  Images,
  BarChart2,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronDown,
  LayoutDashboard,
  FilePlus,
  Send,
  AlertTriangle,
  Bell,
  CheckCircle2,
  User,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { PageId } from '../../types';

export const Sidebar: React.FC = () => {
  const { role, activePage, setActivePage, notifications, currentUser, submissions, exceptions, sentinelAlerts } =
    useApp();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const count = (n: number) => (n > 0 ? String(n) : undefined);

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const managerNavItems: { id: PageId; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: <Compass className="w-4 h-4" /> },
    {
      id: 'review-queue',
      label: 'Review Queue',
      icon: <Inbox className="w-4 h-4" />,
      badge: count(submissions.filter((s) => s.status === 'In Review' || s.status === 'Pending').length),
    },
    { id: 'all-submissions', label: 'All Submissions', icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'brand-guidelines', label: 'Brand Guidelines', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'rules-conflicts', label: 'Rules & Conflicts', icon: <Scale className="w-4 h-4" /> },
    { id: 'exceptions', label: 'Exceptions', icon: <Ban className="w-4 h-4" /> },
    { id: 'sandbox', label: 'Rule Impact Sandbox', icon: <Box className="w-4 h-4" /> },
    { id: 'sentinel', label: 'Sentinel Monitoring', icon: <Radar className="w-4 h-4" /> },
    { id: 'asset-library', label: 'Asset Library', icon: <Images className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics & Health', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'audit-history', label: 'Audit History', icon: <Clock className="w-4 h-4" /> },
  ];

  const creatorNavItems: { id: PageId; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'creator-dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'new-content', label: 'New Content', icon: <FilePlus className="w-4 h-4" /> },
    { id: 'my-submissions', label: 'My Submissions', icon: <Send className="w-4 h-4" />, badge: count(submissions.length) },
    {
      id: 'ai-review',
      label: 'AI Review',
      icon: <Sparkles className="w-4 h-4" />,
      badge: count(submissions.filter((s) => (s.findingsCount ?? 0) > 0).length),
    },
    { id: 'creator-guidelines', label: 'Guidelines', icon: <BookOpen className="w-4 h-4" /> },
    {
      id: 'exception-requests',
      label: 'Exception Requests',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: count(exceptions.filter((e) => e.status === 'Pending').length),
    },
    {
      id: 'sentinel-tasks',
      label: 'Sentinel Tasks',
      icon: <Radar className="w-4 h-4" />,
      badge: count(sentinelAlerts.filter((a) => a.status !== 'Resolved').length),
    },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, badge: count(notifications.filter((n) => n.isUnread).length) },
    {
      id: 'approved-content',
      label: 'Approved Content',
      icon: <CheckCircle2 className="w-4 h-4" />,
      badge: count(submissions.filter((s) => s.status === 'Approved').length),
    },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  ];

  const currentNavItems = role === 'manager' ? managerNavItems : creatorNavItems;

  return (
    <aside className="w-60 bg-white border-r border-line flex flex-col flex-shrink-0 z-20 select-none h-screen">
      {/* Brand Header */}
      {/* Brand Header with animated subtle gradient */}
      <div className="h-16 flex items-center px-5 gap-3 border-b border-[#F1ECE0] shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-brand-500/25 transition-transform duration-300 hover:scale-105">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-ink-900 text-sm leading-tight tracking-tight flex items-center gap-1.5">
            <span>Precedent</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </h1>
          <p className="text-[11px] font-medium text-muted-light leading-tight">
            {role === 'manager' ? 'Brand Governance' : 'Content Team'}
          </p>
        </div>
      </div>

      {/* Role is assigned by the workspace administrator — not switchable. */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center justify-between rounded-xl border border-line bg-[#FAF7EF] px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Workspace</span>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
            {role === 'manager' ? 'Brand Manager' : 'Content Creator'}
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 text-xs">
        {currentNavItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all duration-200 text-left cursor-pointer ${
                isActive
                  ? role === 'manager'
                    ? 'bg-brand-50/90 text-brand-700 font-semibold shadow-2xs'
                    : 'bg-emerald-50/90 text-emerald-800 font-semibold shadow-2xs'
                  : 'text-ink-600 hover:bg-[#FAF7EF] hover:text-ink-900 hover:translate-x-0.5'
              }`}
            >
              {/* Left active accent bar */}
              {isActive && (
                <span
                  className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full ${
                    role === 'manager' ? 'bg-brand-600' : 'bg-emerald-600'
                  }`}
                />
              )}

              <div className="flex items-center gap-3">
                <span
                  className={`transition-colors duration-200 ${
                    isActive
                      ? role === 'manager'
                        ? 'text-brand-600'
                        : 'text-emerald-700'
                      : 'text-muted-light group-hover:text-ink-600'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full transition-all ${
                    isActive
                      ? role === 'manager'
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-emerald-100 text-emerald-800'
                      : item.id === 'notifications'
                      ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                      : 'bg-[#F1ECE0] text-ink-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer Section */}
      <div className="p-3 border-t border-[#F1ECE0] space-y-2.5 shrink-0 bg-white">
        {/* Banner Promo / Compliance */}
        {role === 'manager' ? (
          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center">
            <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-semibold text-[11px] mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Keep our brand</span>
            </div>
            <div className="text-[11px] text-emerald-800 font-medium mb-2">
              consistent &amp; compliant!
            </div>
            <button
              onClick={() => setActivePage('analytics')}
              className="w-full py-1 px-2.5 bg-white hover:bg-[#FAF7EF] text-emerald-800 text-[11px] font-semibold rounded-lg border border-emerald-200 shadow-2xs inline-flex items-center justify-center gap-1 transition"
            >
              <span>View Analytics</span>
              <ArrowRight className="w-3 h-3 text-emerald-700" />
            </button>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-brand-50/70 border border-brand-100 text-center">
            <div className="flex items-center justify-center gap-1.5 text-brand-700 font-semibold text-[11px] mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Pre-Check Assets</span>
            </div>
            <div className="text-[11px] text-brand-700 font-medium mb-2">
              Instant AI brand feedback
            </div>
            <button
              onClick={() => setActivePage('new-content')}
              className="w-full py-1 px-2.5 bg-white hover:bg-[#FAF7EF] text-brand-700 text-[11px] font-semibold rounded-lg border border-brand-200 shadow-2xs inline-flex items-center justify-center gap-1 transition"
            >
              <span>New Brand Check</span>
              <ArrowRight className="w-3 h-3 text-brand-700" />
            </button>
          </div>
        )}

        {/* Signed-in user + sign out */}
        <div className="flex items-center gap-2 rounded-xl border border-line/60 bg-[#FAF7EF] p-2">
          <img
            alt={currentUser.name}
            className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-line"
            src={currentUser.avatar}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold leading-tight text-ink">{currentUser.name}</div>
            <div className="truncate text-[10px] text-muted-light">{currentUser.role}</div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white hover:text-danger-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
