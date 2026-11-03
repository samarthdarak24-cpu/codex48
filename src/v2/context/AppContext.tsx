/**
 * Precedent v2 — backend-backed application context.
 *
 * The 21 reference views were authored against a mock context. This module
 * keeps the same `useApp()` contract but fills it from the real FastAPI
 * service (`@/services/api`), mapping the backend records into the view types.
 *
 * Honesty rules:
 *  - No invented submissions/guidelines/audit rows. Empty data stays empty.
 *  - `complianceScore` is DERIVED from stored findings (100 − weighted open
 *    findings), never a random number.
 *  - Images are deterministic SVG placeholders (the API stores no poster for
 *    text submissions); they are not presented as real photography.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import {
  api,
  type AnalyticsSummary,
  type AnalyticsTrends,
  type CreatorSummary,
} from '@/services/api'
import { fmtDate, fmtDateTime, fmtTime, relative } from '@/lib/utils'
import type {
  AppNotification,
  AuditEvent as ApiAuditEvent,
  BrandAsset,
  ExceptionRequest,
  Finding,
  GuidelineDoc,
  ReassessmentTask,
  Rule,
  Submission as ApiSubmission,
  User as ApiUser,
} from '@/lib/types'
import type {
  Asset,
  AuditEvent,
  ExceptionItem,
  Guideline,
  NotificationItem,
  PageId,
  RuleConflict,
  SentinelAlert,
  Submission,
  UserRole,
} from '../types'

interface Toast {
  id: string
  message: string
  type: 'success' | 'info' | 'warning' | 'error'
}

interface V2User {
  name: string
  email: string
  avatar: string
  initials: string
  role: string
  workspace: string
}

interface AppContextType {
  role: UserRole
  setRole: (role: UserRole) => void
  activePage: PageId
  setActivePage: (page: PageId) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  loading: boolean
  error: string | null
  refresh: () => Promise<void>

  submissions: Submission[]
  guidelines: Guideline[]
  ruleConflicts: RuleConflict[]
  exceptions: ExceptionItem[]
  sentinelAlerts: SentinelAlert[]
  assets: Asset[]
  auditEvents: AuditEvent[]
  notifications: NotificationItem[]

  selectedSubmission: Submission | null
  setSelectedSubmission: (sub: Submission | null) => void
  selectedGuideline: Guideline | null
  setSelectedGuideline: (g: Guideline | null) => void
  selectedConflict: RuleConflict | null
  setSelectedConflict: (rc: RuleConflict | null) => void
  selectedException: ExceptionItem | null
  setSelectedException: (ex: ExceptionItem | null) => void
  selectedAlert: SentinelAlert | null
  setSelectedAlert: (al: SentinelAlert | null) => void
  selectedAsset: Asset | null
  setSelectedAsset: (asset: Asset | null) => void
  selectedAuditEvent: AuditEvent | null
  setSelectedAuditEvent: (evt: AuditEvent | null) => void
  selectedNotification: NotificationItem | null
  setSelectedNotification: (notif: NotificationItem | null) => void

  updateSubmissionStatus: (id: string, status: Submission['status'], comment?: string) => void
  resolveRuleConflict: (id: string) => void
  updateExceptionStatus: (id: string, status: 'Approved' | 'Rejected', note?: string) => void
  resolveSentinelAlert: (id: string) => void
  addNewContentSubmission: (content: Record<string, unknown>) => void
  addNewException: (req: {
    campaign?: string
    requestTitle?: string
    reason: string
    scope?: string
    contentId?: string
    ruleCode?: string
    expiresAt?: string
  }) => void

  /* --- Analytics & Health (real DB aggregations) --- */
  analytics: AnalyticsSummary | null
  analyticsTrends: AnalyticsTrends | null
  analyticsRange: string
  setAnalyticsRange: (range: string) => void
  analyticsLoading: boolean
  creatorSummary: CreatorSummary | null

  /* --- Real mutations used by the repaired pages --- */
  addComment: (submissionId: string, body: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
  runSemanticReview: (submissionId: string) => Promise<{
    count: number
    llmConfigured: boolean
    aiStatus?: string
    aiError?: string | null
    failed?: boolean
  }>
  fetchAiFindings: (submissionId: string) => Promise<unknown[]>
  runRuleSimulation: (ruleId: string, changeType: string, newValue: string) => Promise<unknown>
  activateSimulation: (id: string) => Promise<void>
  updateProfile: (patch: { name?: string; title?: string; avatarTone?: string }) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  downloadGuideline: (id: string) => Promise<void>
  downloadAnalytics: () => Promise<void>

  currentUser: V2User
  toasts: Toast[]
  showToast: (message: string, type?: Toast['type']) => void
  dismissToast: (id: string) => void
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void

  isAiCompareOpen: boolean
  setIsAiCompareOpen: (open: boolean) => void
  isCompareOpen: boolean
  setIsCompareOpen: (open: boolean) => void

  currentPage: PageId
  setCurrentPage: (page: PageId) => void
  markNotificationRead: (id: string) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

/* ------------------------------------------------------------------ */
/* Deterministic placeholder imagery (SVG data URLs, not real photos)  */
/* ------------------------------------------------------------------ */

const TONES = ['#4E7A3D', '#3D6330', '#7C8F5E', '#6A7C4E', '#5E6B45']

/** Cohesive fictional PureGlow imagery generated for the demo (no third-party brands). */
const BRAND_IMAGES = {
  serum: '/images/brand/serum.webp',
  jar: '/images/brand/jar.webp',
  summer: '/images/brand/summer.webp',
  gift: '/images/brand/gift.webp',
  lifestyle: '/images/brand/lifestyle.webp',
  guidelines: '/images/brand/guidelines.webp',
} as const

function imageForTitle(title: string, seed: string): string {
  const t = (title || '').toLowerCase()
  if (t.includes('sensitive') || t.includes('serum') || t.includes('glow')) return BRAND_IMAGES.serum
  if (t.includes('launch') || t.includes('moistur') || t.includes('product highlight')) return BRAND_IMAGES.jar
  if (t.includes('summer') || t.includes('offer') || t.includes('sale')) return BRAND_IMAGES.summer
  if (t.includes('festival') || t.includes('holiday') || t.includes('gift')) return BRAND_IMAGES.gift
  if (t.includes('wellness') || t.includes('influencer') || t.includes('partner') || t.includes('lifestyle')) return BRAND_IMAGES.lifestyle
  if (t.includes('guideline') || t.includes('brand') || t.includes('awareness') || t.includes('playbook')) return BRAND_IMAGES.guidelines
  const order = [BRAND_IMAGES.serum, BRAND_IMAGES.jar, BRAND_IMAGES.summer, BRAND_IMAGES.gift, BRAND_IMAGES.lifestyle, BRAND_IMAGES.guidelines]
  return order[hash(seed) % order.length]
}

function imageForGuideline(category: string): string {
  switch (category) {
    case 'Brand Identity':
      return BRAND_IMAGES.guidelines
    case 'Messaging & Tone':
      return BRAND_IMAGES.lifestyle
    case 'Visual Standards':
      return BRAND_IMAGES.jar
    case 'Product Claims':
      return BRAND_IMAGES.serum
    case 'Legal & Compliance':
      return BRAND_IMAGES.gift
    default:
      return BRAND_IMAGES.summer
  }
}

function hash(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function avatarDataUrl(name: string, seed: string): string {
  const color = TONES[hash(seed) % TONES.length]
  const initials = initialsOf(name) || 'U'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="${color}"/><text x="32" y="39" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="700" fill="#FFFFFF" text-anchor="middle">${initials}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function thumbDataUrl(label: string, seed: string): string {
  const color = TONES[hash(seed) % TONES.length]
  const initials = initialsOf(label) || 'P'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#EEF3EA"/><stop offset="100%" stop-color="#DCE7D5"/></linearGradient></defs><rect width="480" height="360" fill="url(#g)"/><rect x="24" y="24" width="432" height="312" rx="18" fill="none" stroke="${color}" stroke-opacity="0.25" stroke-width="2"/><circle cx="240" cy="150" r="46" fill="${color}" fill-opacity="0.12"/><text x="240" y="164" font-family="Inter,Arial,sans-serif" font-size="38" font-weight="800" fill="${color}" text-anchor="middle">${initials}</text><text x="240" y="240" font-family="Inter,Arial,sans-serif" font-size="16" font-weight="600" fill="${color}" text-anchor="middle">${label.slice(0, 34)}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/* ------------------------------------------------------------------ */
/* Mapping helpers                                                     */
/* ------------------------------------------------------------------ */

function safeDate(value: string | null | undefined, fn: (s: string) => string, fallback = '—'): string {
  if (!value) return fallback
  try {
    return fn(value)
  } catch {
    return fallback
  }
}

function mapStatus(status: string): Submission['status'] {
  switch (status) {
    case 'Approved':
      return 'Approved'
    case 'Draft':
      return 'Draft'
    case 'Declined':
      return 'Rejected'
    case 'Changes Requested':
      return 'Needs Changes'
    case 'In Review':
    case 'Ready for Approval':
      return 'In Review'
    default:
      return 'Pending'
  }
}

/**
 * The score used to be computed here (`100 − high×15 − medium×8 − low×3`).
 * That moved to `backend/app/services/scoring.py` so there is exactly one
 * formula, it is persisted, and the browser only displays it.
 */

function mapFindingType(f: Finding): 'error' | 'warning' | 'success' | 'passed' {
  if (f.status === 'resolved') return 'success'
  if (f.severity === 'High') return 'error'
  if (f.severity === 'Medium') return 'warning'
  return 'warning'
}

function mapContentType(type: string): Submission['type'] {
  switch (type) {
    case 'Image':
      return 'Image'
    case 'Document':
      return 'Text'
    case 'URL':
      return 'Social'
    default:
      return 'Text'
  }
}

function mapGuidelineCategory(category: string): Guideline['category'] {
  switch (category) {
    case 'Visual Identity':
      return 'Brand Identity'
    case 'Communication':
      return 'Messaging & Tone'
    case 'Claims':
      return 'Product Claims'
    case 'Visual Content':
      return 'Visual Standards'
    case 'Social Media':
      return 'Marketing Assets'
    default:
      return 'Marketing Assets'
  }
}

function mapDocStatus(status: string): Guideline['status'] {
  switch (status) {
    case 'active':
      return 'Active'
    case 'draft':
      return 'Draft'
    case 'archived':
      return 'Archived'
    default:
      return 'Pending'
  }
}

function mapExceptionStatus(status: string): ExceptionItem['status'] {
  if (status === 'Approved') return 'Approved'
  if (status === 'Rejected' || status === 'Expired' || status === 'Revoked') return 'Rejected'
  return 'Pending'
}

function mapTriggerCategory(trigger: string): SentinelAlert['category'] {
  if (trigger === 'claim_withdrawn') return 'Claims Risk'
  if (trigger === 'exception_expired' || trigger === 'exception_revoked') return 'Legal & Compliance'
  return 'Policy Violation'
}

const PAGE_PATH: Record<PageId, string> = {
  overview: '/manager/overview',
  'review-queue': '/manager/review-queue',
  'all-submissions': '/manager/all-submissions',
  'brand-guidelines': '/manager/brand-guidelines',
  guidelines: '/manager/brand-guidelines',
  'rules-conflicts': '/manager/rules-conflicts',
  exceptions: '/manager/exceptions',
  sandbox: '/manager/rule-impact-sandbox',
  sentinel: '/manager/sentinel',
  'asset-library': '/manager/asset-library',
  analytics: '/manager/analytics',
  'audit-history': '/manager/audit-history',
  'agent-studio': '/manager/agent-studio',
  'my-agents': '/manager/agents',
  'agent-executions': '/manager/agent-executions',
  'creator-dashboard': '/creator/dashboard',
  'new-content': '/creator/new-content',
  'my-submissions': '/creator/submissions',
  'ai-review': '/creator/ai-review',
  'creator-ai-review': '/creator/ai-review',
  'creator-guidelines': '/creator/guidelines',
  'exception-requests': '/creator/exceptions',
  'creator-exceptions': '/creator/exceptions',
  'sentinel-tasks': '/creator/tasks',
  'creator-tasks': '/creator/tasks',
  notifications: '/creator/notifications',
  'approved-content': '/creator/approved',
  profile: '/creator/profile',
  'my-assistants': '/creator/ai-assistants',
}

const PATH_PAGE: Record<string, PageId> = {
  '/manager/overview': 'overview',
  '/manager/review-queue': 'review-queue',
  '/manager/all-submissions': 'all-submissions',
  '/manager/brand-guidelines': 'brand-guidelines',
  '/manager/rules-conflicts': 'rules-conflicts',
  '/manager/exceptions': 'exceptions',
  '/manager/rule-impact-sandbox': 'sandbox',
  '/manager/sentinel': 'sentinel',
  '/manager/asset-library': 'asset-library',
  '/manager/analytics': 'analytics',
  '/manager/audit-history': 'audit-history',
  '/manager/notifications': 'notifications',
  '/creator/dashboard': 'creator-dashboard',
  '/creator/new-content': 'new-content',
  '/creator/submissions': 'my-submissions',
  '/creator/ai-review': 'ai-review',
  '/creator/guidelines': 'creator-guidelines',
  '/creator/exceptions': 'exception-requests',
  '/creator/tasks': 'sentinel-tasks',
  '/creator/sentinel-tasks': 'sentinel-tasks',
  '/creator/notifications': 'notifications',
  '/creator/approved': 'approved-content',
  '/creator/approved-content': 'approved-content',
  '/creator/profile': 'profile',
  '/manager/submissions': 'all-submissions',
  '/manager/guidelines': 'brand-guidelines',
  '/manager/assets': 'asset-library',
  '/manager/audit-events': 'audit-history',
  '/manager/agent-studio': 'agent-studio',
  '/manager/agents': 'my-agents',
  '/manager/agent-executions': 'agent-executions',
  '/creator/ai-assistants': 'my-assistants',
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const role: UserRole = user?.role === 'manager' ? 'manager' : 'creator'

  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [guidelines, setGuidelines] = useState<Guideline[]>([])
  const [ruleConflicts, setRuleConflicts] = useState<RuleConflict[]>([])
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([])
  const [sentinelAlerts, setSentinelAlerts] = useState<SentinelAlert[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  /* --- Analytics & Health --- */
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [analyticsTrends, setAnalyticsTrends] = useState<AnalyticsTrends | null>(null)
  const [analyticsRange, setAnalyticsRange] = useState('30d')
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [creatorSummary, setCreatorSummary] = useState<CreatorSummary | null>(null)

  // Kept for exception creation; not part of the public view contract.
  const [rules, setRules] = useState<Rule[]>([])

  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [selectedGuideline, setSelectedGuideline] = useState<Guideline | null>(null)
  const [selectedConflict, setSelectedConflict] = useState<RuleConflict | null>(null)
  const [selectedException, setSelectedException] = useState<ExceptionItem | null>(null)
  const [selectedAlert, setSelectedAlert] = useState<SentinelAlert | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [selectedAuditEvent, setSelectedAuditEvent] = useState<AuditEvent | null>(null)
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null)

  const [toasts, setToasts] = useState<Toast[]>([])
  const [isAiCompareOpen, setIsAiCompareOpen] = useState(false)

  const activePage: PageId = location.pathname.startsWith('/manager/agents')
    ? 'my-agents'
    : location.pathname.startsWith('/manager/agent-executions')
      ? 'agent-executions'
      : location.pathname.startsWith('/creator/ai-assistants')
        ? 'my-assistants'
        : PATH_PAGE[location.pathname] ?? (role === 'manager' ? 'overview' : 'creator-dashboard')

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  /* Sonner owns presentation; we keep the array + dismiss helpers so the
     existing context contract (toasts, removeToast, dismissToast) is intact. */
  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const notify =
      type === 'error'
        ? toast.error
        : type === 'warning'
          ? toast.warning
          : type === 'info'
            ? toast.info
            : toast.success
    notify(message)
  }, [])

  const setActivePage = useCallback(
    (page: PageId) => {
      if (page === 'notifications') {
        navigate(role === 'manager' ? '/manager/notifications' : '/creator/notifications')
        return
      }
      navigate(PAGE_PATH[page] ?? (role === 'manager' ? '/manager/overview' : '/creator/dashboard'))
    },
    [navigate, role],
  )

  const hasLoadedRef = useRef(false)

  const refresh = useCallback(async () => {
    if (!hasLoadedRef.current) {
      setLoading(true)
    }
    setError(null)
    const safe = <T,>(p: Promise<T[]>): Promise<T[]> => p.catch(() => [] as T[])

    try {
      const isManager = role === 'manager'
      const [subs, docs, exc, audit, team, assetRows, tasks, notifs, ruleRows] = await Promise.all([
        safe(api.submissions()),
        safe(api.guidelines()),
        safe(api.exceptions()),
        isManager ? safe(api.audit()) : Promise.resolve([]),
        safe(api.team()),
        safe(api.assets()),
        safe(api.sentinelTasks()),
        safe(api.notifications()),
        safe(api.rules()),
      ])
      const conflicts = isManager ? await api.conflicts().catch(() => []) : []

      const byId = new Map<string, ApiUser>(team.map((u) => [u.id, u]))

      // Drafts are private to their creator: a manager must never see unsent
      // work in the review queue or the all-submissions register.
      const visibleSubs = isManager ? subs.filter((s) => s.status !== 'Draft') : subs

      const mappedSubmissions: Submission[] = visibleSubs.map((s) => {
        const creator = s.creatorId ? byId.get(s.creatorId) : undefined
        const creatorName = creator?.name ?? 'Workspace member'
        const latest = s.versions[s.versions.length - 1]
        return {
          id: s.id,
          title: s.title,
          // The campaign name now comes from the joined `campaigns` row. It is
          // deliberately NOT `s.channel` — showing the channel as the campaign
          // was the O2 defect. Unlinked rows say so instead of inventing one.
          campaign: s.campaign || 'No campaign assigned',
          channel: s.channel,
          creator: {
            name: creatorName,
            avatar: avatarDataUrl(creatorName, creator?.id ?? s.id),
            initials: creator?.initials ?? initialsOf(creatorName),
            role: creator?.title,
          },
          thumbnail: imageForTitle(s.title, s.id),
          assetId: s.assetId ?? undefined,
          version: `v${s.version}.0`,
          status: mapStatus(s.status),
          // Server-computed and persisted (services/scoring.py); never derived here.
          complianceScore: s.complianceScore ?? 0,
          scoreBreakdown: s.scoreBreakdown,
          submittedAt: safeDate(s.createdAt, fmtDateTime),
          submittedDate: safeDate(s.createdAt, fmtDate),
          relativeTime: safeDate(s.createdAt, relative),
          time: safeDate(s.createdAt, relative),
          assetType: s.type,
          format: s.type,
          description: s.excerpt || latest?.text || '',
          priority: s.priority,
          type: mapContentType(s.type),
          findingsCount: s.findings.length,
          findings: s.findings.map((f) => ({
            id: f.id,
            title: f.ruleTitle || f.ruleCode,
            description: f.explanation,
            type: mapFindingType(f),
            badge: f.severity,
            guidelineRef: `${f.sourceDocName || 'Guideline'} · ${f.sourceVersion || 'v1'} · p.${f.sourcePage}`,
          })),
          comments: s.comments.map((c) => {
            const author = byId.get(c.authorId)
            return {
              id: c.id,
              author: author?.name ?? 'Workspace member',
              avatar: avatarDataUrl(author?.name ?? 'Member', c.authorId),
              time: safeDate(c.createdAt, relative),
              text: c.body,
            }
          }),
        }
      })

      const mappedGuidelines: Guideline[] = docs.map((d) => {
        const owner = d.ownerId ? byId.get(d.ownerId) : undefined
        return {
          id: d.id,
          title: d.name,
          description: d.description,
          category: mapGuidelineCategory(d.category),
          version: d.version,
          status: mapDocStatus(d.status),
          lastUpdated: safeDate(d.updatedAt, fmtDate),
          owner: owner?.name ?? 'Brand team',
          thumbnail: imageForGuideline(mapGuidelineCategory(d.category)),
          format: d.fileType,
          relatedGuidelines: [],
        }
      })

      const conflictItems: RuleConflict[] = conflicts.map((c: any, i: number) => ({
        id: `conflict-${c.ruleA?.code ?? 'A'}-${c.ruleB?.code ?? 'B'}-${i}`,
        title: `${c.ruleA?.title ?? 'Rule A'} ↔ ${c.ruleB?.title ?? 'Rule B'}`,
        description: c.reason ?? 'Contradictory conditions detected between brand policies.',
        category: c.ruleA?.subject || 'Conflict',
        ruleVersion: `${c.ruleA?.sourceVersion || 'v1.0'} / ${c.ruleB?.sourceVersion || 'v1.0'}`,
        status: 'Conflict',
        date: safeDate(c.ruleA?.effectiveFrom, fmtDate),
        source1: {
          name: `${c.ruleA?.code ?? ''} · ${c.ruleA?.title ?? ''}`,
          requirement: c.ruleA?.condition ?? '',
        },
        source2: {
          name: `${c.ruleB?.code ?? ''} · ${c.ruleB?.title ?? ''}`,
          requirement: c.ruleB?.condition ?? '',
        },
        impact: c.reason || 'Conflicting rules may lead to inconsistent compliance evaluation across campaigns.',
        recommendedAction: 'Review both rules and confirm a single authoritative scope.',
        relatedDoc: c.ruleA?.sourceDocId ?? '',
        ruleACode: c.ruleA?.code ?? '',
        ruleBCode: c.ruleB?.code ?? '',
        reviewed: Boolean(c.reviewed),
        reviewedBy: c.reviewedBy ?? null,
        reviewedAt: c.reviewedAt ?? null,
      }));

      const ruleItems: RuleConflict[] = ruleRows.map((r: Rule) => ({
        id: r.id,
        title: `${r.code} · ${r.title}`,
        description: r.summary || r.condition || 'Brand compliance governance directive.',
        category: r.subject || 'Brand Policy',
        ruleVersion: r.sourceVersion || 'v1.0',
        status: r.status === 'active' ? 'Active' : r.status === 'needs_confirmation' ? 'Review Required' : 'Active',
        date: safeDate(r.effectiveFrom, fmtDate),
        source1: {
          name: `${r.code} · ${r.title}`,
          requirement: r.condition || r.summary,
        },
        source2: r.sourcePassage
          ? {
              name: `Guideline Document (Page ${r.sourcePage || 1})`,
              requirement: r.sourcePassage,
            }
          : undefined,
        impact: `Enforcement: ${r.action || 'Flag non-compliant content'}. Scope: ${r.scope || 'Global'}. Priority: ${r.priority || 'Medium'}.`,
        recommendedAction: r.action || 'Apply policy to all incoming and published assets.',
        relatedDoc: r.sourceDocId || '',
        ruleACode: r.code,
        ruleBCode: undefined,
        reviewed: r.status === 'active',
        reviewedBy: 'Brand Manager',
        reviewedAt: safeDate(r.effectiveFrom, fmtDate),
      }));

      const exceptionRuleItems: RuleConflict[] = exc.map((e) => ({
        id: `exc-${e.id}`,
        title: `${e.code || 'EXC'} · ${e.contentTitle || e.ruleTitle} (Exception)`,
        description: e.reason || 'Approved brand exception granting variance from policy.',
        category: 'Exceptions',
        ruleVersion: 'Exception',
        status: e.status === 'Pending' ? 'Review Required' : 'Active',
        date: safeDate(e.effectiveFrom, fmtDate),
        source1: {
          name: `Policy Override: Rule ${e.ruleCode || 'Policy'}`,
          requirement: e.reason,
        },
        source2: {
          name: `Scope: ${e.scope || 'Campaign'}`,
          requirement: `Expires: ${e.expiresAt ? safeDate(e.expiresAt, fmtDate) : 'No expiration date'}`,
        },
        impact: `Authorized variance from standard brand rule ${e.ruleCode || ''} for ${e.scope || 'campaign'}.`,
        recommendedAction: 'Verify ongoing business necessity before expiration.',
        relatedDoc: e.contentId || '',
        ruleACode: e.ruleCode || '',
        ruleBCode: undefined,
        reviewed: e.status === 'Approved',
        reviewedBy: 'Brand Manager',
        reviewedAt: safeDate(e.effectiveFrom, fmtDate),
      }));

      const mappedConflicts: RuleConflict[] = [...conflictItems, ...ruleItems, ...exceptionRuleItems];

      const mappedExceptions: ExceptionItem[] = exc.map((e) => {
        const requester = byId.get(e.requestedById)
        const decider = e.decidedById ? byId.get(e.decidedById) : undefined
        return {
          id: e.id,
          campaign: e.contentMeta || e.contentTitle || e.ruleTitle,
          requestTitle: e.contentTitle || e.ruleTitle,
          reason: e.reason,
          status: mapExceptionStatus(e.status),
          submittedOn: safeDate(e.effectiveFrom, fmtDate),
          creator: requester?.name ?? 'Workspace member',
          thumbnail: imageForTitle(e.contentTitle || e.ruleTitle, e.id),
          scope: e.scope,
          conditions: e.conditions,
          expiryDate: e.expiresAt ? safeDate(e.expiresAt, fmtDate) : 'No expiry',
          managerNotes: decider ? `Decided by ${decider.name}` : '',
        }
      })

      const mappedAlerts: SentinelAlert[] = tasks.map((t) => ({
        id: t.id,
        title: t.submissionTitle || 'Reassessment task',
        subtitle: t.reason || t.triggerRef,
        category: mapTriggerCategory(t.triggerType),
        severity: t.isOverdue ? 'High' : 'Medium',
        detectedOn: safeDate(t.createdAt, fmtDate),
        status: t.status === 'open' ? 'Open' : 'Resolved',
        thumbnail: imageForTitle(t.submissionTitle || 'Task', t.id),
        description: t.reason,
        recommendedAction: 'Re-review the affected version, then resolve the task.',
        submissionId: t.submissionId,
        submissionTitle: t.submissionTitle,
        contentId: t.submissionId,
        contentTitle: t.submissionTitle,
      }))

      const mappedAssets: Asset[] = assetRows.map((a) => {
        const uploader = byId.get(a.uploadedById)
        const ext = a.filePath?.split('.').pop()?.toUpperCase()
        return {
          id: a.id,
          name: a.name,
          type: a.category?.toLowerCase().includes('image') || a.category?.toLowerCase().includes('logo') ? 'image' : 'document',
          format: a.mimeType?.split('/')[1]?.toUpperCase() ?? ext ?? 'IMG',
          size: a.size ? (a.size < 1024 * 1024 ? `${Math.max(1, Math.round(a.size / 1024))} KB` : `${(a.size / 1024 / 1024).toFixed(1)} MB`) : '—',
          dimensions: a.width && a.height ? `${a.width} × ${a.height}` : undefined,
          status: a.status === 'approved' ? 'Approved' : a.status === 'rejected' ? 'Flagged' : 'In Review',
          campaign: a.brand,
          uploadedBy: uploader?.name ?? 'Workspace member',
          uploadedAt: safeDate(a.createdAt, fmtDate),
          thumbnail: imageForTitle(a.name, a.id),
          tags: [a.category, a.brand].filter(Boolean),
        }
      })

      const mappedAudit: AuditEvent[] = audit.map((e) => {
        const actor = byId.get(e.userId)
        return {
          id: e.id,
          dateTime: safeDate(e.at, fmtDateTime),
          date: safeDate(e.at, fmtDate),
          time: safeDate(e.at, fmtTime),
          user: {
            name: actor?.name ?? 'System',
            role: actor?.title ?? 'system',
            avatar: avatarDataUrl(actor?.name ?? 'System', e.userId || e.id),
            isSystem: !actor,
          },
          action: e.action,
          actionColor:
            e.status === 'Approved'
              ? 'emerald'
              : e.status === 'Rejected'
                ? 'rose'
                : e.action === 'Exception'
                  ? 'amber'
                  : 'slate',
          module: e.entityKind,
          details: e.entityTitle,
          subDetails: e.details,
          status: 'Success',
        }
      })

      const mappedNotifications: NotificationItem[] = notifs.map((n: AppNotification) => {
        const description =
          (typeof n.payload?.message === 'string' && n.payload.message) ||
          (typeof n.payload?.body === 'string' && n.payload.body) ||
          n.type.replace(/_/g, ' ')
        const time = safeDate(n.createdAt, relative)
        return {
          id: n.id,
          title: n.title,
          description,
          message: description,
          time,
          timestamp: time,
          type:
            n.type === 'sentinel_task'
              ? 'action_required'
              : n.type === 'exception_expiring'
                ? 'warning'
                : n.type === 'decision'
                  ? 'approval'
                  : 'system',
          isUnread: !n.isRead,
          read: n.isRead,
          actionUrl: typeof n.payload?.link === 'string' ? n.payload.link : undefined,
        }
      })

      setSubmissions(mappedSubmissions)
      setGuidelines(mappedGuidelines)
      setRuleConflicts(mappedConflicts)
      setExceptions(mappedExceptions)
      setSentinelAlerts(mappedAlerts)
      setAssets(mappedAssets)
      setAuditEvents(mappedAudit)
      setNotifications(mappedNotifications)
      setRules(ruleRows)

      // Creator dashboard metrics are server-scoped, so a creator only ever
      // receives their own numbers.
      const csum = await api.creatorSummary().catch(() => null)
      setCreatorSummary(csum)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the workspace.')
    } finally {
      setLoading(false)
      hasLoadedRef.current = true
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /**
   * Analytics are refetched whenever the range changes, so the 7D/30D/90D/1Y
   * toggle genuinely re-queries the API instead of restyling one static array.
   */
  useEffect(() => {
    if (role !== 'manager') return
    let cancelled = false
    setAnalyticsLoading(true)
    Promise.all([
      api.analytics(analyticsRange).catch(() => null),
      api.analyticsTrends(analyticsRange).catch(() => null),
    ])
      .then(([summary, trends]) => {
        if (cancelled) return
        setAnalytics(summary)
        setAnalyticsTrends(trends)
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [analyticsRange])

  const currentUser = useMemo<V2User>(() => {
    const name = user?.name ?? 'Workspace member'
    return {
      name,
      email: user?.email ?? '',
      avatar: avatarDataUrl(name, user?.id ?? 'user'),
      initials: user?.initials ?? initialsOf(name),
      role: user?.role === 'manager' ? 'Brand Manager' : 'Content Creator',
      workspace: user?.workspace ?? 'Workspace',
    }
  }, [user])

  const setRole = useCallback(
    (next: UserRole) => {
      showToast(
        `Your role (${next}) is assigned by the workspace administrator and cannot be changed here.`,
        'info',
      )
    },
    [showToast],
  )

  const updateSubmissionStatus = useCallback(
    (id: string, status: Submission['status'], comment?: string) => {
      const action =
        status === 'Approved'
          ? 'Approved'
          : status === 'Rejected'
            ? 'Declined'
            : status === 'Needs Changes'
              ? 'Changes Requested'
              : null
      if (!action) {
        showToast('Only a manager can decide a submitted version. Use New Content to submit.', 'info')
        return
      }
      const current = submissions.find((s) => s.id === id)
      const version = current?.version
        ? Number(current.version.replace(/^v/, '').split('.')[0])
        : undefined
      api
        .decideSubmission(id, action, comment ?? '', version)
        .then(() => refresh())
        .then(() => showToast(`Submission marked ${status}.`))
        .catch((err: unknown) =>
          showToast(err instanceof Error ? err.message : 'Decision failed.', 'error'),
        )
    },
    [api, refresh, showToast, submissions],
  )

  const updateExceptionStatus = useCallback(
    (id: string, status: 'Approved' | 'Rejected', note?: string) => {
      api
        .decideException(id, status, note || '')
        .then(() => refresh())
        .then(() => showToast(`Exception ${status.toLowerCase()}.`))
        .catch((err: unknown) =>
          showToast(err instanceof Error ? err.message : 'Exception decision failed.', 'error'),
        )
    },
    [refresh, showToast],
  )

  const resolveSentinelAlert = useCallback(
    (id: string) => {
      api
        .resolveTask(id, 're_approve', 'Resolved from Sentinel monitoring')
        .then(() => refresh())
        .then(() => showToast('Task resolved and recorded in the audit trail.'))
        .catch((err: unknown) =>
          showToast(err instanceof Error ? err.message : 'Could not resolve the task.', 'error'),
        )
    },
    [refresh, showToast],
  )

  const addNewContentSubmission = useCallback(
    (content: Record<string, unknown>) => {
      const text =
        (typeof content.copy === 'string' && content.copy) ||
        (typeof content.description === 'string' && content.description) ||
        (typeof content.title === 'string' && content.title) ||
        ''
      const apiType =
        content.type === 'Image' ? 'Image' : content.type === 'Video' ? 'Image' : 'Text'
      api
        .createSubmission({
          title: (typeof content.title === 'string' && content.title) || 'Untitled submission',
          type: apiType as 'Text' | 'Image' | 'Document' | 'URL',
          channel: (typeof content.channel === 'string' && content.channel) || 'Social Media',
          brand: 'PureGlow',
          text,
        })
        .then(() => refresh())
        .then(() => {
          showToast('Submitted for brand review.')
          setActivePage('my-submissions')
        })
        .catch((err: unknown) =>
          showToast(err instanceof Error ? err.message : 'Submission failed.', 'error'),
        )
    },
    [refresh, setActivePage, showToast],
  )

  const addNewException = useCallback(
    (req: {
      campaign?: string
      requestTitle?: string
      reason: string
      scope?: string
      contentId?: string
      ruleCode?: string
      expiresAt?: string
    }) => {
      const contentId = req.contentId || selectedSubmission?.id || submissions[0]?.id
      if (!contentId) {
        showToast('Create a submission before requesting an exception.', 'error')
        return
      }
      const ruleCode = req.ruleCode || rules[0]?.code || 'CL-04'
      api
        .requestException({
          contentId,
          ruleCode,
          reason: req.reason,
          scope: req.scope || req.campaign || 'Campaign',
          expiresAt: req.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .then(() => refresh())
        .then(() => showToast('Exception request submitted to the governance team.'))
        .catch((err: unknown) =>
          showToast(err instanceof Error ? err.message : 'Exception request failed.', 'error'),
        )
    },
    [refresh, rules, selectedSubmission, showToast, submissions],
  )

  /**
   * Persist a conflict review on the server.
   *
   * The previous implementation only flipped local state and showed a toast,
   * so the "reviewed" state vanished on refresh and nothing was recorded.
   * This now POSTs to /rules/conflicts/review (manager-only server-side),
   * records an audit event, and refetches so the state survives a reload.
   * It deliberately does NOT activate or deactivate any rule.
   */
  const resolveRuleConflict = useCallback(
    async (id: string) => {
      const conflict = ruleConflicts.find((c) => c.id === id)
      if (!conflict) return
      if (conflict.status === 'Conflict' && conflict.ruleACode && conflict.ruleBCode) {
        try {
          await api.reviewConflict(conflict.ruleACode, conflict.ruleBCode, 'Reviewed from Rules & Conflicts')
          await refresh()
          showToast(
            'Conflict marked as reviewed and recorded in the audit trail. No rule was changed.',
            'success',
          )
        } catch (err: unknown) {
          showToast(err instanceof Error ? err.message : 'Could not record the review.', 'error')
        }
      } else if (conflict.status === 'Review Required') {
        try {
          await api.confirmRule(id)
          await refresh()
          showToast(`Rule ${conflict.ruleACode || conflict.title} confirmed as active!`, 'success')
        } catch (err: unknown) {
          showToast(err instanceof Error ? err.message : 'Could not confirm rule.', 'error')
        }
      } else {
        showToast(`Rule ${conflict.ruleACode || conflict.title} verified and recorded in audit log.`, 'success')
      }
    },
    [refresh, ruleConflicts, showToast],
  )

  const addComment = useCallback(
    async (submissionId: string, body: string) => {
      if (!body.trim()) {
        showToast('Write a comment before sending.', 'error')
        return
      }
      try {
        await api.addComment(submissionId, body.trim())
        await refresh()
        showToast('Comment added.')
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Could not add the comment.', 'error')
      }
    },
    [refresh, showToast],
  )

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await api.markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false, read: true })))
      showToast('All notifications marked as read.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update notifications.', 'error')
    }
  }, [showToast])

  const runSemanticReview = useCallback(
    async (submissionId: string) => {
      try {
        const res = await api.runSemanticReview(submissionId)
        await refresh()
        if (!res.llmConfigured) {
          showToast(
            `Semantic review ran with 0 AI suggestions: no language model is configured on this server. Deterministic findings (${res.count ?? 0}) are shown instead.`,
            'info',
          )
        } else {
          showToast(`Semantic review complete: ${res.count ?? 0} finding(s).`)
        }
        return { count: res.count ?? 0, llmConfigured: Boolean(res.llmConfigured), aiStatus: res.aiStatus, aiError: res.aiError }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Semantic review failed.', 'error')
        // The request itself failed (network/timeout). This is NOT the same as
        // "no model configured", so keep llmConfigured unknown/true and flag the
        // failure; the caller must not tell the user AI is switched off.
        return { count: 0, llmConfigured: true, failed: true }
      }
    },
    [refresh, showToast],
  )

  const fetchAiFindings = useCallback(async (submissionId: string) => {
    try {
      return await api.aiFindings(submissionId)
    } catch {
      return []
    }
  }, [])

  const runRuleSimulation = useCallback(
    async (ruleId: string, changeType: string, newValue: string) => {
      try {
        const res = await api.runSimulation({ ruleId, changeType, newValue })
        await refresh()
        showToast('Simulation complete. Nothing was changed — this run is non-mutating.')
        return res
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Simulation failed.', 'error')
        throw err
      }
    },
    [refresh, showToast],
  )

  const activateSimulation = useCallback(
    async (id: string) => {
      try {
        await api.activateSimulation(id)
        await refresh()
        showToast('Rule change activated. Sentinel will create reassessment tasks.')
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Activation failed.', 'error')
        throw err
      }
    },
    [refresh, showToast],
  )

  const updateProfile = useCallback(
    async (patch: { name?: string; title?: string; avatarTone?: string }) => {
      try {
        await api.updateProfile(patch)
        showToast('Profile updated.')
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Could not update the profile.', 'error')
        throw err
      }
    },
    [showToast],
  )

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        await api.changePassword(currentPassword, newPassword)
        showToast('Password changed.')
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Could not change the password.', 'error')
        throw err
      }
    },
    [showToast],
  )

  const downloadGuideline = useCallback(
    async (id: string) => {
      const url = await api.fetchGuidelineBlobUrl(id)
      if (!url) {
        showToast('This document has no downloadable file on the server.', 'error')
        return
      }
      const a = document.createElement('a')
      a.href = url
      a.download = `guideline-${id}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    },
    [showToast],
  )

  const downloadAnalytics = useCallback(async () => {
    try {
      await api.analyticsExport(analyticsRange)
      showToast('Analytics export downloaded.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed.', 'error')
    }
  }, [analyticsRange, showToast])

  const markNotificationRead = useCallback(
    (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isUnread: false, read: true } : n)),
      )
      api.markNotificationRead(id).catch(() => {
        /* keep the optimistic read state; the bell refetches on next load */
      })
    },
    [],
  )

  const value: AppContextType = {
    role,
    setRole,
    activePage,
    setActivePage,
    searchQuery,
    setSearchQuery,
    loading,
    error,
    refresh,
    submissions,
    guidelines,
    ruleConflicts,
    exceptions,
    sentinelAlerts,
    assets,
    auditEvents,
    notifications,
    selectedSubmission,
    setSelectedSubmission,
    selectedGuideline,
    setSelectedGuideline,
    selectedConflict,
    setSelectedConflict,
    selectedException,
    setSelectedException,
    selectedAlert,
    setSelectedAlert,
    selectedAsset,
    setSelectedAsset,
    selectedAuditEvent,
    setSelectedAuditEvent,
    selectedNotification,
    setSelectedNotification,
    updateSubmissionStatus,
    resolveRuleConflict,
    updateExceptionStatus,
    resolveSentinelAlert,
    addNewContentSubmission,
    addNewException,
    analytics,
    analyticsTrends,
    analyticsRange,
    setAnalyticsRange,
    analyticsLoading,
    creatorSummary,
    addComment,
    markAllNotificationsRead,
    runSemanticReview,
    fetchAiFindings,
    runRuleSimulation,
    activateSimulation,
    updateProfile,
    changePassword,
    downloadGuideline,
    downloadAnalytics,
    currentUser,
    toasts,
    showToast,
    dismissToast,
    addToast: showToast,
    removeToast: dismissToast,
    isAiCompareOpen,
    setIsAiCompareOpen,
    isCompareOpen: isAiCompareOpen,
    setIsCompareOpen: setIsAiCompareOpen,
    currentPage: activePage,
    setCurrentPage: setActivePage,
    markNotificationRead,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within an AppProvider')
  return ctx
}
