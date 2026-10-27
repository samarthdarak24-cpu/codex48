/**
 * Precedent — application data store.
 *
 * Loads the whole working set once from the FastAPI backend, then serves every
 * screen from memory. Mutations call the corresponding `api` write method and
 * then re-fetch the affected collection(s) from the server so the UI reflects
 * the authoritative state.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import type {
  ApprovedClaim,
  AuditEvent,
  ExceptionRequest,
  GuidelineDoc,
  Rule,
  Simulation,
  Submission,
  SubmissionStatus,
  User,
} from '@/lib/types'

export interface DataBundle {
  submissions: Submission[]
  docs: GuidelineDoc[]
  rules: Rule[]
  claims: ApprovedClaim[]
  exceptions: ExceptionRequest[]
  simulations: Simulation[]
  audit: AuditEvent[]
  team: User[]
}

interface DataState extends DataBundle {
  loading: boolean
  error: string | null
  refetch: () => void
  submitContent: (input: SubmitInput) => Promise<Submission>
  addVersion: (submissionId: string, text: string, note: string) => Promise<Submission>
  addComment: (submissionId: string, body: string) => void
  decideSubmission: (submissionId: string, action: ReviewDecisionAction, note: string) => void
  requestException: (input: ExceptionInput) => Promise<ExceptionRequest>
  decideException: (id: string, decision: 'Approved' | 'Rejected', conditions: string) => void
  runSimulation: (input: SimulationInput) => Promise<Simulation>
  addDocument: (input: DocInput) => Promise<GuidelineDoc>
  setDocStatus: (id: string, status: GuidelineDoc['status']) => void
  addRule: (input: RuleInput) => Promise<Rule>
  confirmRule: (id: string) => void
  addClaim: (input: ClaimInput) => Promise<ApprovedClaim>
  approveAsset: (id: string) => Promise<void>
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

export interface SubmitInput {
  title: string
  type: Submission['type']
  channel: string
  brand: Submission['brand']
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

type ReviewDecisionAction = 'Approved' | 'Changes Requested' | 'Declined'

const EMPTY: DataBundle = {
  submissions: [],
  docs: [],
  rules: [],
  claims: [],
  exceptions: [],
  simulations: [],
  audit: [],
  team: [],
}

const DataContext = createContext<DataState | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const [bundle, setBundle] = useState<DataBundle>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false

    // Never hit protected endpoints before the session is established.
    if (status !== 'authenticated') {
      setBundle(EMPTY)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    Promise.all([
      api.submissions(),
      api.guidelines(),
      api.rules(),
      api.claims(),
      api.exceptions(),
      api.simulations(),
      api.audit(),
      api.team(),
    ])
      .then(([submissions, docs, rules, claims, exceptions, simulations, audit, team]) => {
        if (cancelled) return
        setBundle({ submissions, docs, rules, claims, exceptions, simulations, audit, team })
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unable to load workspace data.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [nonce, status])

  const refetch = useCallback(() => setNonce((n) => n + 1), [])

  const fail = useCallback((err: unknown) => {
    setError(err instanceof Error ? err.message : 'The request failed. Please try again.')
  }, [])

  /* ---------------------------------------------------------------- */
  /* Content                                                           */
  /* ---------------------------------------------------------------- */

  const submitContent = useCallback(
    async (input: SubmitInput): Promise<Submission> => {
      try {
        const created = await api.createSubmission(input)
        const submissions = await api.submissions()
        setBundle((prev) => ({ ...prev, submissions }))
        return created
      } catch (err) {
        fail(err)
        throw err
      }
    },
    [fail],
  )

  const addVersion = useCallback(
    async (submissionId: string, text: string, note: string): Promise<Submission> => {
      try {
        const updated = await api.addVersion(submissionId, text, note)
        const [submissions, audit] = await Promise.all([api.submissions(), api.audit()])
        setBundle((prev) => ({ ...prev, submissions, audit }))
        return updated
      } catch (err) {
        fail(err)
        throw err
      }
    },
    [fail],
  )

  const addComment = useCallback(
    (submissionId: string, body: string) => {
      api
        .addComment(submissionId, body)
        .then(async () => {
          const [submissions, audit] = await Promise.all([api.submissions(), api.audit()])
          setBundle((prev) => ({ ...prev, submissions, audit }))
        })
        .catch(fail)
    },
    [fail],
  )

  const decideSubmission = useCallback(
    (submissionId: string, action: ReviewDecisionAction, note: string) => {
      // Bind the decision to the version the reviewer actually saw. The backend
      // rejects the request if the content changed in the meantime.
      const version = bundle.submissions.find((s) => s.id === submissionId)?.version
      api
        .decideSubmission(submissionId, action, note, version)
        .then(async () => {
          const [submissions, audit] = await Promise.all([api.submissions(), api.audit()])
          setBundle((prev) => ({ ...prev, submissions, audit }))
        })
        .catch(fail)
    },
    [fail, bundle.submissions],
  )

  /* ---------------------------------------------------------------- */
  /* Exceptions                                                        */
  /* ---------------------------------------------------------------- */

  const requestException = useCallback(
    async (input: ExceptionInput): Promise<ExceptionRequest> => {
      try {
        const created = await api.requestException(input)
        const [exceptions, audit] = await Promise.all([api.exceptions(), api.audit()])
        setBundle((prev) => ({ ...prev, exceptions, audit }))
        return created
      } catch (err) {
        fail(err)
        throw err
      }
    },
    [fail],
  )

  const decideException = useCallback(
    (id: string, decision: 'Approved' | 'Rejected', conditions: string) => {
      api
        .decideException(id, decision, conditions)
        .then(async () => {
          const [exceptions, audit] = await Promise.all([api.exceptions(), api.audit()])
          setBundle((prev) => ({ ...prev, exceptions, audit }))
        })
        .catch(fail)
    },
    [fail],
  )

  /* ---------------------------------------------------------------- */
  /* Simulation                                                        */
  /* ---------------------------------------------------------------- */

  const runSimulation = useCallback(
    async (input: SimulationInput): Promise<Simulation> => {
      try {
        const created = await api.runSimulation(input)
        const simulations = await api.simulations()
        setBundle((prev) => ({ ...prev, simulations }))
        return created
      } catch (err) {
        fail(err)
        throw err
      }
    },
    [fail],
  )

  /* ---------------------------------------------------------------- */
  /* Guidelines, rules and claims                                      */
  /* ---------------------------------------------------------------- */

  const addDocument = useCallback(
    async (input: DocInput): Promise<GuidelineDoc> => {
      try {
        const created = await api.addDocument(input)
        const docs = await api.guidelines()
        setBundle((prev) => ({ ...prev, docs }))
        return created
      } catch (err) {
        fail(err)
        throw err
      }
    },
    [fail],
  )

  const setDocStatus = useCallback(
    (id: string, status: GuidelineDoc['status']) => {
      api
        .setDocStatus(id, status)
        .then(async () => {
          const docs = await api.guidelines()
          setBundle((prev) => ({ ...prev, docs }))
        })
        .catch(fail)
    },
    [fail],
  )

  const addRule = useCallback(
    async (input: RuleInput): Promise<Rule> => {
      try {
        const created = await api.addRule(input)
        const rules = await api.rules()
        setBundle((prev) => ({ ...prev, rules }))
        return created
      } catch (err) {
        fail(err)
        throw err
      }
    },
    [fail],
  )

  const confirmRule = useCallback(
    (id: string) => {
      api
        .confirmRule(id)
        .then(async () => {
          const rules = await api.rules()
          setBundle((prev) => ({ ...prev, rules }))
        })
        .catch(fail)
    },
    [fail],
  )

  const addClaim = useCallback(
    async (input: ClaimInput): Promise<ApprovedClaim> => {
      try {
        const created = await api.addClaim(input)
        const claims = await api.claims()
        setBundle((prev) => ({ ...prev, claims }))
        return created
      } catch (err) {
        fail(err)
        throw err
      }
    },
    [fail],
  )

  const approveAsset = useCallback(
    async (id: string): Promise<void> => {
      try {
        await api.approveAsset(id)
      } catch (err) {
        fail(err)
        throw err
      }
    },
    [fail],
  )

  const value = useMemo<DataState>(
    () => ({
      ...bundle,
      loading,
      error,
      refetch,
      submitContent,
      addVersion,
      addComment,
      decideSubmission,
      requestException,
      decideException,
      runSimulation,
      addDocument,
      setDocStatus,
      addRule,
      confirmRule,
      addClaim,
      approveAsset,
    }),
    [
      bundle,
      loading,
      error,
      refetch,
      submitContent,
      addVersion,
      addComment,
      decideSubmission,
      requestException,
      decideException,
      runSimulation,
      addDocument,
      setDocStatus,
      addRule,
      confirmRule,
      addClaim,
      approveAsset,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
