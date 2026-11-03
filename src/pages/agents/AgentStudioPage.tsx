import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Layers,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Workflow,
  X,
} from 'lucide-react'
import { agentApi } from '@/services/api'
import type {
  AgentDetail,
  AgentStats,
  AgentSummary,
  AgentTemplate,
  DraftFromPromptResponse,
} from '@/lib/agentTypes'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select, Textarea, SearchInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Misc'
import { EASE } from '@/v2/components/motion'
import {
  AgentGlyph,
  AgentStatusPill,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  Panel,
  categoryLabel,
  formatRelative,
} from './shared'

const EXAMPLES = [
  'Create an agent that reviews marketing submissions against our brand guidelines and identifies unsupported claims.',
  'Create an agent that monitors expired exceptions and identifies affected approved content.',
  'Create an agent that searches brand guidelines and answers questions with exact document references.',
  'Create an agent that generates a weekly brand compliance report from real submission data.',
  'Create an agent that checks uploaded posters, extracts text and identifies possible visual branding problems.',
]

const CATEGORIES = [
  { value: 'brand_compliance', label: 'Brand compliance' },
  { value: 'guideline_research', label: 'Guideline research' },
  { value: 'visual_review', label: 'Visual review' },
  { value: 'exceptions', label: 'Exceptions' },
  { value: 'sentinel', label: 'Sentinel' },
  { value: 'audit', label: 'Audit & reporting' },
]

const STAT_META = [
  { key: 'totalAgents', label: 'Total agents', icon: Bot, tone: 'bg-brand-50 text-brand-700' },
  { key: 'publishedAgents', label: 'Published', icon: CheckCircle2, tone: 'bg-success-50 text-success-700' },
  { key: 'draftAgents', label: 'Drafts', icon: FileText, tone: 'bg-cream-100 text-ink-700' },
  { key: 'activeExecutions', label: 'Active executions', icon: Activity, tone: 'bg-sage-50 text-sage-700' },
  { key: 'failedExecutions', label: 'Failed executions', icon: AlertTriangle, tone: 'bg-danger-50 text-danger-700' },
] as const

