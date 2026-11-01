/**
 * Precedent — service layer.
 *
 * Every screen talks to the app through this module. It now performs real
 * HTTP calls against the FastAPI backend described in the contract. The
 * exported names and TypeScript signatures are unchanged so the rest of the
 * app keeps working.
 *
 * Auth note: the bearer token is kept in module memory and mirrored to
 * `sessionStorage` (key `precedent.session`) so a reload restores the
 * session. Role always comes from the user object returned by the backend.
 */

import type {
  AiFinding,
  AiTrustSummary,
  AppNotification,
  ApprovedClaim,
  AssetAnalysis,
  AuditEvent,
  Brand,
  BrandAsset,
  ContentType,
  EvidenceCapabilities,
  ExceptionRequest,
  GuidelineDoc,
  MonitoredPublication,
  Publication,
  ReassessmentTask,
  RetrievedPassage,
  Rule,
  Simulation,
  Submission,
  SystemHealth,
  User,
} from '@/lib/types'

export const API_BASE: string = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

function authHeaders(): Record<string, string> {
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {}
}

const SESSION_KEY = 'precedent.session'

/* ------------------------------------------------------------------ */
/* Session (in-memory token, mirrored to sessionStorage)               */
/* ------------------------------------------------------------------ */

type SessionRecord = { token: string; user: User }

let session: SessionRecord | null = null
try {
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (raw) session = JSON.parse(raw) as SessionRecord
} catch {
  session = null
}

/** Update the in-memory token and persist/remove it in sessionStorage. */
export function setSession(next: SessionRecord | null): void {
  session = next
  try {
    if (next) sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* storage unavailable — keep the in-memory value */
  }
}

/** Fired when the server rejects the stored token (expired / user gone). */
export const SESSION_EXPIRED_EVENT = 'precedent:session-expired'

