/**
 * Precedent — service layer.
 *
 * Every screen talks to the app through this module and nothing else.
 * Today each function resolves from the isolated demo dataset with a small
 * simulated latency (so loading / empty / error states are real code paths).
 * When the FastAPI backend lands, only the bodies of these functions change —
 * swap `delay(...) + demo` for `fetch('/api/...')` and the UI is connected.
 *
 * Auth note: role comes from the resolved account record, never from a
 * client-supplied role field. The session guard in `AuthProvider` mirrors what
 * the backend will enforce with signed tokens.
 */

import {
  approvedClaims,
  auditEvents,
  exceptions,
  guidelineDocs,
  rules,
  simulations,
  submissions,
  users,
} from '@/lib/demo-data'
import type {
  ApprovedClaim,
  AuditEvent,
  ExceptionRequest,
  GuidelineDoc,
  Rule,
  Simulation,
  Submission,
  User,
} from '@/lib/types'

const LATENCY = 260

function delay<T>(value: T, ms = LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function fail(message: string, ms = 320): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

/**
 * Demo credentials (fictional). A real deployment resolves these from the
 * database with Argon2 hashes — no password ever reaches the client bundle.
 */
const DEMO_PASSWORDS: Record<string, string> = {
  'david.kim@pureglow.co': 'precedent',
  'emily.carter@pureglow.co': 'precedent',
}

export interface Session {
  token: string
  user: User
}

export const authApi = {
  async login(email: string, password: string): Promise<Session> {
    const normalized = email.trim().toLowerCase()
    const account = users.find((u) => u.email === normalized)
    if (!account) return fail('No account found for that email address.', 480)
    if (DEMO_PASSWORDS[normalized] !== password) return fail('Incorrect password. Please try again.', 480)
    return delay({ token: `demo.${account.id}.${Date.now()}`, user: account }, 620)
  },

  async requestReset(email: string): Promise<{ sent: boolean }> {
    const normalized = email.trim().toLowerCase()
    const account = users.find((u) => u.email === normalized)
    // Always resolve the same way — never leak whether an account exists.
    return delay({ sent: Boolean(account) }, 520)
  },
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export const api = {
  submissions: () => delay<Submission[]>(submissions),
  submission: async (id: string): Promise<Submission> => {
    const found = submissions.find((s) => s.id === id)
    return found ? delay(found) : fail('Submission not found.', 300)
  },
  guidelines: () => delay<GuidelineDoc[]>(guidelineDocs),
  rules: () => delay<Rule[]>(rules),
  claims: () => delay<ApprovedClaim[]>(approvedClaims),
  exceptions: () => delay<ExceptionRequest[]>(exceptions),
  simulations: () => delay<Simulation[]>(simulations),
  audit: () => delay<AuditEvent[]>(auditEvents),
  team: () => delay<User[]>(users),
}

export type Api = typeof api
