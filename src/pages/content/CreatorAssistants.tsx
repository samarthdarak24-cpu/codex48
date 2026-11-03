import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  FileText,
  Info,
  Loader2,
  Play,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/components/ui/Toast'
import type { Agent, AgentRun, Submission } from '@/lib/types'

interface ExamplePrompt {
  category: string
  label: string
  prompt: string
}

const PROMPT_SUGGESTIONS: Record<string, ExamplePrompt[]> = {
  // Brand Compliance Reviewer
  'ag-brand_compliance_r': [
    {
      category: 'Claims Verification',
      label: 'Check Product Claims',
      prompt: 'Verify all product efficacy statements, clinical results, and superlatives in this copy against our approved claims list.',
    },
    {
      category: 'Tone of Voice',
      label: 'Tone & Forbidden Words',
      prompt: 'Review this copy for unapproved absolute claims (e.g. 100% cure, miracle) and ensure the tone reflects our sophisticated brand voice.',
    },
    {
      category: 'Visual Identity',
      label: 'Color & Contrast Rules',
      prompt: 'Check whether the asset background colour palette strictly follows our primary emerald green and approved neutrals.',
    },
    {
      category: 'Legal Disclaimers',
      label: 'Statutory Disclaimers',
      prompt: 'Confirm that all requisite promotional disclaimers, asterisks, and regulatory safety qualifiers are present.',
    },
  ],
  // Guideline Research Assistant
  'ag-guideline_research': [
    {
      category: 'Claims & Evidence',
      label: 'Clinical Testimonials',
      prompt: 'What are the exact guideline requirements and verbatim passages governing customer testimonials and clinical comparison charts?',
    },
    {
      category: 'Sustainability',
      label: 'Eco-Friendly Statements',
      prompt: 'Find verbatim guideline passages on sustainability certifications, recyclable packaging, and cruelty-free claims.',
    },
    {
      category: 'Brand Visuals',
      label: 'Logo Clear Space',
      prompt: 'What are the minimum clear space and margin breathing room rules when placing our master shield logo on social campaign cards?',
    },
    {
      category: 'Influencer Rules',
      label: 'Sponsored Endorsements',
      prompt: 'Search brand documentation for required disclosure tags (#Ad, #Sponsored) and tone requirements for creator partnerships.',
    },
  ],
  // Audit Report Assistant
  'ag-audit_report_assis': [
    {
      category: 'Executive Summary',
      label: 'Campaign Audit Report',
      prompt: 'Summarize brand governance activity, approvals vs rejections, and review turnaround times for this campaign.',
    },
    {
      category: 'Policy Trends',
      label: 'Top Violated Rules',
      prompt: 'Generate an audit breakdown of the most frequently violated rules across all marketing channels this month.',
    },
    {
      category: 'Exceptions',
      label: 'Active Exemption Logs',
      prompt: 'Show all recorded policy exceptions, approved scopes, and upcoming expiration dates requiring reassessment.',
    },
    {
      category: 'Audit Trail',
      label: 'SHA-256 Trail Export',
      prompt: 'Prepare an executive compliance health summary verifying immutable audit logging for upcoming leadership review.',
    },
  ],
}

const DEFAULT_EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    category: 'Brand Rules',
    label: 'Full Governance Check',
    prompt: 'Evaluate this submission against all active brand rules and highlight any non-compliant copy or visual elements.',
  },
  {
    category: 'Claims',
    label: 'Substantiate Statements',
    prompt: 'Verify that every statement in this creative can be substantiated with recorded brand guidelines and approved claims.',
  },
  {
    category: 'Tone of Voice',
    label: 'Tone Alignment',
    prompt: 'Ensure writing style, terminology, and messaging adhere to our core brand values and communication standards.',
  },
]