/** Clear the local session and tell the app to return to the login screen. */
function clearSessionAndNotify(): void {
  setSession(null)
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* storage unavailable */
  }
  try {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
  } catch {
    /* no window (SSR) */
  }
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/* ------------------------------------------------------------------ */
/* Request primitive                                                   */
/* ------------------------------------------------------------------ */

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`)
  // Let the browser set the multipart boundary when a FormData body is used.
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    let detail: string = res.statusText
    try {
      const data = await res.json()
      const raw = (data as { detail?: unknown; message?: unknown }).detail ?? (data as { message?: unknown }).message
      if (typeof raw === 'string') detail = raw
      else if (raw && typeof raw === 'object' && 'message' in raw) detail = String((raw as { message: unknown }).message)
      else if (raw != null) detail = JSON.stringify(raw)
    } catch {
      /* non-JSON error body — keep statusText */
    }
    // A 401 outside the login call means the stored token is no longer valid
    // (expired, or the database was reseeded so the user id no longer exists).
    // Drop the stale session and force a re-login instead of surfacing a raw
    // "User not found" error on whatever action the user was attempting.
    if (res.status === 401 && path !== '/auth/login') {
      clearSessionAndNotify()
      throw new ApiError('Your session has expired. Please sign in again.', 401)
    }
    throw new ApiError(detail, res.status)
  }

  if (res.status === 204) return undefined as T
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return undefined as T
  return (await res.json()) as T
}

/* ------------------------------------------------------------------ */
/* Input shapes (kept compatible with the callers in DataContext)      */
/* ------------------------------------------------------------------ */

export interface CreateSubmissionInput {
  title: string
  type: ContentType
  channel: string
  brand: Brand
  text: string
  assetId?: string
}

export interface ExceptionInput {
  contentId: string
  ruleCode: string
  reason: string
  scope: string
  expiresAt: string
}

export interface SimulationInput {
  ruleId: string
  changeType: string
  newValue: string
}

export interface DocInput {
  name: string
  description: string
  category: GuidelineDoc['category']
  fileType: 'PDF' | 'DOCX'
  fileSize: string
  pages: number
}

export interface RuleInput {
  title: string
  summary: string
  subject: string
  condition: string
  action: string
  scope: string
  priority: Rule['priority']
  sourceDocId: string
  sourcePassage: string
  sourcePage: number
}

export interface ClaimInput {
  text: string
  product: string
  scope: string
}

export interface Session {
  token: string
  user: User
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export const authApi = {
  async login(email: string, password: string): Promise<Session> {
    const data = await request<Session>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setSession({ token: data.token, user: data.user })
    return data
  },

  async requestReset(email: string): Promise<{ sent: boolean }> {
    return request<{ sent: boolean }>('/auth/request-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  async me(): Promise<User> {
    return request<User>('/auth/me', { method: 'GET' })
  },

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' })
    } finally {
      setSession(null)
    }
  },
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export const api = {
  submissions: () => request<Submission[]>('/submissions'),
  submission: (id: string) => request<Submission>(`/submissions/${id}`),
  guidelines: () => request<GuidelineDoc[]>('/guidelines'),
  searchGuidelines: (q: string) => request<any[]>(`/guidelines/search?q=${encodeURIComponent(q)}`),
  rules: () => request<Rule[]>('/rules'),
  conflicts: () => request<any[]>('/rules/conflicts'),
  claims: () => request<ApprovedClaim[]>('/claims'),
  exceptions: () => request<ExceptionRequest[]>('/exceptions'),
  getExceptionHistory: (id: string) => request<any[]>(`/exceptions/${id}/history`),
  simulations: () => request<Simulation[]>('/simulations'),
  audit: () => request<AuditEvent[]>('/audit'),
  /**
   * Download the audit export.
   *
   * A plain `window.open` cannot attach the bearer token, so the endpoint
   * would answer 401 and the UI would claim success anyway. Fetch it with the
   * same auth path as every other call, then hand the browser a blob.
   */
  downloadAudit: async (format: 'csv' | 'json' = 'csv'): Promise<void> => {
    const headers = new Headers()
    if (session?.token) headers.set('Authorization', `Bearer ${session.token}`)
    const res = await fetch(`${API_BASE}/audit/export?format=${format}`, { headers })
    if (!res.ok) throw new ApiError(`Export failed (${res.status})`, res.status)

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `precedent-audit.${format === 'csv' ? 'csv' : 'json'}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
  team: () => request<User[]>('/team'),

  /* ---------------------------------------------------------------- */
  /* Writes                                                            */
  /* ---------------------------------------------------------------- */

  createSubmission: (input: CreateSubmissionInput) =>
    request<Submission>('/submissions', {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        excerpt: input.text.slice(0, 64) + (input.text.length > 64 ? '…' : ''),
        type: input.type,
        channel: input.channel,
        brand: input.brand,
        text: input.text,
        assetId: input.assetId ?? null,
      }),
    }),

  addVersion: (id: string, text: string, note: string) =>
    request<Submission>(`/submissions/${id}/versions`, {
      method: 'POST',
      body: JSON.stringify({ text, note }),
    }),

  addComment: (id: string, body: string) =>
    request<Submission>(`/submissions/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  decideSubmission: (id: string, action: string, note: string, version?: number) =>
    request<Submission>(`/submissions/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ action, note, version }),
    }),

  requestException: (input: ExceptionInput) =>
    request<ExceptionRequest>('/exceptions', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  decideException: (id: string, decision: 'Approved' | 'Rejected', conditions: string) =>
    request<ExceptionRequest>(`/exceptions/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision, conditions }),
    }),

  revokeException: (id: string, reason: string) =>
    request<ExceptionRequest>(`/exceptions/${id}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  runSimulation: async (input: SimulationInput): Promise<Simulation> => {
    const rule = (await request<Rule[]>('/rules')).find((r) => r.id === input.ruleId)
    const name = `${input.changeType} · ${rule?.title ?? 'Rule'}`
    const currentValue = rule?.action ?? ''
    return request<Simulation>('/simulations', {
      method: 'POST',
      body: JSON.stringify({
        name,
        ruleId: input.ruleId,
        changeType: input.changeType,
        currentValue,
        newValue: input.newValue,
      }),
    })
  },

  activateSimulation: (id: string) =>
    request<{ status: string; rule: Rule; simulation: Simulation }>(`/simulations/${id}/activate`, {
      method: 'POST',
    }),

  addDocument: (input: DocInput) => {
    const form = new FormData()
    const blob = new Blob([`${input.name}\n\n${input.description}`], { type: 'application/octet-stream' })
    form.append('file', blob, `document.${input.fileType.toLowerCase()}`)
    form.append('name', input.name)
    form.append('description', input.description)
    form.append('category', input.category)
    form.append('brand', 'PureGlow')
    form.append('visible_to_creators', 'true')
    return request<GuidelineDoc>('/guidelines', { method: 'POST', body: form })
  },

  uploadGuidelineFile: (file: File, name: string, category: string, description: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('name', name)
    form.append('description', description)
    form.append('category', category)
    form.append('brand', 'PureGlow')
    form.append('visible_to_creators', 'true')
    return request<GuidelineDoc>('/guidelines', { method: 'POST', body: form })
  },

  setDocStatus: (id: string, status: GuidelineDoc['status']) =>
    request<GuidelineDoc>(`/guidelines/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  addRule: (input: RuleInput) =>
    request<Rule>('/rules', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  confirmRule: (id: string) =>
    request<Rule>(`/rules/${id}/confirm`, { method: 'POST' }),

  rejectRule: (id: string) =>
    request<Rule>(`/rules/${id}/reject`, { method: 'POST' }),

  addClaim: (input: ClaimInput) =>
    request<ApprovedClaim>('/claims', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /* ---------------------------------------------------------------- */
  /* Brand / product image library                                     */
  /* ---------------------------------------------------------------- */

  assets: () => request<BrandAsset[]>('/assets'),

  researchAssets: (query: string, brand: string) =>
    request<{ configured: boolean; results: Array<Record<string, unknown>> }>('/assets/research', {
      method: 'POST',
      body: JSON.stringify({ query, brand }),
    }),

  uploadAsset: (file: File, name: string, brand: string, category: string, notes: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('name', name)
    form.append('brand', brand)
    form.append('category', category)
    form.append('notes', notes)
    return request<BrandAsset>('/assets', { method: 'POST', body: form })
  },

  approveAsset: (id: string) =>
    request<BrandAsset>(`/assets/${id}/approve`, { method: 'POST' }),

  /** Fetch a protected asset file with the bearer token and return an object URL. */
  fetchAssetBlobUrl: async (id: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/assets/${id}/file`, { headers: authHeaders() })
      if (!res.ok) return null
      const blob = await res.blob()
      return URL.createObjectURL(blob)
    } catch {
      return null
    }
  },

  /* ---------------------------------------------------------------- */
  /* A1 VisualGuard                                                    */
  /* ---------------------------------------------------------------- */

  /**
   * Upload a poster. Returns immediately with status "pending"; the analyser
   * runs in the background, so poll `analysis(id)` until it leaves pending.
   */
  uploadPoster: (
    file: File,
    opts: { submissionId?: string; title?: string; channel?: string; brand?: string } = {},
  ) => {
    const form = new FormData()
    form.append('file', file)
    if (opts.submissionId) form.append('submission_id', opts.submissionId)
    form.append('title', opts.title ?? file.name)
    form.append('channel', opts.channel ?? 'Social Media')
    form.append('brand', opts.brand ?? 'PureGlow')
    return request<{ analysisId: string; submissionId: string; status: string }>(
      '/analysis/upload',
      { method: 'POST', body: form },
    )
  },

  analysis: (id: string) => request<AssetAnalysis>(`/analysis/${id}`),

  analysisForSubmission: (submissionId: string) =>
    request<AssetAnalysis>(`/analysis/submission/${submissionId}`),

  rerunAnalysis: (id: string) =>
    request<{ analysisId: string; status: string }>(`/analysis/${id}/rerun`, { method: 'POST' }),

  /** Object URL for the stored poster (the endpoint is token-protected). */
  fetchPosterBlobUrl: async (submissionId: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/analysis/${submissionId}/file`, {
        headers: authHeaders(),
      })
      if (!res.ok) return null
      const blob = await res.blob()
      return URL.createObjectURL(blob)
    } catch {
      return null
    }
  },

  /* ---------------------------------------------------------------- */
  /* A2 Evidence Intelligence                                          */
  /* ---------------------------------------------------------------- */

  evidenceCapabilities: () => request<EvidenceCapabilities>('/evidence/capabilities'),

  aiFindings: (submissionId: string) =>
    request<AiFinding[]>(`/evidence/findings/${submissionId}`),

  runSemanticReview: (submissionId: string, versionId?: string) =>
    request<{ submissionId: string; count: number; findings: AiFinding[]; llmConfigured: boolean }>(
      `/evidence/review/${submissionId}`,
      { method: 'POST', body: JSON.stringify({ versionId: versionId ?? null }) },
    ),

  searchEvidence: (q: string, topK?: number) =>
    request<{ query: string; results: RetrievedPassage[]; method: string }>(
      `/evidence/search?q=${encodeURIComponent(q)}${topK ? `&topK=${topK}` : ''}`,
    ),

  syncEmbeddings: () =>
    request<{ model: string | null; indexed: number; skipped: number }>(
      '/evidence/sync-embeddings',
      { method: 'POST' },
    ),

  aiTrust: (days = 30) => request<AiTrustSummary>(`/evidence/trust?days=${days}`),

  /** Capability report for the trust panel: database, OCR, embeddings, LLM, scheduler. */
  health: () => request<SystemHealth>('/health'),

  /* ---------------------------------------------------------------- */
  /* A3 Sentinel                                                       */
  /* ---------------------------------------------------------------- */

  markPublished: (submissionId: string, channel?: string, versionId?: string) =>
    request<Publication>('/sentinel/publications', {
      method: 'POST',
      body: JSON.stringify({ submissionId, channel, versionId }),
    }),

  withdrawPublication: (publicationId: string) =>
    request<{ id: string; status: string }>(`/sentinel/publications/${publicationId}`, {
      method: 'DELETE',
    }),

  sentinelPublications: (status?: string, limit = 50) =>
    request<MonitoredPublication[]>(
      `/sentinel/publications?limit=${limit}${status ? `&status=${encodeURIComponent(status)}` : ''}`,
    ),

  sentinelTasks: (status?: string, mine = false) =>
    request<ReassessmentTask[]>(
      `/sentinel/tasks?${status ? `status=${encodeURIComponent(status)}&` : ''}mine=${mine}`,
    ),

  resolveTask: (taskId: string, resolution: string, note = '') =>
    request<ReassessmentTask>(`/sentinel/tasks/${taskId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution, note }),
    }),

  scanExpiring: (days = 30) =>
    request<{ notified: number; items: unknown[] }>(`/sentinel/scan?days=${days}`, {
      method: 'POST',
    }),

  notifications: (unreadOnly = false) =>
    request<AppNotification[]>(`/sentinel/notifications?unreadOnly=${unreadOnly}`),

  unreadCount: () =>
    request<{ count: number }>('/sentinel/notifications/unread-count'),

  markNotificationRead: (id: string) =>
    request<AppNotification>(`/sentinel/notifications/${id}/read`, { method: 'POST' }),

  markAllNotificationsRead: () =>
    request<{ marked: number }>('/sentinel/notifications/read-all', { method: 'POST' }),

  /* Rule edits that trigger Sentinel (blueprint 7.2) */
  editRule: (id: string, patch: Partial<RuleInput> & { status?: string }) =>
    request<Rule>(`/rules/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  deactivateRule: (id: string) =>
    request<Rule>(`/rules/${id}/deactivate`, { method: 'POST' }),

  withdrawClaim: (id: string) =>
    request<ApprovedClaim>(`/claims/${id}/withdraw`, { method: 'POST' }),

  /* Second Batch Innovations (N10-N18)                               */
  /* ---------------------------------------------------------------- */
  listSnippets: (category?: string) =>
    request<any[]>(category ? `/snippets?category=${encodeURIComponent(category)}` : '/snippets'),

  createSnippet: (data: { text: string; category?: string; rule_codes?: string[]; valid_until?: string }) =>
    request<any>('/snippets', { method: 'POST', body: JSON.stringify(data) }),

  submitFindingFeedback: (findingId: string, reason: string, notes: string) =>
    request<any>(`/submissions/findings/${findingId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ reason, notes }),
    }),

  feedbackReports: () =>
    request<any[]>('/feedback/reports'),

  expiryForecast: () =>
    request<{ items: any[]; summary: any }>('/exceptions/forecast'),

  simulateException: (id: string) =>
    request<any>(`/exceptions/${id}/simulate`, { method: 'POST' }),

  explainFinding: (findingId: string, lang = 'en') =>
    request<any>(`/submissions/findings/${findingId}/explain?lang=${lang}`),

  exportUserData: () =>
    request<any>('/auth/me/export'),

  /* ProofPass (Stretch Innovation F1)                                */
  /* ---------------------------------------------------------------- */
  generatePassport: (submissionId: string, versionId?: string) =>
    request<any>('/passport/generate', {
      method: 'POST',
      body: JSON.stringify({ submissionId, versionId }),
    }),

  getPassport: (passportId: string) =>
    request<any>(`/passport/${encodeURIComponent(passportId)}`),

  verifyPassport: (passportIdOrToken: string) => {
    const fd = new FormData()
    fd.append('passportIdOrToken', passportIdOrToken)
    return request<any>('/passport/verify', {
      method: 'POST',
      body: fd,
    })
  },

  revokePassport: (passportId: string, reason: string) =>
    request<any>(`/passport/${encodeURIComponent(passportId)}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  /* Model & System Health                                            */
  modelsHealth: () =>
    request<any>('/health/models'),

  applySuggestion: (suggestionId: string) =>
    request<any>(`/submissions/suggestions/${encodeURIComponent(suggestionId)}/apply`, {
      method: 'POST',
    }),

  suggestFindingEdits: (findingId: string) =>
    request<any>(`/submissions/findings/${encodeURIComponent(findingId)}/suggest-edits`, {
      method: 'POST',
    }),

  impactPreview: (triggerRef: string, triggerType = 'rule_edited') =>
    request<any>(`/sentinel/impact-preview?trigger_ref=${encodeURIComponent(triggerRef)}&trigger_type=${encodeURIComponent(triggerType)}`),

  /* Review Crew Multi-Agent Bounded Trace                           */
  triggerCrewReview: (submissionId: string) =>
    request<any>(`/submissions/${encodeURIComponent(submissionId)}/crew-review`, {
      method: 'POST',
    }),

  fetchCrewTrace: (submissionId: string) =>
    request<any>(`/submissions/${encodeURIComponent(submissionId)}/crew-trace`),

  crewSummary: () =>
    request<{
      workspace: string
      totalRuns: number
      completedRuns: number
      avgDurationMs: number
      agents: { id: string; name: string; role: string; status: string; badge: string; desc: string }[]
      recentTraces: {
        id: string
        submissionId: string
        versionNum: number
        status: string
        summary: string
        durationMs: number
        createdAt: string
        stepsCount: number
      }[]
    }>('/crew/summary'),

  listPassports: () =>
    request<{
      id: string
      submissionId: string
      versionNumber: number
      brand: string
      title: string
      sha256: string
      phash: string | null
      token: string
      approvedBy: string
      status: string
      revocationReason: string | null
      createdAt: string
      expiresAt: string
    }[]>('/passport'),

  listAnalyses: (limit = 50) =>
    request<(AssetAnalysis & { submissionTitle?: string; submissionCode?: string })[]>(`/analysis?limit=${limit}`),

  /* User Profile & Security                                          */
  /* ---------------------------------------------------------------- */
  updateProfile: (data: { name?: string; title?: string; avatarTone?: string }) =>
    request<User>('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  /* Exports & Reports                                                */
  /* ---------------------------------------------------------------- */
  downloadAuditCsv: (action?: string, brand?: string) => {
    const params = new URLSearchParams({ format: 'csv' })
    if (action) params.append('action', action)
    if (brand) params.append('brand', brand)
    return downloadFile(`/audit/export?${params.toString()}`, `audit_log_${new Date().toISOString().slice(0, 10)}.csv`)
  },

  downloadSubmissionsCsv: (status?: string, brand?: string) => {
    const params = new URLSearchParams({ format: 'csv' })
    if (status) params.append('status', status)
    if (brand) params.append('brand', brand)
    return downloadFile(`/submissions/export?${params.toString()}`, `submissions_${new Date().toISOString().slice(0, 10)}.csv`)
  },

  downloadSubmissionReport: (submissionId: string, format: 'json' | 'text' = 'text') => {
    const filename = `compliance_report_${submissionId}.${format === 'text' ? 'txt' : 'json'}`
    return downloadFile(`/submissions/${encodeURIComponent(submissionId)}/report?format=${format}`, filename)
  },

  /* Analytics & Health (real DB aggregations)                         */
  /* ---------------------------------------------------------------- */

  /** `range` is 7d | 30d | 90d | 1y and genuinely changes the returned series. */
  analytics: (range = '30d') =>
    request<AnalyticsSummary>(`/analytics?range=${encodeURIComponent(range)}`),

  analyticsTrends: (range = '30d') =>
    request<AnalyticsTrends>(`/analytics/trends?range=${encodeURIComponent(range)}`),

  analyticsExport: (range = '30d') =>
    downloadFile(`/analytics/export?range=${encodeURIComponent(range)}`, 'precedent-analytics.csv'),

  /** Per-creator dashboard metrics; the server scopes this to the caller. */
  creatorSummary: () => request<CreatorSummary>('/analytics/creator-summary'),

  /* Rules & Conflicts                                                 */
  /* ---------------------------------------------------------------- */

  /** Persist that a manager reviewed a conflict. Never mutates a rule. */
  reviewConflict: (ruleACode: string, ruleBCode: string, note = '') =>
    request<{ id: string; status: string; duplicate: boolean }>('/rules/conflicts/review', {
      method: 'POST',
      body: JSON.stringify({ ruleACode, ruleBCode, note }),
    }),

  clearConflictReview: (ruleACode: string, ruleBCode: string) =>
    request<{ deleted: number }>(
      `/rules/conflicts/review?ruleACode=${encodeURIComponent(ruleACode)}&ruleBCode=${encodeURIComponent(ruleBCode)}`,
      { method: 'DELETE' },
    ),

  /** Fetch a protected guideline file with the bearer token and return an object URL. */
  fetchGuidelineBlobUrl: async (id: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/guidelines/${id}/file`, { headers: authHeaders() })
      if (!res.ok) return null
      return URL.createObjectURL(await res.blob())
    } catch {
      return null
    }
  },
}

