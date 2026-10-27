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
  ApprovedClaim,
  AuditEvent,
  Brand,
  BrandAsset,
  ContentType,
  ExceptionRequest,
  GuidelineDoc,
  Rule,
  Simulation,
  Submission,
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
  claims: () => request<ApprovedClaim[]>('/claims'),
  exceptions: () => request<ExceptionRequest[]>('/exceptions'),
  getExceptionHistory: (id: string) => request<any[]>(`/exceptions/${id}/history`),
  simulations: () => request<Simulation[]>('/simulations'),
  audit: () => request<AuditEvent[]>('/audit'),
  exportAuditUrl: (format: 'csv' | 'json' = 'csv') => `${API_BASE}/audit/export?format=${format}`,
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
}

export type Api = typeof api

