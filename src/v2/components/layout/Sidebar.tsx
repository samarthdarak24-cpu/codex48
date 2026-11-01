import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, LogOut, Compass, Inbox, FolderOpen, BookOpen, Scale, Ban, Box,
  Radar, Images, BarChart2, Clock, Sparkles, ArrowRight, LayoutDashboard,
  FilePlus, Send, AlertTriangle, Bell, CheckCircle2, User, History,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { PageId } from '../../types';

const cnt = (n: number) => (n > 0 ? String(n) : undefined);

export const Sidebar: React.FC = () => {
  const { role, activePage, setActivePage, notifications, currentUser, submissions, exceptions, sentinelAlerts } = useApp();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => { logout(); navigate('/login', { replace: true }); };

  const managerNav: { id: PageId; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview',         label: 'Overview',           icon: <Compass    className="w-4 h-4" /> },
    { id: 'review-queue',     label: 'Review Queue',       icon: <Inbox      className="w-4 h-4" />, badge: cnt(submissions.filter(s => s.status === 'In Review' || s.status === 'Pending').length) },
    { id: 'all-submissions',  label: 'All Submissions',    icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'brand-guidelines', label: 'Brand Guidelines',   icon: <BookOpen   className="w-4 h-4" /> },
    { id: 'rules-conflicts',  label: 'Rules & Conflicts',  icon: <Scale      className="w-4 h-4" /> },
    { id: 'exceptions',       label: 'Exceptions',         icon: <Ban        className="w-4 h-4" /> },
    { id: 'sandbox',          label: 'Rule Impact Sandbox',icon: <Box        className="w-4 h-4" /> },
    { id: 'sentinel',         label: 'Sentinel Monitoring',icon: <Radar      className="w-4 h-4" /> },
    { id: 'asset-library',    label: 'Asset Library',      icon: <Images     className="w-4 h-4" /> },
    { id: 'analytics',        label: 'Analytics & Health', icon: <BarChart2  className="w-4 h-4" /> },
    { id: 'audit-history',    label: 'Audit History',      icon: <History    className="w-4 h-4" /> },
  ];

  const creatorNav: { id: PageId; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'creator-dashboard', label: 'Dashboard',          icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'new-content',       label: 'New Content',        icon: <FilePlus        className="w-4 h-4" /> },
    { id: 'my-submissions',    label: 'My Submissions',     icon: <Send            className="w-4 h-4" />, badge: cnt(submissions.length) },
    { id: 'ai-review',         label: 'AI Review',          icon: <Sparkles        className="w-4 h-4" />, badge: cnt(submissions.filter(s => (s.findingsCount ?? 0) > 0).length) },
    { id: 'creator-guidelines',label: 'Guidelines',         icon: <BookOpen        className="w-4 h-4" /> },
    { id: 'exception-requests',label: 'Exception Requests', icon: <AlertTriangle   className="w-4 h-4" />, badge: cnt(exceptions.filter(e => e.status === 'Pending').length) },
    { id: 'sentinel-tasks',    label: 'Sentinel Tasks',     icon: <Radar           className="w-4 h-4" />, badge: cnt(sentinelAlerts.filter(a => a.status !== 'Resolved').length) },
    { id: 'notifications',     label: 'Notifications',      icon: <Bell            className="w-4 h-4" />, badge: cnt(notifications.filter(n => n.isUnread).length) },
    { id: 'approved-content',  label: 'Approved Content',   icon: <CheckCircle2    className="w-4 h-4" />, badge: cnt(submissions.filter(s => s.status === 'Approved').length) },
    { id: 'profile',           label: 'Profile',            icon: <User            className="w-4 h-4" /> },
  ];

  const navItems = role === 'manager' ? managerNav : creatorNav;

  return (
    <aside className="w-[240px] flex flex-col shrink-0 h-screen select-none sidebar-bg border-r border-slate-200">

      {/* Brand */}
      <div className="h-16 flex items-center px-5 gap-3 border-b border-slate-100 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-500/25 animate-float-gentle">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-[15px] font-bold text-slate-900 leading-tight tracking-tight">Precedent</p>
          <p className="text-[10px] text-slate-500 leading-tight mt-0.5 flex items-center gap-1.5">
            {role === 'manager' ? 'Brand Governance' : 'Content Team'}
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto styled-scroll px-3 py-3 space-y-0.5" aria-label="Main">
        {navItems.map(item => {
          const isActive = activePage === item.id;
          return (
            <button key={item.id} onClick={() => setActivePage(item.id)}
              className={`sidebar-nav-item w-full group relative flex items-center justify-between h-9 px-3 rounded-xl text-[13px] font-medium text-left cursor-pointer transition-all ${
                isActive
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}>
              {isActive && <span className="nav-active-bar" />}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`shrink-0 transition-colors ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-brand-500'}`}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full shrink-0 ml-1 transition-all ${
                  isActive ? 'bg-brand-100 text-brand-700' :
                  item.id === 'notifications' ? 'bg-red-100 text-red-700' :
                  'bg-slate-200 text-slate-600'
                }`}>{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-3 pt-2 border-t border-slate-100 space-y-2.5 shrink-0">
        {/* Promo */}
        <div className="sidebar-promo text-center">
          <p className="text-[11px] font-semibold text-slate-700 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-brand-500" />
            {role === 'manager' ? 'Keep brand consistent!' : 'Check your content'}
          </p>
          <button onClick={() => setActivePage(role === 'manager' ? 'analytics' : 'new-content')}
            className="mt-1.5 w-full py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded-xl border border-slate-200 inline-flex items-center justify-center gap-1 transition-all hover:border-brand-300 hover:text-brand-700">
            {role === 'manager' ? 'View Analytics' : 'New Brand Check'} <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* User row */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-colors group">
          <div className="relative shrink-0">
            <img alt={currentUser.name} className="h-8 w-8 rounded-full object-cover ring-2 ring-slate-200 group-hover:ring-brand-300 transition-all" src={currentUser.avatar} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900 leading-tight">{currentUser.name}</p>
            <p className="truncate text-[10px] text-slate-500">{currentUser.role}</p>
          </div>
          <button type="button" onClick={handleSignOut} title="Sign out"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
