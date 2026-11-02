import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bot,
  X,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  ChevronDown,
  Layers,
  RefreshCw,
  Loader2,
  Clock,
  Minus,
  ThumbsUp,
  ThumbsDown,
  FileText,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { useApp } from '../../context/AppContext'
import { agentApi } from '@/services/api'
import type { AgentRun, AgentSummary } from '@/lib/agentTypes'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  id: string
  sender: 'user' | 'agent'
  text: string
  timestamp: string
  run?: AgentRun
  tone?: 'info' | 'error'
}

type Finding = {
  ruleCode?: string
  ruleTitle?: string
  severity?: string
  explanation?: string
  sourceDocName?: string
  sourcePage?: number
  evidenceVerified?: boolean
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm-welcome',
    sender: 'agent',
    text:
      'Hi — I run your published Precedent agents against real workspace data. Ask me to review a submission, research the guidelines, or check an exception, and I will show the actual tool steps and findings.',
    timestamp: 'Just now',
  },
]

const QUICK_PROMPTS = [
  { label: 'Review latest submission', query: 'Review my latest submission against the active brand guidelines.' },
  { label: 'Approved colours', query: 'What are the approved background colours for PureGlow campaigns?' },
  { label: 'Unsupported claims', query: 'Which marketing claims are unsupported and need evidence?' },
  { label: 'Explain a rule', query: 'Explain the rule about approved product claims and where it is cited.' },
]

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  completed: { label: 'Completed', cls: 'bg-sage-50 text-sage-700 border-sage-200', dot: 'bg-sage-500' },
  running: { label: 'Running', cls: 'bg-brand-50 text-brand-700 border-brand-200', dot: 'bg-brand-500' },
  waiting_approval: { label: 'Awaiting approval', cls: 'bg-warn-50 text-warn-700 border-warn-200', dot: 'bg-warn-500' },
  queued: { label: 'Queued', cls: 'bg-cream-100 text-ink-600 border-line', dot: 'bg-muted' },
  failed: { label: 'Failed', cls: 'bg-danger-50 text-danger-700 border-danger-200', dot: 'bg-danger-500' },
  cancelled: { label: 'Cancelled', cls: 'bg-cream-100 text-ink-600 border-line', dot: 'bg-muted' },
}

