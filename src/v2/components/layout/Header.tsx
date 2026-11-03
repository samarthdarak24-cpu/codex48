import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, HelpCircle, X, ChevronDown, LogOut, UserRound, Shield, Sparkles, Menu, Moon, Sun } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '@/context/AuthContext';

export const Header: React.FC<{
  onOpenNav?: () => void;
  theme: 'night' | 'day';
  onThemeChange: () => void;
}> = ({ onOpenNav, theme, onThemeChange }) => {
  const { searchQuery, setSearchQuery, notifications, role, currentUser, setActivePage } = useApp();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleSignOut = () => { setShowProfile(false); logout(); navigate('/login', { replace: true }); };
  const unreadCount = notifications.filter(n => n.isUnread).length;

  const placeholder = role === 'manager'
    ? 'Search submissions, rules, assets...'
    : 'Search your submissions, campaigns...';

  return (
    <>
      <header className="h-16 header-glass px-4 sm:px-6 flex items-center gap-3 justify-between shrink-0 sticky top-0 z-20">

        {/* Mobile nav toggle */}
        <button
          type="button"
          onClick={onOpenNav}
          className="lg:hidden shrink-0 rounded-xl p-2 text-ink-600 transition-colors hover:bg-cream-100 hover:text-ink"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search bar */}
        <div className="flex-1 max-w-[480px]">
          <div className="relative group">
            <Search className="w-3.5 h-3.5 text-muted-light absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors group-focus-within:text-brand-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={placeholder}
              aria-label="Search"
              className="w-full pl-9 pr-9 py-2 text-xs bg-cream-100 border border-line rounded-full text-ink placeholder-muted-light focus:outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/12 transition-all duration-200"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-light hover:text-ink-600 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right utilities */}
        <div className="flex items-center gap-1.5">

          {/* Role pill */}
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${
            role === 'manager'
              ? 'bg-brand-50 border-brand-200 text-brand-700'
              : 'bg-sage-50 border-sage-200 text-sage-700'
          }`}>
            {role === 'manager'
              ? <><Shield className="w-3 h-3 text-brand-600" />Governance Portal</>
              : <><Sparkles className="w-3 h-3 text-sage-600" />Creator Studio</>
            }
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifMenu(!showNotifMenu); setShowProfile(false); }}
              className="relative p-2 text-muted-light hover:text-ink hover:bg-[#F1ECE0] rounded-xl transition-all cursor-pointer group"
              title="Notifications"
            >
              <Bell className="w-4.5 h-4.5 group-hover:animate-pulse-subtle" />
              {unreadCount > 0 && (
                <>
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500/40 animate-ping" />
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[9px] font-bold flex items-center justify-center px-1 border-2 border-white shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </>
              )}
            </button>

            {showNotifMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowNotifMenu(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-md rounded-2xl border border-line shadow-xl py-2 z-40 animate-scale-in">
                  <div className="px-4 py-2 border-b border-[#F1ECE0] flex items-center justify-between">
                    <div className="font-bold text-ink-900 text-xs flex items-center gap-1.5">
                      Notifications
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 font-bold">{unreadCount} new</span>
                      )}
                    </div>
                    <button onClick={() => { setShowNotifMenu(false); setActivePage('notifications'); }} className="text-[11px] text-brand-600 font-semibold hover:underline">View All →</button>
                  </div>
                  <div className="max-h-72 overflow-y-auto styled-scroll divide-y divide-[#F1ECE0]">
                    {notifications.slice(0, 5).map(n => (
                      <div key={n.id} onClick={() => { setShowNotifMenu(false); setActivePage('notifications'); }}
                        className={`p-3 cursor-pointer transition-colors text-xs group hover:bg-gradient-to-r hover:from-brand-50/50 hover:to-transparent ${n.isUnread ? 'bg-brand-50/30' : ''}`}>
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.isUnread ? 'bg-brand-500' : 'bg-transparent'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-ink-900 leading-snug group-hover:text-brand-700 transition-colors">{n.title}</p>
                            <p className="text-[11px] text-muted mt-0.5 line-clamp-1">{n.description || n.message}</p>
                            <p className="text-[10px] text-muted-light mt-1">{n.time || n.timestamp}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && <div className="p-6 text-center text-xs text-muted">No notifications yet.</div>}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Help */}
          <button onClick={() => setShowHelp(true)} className="p-2 text-muted-light hover:text-ink hover:bg-[#F1ECE0] rounded-xl transition-all cursor-pointer" title="Help & Guide">
            <HelpCircle className="w-4.5 h-4.5" />
          </button>

          {/* Day/night appearance */}
          <button
            type="button"
            onClick={onThemeChange}
            className="theme-toggle inline-flex items-center gap-1.5 rounded-xl border border-line px-2.5 py-2 text-[11px] font-semibold text-muted transition-all hover:border-brand-300 hover:text-brand-700"
            aria-label={`Switch to ${theme === 'night' ? 'day' : 'night'} mode`}
            title={`Switch to ${theme === 'night' ? 'day' : 'night'} mode`}
          >
            {theme === 'night' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="hidden md:inline">{theme === 'night' ? 'Day' : 'Night'}</span>
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-gradient-to-b from-transparent via-line to-transparent mx-1" />

          {/* User avatar + dropdown */}
          <div className="relative">
            <button type="button" onClick={() => { setShowProfile(v => !v); setShowNotifMenu(false); }}
              className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 hover:bg-gradient-to-r hover:from-[#F2F7FD] hover:to-[#EDF4FB] transition-all"
              aria-label="Account menu">
              <div className="relative">
                <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-300/40 hover:ring-brand-400 transition-all" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[12px] font-semibold text-ink leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-muted-light leading-tight">{currentUser.role}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-light" />
            </button>

            {showProfile && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowProfile(false)} />
                <div className="absolute right-0 top-12 z-40 w-56 rounded-2xl border border-line bg-white/95 backdrop-blur-md p-2 shadow-xl animate-scale-in">
                  {/* User info */}
                  <div className="px-3 py-2.5 bg-gradient-to-r from-brand-50 to-emerald-50 rounded-xl mb-1">
                    <p className="text-sm font-bold text-ink-900">{currentUser.name}</p>
                    <p className="text-xs text-muted truncate">{currentUser.email}</p>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{currentUser.role}
                    </span>
                  </div>
                  <button type="button"
                    onClick={() => { setShowProfile(false); setActivePage(role === 'creator' ? 'profile' : 'overview'); }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-ink-700 hover:bg-gradient-to-r hover:from-brand-50 hover:to-transparent transition-all">
                    <UserRound className="w-3.5 h-3.5 text-brand-500" />
                    {role === 'creator' ? 'My Profile' : 'Workspace Overview'}
                  </button>
                  <div className="h-px bg-gradient-to-r from-transparent via-line to-transparent my-1" />
                  <button type="button" onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-danger-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-transparent transition-all">
                    <LogOut className="w-3.5 h-3.5" />Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-line animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-500/30">
                  <Shield className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-ink-900 text-sm">Precedent Help Guide</h3>
                  <p className="text-[10px] text-muted-light">Brand Governance Platform</p>
                </div>
              </div>
              <button onClick={() => setShowHelp(false)} className="p-1.5 rounded-xl text-muted-light hover:text-ink-700 hover:bg-[#F1ECE0] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="py-4 space-y-3 text-xs text-ink-600 leading-relaxed">
              <p><strong className="text-ink-900">Precedent</strong> is your brand governance platform for managing content compliance, guidelines, and approvals.</p>
              <div className="bg-gradient-to-br from-[#FAF7EF] to-[#F5F0E8] rounded-2xl p-3.5 border border-line space-y-2">
                <p className="font-bold text-ink text-[11px] uppercase tracking-wider">Key Modules</p>
                <ul className="space-y-2 text-[11px]">
                  {[
                    ['Review Queue', 'Multi-stage kanban with VisualGuard OCR analysis'],
                    ['Rules & Conflicts', 'Detect contradictory brand guidelines automatically'],
                    ['Rule Impact Sandbox', 'Simulate rule changes before publishing'],
                    ['Sentinel Monitoring', 'Continuous AI-powered brand surveillance'],
                  ].map(([title, desc]) => (
                    <li key={title} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                      <span><strong className="text-ink-900">{title}</strong> — {desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-[11px] text-muted bg-blue-50 border border-blue-100 rounded-xl p-2.5">
                💡 Use <strong>david.kim@pureglow.co</strong> (manager) or <strong>emily.carter@pureglow.co</strong> (creator) with password <code className="bg-white px-1 rounded font-mono">precedent</code>
              </p>
            </div>
            <div className="flex justify-end pt-3 border-t border-line">
              <button onClick={() => setShowHelp(false)} className="btn-primary-glow py-2 px-5 rounded-xl text-white font-bold text-xs">Got it</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
