import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Database,
  Lock,
  Play,
  Send,
  Sparkles,
} from 'lucide-react'
import { agentApi } from '@/services/api'
import type { AgentDetail, AgentRun, AgentSummary } from '@/lib/agentTypes'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Textarea } from '@/components/ui/Field'
import { cn } from '@/lib/utils'
import { EASE } from '@/v2/components/motion'
import {
  AgentGlyph,
  AgentStatusPill,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  Panel,
  PanelHeader,
  categoryLabel,
  formatRelative,
} from './shared'
import { JsonPanel, RunTimeline } from './RunTimeline'

export default function CreatorAssistantsPage() {
  const { agentId } = useParams()
  const navigate = useNavigate()

  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(agentId ?? null)
  const [detail, setDetail] = useState<AgentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await agentApi.list({ status: 'published' })
      setAgents(data)
      if (!selectedId && data.length > 0) setSelectedId(data[0].id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your assistants')
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    agentApi
      .get(selectedId)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the assistant')
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId])

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-2xs font-semibold text-brand-700">
            <Sparkles className="h-3 w-3" />
            Agent Studio
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-ink">My AI Assistants</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
            Published assistants your Brand Manager has made available to the content team.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/creator/dashboard')}>
          Back to dashboard
        </Button>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorBlock message={error} onRetry={load} />
        </div>
      )}

      {loading ? (
        <Panel className="mt-6">
          <LoadingBlock label="Loading assistants…" />
        </Panel>
      ) : agents.length === 0 ? (
        <Panel className="mt-6">
          <EmptyState
            title="No assistants published yet"
            body="Your Brand Manager can publish an agent from Agent Studio. Published assistants appear here automatically."
            icon={<Bot className="h-5 w-5" />}
          />
        </Panel>
      ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-12">
          <div className="space-y-2 xl:col-span-4">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => {
                  setSelectedId(agent.id)
                  navigate(`/creator/ai-assistants/${agent.id}`, { replace: true })
                }}
                className={cn(
                  'w-full rounded-2xl border bg-white p-3.5 text-left shadow-card transition-all hover:border-brand-300',
                  selectedId === agent.id ? 'border-brand-400 ring-2 ring-brand-500/15' : 'border-line',
                )}
              >
                <div className="flex items-start gap-3">
                  <AgentGlyph icon={agent.icon} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-ink">{agent.name}</p>
                      <AgentStatusPill status={agent.status} />
                    </div>
                    <p className="mt-0.5 text-2xs text-muted">{categoryLabel(agent.category)}</p>
                    <p className="mt-1.5 line-clamp-2 text-2xs leading-relaxed text-ink-600">{agent.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        {agent.toolCount} tools
                      </span>
                      <span>Last used {formatRelative(agent.lastRunAt)}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="xl:col-span-8">
            <AnimatePresence mode="wait">
              {detailLoading ? (
                <Panel key="loading">
                  <LoadingBlock label="Loading assistant…" />
                </Panel>
              ) : detail ? (
                <motion.div
                  key={detail.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: EASE }}
                >
                  <AssistantRunner agent={detail} />
                </motion.div>
              ) : (
                <Panel>
                  <EmptyState title="Select an assistant" body="Choose an assistant to see what it does and run it." icon={<Bot className="h-5 w-5" />} />
                </Panel>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}

function AssistantRunner({ agent }: { agent: AgentDetail }) {
  const [submissionId, setSubmissionId] = useState('')
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [run, setRun] = useState<AgentRun | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const properties = (agent.version.spec.input_schema?.properties as Record<string, unknown> | undefined) ?? {}
  const wantsSubmission = 'submission_id' in properties || agent.version.tools.some((t) => t.id === 'get_submission')
  const wantsQuery = 'query' in properties

  const execute = async () => {
    setBusy(true)
    setError(null)
    try {
      const input: Record<string, unknown> = {}
      if (submissionId.trim()) input.submission_id = submissionId.trim()
      if (query.trim()) input.query = query.trim()
      if (message.trim()) input.text = message.trim()
      const result = await agentApi.execute(agent.id, input, 'manual')
      setRun(result.run)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The assistant could not run')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
          <AgentGlyph icon={agent.icon} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-ink">{agent.name}</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{agent.description}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {agent.version.tools.map((tool) => (
                <span
                  key={tool.id}
                  className="inline-flex items-center gap-1 rounded-full bg-cream-100 px-2 py-0.5 text-[10px] text-ink-600"
                >
                  {tool.name}
                  {tool.approvalRequired && <Lock className="h-2.5 w-2.5 text-warn-600" />}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-line bg-cream-50/60 px-4 py-2.5 text-[10.5px] leading-relaxed text-muted">
          <span className="inline-flex items-center gap-1 font-semibold text-ink-600">
            <CheckCircle2 className="h-3 w-3 text-success-500" />
            Read-only assistant.
          </span>{' '}
          It can retrieve data and prepare recommendations. It cannot approve, reject, publish or change official
          records — those decisions stay with your Brand Manager.
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Run this assistant" icon={<Play className="h-4 w-4" />} />
          <div className="space-y-3 px-4 py-4">
            {wantsSubmission && (
              <div>
                <label className="mb-1 block text-2xs font-semibold text-ink-700">Submission ID</label>
                <Input
                  value={submissionId}
                  onChange={(e) => setSubmissionId(e.target.value)}
                  placeholder="sub_…"
                  className="font-mono text-xs"
                />
              </div>
            )}
            {wantsQuery && (
              <div>
                <label className="mb-1 block text-2xs font-semibold text-ink-700">Question</label>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What would you like to know?"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-700">Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Add context…"
              />
            </div>
            {error && (
              <div className="rounded-lg border border-danger-200 bg-danger-50 px-2.5 py-2 text-2xs text-danger-700">
                {error}
              </div>
            )}
            <Button onClick={execute} disabled={busy}>
              {busy ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Running…
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Run assistant
                </>
              )}
            </Button>
          </div>
        </Panel>

        <div>
          {run ? (
            <RunTimeline run={run} />
          ) : (
            <Panel>
              <PanelHeader title="Result" icon={<ArrowRight className="h-4 w-4" />} />
              <div className="px-4 py-8 text-center text-xs text-muted">
                Run the assistant to see its result and execution steps.
              </div>
            </Panel>
          )}
        </div>
      </div>

      {run?.output && <JsonPanel title="Assistant output" value={run.output} defaultOpen />}
    </div>
  )
}