/* ------------------------------------------------------------------ */
/* Analytics response types                                            */
/* ------------------------------------------------------------------ */

export interface AnalyticsSummary {
  range: string
  generatedAt: string
  sampleSize: number
  totals: {
    submissions: number
    inReview: number
    approved: number
    needsChanges: number
    declined: number
    decided: number
    openFindings: number
    totalFindings: number
  }
  statusBreakdown: Record<string, number>
  complianceScore: number
  findingsByCategory: { category: string; count: number; high: number; medium: number; low: number }[]
  topRules: { code: string; title: string; count: number }[]
  ruleCoverage: { activeRules: number; totalRules: number; rulesTriggered: number }
  citations: { verified: number; total: number; passages: number; verifiedPct: number }
  reviewPerformance: { decisions: number; avgReviewHours: number | null; tracked: boolean }
  sentinel: { open: number; resolved: number }
  exceptions: Record<string, number>
  campaignHealth: { campaign: string; count: number; issues: number; score: number }[]
}

export interface AnalyticsTrends {
  range: string
  bucket: 'day' | 'week'
  points: { date: string; score: number; submissions: number; issues: number }[]
  hasData: boolean
  empty: boolean
}

export interface CreatorSummary {
  sampleSize: number
  complianceScore: number
  statusBreakdown: Record<string, number>
  approved: number
  inReview: number
  needsChanges: number
  openIssues: number
  openTasks: number
  unreadNotifications: number
  recent: { id: string; title: string; status: string; score: number; createdAt: string | null }[]
}

/** Utility to download file responses with authenticated bearer headers */
export async function downloadFile(path: string, defaultFilename: string): Promise<void> {
  const headers = new Headers()
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`)
  const res = await fetch(`${API_BASE}${path}`, { headers })
  if (!res.ok) {
    throw new ApiError(`Download failed with status ${res.status}`, res.status)
  }
  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = defaultFilename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

export type Api = typeof api

