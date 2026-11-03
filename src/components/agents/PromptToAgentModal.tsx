import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
  Play,
  ShieldCheck,
  Sparkles,
  Wand2,
  Workflow,
  X,
} from 'lucide-react'
import { api } from '@/services/api'
import type { Agent, AgentPromptResult } from '@/lib/types'

interface PromptToAgentModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: (agent: Agent) => void
}

const EXAMPLE_PROMPTS = [
  {
    title: 'Brand Compliance Reviewer',
    category: 'brand_compliance',
    prompt:
      'Create an agent that reviews marketing submissions against our brand guidelines and identifies unsupported claims with exact evidence.',
  },
  {
    title: 'VisualGuard Poster Checker',
    category: 'visual_guard',
    prompt:
      'Create an agent that checks uploaded posters, extracts text, analyzes palette and identifies possible visual branding problems.',
  },
  {
    title: 'Guideline Research Assistant',
    category: 'guideline_research',
    prompt:
      'Create an agent that searches brand guidelines and answers questions with exact document references and page citations.',
  },
  {
    title: 'Exception Triage Assistant',
    category: 'exception_triage',
    prompt:
      'Create an agent that monitors expired exceptions, assesses risk, and identifies affected approved content without auto-approving.',
  },
  {
    title: 'Weekly Audit Report Assistant',
    category: 'audit_report',
    prompt:
      'Create an agent that generates a weekly brand compliance report from real submission data and governance audit logs.',
  },
  {
    title: 'Sentinel Impact Assistant',
    category: 'sentinel_impact',
    prompt:
      'Create an agent that identifies potentially affected content after a guideline or rule changes and stages reassessment tasks.',
  },
]

export function PromptToAgentModal({ isOpen, onClose, onCreated }: PromptToAgentModalProps) {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [category, setCategory] = useState<string>('brand_compliance')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AgentPromptResult | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.length < 5) {
      setError('Please provide a description of at least 5 characters.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await api.draftAgentFromPrompt(prompt, category)
      setResult(res)
      if (onCreated) {
        onCreated(res.agent)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to generate agent from prompt. Please check your instructions.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenBuilder = () => {
    if (result?.agent) {
      onClose()
      navigate(`/manager/agents/${result.agent.id}/builder`)
    }
  }

  const handleOpenDetail = () => {
    if (result?.agent) {
      onClose()
      navigate(`/manager/agents/${result.agent.id}`)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#23282A]/45 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-canvas shadow-2xl my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-white px-5 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 shadow-sm border border-brand-100">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Prompt-to-Agent Studio</h2>
              <p className="text-xs text-muted">Describe your AI brand governance assistant in ordinary English.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-[#F3EFE6] hover:text-ink transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!result ? (
            <>
              {/* Prompt Textarea */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Describe what you want your AI agent to do
                </label>
                <div className="relative rounded-xl border border-line bg-white shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want your AI agent to do... (e.g. 'Create an agent that reviews marketing submissions against our brand guidelines and identifies unsupported claims.')"
                    className="w-full resize-none rounded-xl p-4 text-sm text-ink placeholder:text-muted/60 focus:outline-none"
                  />
                  <div className="flex items-center justify-between border-t border-line/60 bg-[#FCFBF8] px-4 py-2.5 rounded-b-xl">
                    <span className="text-[11px] text-muted">
                      Precedent will synthesize system instructions, tool bindings and a visual workflow.
                    </span>
                    <span className="text-xs font-medium text-muted">{prompt.length} chars</span>
                  </div>
                </div>
              </div>

              {/* Category Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Primary Governance Domain
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'brand_compliance', label: 'Brand Compliance' },
                    { id: 'guideline_research', label: 'Guideline Research' },
                    { id: 'visual_guard', label: 'VisualGuard & Assets' },
                    { id: 'exception_triage', label: 'Exception Triage' },
                    { id: 'sentinel_impact', label: 'Sentinel Impact' },
                    { id: 'audit_report', label: 'Audit & Reporting' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center justify-center rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        category === cat.id
                          ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700 shadow-sm'
                          : 'border-line bg-white text-ink hover:bg-[#F8F6F0]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Example Prompts Shelf */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Quick-Start Inspiration Prompts
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {EXAMPLE_PROMPTS.map((ex, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setPrompt(ex.prompt)
                        setCategory(ex.category)
                      }}
                      className="group flex flex-col text-left rounded-xl border border-line bg-white p-3 hover:border-brand-300 hover:bg-[#FAF9F5] transition-all"
                    >
                      <span className="text-xs font-semibold text-ink group-hover:text-brand-700">
                        {ex.title}
                      </span>
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted leading-relaxed">
                        {ex.prompt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}
            </>
          ) : (
            /* Generated Agent Preview */
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/70 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">{result.agent.name}</h3>
                  <p className="text-xs text-muted mt-0.5">{result.agent.description}</p>
                </div>
              </div>

              {/* Warnings / Fallbacks if any */}
              {result.warnings && result.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
                  <span className="font-semibold">Synthesis Note:</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    {result.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Grid of properties */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-line bg-white p-3.5 space-y-2">
                  <span className="font-semibold text-muted uppercase tracking-wider text-[10px]">
                    Selected Registered Tools
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.agent.tools.map((t) => (
                      <span
                        key={t}
                        className="rounded-md border border-brand-200 bg-brand-50/80 px-2 py-0.5 text-[11px] font-medium text-brand-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-white p-3.5 space-y-2">
                  <span className="font-semibold text-muted uppercase tracking-wider text-[10px]">
                    Governance & Approval Policy
                  </span>
                  <div className="space-y-1 text-[11px] text-ink">
                    <p className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
                      <span>Manager approval required on writes</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Workflow className="h-3.5 w-3.5 text-brand-600" />
                      <span>{result.agent.workflow.nodes.length} Visual Workflow Nodes Generated</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* System Instructions Preview */}
              <div className="rounded-xl border border-line bg-white p-3.5 space-y-1.5">
                <span className="font-semibold text-muted uppercase tracking-wider text-[10px]">
                  Generated System Instructions
                </span>
                <p className="text-xs text-ink/80 whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto bg-[#FAF8F5] p-2.5 rounded-lg border border-line/50 font-mono text-[11px]">
                  {result.agent.instructions}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-line bg-white px-5 py-3.5 sm:px-6 sm:py-4">
          {!result ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-medium text-ink hover:bg-[#F8F6F0] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading || prompt.trim().length < 5}
                onClick={handleGenerate}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Synthesizing Agent...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    <span>Generate AI Agent</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-medium text-ink hover:bg-[#F8F6F0]"
              >
                Regenerate
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenDetail}
                  className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-medium text-ink hover:bg-[#F8F6F0]"
                >
                  View Details
                </button>
                <button
                  type="button"
                  onClick={handleOpenBuilder}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
                >
                  <Workflow className="h-4 w-4" />
                  <span>Open in Visual Builder</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