export default function AgentStudioPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<AgentStats | null>(null)
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [templates, setTemplates] = useState<AgentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState<'updated' | 'name' | 'success' | 'runs'>('updated')

  const [createOpen, setCreateOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsData, agentData, templateData] = await Promise.all([
        agentApi.stats(),
        agentApi.list(),
        agentApi.templates(),
      ])
      setStats(statsData)
      setAgents(agentData)
      setTemplates(templateData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Agent Studio')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    let rows = [...agents]
    if (query.trim()) {
      const needle = query.toLowerCase()
      rows = rows.filter(
        (a) =>
          a.name.toLowerCase().includes(needle) ||
          a.description.toLowerCase().includes(needle) ||
          a.ownerName.toLowerCase().includes(needle),
      )
    }
    if (status) rows = rows.filter((a) => a.status === status)
    if (category) rows = rows.filter((a) => a.category === category)
    if (sort === 'name') rows.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'success') rows.sort((a, b) => (b.successRate ?? -1) - (a.successRate ?? -1))
    else if (sort === 'runs') rows.sort((a, b) => b.totalRuns - a.totalRuns)
    else rows.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
    return rows
  }, [agents, query, status, category, sort])

  const handleCreated = (result: DraftFromPromptResponse, destination: 'builder' | 'detail') => {
    setCreateOpen(false)
    setTemplatesOpen(false)
    const id = result.agent.id
    navigate(destination === 'builder' ? `/manager/agents/${id}/builder` : `/manager/agents/${id}`)
  }

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-2xs font-semibold text-brand-700">
            <Sparkles className="h-3 w-3" />
            Agent Studio
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-ink">Agent Studio</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
            Build, configure and automate intelligent brand governance assistants.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setTemplatesOpen(true)}>
            <Layers className="h-4 w-4" />
            Browse templates
          </Button>
          <Button variant="outline" onClick={() => navigate('/manager/agent-executions')}>
            <Activity className="h-4 w-4" />
            View executions
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create agent
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-5">
          <ErrorBlock message={error} onRetry={load} />
        </div>
      )}

      {/* Stats */}
      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STAT_META.map((meta, index) => {
          const Icon = meta.icon
          const value = stats ? (stats[meta.key] as number) : 0
          return (
            <motion.div
              key={meta.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04, ease: EASE }}
              className="rounded-2xl border border-line bg-white p-4 shadow-card"
            >
              <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${meta.tone}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-muted">{meta.label}</p>
              <p className="mt-0.5 text-2xl font-semibold tracking-[-0.02em] text-ink">
                {stats ? value : '—'}
              </p>
            </motion.div>
          )
        })}
      </section>

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-2 lg:flex-row lg:items-center">
        <SearchInput value={query} onChange={setQuery} placeholder="Search agents by name, description or owner…" />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-[34px] w-auto min-w-[130px]">
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="h-[34px] w-auto min-w-[150px]">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-[34px] w-auto min-w-[150px]">
            <option value="updated">Recently updated</option>
            <option value="name">Name A–Z</option>
            <option value="success">Success rate</option>
            <option value="runs">Most executions</option>
          </Select>
        </div>
      </div>

      {/* Gallery */}
      <div className="mt-4">
        {loading ? (
          <Panel>
            <LoadingBlock label="Loading agents…" />
          </Panel>
        ) : filtered.length === 0 ? (
          <Panel>
            <EmptyState
              title={agents.length === 0 ? 'No agents yet' : 'No agents match these filters'}
              body={
                agents.length === 0
                  ? 'Describe an assistant in plain English and Agent Studio will generate a configurable, testable agent.'
                  : 'Try clearing the search or choosing a different status or category.'
              }
              icon={<Bot className="h-5 w-5" />}
              action={
                agents.length === 0 ? (
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Create your first agent
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuery('')
                      setStatus('')
                      setCategory('')
                    }}
                  >
                    Clear filters
                  </Button>
                )
              }
            />
          </Panel>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((agent, index) => (
                <motion.article
                  key={agent.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.2), ease: EASE }}
                  className="group flex flex-col rounded-2xl border border-line bg-white p-4 shadow-card transition-all hover:-translate-y-[1px] hover:border-brand-300 hover:shadow-lift"
                >
                  <div className="flex items-start gap-3">
                    <AgentGlyph icon={agent.icon} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold text-ink">{agent.name}</h3>
                        <AgentStatusPill status={agent.status} />
                      </div>
                      <p className="mt-0.5 text-2xs text-muted">
                        {categoryLabel(agent.category)} · {agent.ownerName}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 min-h-[34px] text-xs leading-[17px] text-ink-600">
                    {agent.description || 'No description yet.'}
                  </p>

                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-cream-50 px-2.5 py-2 text-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-light">Tools</p>
                      <p className="text-xs font-semibold text-ink">{agent.toolCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-light">Success</p>
                      <p className="text-xs font-semibold text-ink">
                        {agent.successRate == null ? '—' : `${agent.successRate}%`}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-light">Runs</p>
                      <p className="text-xs font-semibold text-ink">{agent.totalRuns}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
                    <span className="inline-flex items-center gap-1 text-2xs text-muted">
                      <Clock className="h-3 w-3" />
                      {formatRelative(agent.lastRunAt)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/manager/agents/${agent.id}`)}>
                        Open
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/manager/agents/${agent.id}/builder`)}>
                        <Workflow className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <CreateAgentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <TemplatesModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        templates={templates}
        onCreated={handleCreated}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Create from prompt                                                  */
/* ------------------------------------------------------------------ */

function CreateAgentModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (result: DraftFromPromptResponse, destination: 'builder' | 'detail') => void
}) {
  const [prompt, setPrompt] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<DraftFromPromptResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    if (!open) {
      setPrompt('')
      setCategory('')
      setBrand('')
      setGenerating(false)
      setResult(null)
      setError(null)
      setPublishing(false)
    }
  }, [open])

  const generate = async () => {
    if (prompt.trim().length < 8) {
      setError('Describe the agent in at least a sentence.')
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const response = await agentApi.draftFromPrompt(prompt.trim(), category || undefined, brand || undefined)
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the agent')
    } finally {
      setGenerating(false)
    }
  }

  const publish = async () => {
    if (!result) return
    setPublishing(true)
    setError(null)
    try {
      await agentApi.publish(result.agent.id)
      onCreated(result, 'detail')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publishing failed')
    } finally {
      setPublishing(false)
    }
  }

  const discard = async () => {
    if (!result) {
      onClose()
      return
    }
    try {
      await agentApi.remove(result.agent.id)
    } catch {
      /* the draft may already be gone — closing is still correct */
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={result ? 'Review generated agent' : 'Create an agent from a prompt'}
      description={
        result
          ? 'The configuration below was generated, validated and saved as a draft. You can edit everything.'
          : 'Describe what you want your AI agent to do. Agent Studio turns it into a validated configuration and workflow.'
      }
      width="max-w-3xl"
      footer={
        result ? (
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" onClick={discard}>
              <Trash2 className="h-4 w-4" />
              Discard draft
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => onCreated(result, 'builder')}>
                <Workflow className="h-4 w-4" />
                Edit workflow
              </Button>
              <Button variant="outline" onClick={() => onCreated(result, 'detail')}>
                Save draft
              </Button>
              <Button onClick={publish} disabled={publishing}>
                {publishing ? 'Publishing…' : 'Publish agent'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={generate} disabled={generating || prompt.trim().length < 8}>
              {generating ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate agent
                </>
              )}
            </Button>
          </div>
        )
      }
    >
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-danger-200 bg-danger-50 px-3 py-2.5 text-xs text-danger-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="space-y-4"
          >
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="agent-prompt" className="text-xs font-semibold text-ink-700">
                  Describe your agent
                </label>
                <span className="text-2xs text-muted-light">{prompt.length}/4000</span>
              </div>
              <Textarea
                id="agent-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 4000))}
                rows={6}
                placeholder="Describe what you want your AI agent to do…"
                className="min-h-[140px] text-sm leading-relaxed"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-700">Category</label>
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Auto-detect</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-700">Brand / workspace</label>
                <Input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Use my current workspace"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-muted">
                <Sparkles className="h-3 w-3" />
                Try an example
              </p>
              <div className="space-y-1.5">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setPrompt(example)}
                    className="flex w-full items-start gap-2 rounded-xl border border-line bg-cream-50/60 px-3 py-2 text-left text-xs leading-relaxed text-ink-600 transition-colors hover:border-brand-300 hover:bg-brand-50/60 hover:text-ink"
                  >
                    <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-brand-500" />
                    <span>{example}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-cream-50 px-3 py-2.5 text-2xs leading-relaxed text-muted">
              <span className="font-semibold text-ink-600">Safety:</span> agents can read governance data and
              prepare drafts. They cannot approve, reject, publish content or change official rules. Protected
              write actions pause for a Brand Manager.
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="space-y-4"
          >
            <div className="flex items-start gap-3 rounded-2xl border border-line bg-cream-50/70 p-4">
              <AgentGlyph icon={result.spec.icon} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-md font-semibold text-ink">{result.spec.name}</h3>
                  <Badge tone={result.generation.generatedBy === 'llm' ? 'brand' : 'neutral'} size="sm">
                    {result.generation.generatedBy === 'llm' ? 'LLM generated' : 'Deterministic router'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-600">{result.spec.description}</p>
                <p className="mt-1.5 text-2xs text-muted">
                  {categoryLabel(result.spec.category)} · {result.spec.tools.length} tools ·{' '}
                  {result.spec.workflow.nodes.length} nodes
                </p>
              </div>
            </div>

            {result.generation.notes.length > 0 && (
              <div className="rounded-xl border border-warn-200 bg-warn-50 px-3 py-2.5 text-2xs leading-relaxed text-warn-700">
                {result.generation.notes.map((note) => (
                  <p key={note}>• {note}</p>
                ))}
              </div>
            )}

            {result.validation.errors.length > 0 && (
              <div className="rounded-xl border border-danger-200 bg-danger-50 px-3 py-2.5 text-2xs text-danger-700">
                <p className="font-semibold">Validation errors</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  {result.validation.errors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line p-3">
                <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted">Instructions</p>
                <p className="max-h-28 overflow-y-auto text-xs leading-relaxed text-ink-600">
                  {result.spec.instructions}
                </p>
              </div>
              <div className="rounded-xl border border-line p-3">
                <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted">Selected tools</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.spec.tools.map((tool) => (
                    <span
                      key={tool}
                      className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700 ring-1 ring-inset ring-brand-100"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <PreviewTile label="Expected input" value={summariseSchema(result.spec.input_schema)} />
              <PreviewTile label="Expected output" value={summariseSchema(result.spec.output_schema)} />
              <PreviewTile
                label="Memory"
                value={
                  result.spec.memory.enabled
                    ? `${result.spec.memory.scope} memory`
                    : 'Disabled'
                }
              />
            </div>

            <div className="rounded-xl border border-line p-3">
              <p className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-muted">
                <Workflow className="h-3 w-3" />
                Workflow
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {result.spec.workflow.nodes.map((node, index) => (
                  <span key={node.id} className="inline-flex items-center gap-1.5">
                    <span className="rounded-lg border border-line bg-white px-2 py-1 text-[10px] font-medium text-ink-600">
                      {node.data.label}
                    </span>
                    {index < result.spec.workflow.nodes.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-muted-light" />
                    )}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2.5 text-2xs leading-relaxed text-brand-800">
              <span className="font-semibold">Permissions:</span>{' '}
              {result.spec.approval_policy.human_approval_required_for_write_actions
                ? 'Human approval is required for every protected write action.'
                : 'No write approval configured.'}{' '}
              Execution is capped at {result.spec.execution_limits.max_steps} steps and{' '}
              {result.spec.execution_limits.timeout_seconds}s.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}

function PreviewTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="text-xs leading-relaxed text-ink-600">{value}</p>
    </div>
  )
}

function summariseSchema(schema: Record<string, unknown>): string {
  const properties = schema?.properties as Record<string, unknown> | undefined
  if (!properties || Object.keys(properties).length === 0) return 'Open / not specified'
  return Object.keys(properties).join(', ')
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

function TemplatesModal({
  open,
  onClose,
  templates,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  templates: AgentTemplate[]
  onCreated: (result: DraftFromPromptResponse, destination: 'builder' | 'detail') => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const useTemplate = async (template: AgentTemplate) => {
    setBusy(template.id)
    setError(null)
    try {
      const result = await agentApi.fromTemplate(template.id)
      onCreated(result, 'builder')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the agent from this template')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Agent template library"
      description="Every template is wired to real backend tools. Choose one and edit it in the workflow builder."
      width="max-w-4xl"
      footer={
        <div className="flex w-full justify-end">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {error && <div className="mb-3 rounded-xl border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((template) => (
          <div key={template.id} className="flex flex-col rounded-2xl border border-line p-4">
            <div className="flex items-start gap-3">
              <AgentGlyph icon={template.icon} />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-ink">{template.name}</h3>
                <p className="text-2xs text-muted">{categoryLabel(template.category)}</p>
              </div>
            </div>
            <p className="mt-2.5 flex-1 text-xs leading-relaxed text-ink-600">{template.description}</p>
            <div className="mt-2.5 flex flex-wrap gap-1">
              {template.tools.slice(0, 4).map((tool) => (
                <span key={tool.id} className="rounded-full bg-cream-100 px-1.5 py-0.5 text-[10px] text-ink-600">
                  {tool.name}
                </span>
              ))}
              {template.tools.length > 4 && (
                <span className="rounded-full bg-cream-100 px-1.5 py-0.5 text-[10px] text-ink-600">
                  +{template.tools.length - 4}
                </span>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
              <span className="text-[10px] text-muted">
                {template.triggerLabel} → {template.outputLabel}
              </span>
              <Button size="sm" onClick={() => useTemplate(template)} disabled={busy !== null}>
                {busy === template.id ? 'Creating…' : 'Use template'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