const SEVERITY_CLS: Record<string, string> = {
  high: 'bg-danger-50 text-danger-700',
  medium: 'bg-warn-50 text-warn-700',
  low: 'bg-olive-50 text-olive-700',
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function stamp(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function findingsOf(run: AgentRun): Finding[] {
  const out = (run.output ?? {}) as Record<string, unknown>
  const draft = out.draft as Record<string, unknown> | undefined
  const raw = draft?.findings ?? out.findings
  return Array.isArray(raw) ? (raw as Finding[]).slice(0, 4) : []
}

function summaryOf(run: AgentRun): string {
  const out = (run.output ?? {}) as Record<string, any>
  const draft = out.draft as Record<string, any> | undefined
  if (typeof out.answer === 'string' && out.answer.trim()) return out.answer
  if (typeof out.report === 'string' && out.report.trim()) return out.report
  if (typeof out.summary === 'string' && out.summary.trim()) return out.summary
  if (draft && typeof draft.summary === 'string' && draft.summary.trim()) return draft.summary
  if (run.status === 'waiting_approval') {
    return 'Analysis complete. The agent is paused at a human-approval checkpoint before it writes anything.'
  }
  if (run.status === 'failed') return run.error || 'The run failed.'
  if (run.status === 'cancelled') return 'The run was cancelled.'
  return `The agent finished with status ${run.status.replace(/_/g, ' ')}.`
}

function buildInput(
  agent: AgentSummary,
  q: string,
  submissions: { id: string }[],
): Record<string, unknown> | null {
  if (['brand_compliance', 'visual_review', 'sentinel'].includes(agent.category)) {
    const sid = q.match(/sub_[a-z0-9]+/i)?.[0] ?? submissions[0]?.id
    if (!sid) return null
    return { submission_id: sid, query: q, text: q }
  }
  if (agent.category === 'exceptions') {
    const eid = q.match(/ex_[a-z0-9-]+/i)?.[0]
    if (!eid) return null
    return { exception_id: eid, query: q, text: q }
  }
  return { query: q, text: q }
}

/** Deterministic intent router over published agents. No fabricated results. */
function chooseAgent(
  q: string,
  agents: AgentSummary[],
  submissions: { id: string }[],
): { agent: AgentSummary; input: Record<string, unknown> } | null {
  const lower = q.toLowerCase()
  const order = /exception|override|waiver/.test(lower)
    ? ['exceptions', 'brand_compliance', 'guideline_research', 'audit']
    : /audit|report|weekly|trend/.test(lower) && !/submission/.test(lower)
      ? ['audit', 'guideline_research', 'brand_compliance']
      : /review|check|submission|poster|claim|content|compliance|visual/.test(lower)
        ? ['brand_compliance', 'visual_review', 'sentinel', 'guideline_research']
        : ['guideline_research', 'brand_compliance', 'audit', 'exceptions']

  for (const cat of order) {
    const agent = agents.find((a) => a.category === cat)
    if (!agent) continue
    const input = buildInput(agent, q, submissions)
    if (input) return { agent, input }
  }
  if (agents[0]) {
    return { agent: agents[0], input: buildInput(agents[0], q, submissions) ?? { query: q, text: q } }
  }
  return null
}

/* ------------------------------------------------------------------ */
/* Small renderers                                                     */
/* ------------------------------------------------------------------ */

const StepIcon: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'completed') return <CheckCircle2 className="h-3 w-3 shrink-0 text-sage-600" />
  if (status === 'running') return <Loader2 className="h-3 w-3 shrink-0 animate-spin text-brand-600" />
  if (status === 'waiting_approval') return <Clock className="h-3 w-3 shrink-0 text-warn-600" />
  if (status === 'failed') return <AlertTriangle className="h-3 w-3 shrink-0 text-danger-600" />
  return <Minus className="h-3 w-3 shrink-0 text-muted-light" />
}

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const meta = STATUS_META[status] ?? STATUS_META.queued
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8.5px] font-semibold', meta.cls)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}

