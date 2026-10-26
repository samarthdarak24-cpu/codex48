import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FilePlus2,
  FlaskConical,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  MessageSquare,
  RotateCcw,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { exceptionStats, awaitingDecision } from '@/lib/selectors'
import { Avatar } from '@/components/ui/Misc'
import { clearDemoBundle } from '@/services/demoStore'
import { CountBubble } from '@/components/ui/Badge'

/* ------------------------------------------------------------------ */
/* Brand                                                               */
/* ------------------------------------------------------------------ */

export function BrandMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5FD48F" />
          <stop offset="55%" stopColor="#2FB86B" />
          <stop offset="100%" stopColor="#1E9E5A" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.5l10.2 3.6v8.1c0 6.4-4.1 12.1-10.2 15.3C9.9 26.3 5.8 20.6 5.8 14.2V6.1L16 2.5z"
        fill="url(#shieldGrad)"
      />
      <path
        d="M16 6.2l6.9 2.4v5.6c0 4.4-2.8 8.4-6.9 10.7-4.1-2.3-6.9-6.3-6.9-10.7V8.6L16 6.2z"
        fill="#fff"
        fillOpacity=".22"
      />
      <path
        d="M11.6 15.6l3 3 6-6.2"
        fill="none"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Wordmark({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark size={compact ? 24 : 30} />
      <div className="min-w-0">
        <p className="text-[15.5px] font-bold leading-[18px] tracking-[-0.02em] text-ink">Precedent</p>
        {!compact && <p className="mt-[1px] text-[9.5px] leading-[12px] text-muted">AI-assisted brand governance</p>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  badge?: number
  badgeTone?: 'danger' | 'warn'
}

function useNavItems(): { items: NavItem[]; footer: string } {
  const { user } = useAuth()
  const { submissions, exceptions } = useData()

  if (user?.role === 'manager') {
    const pending = awaitingDecision(submissions).length
    const openExceptions = exceptionStats(exceptions).pending + exceptionStats(exceptions).inReview
    return {
      footer: 'Smarter brand decisions.',
      items: [
        { to: '/manager/overview', label: 'Overview', icon: LayoutDashboard },
        { to: '/manager/queue', label: 'Review Queue', icon: ListChecks, badge: pending, badgeTone: 'danger' },
        { to: '/manager/guidelines', label: 'Guidelines & Rules', icon: BookOpen },
        { to: '/manager/exceptions', label: 'Exceptions', icon: Clock, badge: openExceptions, badgeTone: 'warn' },
        { to: '/manager/sandbox', label: 'Rule Impact Sandbox', icon: FlaskConical },
        { to: '/manager/audit', label: 'Audit History', icon: ShieldCheck },
      ],
    }
  }

  return {
    footer: 'Better content. Stronger brands.',
    items: [
      { to: '/app/overview', label: 'Overview', icon: LayoutDashboard },
      { to: '/app/new', label: 'New Content', icon: FilePlus2 },
      { to: '/app/submissions', label: 'My Submissions', icon: ClipboardCheck },
      { to: '/app/guidelines', label: 'Brand Guidelines', icon: BookOpen },
      { to: '/app/feedback', label: 'Review Feedback', icon: MessageSquare },
    ],
  }
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { items, footer } = useNavItems()
  const { user } = useAuth()

  return (
    <aside className="flex h-full w-[246px] shrink-0 flex-col border-r border-line bg-white">
      <div className="px-4 pb-4 pt-5">
        <Link to={user?.role === 'manager' ? '/manager/overview' : '/app/overview'} onClick={onNavigate}>
          <Wordmark />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-base transition-colors',
                    isActive
                      ? 'bg-brand-50 font-semibold text-brand-700'
                      : 'font-medium text-ink-600 hover:bg-[#F6F9FE] hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute -left-3 top-1/2 h-[22px] w-[3px] -translate-y-1/2 rounded-r-full bg-brand-500" />
                    )}
                    <item.icon
                      className={cn('h-[15px] w-[15px] shrink-0', isActive ? 'text-brand-500' : 'text-muted')}
                      strokeWidth={isActive ? 2.2 : 1.9}
                    />
                    <span className="truncate">{item.label}</span>
                    {item.badge ? <CountBubble count={item.badge} tone={item.badgeTone} /> : null}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-line px-4 py-3.5">
        <div className="flex items-center gap-2">
          <BrandMark size={18} />
          <div className="min-w-0">
            <p className="text-xs font-semibold leading-[15px] text-ink">Precedent</p>
            <p className="truncate text-[9.5px] leading-[13px] text-muted">{footer}</p>
          </div>
        </div>
        <p className="mt-2.5 text-[9px] leading-[12px] text-muted-light">
          Fictional demo workspace · no customer data
        </p>
      </div>
    </aside>
  )
}

/* ------------------------------------------------------------------ */
/* Topbar                                                              */
/* ------------------------------------------------------------------ */

