import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, HelpCircle, X, ExternalLink, Shield, Sparkles, ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '@/context/AuthContext';

export const Header: React.FC = () => {
  const { searchQuery, setSearchQuery, notifications, role, currentUser, setActivePage } = useApp();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleSignOut = () => {
    setShowProfileMenu(false);
    logout();
    navigate('/login', { replace: true });
  };

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  return (
    <>
      <header className="h-16 bg-white border-b border-line px-6 flex items-center justify-between flex-shrink-0 z-10 sticky top-0">
        {/* Global Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-light absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search submissions, rules, assets, guidelines..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#FAF7EF]/90 border border-line rounded-xl text-ink-700 placeholder-muted-light focus:outline-none focus:border-brand-500 focus:bg-white transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-light hover:text-ink-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Header Utilities */}
        <div className="flex items-center gap-3.5 ml-4">
          {/* Active Mode Pill Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-line bg-[#FAF7EF] text-ink-700">
            {role === 'manager' ? (
              <span className="flex items-center gap-1.5 text-brand-700">
                <Shield className="w-3.5 h-3.5 text-brand-600" />
                <span>Governance Portal</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-800">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Creator Studio</span>
              </span>
            )}
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
              className="relative p-2 text-muted hover:text-ink hover:bg-[#F1ECE0] rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <>
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping opacity-75" />
                  <span className="absolute top-1 right-1 px-1.5 py-0.2 min-w-4 h-4 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white shadow-xs">
                    {unreadCount}
                  </span>
                </>
              )}
            </button>

            {/* Notification preview popup */}
            {showNotificationsMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-md rounded-2xl border border-line shadow-xl py-2 z-40 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-[#F1ECE0] flex items-center justify-between">
                  <div className="font-bold text-ink-900 text-xs flex items-center gap-1.5">
                    <span>Notifications</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
                      {unreadCount} new
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowNotificationsMenu(false);
                      setActivePage('notifications');
                    }}
                    className="text-[11px] text-brand-600 font-semibold hover:underline cursor-pointer"
                  >
                    View All →
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-[#F1ECE0]">
                  {notifications.slice(0, 4).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        setShowNotificationsMenu(false);
                        setActivePage('notifications');
                      }}
                      className="p-3 hover:bg-[#FAF7EF] cursor-pointer transition text-xs group"
                    >
                      <div className="font-semibold text-ink-900 leading-snug group-hover:text-brand-600 transition-colors">
                        {n.title}
                      </div>
                      <div className="text-[11px] text-muted mt-0.5 line-clamp-1">{n.description || n.message}</div>
                      <div className="text-[10px] text-muted-light mt-1">{n.time || n.timestamp}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Help Button */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-2 text-muted hover:text-ink hover:bg-[#F1ECE0] rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
            title="Precedent Knowledge & Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* User menu — profile + sign out */}
          <div className="relative pl-2 border-l border-line flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowProfileMenu((v) => !v)}
              className="flex items-center gap-1.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              aria-label="Account menu"
              aria-expanded={showProfileMenu}
            >
              <span className="relative group">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-500/30 group-hover:ring-brand-500/70 transition-all duration-300 shadow-xs"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-400" />
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-light" />
            </button>

            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowProfileMenu(false)} />
                <div className="absolute right-0 top-11 z-40 w-60 rounded-xl border border-line bg-white p-2 shadow-xl">
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-semibold text-ink">{currentUser.name}</p>
                    <p className="truncate text-[10px] text-muted">{currentUser.email}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-brand-700">{currentUser.role}</p>
                  </div>
                  <div className="my-1 h-px bg-line" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setActivePage(role === 'creator' ? 'profile' : 'overview');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-ink-700 hover:bg-[#FAF7EF]"
                  >
                    <UserRound className="w-3.5 h-3.5 text-muted" />
                    {role === 'creator' ? 'My profile' : 'Workspace overview'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-danger-600 hover:bg-danger-50"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Help & Guidebook Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-line">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1ECE0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-ink-900 text-sm">Precedent Brand Governance System</h3>
                  <p className="text-[11px] text-muted-light">Platform guide &amp; workflow</p>
                </div>
              </div>
              <button onClick={() => setShowHelpModal(false)} className="text-muted-light hover:text-ink-700 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs text-ink-600 leading-relaxed">
              <p>
                Welcome to <strong className="text-ink-900">Precedent</strong>, the all-in-one brand governance suite that unifies
                marketing, design, legal compliance, and creative production.
              </p>
              <div className="bg-[#FAF7EF] rounded-xl p-3 border border-line space-y-2">
                <div className="font-semibold text-ink text-[11px] uppercase tracking-wider">Key Modules:</div>
                <ul className="space-y-1.5 list-disc pl-4 text-[11px]">
                  <li><strong className="text-ink">Review Queue:</strong> Multi-stage kanban review with VisualGuard OCR and claim validation.</li>
                  <li><strong className="text-ink">Rules &amp; Conflicts:</strong> Detect contradictory guidelines across marketing and legal domains.</li>
                  <li><strong className="text-ink">Rule Impact Sandbox:</strong> Simulate the real impact of rule adjustments on live assets before publishing.</li>
                  <li><strong className="text-ink">Sentinel Monitoring:</strong> Continuous background surveillance for brand risks and claim violations.</li>
                  <li><strong className="text-ink">Role assignment:</strong> Roles are set by your workspace administrator; each account has exactly one workspace.</li>
                </ul>
              </div>
            </div>
            <div className="pt-3 border-t border-[#F1ECE0] flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="py-1.5 px-4 bg-ink-900 hover:bg-ink text-white rounded-lg font-semibold text-xs transition"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