const RunBlock: React.FC<{
  run: AgentRun
  messageId: string
  role: string
  onDecide: (messageId: string, runId: string, decision: 'approve' | 'reject') => void
}> = ({ run, messageId, role, onDecide }) => {
  const findings = findingsOf(run)
  const steps = run.steps ?? []
  const pending = run.status === 'waiting_approval'

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <StatusPill status={run.status} />
        <span className="text-[9px] text-muted">
          {run.agentName} · {run.stepCount} steps · {run.durationMs}ms
        </span>
      </div>

      {findings.length > 0 && (
        <div className="space-y-1.5">
          {findings.map((f, i) => (
            <div key={`${f.ruleCode ?? 'f'}-${i}`} className="rounded-xl border border-line bg-white/85 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[10.5px] font-semibold text-ink">
                  {f.ruleCode ?? 'Finding'}
                  {f.ruleTitle ? ` · ${f.ruleTitle}` : ''}
                </span>
                {f.severity && (
                  <span
                    className={cn(
                      'shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase',
                      SEVERITY_CLS[f.severity.toLowerCase()] ?? 'bg-cream-100 text-ink-600',
                    )}
                  >
                    {f.severity}
                  </span>
                )}
              </div>
              {f.explanation && (
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted">{f.explanation}</p>
              )}
              {(f.sourceDocName || f.sourcePage) && (
                <p className="mt-1 flex items-center gap-1 text-[9px] text-sage-700">
                  <FileText className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">
                    {f.sourceDocName}
                    {f.sourcePage ? ` · Page ${f.sourcePage}` : ''}
                    {f.evidenceVerified ? ' · verified' : ''}
                  </span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {steps.length > 0 && (
        <details className="group rounded-xl border border-line bg-white/75">
          <summary className="flex cursor-pointer list-none items-center justify-between px-2 py-1.5 text-[10px] font-semibold text-ink-600">
            <span className="inline-flex items-center gap-1">
              <Layers className="h-3 w-3" />
              Execution steps ({steps.length})
            </span>
            <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
          </summary>
          <ol className="space-y-1 border-t border-line px-2 py-1.5">
            {steps.map((s) => (
              <li key={s.id} className="flex items-center gap-1.5 text-[9.5px]">
                <StepIcon status={s.status} />
                <span className="min-w-0 flex-1 truncate text-ink-600">{s.label}</span>
                {s.toolId && (
                  <span className="shrink-0 rounded bg-cream-100 px-1 font-mono text-[8px] text-muted">{s.toolId}</span>
                )}
                <span className="shrink-0 tabular-nums text-muted">{s.durationMs}ms</span>
              </li>
            ))}
          </ol>
        </details>
      )}

      {pending &&
        (role === 'manager' ? (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onDecide(messageId, run.id, 'approve')}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-600 px-2 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <ThumbsUp className="h-3 w-3" />
              Approve &amp; resume
            </button>
            <button
              type="button"
              onClick={() => onDecide(messageId, run.id, 'reject')}
              className="flex items-center justify-center gap-1 rounded-lg border border-line bg-white px-2 py-1.5 text-[10px] font-semibold text-ink-600 transition-colors hover:bg-cream-50"
            >
              <ThumbsDown className="h-3 w-3" />
              Reject
            </button>
          </div>
        ) : (
          <p className="rounded-lg border border-warn-200 bg-warn-50 px-2 py-1 text-[9.5px] text-warn-700">
            Waiting for a brand manager to approve this action.
          </p>
        ))}
    </div>
  )
}

const RunRow: React.FC<{ run: AgentRun }> = ({ run }) => {
  const [detail, setDetail] = useState<AgentRun | null>(null)
  const [loading, setLoading] = useState(false)

  const onToggle = async (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (!e.currentTarget.open || detail || loading) return
    setLoading(true)
    try {
      setDetail(await agentApi.run(run.id))
    } catch {
      /* leave the compact row in place */
    } finally {
      setLoading(false)
    }
  }

  const full = detail ?? run
  const steps = full.steps ?? []

  return (
    <details className="group rounded-xl border border-line bg-white" onToggle={onToggle}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-2">
        <StatusPill status={run.status} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-semibold text-ink">{run.agentName}</span>
          <span className="block truncate text-[9px] text-muted">
            {run.triggerType} · {run.stepCount} steps · {run.durationMs}ms
          </span>
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line px-2.5 py-1.5">
        {loading && <p className="py-1 text-[9px] text-muted">Loading steps…</p>}
        {!loading && steps.length === 0 && <p className="py-1 text-[9px] text-muted">No step detail stored.</p>}
        {steps.slice(0, 14).map((s) => (
          <div key={s.id} className="flex items-center gap-1.5 py-0.5 text-[9px]">
            <StepIcon status={s.status} />
            <span className="min-w-0 flex-1 truncate text-ink-600">{s.label}</span>
            {s.toolId && (
              <span className="shrink-0 rounded bg-cream-100 px-1 font-mono text-[8px] text-muted">{s.toolId}</span>
            )}
          </div>
        ))}
      </div>
    </details>
  )
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const FloatingAgentChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState<'chat' | 'runs'>('chat')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [busy, setBusy] = useState(false)
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [agentsLoaded, setAgentsLoaded] = useState(false)
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [runsLoading, setRunsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  /* Safe context read: the chat also renders on the public marketing page. */
  let ctx: ReturnType<typeof useApp> | null = null
  try {
    ctx = useApp()
  } catch {
    ctx = null
  }
  const role = ctx?.role ?? 'manager'
  const submissions = ctx?.submissions ?? []
  const signedIn = Boolean(ctx)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, busy])

  useEffect(() => {
    if (!isOpen || !signedIn || agentsLoaded) return
    let cancelled = false
    agentApi
      .list({ status: 'published' })
      .then((rows) => {
        if (!cancelled) {
          setAgents(rows)
          setAgentsLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setAgentsLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, signedIn, agentsLoaded])

  const loadRuns = useCallback(async () => {
    setRunsLoading(true)
    try {
      setRuns(await agentApi.allRuns({ limit: 30 }))
    } catch {
      setRuns([])
    } finally {
      setRunsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && tab === 'runs' && signedIn) void loadRuns()
  }, [isOpen, tab, signedIn, loadRuns])

  const send = async (text?: string) => {
    const q = (text ?? input).trim()
    if (!q || busy) return

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, sender: 'user', text: q, timestamp: stamp() },
    ])
    if (!text) setInput('')

    if (!signedIn) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'agent',
          text: 'Sign in to run agents against your workspace.',
          tone: 'error',
          timestamp: stamp(),
        },
      ])
      return
    }

    setBusy(true)
    try {
      const picked = chooseAgent(q, agents, submissions)
      if (!picked) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: 'agent',
            text:
              agents.length === 0
                ? 'No published agent is available yet. Publish one in Agent Studio, then ask me again.'
                : 'I could not match that request to an available agent. Try “review my latest submission” or “what are the approved colours?”.',
            tone: 'error',
            timestamp: stamp(),
          },
        ])
        return
      }
      const { run } = await agentApi.execute(picked.agent.id, picked.input, 'manual')
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, sender: 'agent', text: summaryOf(run), run, timestamp: stamp() },
      ])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The agent could not run.'
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, sender: 'agent', text: message, tone: 'error', timestamp: stamp() },
      ])
    } finally {
      setBusy(false)
    }
  }

  const decide = async (messageId: string, runId: string, decision: 'approve' | 'reject') => {
    try {
      const { run } = await agentApi.approveRun(runId, decision)
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, run, text: summaryOf(run) } : m)),
      )
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'agent',
          text: err instanceof Error ? err.message : 'The decision could not be recorded.',
          tone: 'error',
          timestamp: stamp(),
        },
      ])
    }
  }

  return (
    <>
      {/* ---------------- Floating Trigger ---------------- */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              onClick={() => setIsOpen(true)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              className="group relative flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-500/40 bg-gradient-to-br from-[#17251C] via-[#213828] to-[#121E16] text-white shadow-[0_12px_32px_-6px_rgba(30,55,38,0.5)]"
              aria-label="Open Precedent AI Copilot"
            >
              <span className="absolute -right-1 -top-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage-400 opacity-75" />
                <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-sage-500" />
              </span>
              <div className="relative">
                <Bot className="h-6 w-6 text-sage-300 transition-transform duration-300 group-hover:rotate-12" />
                <Sparkles className="absolute -right-1 -top-1 h-3 w-3 animate-pulse text-sage-200" />
              </div>
              <div className="pointer-events-none absolute right-full mr-3.5 hidden items-center gap-1.5 whitespace-nowrap rounded-xl border border-line bg-white/95 px-3 py-1.5 text-xs font-bold text-ink opacity-0 shadow-lg backdrop-blur-md transition-opacity group-hover:opacity-100 sm:flex">
                <span className="h-2 w-2 animate-ping rounded-full bg-sage-500" />
                <span>Precedent AI Copilot</span>
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ---------------- Chat Window ---------------- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-50 flex h-[600px] max-h-[88vh] w-[92vw] flex-col overflow-hidden rounded-3xl border border-ink/10 bg-white/95 shadow-[0_25px_60px_-15px_rgba(15,33,56,0.25)] backdrop-blur-2xl sm:w-[430px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line bg-gradient-to-r from-[#17251C] via-[#1E3325] to-[#121E16] px-4 py-3.5 text-white">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-sage-500/30 bg-sage-500/20 text-sage-300">
                  <Bot className="h-4 w-4" />
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-sage-400" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-[13.5px] font-bold text-white">Precedent AI Copilot</h3>
                    <span className="rounded bg-sage-500/25 px-1.5 py-0.5 text-[9px] font-bold text-sage-200">
                      Live agents
                    </span>
                  </div>
                  <p className="text-[10px] text-white/60">
                    {signedIn ? `${agents.length} published agent${agents.length === 1 ? '' : 's'} · ${role === 'manager' ? 'Brand Manager' : 'Creator'}` : 'Sign in to run agents'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close Agent Chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-line bg-cream-50/70 p-1 text-xs font-semibold text-muted">
              <button
                onClick={() => setTab('chat')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-1.5 text-[11.5px] transition-all',
                  tab === 'chat' ? 'bg-white font-bold text-ink shadow-sm' : 'hover:text-ink',
                )}
              >
                <Bot className="h-3.5 w-3.5 text-brand-600" />
                <span>Copilot</span>
              </button>
              <button
                onClick={() => setTab('runs')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-1.5 text-[11.5px] transition-all',
                  tab === 'runs' ? 'bg-white font-bold text-ink shadow-sm' : 'hover:text-ink',
                )}
              >
                <Terminal className="h-3.5 w-3.5 text-brand-600" />
                <span>Run history</span>
              </button>
            </div>

            {/* Chat */}
            {tab === 'chat' && (
              <>
                <div ref={scrollRef} className="flex-1 space-y-3.5 overflow-y-auto p-4 text-xs">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        'flex max-w-[92%] flex-col',
                        m.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start',
                      )}
                    >
                      <div
                        className={cn(
                          'rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-sm',
                          m.sender === 'user'
                            ? 'rounded-br-sm bg-ink text-white'
                            : m.tone === 'error'
                              ? 'rounded-bl-sm border border-danger-200 bg-danger-50 text-danger-800'
                              : 'rounded-bl-sm border border-line bg-cream-50 text-ink',
                        )}
                      >
                        <p className="whitespace-pre-wrap text-[12px]">{m.text}</p>
                        {m.run && <RunBlock run={m.run} messageId={m.id} role={role} onDecide={decide} />}
                      </div>
                      <span className="mt-1 px-1 text-[9px] text-muted">{m.timestamp}</span>
                    </div>
                  ))}

                  {busy && (
                    <div className="flex items-center gap-2 rounded-2xl border border-line bg-cream-50 px-3 py-2 text-[10px] text-muted">
                      <Loader2 className="h-3 w-3 animate-spin text-brand-600" />
                      Running agent against workspace data…
                    </div>
                  )}
                </div>

                <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-t border-line/60 bg-cream-50/50 px-3 py-2">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => void send(p.query)}
                      disabled={busy}
                      className="shrink-0 rounded-full border border-line bg-white px-2.5 py-1 text-[10.5px] font-semibold text-ink-600 shadow-sm transition-colors hover:border-brand-400 hover:text-brand-700 disabled:opacity-50"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    void send()
                  }}
                  className="flex items-center gap-2 border-t border-line bg-white p-3"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={signedIn ? 'Ask me to review, research or check…' : 'Sign in to run agents'}
                    className="flex-1 rounded-xl border border-line bg-cream-50/60 px-3 py-2 text-[12px] text-ink outline-none transition-all placeholder:text-muted focus:border-brand-500 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || busy}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-white shadow-sm transition-opacity hover:bg-ink-800 disabled:opacity-40"
                    aria-label="Send"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </button>
                </form>
              </>
            )}

            {/* Run history */}
            {tab === 'runs' && (
              <div className="flex-1 space-y-2 overflow-y-auto p-3 text-xs">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h4 className="text-[12px] font-bold text-ink">Agent runs</h4>
                    <p className="text-[10px] text-muted">Real executions from your workspace</p>
                  </div>
                  <button
                    onClick={() => void loadRuns()}
                    disabled={runsLoading || !signedIn}
                    className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10.5px] font-bold text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-60"
                  >
                    <RefreshCw className={cn('h-3 w-3', runsLoading && 'animate-spin')} />
                    <span>{runsLoading ? 'Loading' : 'Refresh'}</span>
                  </button>
                </div>

                {!signedIn ? (
                  <p className="rounded-xl border border-line bg-cream-50 p-4 text-center text-[10.5px] text-muted">
                    Sign in to view agent runs.
                  </p>
                ) : runs.length === 0 ? (
                  <p className="rounded-xl border border-line bg-cream-50 p-4 text-center text-[10.5px] text-muted">
                    {runsLoading ? 'Loading runs…' : 'No agent runs yet. Ask the copilot to review something.'}
                  </p>
                ) : (
                  runs.map((r) => <RunRow key={r.id} run={r} />)
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