function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const close = () => {
      setMenuOpen(false)
      setNotifOpen(false)
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const placeholder =
    user?.role === 'manager' ? 'Search content, rules, or submissions…' : 'Search content, rules, or guidelines…'

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur-md sm:px-6">
      <button
        onClick={onOpenMenu}
        aria-label="Open navigation"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-600 lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      <form
        className="relative hidden max-w-[330px] flex-1 sm:block"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-light" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-[34px] w-full rounded-full border border-line bg-[#F7FAFE] pl-9 pr-3 text-base text-ink placeholder:text-muted-light transition focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-brand-500/10"
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setNotifOpen((v) => !v)
              setMenuOpen(false)
            }}
            aria-label="Notifications"
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-[#F2F7FD]"
          >
            <Bell className="h-[17px] w-[17px]" strokeWidth={1.9} />
            <span className="absolute right-[7px] top-[6px] h-[6px] w-[6px] rounded-full bg-[#F0453F] ring-2 ring-white" />
          </button>
          {notifOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-11 w-[290px] animate-pop-in rounded-xl border border-line bg-white p-1.5 shadow-lift"
            >
              <p className="px-2.5 py-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">
                Notifications
              </p>
              <div className="px-2.5 py-3 text-xs text-muted">
                You are up to date. New review decisions, exception expiries and rule confirmations will appear here.
              </div>
            </div>
          )}
        </div>

        <div className="mx-1 h-6 w-px bg-line" />

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
              setNotifOpen(false)
            }}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 transition-colors hover:bg-[#F2F7FD]"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Avatar initials={user?.initials ?? '—'} tone={user?.avatarTone} size="lg" />
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-[15px] text-ink">{user?.name}</p>
              <p className="text-2xs leading-[14px] text-muted">{user?.title}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted" />
          </button>

          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              role="menu"
              className="absolute right-0 top-12 w-[236px] animate-pop-in rounded-xl border border-line bg-white p-1.5 shadow-lift"
            >
              <div className="px-2.5 py-2">
                <p className="text-base font-semibold text-ink">{user?.name}</p>
                <p className="text-xs text-muted">{user?.email}</p>
                <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-success-50 px-1.5 py-px text-2xs font-medium text-success-700">
                  <span className="h-1 w-1 rounded-full bg-success-500" />
                  {user?.title}
                </p>
              </div>
              <div className="my-1 h-px bg-line" />
              <button
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-base text-ink-600 transition-colors hover:bg-[#F5F9FE]"
                onClick={() => navigate(user?.role === 'manager' ? '/manager/guidelines' : '/app/guidelines')}
              >
                <BookOpen className="h-3.5 w-3.5 text-muted" />
                Brand guidelines
              </button>
              <button
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-base text-ink-600 transition-colors hover:bg-[#F5F9FE]"
                onClick={() => navigate('/login')}
              >
                <Users className="h-3.5 w-3.5 text-muted" />
                Switch workspace
              </button>
              <div className="my-1 h-px bg-line" />
              <button
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-base text-ink-600 transition-colors hover:bg-[#F5F9FE]"
                onClick={() => {
                  clearDemoBundle()
                  window.location.reload()
                }}
              >
                <RotateCcw className="h-3.5 w-3.5 text-muted" />
                Reset demo data
              </button>
              <button
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-base font-medium text-danger-600 transition-colors hover:bg-danger-50"
                onClick={() => {
                  logout()
                  navigate('/login', { replace: true })
                }}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/* Page header                                                         */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  subtitle,
  backTo,
  backLabel = 'Back to Dashboard',
  actions,
  eyebrow,
}: {
  title: string
  subtitle?: string
  backTo?: string
  backLabel?: string
  actions?: React.ReactNode
  eyebrow?: React.ReactNode
}) {
  const navigate = useNavigate()
  return (
    <div className="mb-4">
      {backTo && (
        <button
          onClick={() => navigate(backTo)}
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          <ArrowLeft className="h-3 w-3" />
          {backLabel}
        </button>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow}
          <h1 className="text-3xl font-semibold tracking-[-0.025em] text-ink">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-base leading-[20px] text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-canvas">
      <div className="sticky top-0 hidden h-screen lg:block">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#0F2138]/40 animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full animate-slide-in">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-ink shadow-lift"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-[1180px] animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Right rail layout helper                                            */
/* ------------------------------------------------------------------ */

export function WithRail({ children, rail }: { children: React.ReactNode; rail: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_296px]">
      <div className="min-w-0 space-y-4">{children}</div>
      <div className="space-y-4">{rail}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

export function RailCard({
  title,
  action,
  icon,
  children,
  className,
}: {
  title: string
  action?: React.ReactNode
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-xl border border-line bg-white shadow-card', className)}>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h2 className="flex items-center gap-1.5 text-md font-semibold text-ink">
          {icon && <span className="text-brand-500">{icon}</span>}
          {title}
        </h2>
        {action}
      </div>
      <div className="px-4 pb-3.5">{children}</div>
    </section>
  )
}

export function QuickAction({
  icon,
  label,
  description,
  onClick,
  tone = 'brand',
}: {
  icon: React.ReactNode
  label: string
  description?: string
  onClick?: () => void
  tone?: 'brand' | 'success' | 'warn' | 'grape'
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    success: 'bg-success-50 text-success-600',
    warn: 'bg-warn-50 text-warn-600',
    grape: 'bg-grape-50 text-grape-600',
  }
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-start gap-2.5 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-[#F8FBFF]"
    >
      <span className={cn('mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-md', tones[tone])}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium leading-[18px] text-ink group-hover:text-brand-700">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-[15px] text-muted">{description}</span>}
      </span>
      <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-light transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}
