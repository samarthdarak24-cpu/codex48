import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
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
  Radar,
  ScanEye,
  Search,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Copy,
  ExternalLink,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { exceptionStats, awaitingDecision } from '@/lib/selectors'
import { Avatar, Modal } from '@/components/ui/Misc'
import { Button } from '@/components/ui/Button'
import { CountBubble } from '@/components/ui/Badge'
import { NotificationBell } from '@/components/layout/NotificationBell'

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
        { to: '/manager/sentinel', label: 'Sentinel', icon: Radar },
        { to: '/manager/trust', label: 'AI Trust', icon: ScanEye },
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
    <aside className="flex h-full w-[246px] max-w-[85vw] shrink-0 flex-col border-r border-line bg-white">
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
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [judgeOpen, setJudgeOpen] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const close = () => {
      setMenuOpen(false)
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
    }
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const switchRole = async (targetRole: 'manager' | 'creator') => {
    const email = targetRole === 'manager' ? 'david.kim@pureglow.co' : 'emily.carter@pureglow.co'
    try {
      await login(email, 'precedent')
      setJudgeOpen(false)
      navigate(targetRole === 'manager' ? '/manager/overview' : '/app/overview')
    } catch {
      navigate('/login')
    }
  }

  const placeholder =
    user?.role === 'manager' ? 'Search content, rules, or submissions…' : 'Search content, rules, or guidelines…'

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-white/90 px-3 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <button
          onClick={onOpenMenu}
          aria-label="Open navigation"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-600 transition-colors hover:bg-[#F2F7FD]"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Link to={user?.role === 'manager' ? '/manager/overview' : '/app/overview'} className="flex items-center gap-1.5">
          <BrandMark size={22} />
          <span className="text-sm font-bold tracking-tight text-ink">Precedent</span>
        </Link>
      </div>

      <form
        className="relative hidden max-w-[330px] flex-1 sm:block"
        onSubmit={(e) => {
          e.preventDefault()
          const q = query.trim()
          if (!q) return
          // The box searches the list the user can actually act on.
          const target = user?.role === 'manager' ? '/manager/queue' : '/app/submissions'
          navigate(`${target}?q=${encodeURIComponent(q)}`)
          setQuery('')
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

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => setJudgeOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50/90 px-3 py-1 text-xs font-bold text-brand-700 shadow-2xs transition-all hover:border-brand-300 hover:bg-brand-100"
          title="Open Judge Guided Tour &amp; Demo Evaluation Guide"
        >
          <Sparkles className="h-3.5 w-3.5 animate-pulse text-brand-600" />
          <span className="hidden sm:inline">Judge Tour</span>
        </button>

        <NotificationBell />

        <div className="mx-1 h-6 w-px bg-line" />

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
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
              className="absolute right-0 top-12 w-[236px] max-w-[calc(100vw-32px)] animate-pop-in rounded-xl border border-line bg-white p-1.5 shadow-lift"
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

      <Modal
        open={judgeOpen}
        onClose={() => setJudgeOpen(false)}
        title="Precedent — Judge Evaluation Tour (Round 3)"
        description="Step-by-step walkthrough covering A1 VisualGuard, A2 Evidence Intelligence, and A3 Sentinel."
        width="max-w-2xl"
        footer={
          <div className="flex w-full items-center justify-between">
            <span className="text-[11px] text-muted">Inkloom AI Brand Governance Challenge · Team samarth.darak24</span>
            <Button variant="primary" size="sm" onClick={() => setJudgeOpen(false)}>
              Close Guide
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-ink">
          {/* 1-Click Role Switcher */}
          <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-brand-100">
              <span className="text-xs font-bold text-brand-900 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-brand-700" />
                1-Click Role Switcher
              </span>
              <span className="text-[10px] text-brand-700 font-mono">Password: precedent</span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => switchRole('manager')}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-2.5 text-left text-xs transition-all',
                  user?.role === 'manager'
                    ? 'border-brand-500 bg-white shadow-xs font-bold text-brand-900 ring-2 ring-brand-500/20'
                    : 'border-brand-200/80 bg-white/70 hover:bg-white text-ink-700',
                )}
              >
                <div>
                  <p className="font-bold">David Kim (Manager)</p>
                  <p className="text-[10.5px] text-muted">david.kim@pureglow.co</p>
                </div>
                {user?.role === 'manager' ? (
                  <CheckCircle2 className="h-4 w-4 text-brand-600" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5 text-muted-light" />
                )}
              </button>

              <button
                type="button"
                onClick={() => switchRole('creator')}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-2.5 text-left text-xs transition-all',
                  user?.role === 'creator'
                    ? 'border-brand-500 bg-white shadow-xs font-bold text-brand-900 ring-2 ring-brand-500/20'
                    : 'border-brand-200/80 bg-white/70 hover:bg-white text-ink-700',
                )}
              >
                <div>
                  <p className="font-bold">Emily Carter (Creator)</p>
                  <p className="text-[10.5px] text-muted">emily.carter@pureglow.co</p>
                </div>
                {user?.role === 'creator' ? (
                  <CheckCircle2 className="h-4 w-4 text-brand-600" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5 text-muted-light" />
                )}
              </button>
            </div>
          </div>

          {/* 4-Step Verification Walkthrough */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
              4-Step Judge Evaluation Journey
            </h4>

            <div className="rounded-xl border border-line bg-canvas/30 p-3 space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                  1
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-ink">A1 VisualGuard: Creative Poster Analysis</p>
                    <button
                      type="button"
                      onClick={() => {
                        setJudgeOpen(false)
                        navigate('/app/new')
                      }}
                      className="text-[11px] font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                    >
                      Open /app/new <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-muted mt-0.5 leading-relaxed text-[11px]">
                    Switch to Creator. Select <strong>Poster</strong> channel, upload an ad creative (or click the sample asset). The backend executes Tesseract OCR text blocks with pixel bounding boxes, K-means background palette distance, logo template match, and WCAG AA contrast sampling.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2 border-t border-line/60">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                  2
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-ink">A2 Evidence Intelligence: Grounded Review</p>
                    <button
                      type="button"
                      onClick={() => {
                        setJudgeOpen(false)
                        navigate('/app/feedback/sub-14')
                      }}
                      className="text-[11px] font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                    >
                      Open /app/feedback <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-muted mt-0.5 leading-relaxed text-[11px]">
                    Open a submission review. Inspect deterministic findings partitioned from AI suggestions. Notice the verified citation badge linked to exact stored guideline passages (e.g. Page 14 §3.2) and the 1-click minimal edit diff.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2 border-t border-line/60">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                  3
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-ink">Scoped Exceptions & Expiry Enforcement</p>
                    <button
                      type="button"
                      onClick={() => {
                        setJudgeOpen(false)
                        navigate('/manager/exceptions')
                      }}
                      className="text-[11px] font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                    >
                      Open /manager/exceptions <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-muted mt-0.5 leading-relaxed text-[11px]">
                    Switch to Manager. View scoped exception rulings (campaign boundary, owner, and expiration date). Observe that attempting to approve an expired exception is strictly refused by the backend with HTTP 409 Conflict.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2 border-t border-line/60">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                  4
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-ink">A3 Sentinel & Rule Impact Sandbox</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setJudgeOpen(false)
                          navigate('/manager/sandbox')
                        }}
                        className="text-[11px] font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                      >
                        Sandbox <ExternalLink className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setJudgeOpen(false)
                          navigate('/manager/sentinel')
                        }}
                        className="text-[11px] font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                      >
                        Sentinel <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-muted mt-0.5 leading-relaxed text-[11px]">
                    Simulate proposed policy changes in the Sandbox to preview compliance blast radius over all stored assets. Sentinel continuously surveils published content and dispatches deduplicated reassessment tasks when policies change.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Copyable Test Fixtures */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
              Ready-to-Copy Test Fixtures
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-white p-2.5 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-ink">Deterministic Violation:</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('100% safe, boosts immunity, 20% off', 'f1')}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-800"
                  >
                    {copiedKey === 'f1' ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    {copiedKey === 'f1' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="font-mono text-[11px] text-ink-600 bg-canvas/60 p-1.5 rounded">
                  "100% safe, boosts immunity, 20% off"
                </p>
                <p className="text-[10px] text-muted mt-1">Triggers superlative, unapproved health claim, and discount limit rules.</p>
              </div>

              <div className="rounded-lg border border-line bg-white p-2.5 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-ink">Semantic Paraphrase:</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('Our blend keeps colds away all season', 'f2')}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-800"
                  >
                    {copiedKey === 'f2' ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    {copiedKey === 'f2' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="font-mono text-[11px] text-ink-600 bg-canvas/60 p-1.5 rounded">
                  "Our blend keeps colds away all season"
                </p>
                <p className="text-[10px] text-muted mt-1">Semantic retrieval maps meaning to Rule CL-06 despite zero keyword match.</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow}
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-ink">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm sm:text-base leading-[20px] text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">{actions}</div>}
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
  const { mutationError, clearMutationError } = useData()

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
          <div className="absolute inset-0 bg-[#23282A]/40 animate-fade-in" onClick={() => setMobileOpen(false)} />
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
{mutationError && (
          <div
            role="alert"
            className="mx-4 mt-3 flex flex-wrap items-start gap-x-3 gap-y-1.5 rounded-xl border border-danger-200 bg-danger-50 px-3 py-2.5 sm:mx-6"
          >
            <AlertTriangle className="mt-[2px] h-3.5 w-3.5 shrink-0 text-danger-600" />
            <p className="min-w-0 flex-1 text-xs leading-[17px] text-danger-700">
              <span className="font-semibold">That change was not saved.</span> {mutationError}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={clearMutationError}
                className="rounded-md px-2 py-1 text-2xs font-semibold text-danger-700 transition-colors hover:bg-danger-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-[1180px] animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
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