export default function CreatorAssistantsPage() {
  const toast = useToast()
  const [agents, setAgents] = useState<Agent[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedSubId, setSelectedSubId] = useState<string>('')
  const [queryText, setQueryText] = useState('')
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<AgentRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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
      const trimmedQuery = queryText.trim()
      const payload: any = {
        trigger_type: 'manual',
        submission_id: selectedSubId || undefined,
        query: trimmedQuery || undefined,
        prompt: trimmedQuery || undefined,
        inputs: {
          submission_id: selectedSubId || undefined,
          query: trimmedQuery || undefined,
          prompt: trimmedQuery || undefined,
        },
      }
      const res = await api.executeAgent(selectedAgent.id, payload)
      setRunResult(res)
      if (res.status === 'failed') {
        setError(res.error || 'Execution encountered an issue. See details below.')
      } else if (res.status === 'waiting_for_approval') {
        toast.info(
          'Staged for Manager Approval',
          'Assistant completed compliance checks and staged a review draft for Brand Manager sign-off.'
        )
      } else {
        toast.success('Assistant check completed', 'Comprehensive guidance synthesized below.')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to execute assistant.')
      toast.error('Execution Failed', err?.message || 'Could not execute AI assistant.')
    } finally {
      setRunning(false)
    }
  }

  const handleCopyGuidance = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard', 'Assistant guidance copied.')
    setTimeout(() => setCopied(false), 2000)
  }

  const promptExamples = selectedAgent
    ? PROMPT_SUGGESTIONS[selectedAgent.id] ||
      (selectedAgent.slug && PROMPT_SUGGESTIONS[selectedAgent.slug]) ||
      (selectedAgent.name.toLowerCase().includes('research')
        ? PROMPT_SUGGESTIONS['ag-guideline_research']
        : selectedAgent.name.toLowerCase().includes('audit')
        ? PROMPT_SUGGESTIONS['ag-audit_report_assis']
        : PROMPT_SUGGESTIONS['ag-brand_compliance_r']) ||
      DEFAULT_EXAMPLE_PROMPTS
    : DEFAULT_EXAMPLE_PROMPTS

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
                    setError(null)
                  }}
                  className={`w-full text-left rounded-xl border p-4 transition-all cursor-pointer ${
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
              <div className="rounded-2xl border border-line bg-white p-6 shadow-xs space-y-5">
                <div>
                  <h2 className="text-base font-bold text-ink">{selectedAgent.name}</h2>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">{selectedAgent.description}</p>
                </div>

                <div className="space-y-4">
                  {/* Target Marketing Submission */}
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

                  {/* Prompt Examples Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-brand-600" />
                        Prompt Examples for this Assistant
                      </label>
                      <span className="text-[11px] text-muted">Click any prompt to autofill</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {promptExamples.map((ex) => {
                        const isSelected = queryText === ex.prompt
                        return (
                          <button
                            key={ex.label}
                            type="button"
                            onClick={() => setQueryText(ex.prompt)}
                            title={ex.prompt}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-2xs font-medium transition-all text-left cursor-pointer ${
                              isSelected
                                ? 'border-brand-500 bg-brand-50 text-brand-900 shadow-2xs font-semibold ring-1 ring-brand-400'
                                : 'border-line bg-stone-50/70 text-ink hover:border-brand-300 hover:bg-white'
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />
                            <span>{ex.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Additional Notes / Question Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink">
                      Inquiry / Ad Copy Notes
                    </label>
                    <textarea
                      rows={3}
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      placeholder="e.g. Verify product claims, or choose an example above..."
                      className="w-full rounded-xl border border-line bg-white p-3 text-xs text-ink placeholder:text-muted/60 focus:border-brand-500 focus:outline-none resize-none"
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Execution Alert:</span>
                        <span>{error}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    {queryText && (
                      <button
                        type="button"
                        onClick={() => setQueryText('')}
                        className="text-xs text-muted hover:text-ink transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Clear prompt
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={running}
                      onClick={handleExecute}
                      className="ml-auto inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-all cursor-pointer"
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

                {/* Output Guidance Panel */}
                {runResult && (
                  <div className="mt-6 pt-5 border-t border-line space-y-4 animate-in fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink uppercase tracking-wider">
                          Assistant Guidance
                        </span>
                        {runResult.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Completed ({runResult.duration_ms || 120}ms)
                          </span>
                        )}
                        {runResult.status === 'waiting_for_approval' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                            <ShieldAlert className="h-3 w-3 text-amber-600" />
                            Staged for Manager Approval
                          </span>
                        )}
                        {runResult.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-800 border border-red-200">
                            <AlertTriangle className="h-3 w-3 text-red-600" />
                            Failed ({runResult.duration_ms || 0}ms)
                          </span>
                        )}
                      </div>

                      {runResult.outputs?.synthesis && (
                        <button
                          type="button"
                          onClick={() => handleCopyGuidance(runResult.outputs.synthesis)}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-2xs font-semibold text-ink hover:bg-stone-50 transition-colors cursor-pointer"
                        >
                          {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          <span>{copied ? 'Copied' : 'Copy Guidance'}</span>
                        </button>
                      )}
                    </div>

                    {runResult.status === 'waiting_for_approval' && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                        <Info className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                        <div>
                          <span className="font-semibold block">Workflow Reached Manager Approval Point</span>
                          <span>
                            The assistant completed all deterministic checks and staged a review draft for Brand Manager sign-off. The synthesized findings are provided below.
                          </span>
                        </div>
                      </div>
                    )}

                    {runResult.outputs && (
                      <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-5 space-y-3 text-xs text-ink">
                        {runResult.outputs.synthesis ? (
                          <FormattedSynthesis synthesis={runResult.outputs.synthesis} />
                        ) : (
                          <pre className="text-[11px] font-mono text-ink overflow-x-auto p-3 bg-white rounded-lg border border-line">
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

function FormattedSynthesis({ synthesis }: { synthesis: string }) {
  const lines = synthesis.split('\n')
  return (
    <div className="space-y-2 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-sm font-bold text-brand-900 border-b border-brand-200/80 pb-1 pt-1.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-brand-700" />
              {trimmed.replace('### ', '')}
            </h3>
          )
        }
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={idx} className="text-xs font-bold text-brand-800 pt-2 pb-0.5">
              {trimmed.replace('#### ', '')}
            </h4>
          )
        }
        if (trimmed.startsWith('> "') || trimmed.startsWith('>')) {
          return (
            <blockquote key={idx} className="border-l-2 border-brand-400 pl-3 py-1 text-2xs italic text-ink/80 bg-white/60 rounded-r-lg my-1">
              {trimmed.replace(/^>\s*/, '')}
            </blockquote>
          )
        }
        if (trimmed.startsWith('- ')) {
          return (
            <div key={idx} className="flex items-start gap-2 text-xs pl-1">
              <span className="text-brand-600 mt-1 font-bold text-[10px]">•</span>
              <span className="flex-1 text-ink/90">{formatInline(trimmed.replace('- ', ''))}</span>
            </div>
          )
        }
        if (/^\d+\.\s/.test(trimmed)) {
          const num = trimmed.match(/^(\d+)\.\s/)?.[1]
          const rest = trimmed.replace(/^\d+\.\s/, '')
          return (
            <div key={idx} className="flex items-start gap-2 text-xs pl-1">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-800">
                {num}
              </span>
              <span className="flex-1 text-ink/90">{formatInline(rest)}</span>
            </div>
          )
        }
        return (
          <p key={idx} className="text-xs text-ink/90">
            {formatInline(trimmed)}
          </p>
        )
      })}
    </div>
  )
}

function formatInline(text: string) {
  // Convert **bold** and `code`
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-brand-100/70 px-1 py-0.5 font-mono text-[11px] text-brand-900 border border-brand-200/50">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}
