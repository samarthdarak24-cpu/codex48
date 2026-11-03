import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  Eye,
  FileCheck,
  FileText,
  Filter,
  History,
  Layers,
  Loader2,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Wand2,
  Workflow,
  Zap,
} from 'lucide-react'
import { api } from '@/services/api'
import type { Agent, AgentRun, AgentTemplate } from '@/lib/types'
import { PromptToAgentModal } from '@/components/agents/PromptToAgentModal'
import { TestPlaygroundModal } from '@/components/agents/TestPlaygroundModal'

const CATEGORY_NAMES: Record<string, string> = {
  brand_compliance: 'Brand Compliance',
  guideline_research: 'Guideline Research',
  visual_guard: 'VisualGuard',
  exception_triage: 'Exception Triage',
  sentinel_impact: 'Sentinel Impact',
  audit_report: 'Audit & Reports',
}

export default function AgentStudioPage() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState<Agent[]>([])
  const [templates, setTemplates] = useState<AgentTemplate[]>([])
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [testingAgent, setTestingAgent] = useState<Agent | null>(null)
  const [instantiatingId, setInstantiatingId] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [fetchedAgents, fetchedTemplates, fetchedRuns] = await Promise.all([
        api.agents(),
        api.agentTemplates(),
        api.allAgentRuns({ limit: 50 }),
      ])
      setAgents(fetchedAgents)
      setTemplates(fetchedTemplates)
      setRuns(fetchedRuns)
    } catch (err) {
      console.error('Failed to load Agent Studio data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // KPI Calculations from actual DB values
  const totalAgents = agents.length
  const publishedAgents = agents.filter((a) => a.status === 'published').length
  const draftAgents = agents.filter((a) => a.status === 'draft').length
  const waitingApprovals = runs.filter((r) => r.status === 'waiting_for_approval').length
  const completedRuns = runs.filter((r) => r.status === 'completed').length
  const overallSuccessRate = runs.length > 0 ? Math.round((completedRuns / runs.length) * 100) : 100

  // Filtered Agents
  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      const matchesSearch =
        search === '' ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.description.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter
      const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter
      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [agents, search, statusFilter, categoryFilter])

  const handleInstantiateTemplate = async (templateId: string) => {
    setInstantiatingId(templateId)
    try {
      const newAgent = await api.instantiateTemplate(templateId)
      await loadData()
      navigate(`/manager/agents/${newAgent.id}/builder`)
    } catch (err) {
      console.error('Failed to instantiate template:', err)
    } finally {
      setInstantiatingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Main Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200 shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink font-serif">Agent Studio</h1>
              <p className="text-sm text-muted">
                Build, configure and automate intelligent brand governance assistants with natural language.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/manager/agent-runs"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink shadow-xs hover:bg-[#F8F6F0] transition-colors"
          >
            <History className="h-4 w-4 text-muted" />
            <span>View Executions</span>
            {waitingApprovals > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {waitingApprovals}
              </span>
            )}
          </Link>

          <button
            onClick={() => setIsPromptModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
          >
            <Wand2 className="h-4 w-4" />
            <span>Create Agent from Prompt</span>
          </button>
        </div>
      </div>

      {/* KPI Dashboard Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-2xl border border-line bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Agents</span>
            <Bot className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">{totalAgents}</p>
          <span className="text-[11px] text-muted">Custom assistants</span>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-brand-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Published</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-brand-800">{publishedAgents}</p>
          <span className="text-[11px] text-muted">Live & automated</span>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Drafts</span>
            <Workflow className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">{draftAgents}</p>
          <span className="text-[11px] text-muted">Under construction</span>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Waiting Approval</span>
            <Clock className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-800">{waitingApprovals}</p>
          <span className="text-[11px] text-muted">Manager review needed</span>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-brand-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Success Rate</span>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">{overallSuccessRate}%</p>
          <span className="text-[11px] text-muted">Across real runs</span>
        </div>
      </div>

      {/* Ready-Made Templates Shelf */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-ink font-serif">Ready-Made Agent Templates</h2>
            <p className="text-xs text-muted">Pre-wired enterprise governance pipelines with verified tool bindings.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="group flex flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-xs hover:border-brand-400 hover:shadow-md transition-all"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-[#FAF9F5] border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {CATEGORY_NAMES[tmpl.category] || tmpl.category}
                  </span>
                  <span className="text-[11px] font-mono text-muted">{tmpl.tools.length} tools</span>
                </div>
                <h3 className="text-sm font-bold text-ink group-hover:text-brand-700 transition-colors">
                  {tmpl.name}
                </h3>
                <p className="line-clamp-2 text-xs text-muted leading-relaxed">{tmpl.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] text-muted">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
                  <span>Manager Guarded</span>
                </div>
                <button
                  type="button"
                  disabled={instantiatingId === tmpl.id}
                  onClick={() => handleInstantiateTemplate(tmpl.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900"
                >
                  {instantiatingId === tmpl.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>Use Template</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Gallery Section */}
      <div className="space-y-4 pt-4 border-t border-line/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-ink font-serif">Workspace AI Agents</h2>
            <p className="text-xs text-muted">Configured brand assistants active in your workspace.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search agents..."
                className="rounded-xl border border-line bg-white pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none w-48"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
              <option value="paused">Paused</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="brand_compliance">Brand Compliance</option>
              <option value="guideline_research">Guideline Research</option>
              <option value="visual_guard">VisualGuard</option>
              <option value="exception_triage">Exception Triage</option>
              <option value="sentinel_impact">Sentinel Impact</option>
              <option value="audit_report">Audit & Reports</option>
            </select>
          </div>
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white p-8 text-center">
            <Bot className="h-10 w-10 text-muted/40 mb-2" />
            <h3 className="text-sm font-bold text-ink">No Agents Found</h3>
            <p className="mt-1 max-w-sm text-xs text-muted">
              {search || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your search filters.'
                : 'Get started by creating your first AI brand assistant from a natural language prompt.'}
            </p>
            <button
              onClick={() => setIsPromptModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Your First Agent</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className="group flex flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-xs hover:border-brand-400 hover:shadow-md transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        agent.status === 'published'
                          ? 'bg-brand-50 text-brand-700 border border-brand-200'
                          : agent.status === 'paused'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-muted/15 text-muted border border-muted/30'
                      }`}
                    >
                      {agent.status} (v{agent.current_version})
                    </span>
                    <span className="text-[11px] font-mono text-muted">
                      {CATEGORY_NAMES[agent.category] || agent.category}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-ink group-hover:text-brand-700 transition-colors">
                      {agent.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted leading-relaxed">
                      {agent.description || 'Custom brand assistant.'}
                    </p>
                  </div>

                  {/* Tools preview pills */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {agent.tools.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="rounded bg-[#FAF8F2] px-2 py-0.5 font-mono text-[10px] text-ink-600 border border-line/60"
                      >
                        {t}
                      </span>
                    ))}
                    {agent.tools.length > 3 && (
                      <span className="rounded bg-[#FAF8F2] px-1.5 py-0.5 text-[10px] text-muted border border-line/60">
                        +{agent.tools.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Run Stats */}
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] border-t border-line/60">
                    <div>
                      <span className="text-muted">Total Runs:</span>{' '}
                      <span className="font-semibold text-ink">{agent.total_runs}</span>
                    </div>
                    <div>
                      <span className="text-muted">Success:</span>{' '}
                      <span className="font-semibold text-brand-700">{agent.success_rate}%</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setTestingAgent(agent)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-[#FAF8F2] transition-colors"
                  >
                    <Play className="h-3 w-3 fill-brand-600 text-brand-600" />
                    <span>Test</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/manager/agents/${agent.id}`}
                      className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-[#FAF8F2] transition-colors"
                    >
                      Details
                    </Link>
                    <Link
                      to={`/manager/agents/${agent.id}/builder`}
                      className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 transition-colors"
                    >
                      <Workflow className="h-3 w-3" />
                      <span>Visual Editor</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prompt-to-Agent Creation Modal */}
      <PromptToAgentModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        onCreated={() => loadData()}
      />

      {/* Test Playground Modal */}
      {testingAgent && (
        <TestPlaygroundModal
          isOpen={!!testingAgent}
          agent={testingAgent}
          onClose={() => setTestingAgent(null)}
          onPublish={async () => {
            await api.publishAgent(testingAgent.id)
            setTestingAgent(null)
            loadData()
          }}
        />
      )}
    </div>
  )
}
