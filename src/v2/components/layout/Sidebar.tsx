import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, LogOut, Compass, Inbox, FolderOpen, BookOpen, Scale, Ban, Box,
  Radar, Images, BarChart2, History, Sparkles, ArrowRight, LayoutDashboard,
  FilePlus, Send, AlertTriangle, Bell, CheckCircle2, User, X, Bot, Activity,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { PageId } from '../../types';
import { EASE } from '../motion';

const cnt = (n: number) => (n > 0 ? String(n) : undefined);

type NavItem = { id: PageId; label: string; icon: React.ReactNode; badge?: string };

export const Sidebar: React.FC<{ mobileOpen?: boolean; onClose?: () => void }> = ({
  mobileOpen = false,
  onClose,
}) => {
  const { role, activePage, setActivePage, notifications, currentUser, submissions, exceptions, sentinelAlerts } = useApp();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const handleSignOut = () => { logout(); navigate('/login', { replace: true }); };

  const managerNav: NavItem[] = [
    { id: 'overview',         label: 'Overview',            icon: <Compass    className="w-4 h-4" /> },
    { id: 'agent-studio',     label: 'Agent Studio',        icon: <Sparkles   className="w-4 h-4" /> },
    { id: 'my-agents',        label: 'My Agents',           icon: <Bot        className="w-4 h-4" /> },
    { id: 'agent-executions', label: 'Agent Executions',    icon: <Activity   className="w-4 h-4" /> },
    { id: 'review-queue',     label: 'Review Queue',        icon: <Inbox      className="w-4 h-4" />, badge: cnt(submissions.filter(s => s.status === 'In Review' || s.status === 'Pending').length) },
    { id: 'all-submissions',  label: 'All Submissions',     icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'brand-guidelines', label: 'Brand Guidelines',    icon: <BookOpen   className="w-4 h-4" /> },
    { id: 'rules-conflicts',  label: 'Rules & Conflicts',   icon: <Scale      className="w-4 h-4" /> },
    { id: 'exceptions',       label: 'Exceptions',          icon: <Ban        className="w-4 h-4" /> },
    { id: 'sandbox',          label: 'Rule Impact Sandbox', icon: <Box        className="w-4 h-4" /> },
    { id: 'sentinel',         label: 'Sentinel Monitoring', icon: <Radar      className="w-4 h-4" /> },
    { id: 'asset-library',    label: 'Asset Library',       icon: <Images     className="w-4 h-4" /> },
    { id: 'analytics',        label: 'Analytics & Health',  icon: <BarChart2  className="w-4 h-4" /> },
    { id: 'audit-history',    label: 'Audit History',       icon: <History    className="w-4 h-4" /> },
  ];

  const creatorNav: NavItem[] = [
    { id: 'creator-dashboard', label: 'Dashboard',          icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'my-assistants',     label: 'My AI Assistants',   icon: <Bot             className="w-4 h-4" /> },
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

  const handleNav = (id: PageId) => {
    setActivePage(id);
    onClose?.();
  };

  const body = (
    <>
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm shadow-brand-500/25">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold leading-tight tracking-tight text-ink">Precedent</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[10px] leading-tight text-muted">
            {role === 'manager' ? 'Brand Governance' : 'Content Team'}
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-sage-500" />
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-cream-100 hover:text-ink lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="styled-scroll flex-1 space-y-0.5 overflow-y-auto px-3 py-3" aria-label="Main">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`sidebar-nav-item group relative flex h-11 w-full cursor-pointer items-center justify-between rounded-xl px-3 text-left text-[13px] font-medium transition-colors lg:h-9 ${
                isActive
                  ? 'bg-brand-50 font-semibold text-brand-800'
                  : 'text-ink-600 hover:text-ink'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId={reduce ? undefined : 'sidebar-active'}
                  className="absolute left-0 top-[24%] bottom-[24%] w-[3px] rounded-r-[3px] bg-gradient-to-b from-brand-500 to-sage-500 shadow-[0_0_8px_rgba(36,76,58,0.45)]"
                  transition={{ duration: 0.28, ease: EASE }}
                />
              )}
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`shrink-0 transition-all duration-200 group-hover:translate-x-[2px] ${
                    isActive ? 'text-brand-600' : 'text-muted-light group-hover:text-brand-500'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <motion.span
                  key={item.badge}
                  initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className={`ml-1 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
                    isActive
                      ? 'bg-brand-100 text-brand-700'
                      : item.id === 'notifications'
                        ? 'bg-danger-100 text-danger-700'
                        : 'bg-cream-200 text-ink-600'
                  }`}
                >
                  {item.badge}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 space-y-2.5 border-t border-line px-3 pb-3 pt-2">
        <div className="sidebar-promo text-center">
          <p className="flex items-center justify-center gap-1 text-[11px] font-semibold text-ink-700">
            <Sparkles className="h-3 w-3 text-brand-500" />
            {role === 'manager' ? 'Keep brand consistent' : 'Check your content'}
          </p>
          <button
            onClick={() => handleNav(role === 'manager' ? 'analytics' : 'new-content')}
            className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-line bg-white py-1.5 text-[11px] font-semibold text-ink-700 transition-all hover:border-brand-300 hover:text-brand-700"
          >
            {role === 'manager' ? 'View Analytics' : 'New Brand Check'} <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="group flex items-center gap-2.5 rounded-xl border border-line bg-cream-50 p-2.5 transition-colors hover:bg-white">
          <div className="relative shrink-0">
            <img
              alt={currentUser.name}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-line transition-all duration-200 group-hover:scale-105 group-hover:ring-brand-300 group-hover:shadow-[0_0_0_3px_rgba(36,76,58,0.12)]"
              src={currentUser.avatar}
            />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-sage-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold leading-tight text-ink">{currentUser.name}</p>
            <p className="truncate text-[10px] text-muted">{currentUser.role}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="shrink-0 rounded-lg p-1.5 text-muted-light transition-all duration-200 hover:scale-110 hover:bg-danger-50 hover:text-danger-600 active:scale-95"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="sidebar-bg hidden h-screen w-[240px] shrink-0 select-none flex-col border-r border-line lg:flex">
        {body}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-ink-900/35 backdrop-blur-[2px]"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
            <motion.aside
              className="sidebar-bg absolute left-0 top-0 flex h-full w-[264px] flex-col border-r border-line shadow-pop"
              initial={reduce ? false : { x: '-100%' }}
              animate={{ x: 0 }}
              exit={reduce ? undefined : { x: '-100%' }}
              transition={{ duration: 0.3, ease: EASE }}
              aria-label="Main navigation"
            >
              {body}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
