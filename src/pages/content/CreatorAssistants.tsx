import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  Loader2,
  Play,
  Search,
  Sparkles,
} from 'lucide-react'
import { api } from '@/services/api'
import type { Agent, AgentRun, Submission } from '@/lib/types'

export default function CreatorAssistantsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedSubId, setSelectedSubId] = useState<string>('')
  const [queryText, setQueryText] = useState('')
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<AgentRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const [fetchedAgents, fetchedSubs] = await Promise.all([
          api.agents(),
          api.submissions(),
        ])
        setAgents(fetchedAgents)
        setSubmissions(fetchedSubs)
        if (fetchedAgents.length > 0) setSelectedAgent(fetchedAgents[0])
        if (fetchedSubs.length > 0) setSelectedSubId(fetchedSubs[0].id)
      } catch (err) {
        console.error('Failed to load creator assistants:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleExecute = async () => {
    if (!selectedAgent) return
    setRunning(true)
    setError(null)
    setRunResult(null)
    try {
      const payload: any = {}
      if (selectedSubId) payload.submission_id = selectedSubId
      if (queryText.trim()) {
        payload.query = queryText
        payload.prompt = queryText
      }
      const res = await api.executeAgent(selectedAgent.id, payload)
      setRunResult(res)
    } catch (err: any) {
      setError(err?.message || 'Failed to execute assistant.')
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink font-serif">My AI Assistants</h1>
            <p className="text-sm text-muted">
              Authorised AI brand governance tools to pre-check copy, analyze guidelines, and verify claims.
            </p>
          </div>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center text-muted">
          <Bot className="h-10 w-10 text-muted/40 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-ink">No Published Assistants Available</h3>
          <p className="mt-1 text-xs text-muted">
            Your Brand Manager has not published any assistants for creators yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Assistant Selector */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Select Assistant</span>
            <div className="space-y-2">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => {
                    setSelectedAgent(agent)
                    setRunResult(null)
                  }}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    selectedAgent?.id === agent.id
                      ? 'border-brand-500 bg-brand-50/60 shadow-sm'
                      : 'border-line bg-white hover:bg-[#FAF9F5]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-ink">{agent.name}</h3>
                    <span className="rounded bg-[#FAF8F2] px-1.5 py-0.5 text-[9px] font-mono text-muted border border-line">
                      {agent.tools.length} tools
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted leading-relaxed">{agent.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Interaction Canvas (2 Columns) */}
          <div className="md:col-span-2 space-y-5">
            {selectedAgent && (
              <div className="rounded-2xl border border-line bg-white p-6 shadow-xs space-y-4">
                <div>
                  <h2 className="text-base font-bold text-ink">{selectedAgent.name}</h2>
                  <p className="text-xs text-muted mt-0.5">{selectedAgent.description}</p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink">Target Marketing Submission</label>
                    <select
                      value={selectedSubId}
                      onChange={(e) => setSelectedSubId(e.target.value)}
                      className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:border-brand-500 focus:outline-none"
                    >
                      <option value="">-- No Submission (Freeform Query) --</option>
                      {submissions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title} ({s.channel}) — {s.status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink">Additional Notes / Question</label>
                    <textarea
                      rows={3}
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      placeholder="Optional question or ad copy excerpt..."
                      className="w-full rounded-xl border border-line bg-white p-3 text-xs text-ink placeholder:text-muted/60 focus:border-brand-500 focus:outline-none resize-none"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={running}
                      onClick={handleExecute}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-all"
                    >
                      {running ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Running Assistant...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 fill-white" />
                          <span>Run Assistant</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Output Panel */}
                {runResult && (
                  <div className="mt-4 pt-4 border-t border-line space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink uppercase tracking-wider">Assistant Guidance</span>
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 border border-brand-200">
                        {runResult.status} ({runResult.duration_ms}ms)
                      </span>
                    </div>

                    {runResult.outputs && (
                      <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 space-y-2 text-xs">
                        {runResult.outputs.synthesis ? (
                          <p className="text-xs text-ink/90 whitespace-pre-line leading-relaxed">
                            {runResult.outputs.synthesis}
                          </p>
                        ) : (
                          <pre className="text-[11px] font-mono text-ink overflow-x-auto">
                            {JSON.stringify(runResult.outputs, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

