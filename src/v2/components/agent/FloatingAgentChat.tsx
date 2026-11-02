import React, { useState, useRef, useEffect } from 'react'
import {
  Bot,
  X,
  Send,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  Terminal,
  Zap,
  ChevronDown,
  Layers,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useApp } from '../../context/AppContext'

interface ChatMessage {
  id: string
  sender: 'user' | 'agent'
  text: string
  citation?: {
    rule: string
    page: string
    grounded: boolean
  }
  timestamp: string
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm-welcome',
    sender: 'agent',
    text: "Hello! I am your Precedent AI Brand Governance Copilot. I inspect content against active guidelines, verify exact citations, and monitor policy rules. How can I help you today?",
    timestamp: 'Just now',
  },
]

const QUICK_PROMPTS = [
  { label: 'Approved Colors', query: 'What are the approved background colors for PureGlow campaigns?' },
  { label: 'Anti-Aging Claims', query: "Can we use 'wrinkle eraser' or 'clinical cure' claims?" },
  { label: 'Rule BR-01', query: 'Explain Rule BR-01 and where it is cited in the guidelines.' },
  { label: 'Festival Exception', query: 'What is the current status of the EX-2024-09 festival exception?' },
]

export const FloatingAgentChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'executions'>('chat')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [isTyping, setIsTyping] = useState(false)
  const [scanning, setScanning] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  let role = 'manager'
  try {
    const appContext = useApp()
    if (appContext?.role) role = appContext.role
  } catch {
    // outside AppProvider, defaults to manager
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const handleSend = (textToSend?: string) => {
    const q = (textToSend || input).trim()
    if (!q) return

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInput('')
    setIsTyping(true)

    setTimeout(() => {
      let replyText = ''
      let citationData: ChatMessage['citation'] = undefined

      const lower = q.toLowerCase()
      if (lower.includes('color') || lower.includes('background') || lower.includes('br-01')) {
        replyText = "According to Rule BR-01, only Primary Green (#7AB93B) and Neutral Sand (#F4EFE3) are approved background colors for PureGlow standard campaigns. Seasonal overrides require a scoped exception ruling."
        citationData = {
          rule: 'Rule BR-01: Approved Palette',
          page: 'Page 12 §3.2 (Color Palette Guide v1.0)',
          grounded: true,
        }
      } else if (lower.includes('wrinkle') || lower.includes('cure') || lower.includes('claim')) {
        replyText = "Violation Warning: Absolute medical claims such as 'wrinkle eraser', 'eliminates aging', or 'cure' are strictly prohibited by Rule BR-02. Approved alternative phrasing: 'Clinically proven hydration' or 'Visibly smooths fine lines'."
        citationData = {
          rule: 'Rule BR-02: Claim Substantiation',
          page: 'Page 18 §4.1 (Claims & Efficacy Policy)',
          grounded: true,
        }
      } else if (lower.includes('festival') || lower.includes('exception') || lower.includes('ex-')) {
        replyText = "Exception Ruling EX-2024-09 is currently ACTIVE. It grants a temporary waiver for orange/warm gradient backgrounds on social media festival banners only. Expiration date: December 31, 2026. Approved by David Kim."
        citationData = {
          rule: 'Ruling EX-2024-09: Seasonal Override',
          page: 'Scoped Exception Store',
          grounded: true,
        }
      } else {
        replyText = `I have verified your query against the PureGlow Botanicals Guideline Store. All claims must carry verified clinical batch citations and follow our 13 deterministic brand rule checkers.`
        citationData = {
          rule: 'Rule BR-03: Fact Verification',
          page: 'Page 5 §1.2',
          grounded: true,
        }
      }

      const agentMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'agent',
        text: replyText,
        citation: citationData,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, agentMsg])
      setIsTyping(false)
    }, 700)
  }

  const triggerSentinelScan = () => {
    setScanning(true)
    setTimeout(() => {
      setScanning(false)
      toast.success('Sentinel scan completed: 15 submissions verified, 0 unauthorized drifts detected.')
    }, 1200)
  }

  return (
    <>
      {/* ---------------- Floating Trigger Logo ---------------- */}
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
              className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1B2B20] via-[#213828] to-[#121E16] text-white shadow-[0_12px_32px_-6px_rgba(30,55,38,0.5)] border border-emerald-500/40"
              aria-label="Open Precedent AI Agent Copilot"
            >
              {/* Online pulsing ping dot */}
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500 border-2 border-white" />
              </span>

              {/* Bot / Sparkles Icon */}
              <div className="relative">
                <Bot className="h-6 w-6 text-emerald-300 transition-transform duration-300 group-hover:rotate-12" />
                <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-emerald-200 animate-pulse" />
              </div>

              {/* Hover Tooltip Pill */}
              <div className="pointer-events-none absolute right-full mr-3.5 hidden sm:flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-line bg-white/95 px-3 py-1.5 text-xs font-bold text-ink shadow-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Precedent AI Copilot</span>
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ---------------- Floating Chatbox Window ---------------- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-50 flex h-[580px] max-h-[85vh] w-[92vw] sm:w-[420px] flex-col overflow-hidden rounded-3xl border border-ink/10 bg-white/95 shadow-[0_25px_60px_-15px_rgba(15,33,56,0.25)] backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line bg-gradient-to-r from-[#17251C] via-[#1E3325] to-[#121E16] px-4 py-3.5 text-white">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Bot className="h-4 w-4" />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-[13.5px] font-bold text-white">Precedent AI Copilot</h3>
                    <span className="rounded bg-emerald-500/30 text-emerald-300 px-1.5 py-0.2 text-[9px] font-bold">
                      Grounded
                    </span>
                  </div>
                  <p className="text-[10px] text-white/60">
                    PureGlow Guidelines · {role === 'manager' ? 'Brand Manager' : 'Creator'} Scope
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label="Close Agent Chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex border-b border-line bg-sand-50/70 p-1 text-xs font-semibold text-muted">
              <button
                onClick={() => setActiveTab('chat')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-[11.5px] transition-all',
                  activeTab === 'chat' ? 'bg-white text-ink shadow-2xs font-bold' : 'hover:text-ink',
                )}
              >
                <Bot className="h-3.5 w-3.5 text-brand-600" />
                <span>Copilot Chat</span>
              </button>
              <button
                onClick={() => setActiveTab('executions')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-[11.5px] transition-all',
                  activeTab === 'executions' ? 'bg-white text-ink shadow-2xs font-bold' : 'hover:text-ink',
                )}
              >
                <Terminal className="h-3.5 w-3.5 text-emerald-600" />
                <span>Agent Executions</span>
              </button>
            </div>

            {/* Tab 1: Copilot Chat */}
            {activeTab === 'chat' && (
              <>
                {/* Chat Scroll Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        'flex flex-col max-w-[85%]',
                        m.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start',
                      )}
                    >
                      <div
                        className={cn(
                          'rounded-2xl px-3.5 py-2.5 shadow-2xs leading-relaxed',
                          m.sender === 'user'
                            ? 'bg-ink text-white rounded-br-xs'
                            : 'bg-sand-100/70 text-ink border border-line rounded-bl-xs',
                        )}
                      >
                        <p className="text-[12px]">{m.text}</p>

                        {/* Citation Anchor Box */}
                        {m.citation && (
                          <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-2 text-[10px] text-emerald-950">
                            <div className="flex items-center justify-between font-bold text-emerald-800">
                              <span className="flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                {m.citation.rule}
                              </span>
                              <span className="bg-emerald-200 px-1 rounded text-[8.5px]">100% Grounded</span>
                            </div>
                            <p className="mt-0.5 text-emerald-900/80 font-mono text-[9px]">
                              {m.citation.page}
                            </p>
                          </div>
                        )}
                      </div>
                      <span className="mt-1 text-[9px] text-muted px-1">{m.timestamp}</span>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex items-center gap-1.5 rounded-2xl bg-sand-100/70 border border-line px-3 py-2 w-16 text-muted">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-bounce" />
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-bounce [animation-delay:300ms]" />
                    </div>
                  )}
                </div>

                {/* Quick Prompts Bar */}
                <div className="border-t border-line/60 bg-sand-50/50 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => handleSend(p.query)}
                      className="shrink-0 rounded-full border border-line bg-white px-2.5 py-1 text-[10.5px] font-semibold text-ink-600 hover:border-brand-400 hover:text-brand-700 transition-colors shadow-2xs"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSend()
                  }}
                  className="flex items-center gap-2 border-t border-line bg-white p-3"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about brand rules, citations..."
                    className="flex-1 rounded-xl border border-line bg-sand-50/60 px-3 py-2 text-[12px] text-ink placeholder:text-muted outline-none focus:border-brand-500 focus:bg-white transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white hover:bg-ink-800 disabled:opacity-40 transition-opacity shrink-0 shadow-xs"
                    aria-label="Send"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </>
            )}

            {/* Tab 2: Agent Executions Telemetry */}
            {activeTab === 'executions' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <div>
                    <h4 className="font-bold text-ink text-[12.5px]">Live Execution Telemetry</h4>
                    <p className="text-[10px] text-muted">Autonomous Sentinel & Review Crew daemons</p>
                  </div>
                  <button
                    onClick={triggerSentinelScan}
                    disabled={scanning}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 text-[10.5px] font-bold hover:bg-emerald-100 transition-colors disabled:opacity-60"
                  >
                    <RefreshCw className={cn('h-3 w-3', scanning && 'animate-spin')} />
                    <span>{scanning ? 'Scanning...' : 'Run Scan'}</span>
                  </button>
                </div>

                {/* Run 1 */}
                <div className="rounded-xl border border-line bg-sand-50/60 p-3 space-y-1.5 font-mono text-[10.5px]">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> review_crew.submission_audit
                    </span>
                    <span className="text-muted text-[9px]">184ms</span>
                  </div>
                  <p className="text-muted text-[10px]">Orchestrated Intake $\to$ Retrieval $\to$ Rule Engine $\to$ Summary</p>
                  <div className="flex items-center gap-1 text-[9px] text-emerald-800 font-semibold pt-1 border-t border-line/60">
                    <span>Target: Summer Glow Banner v2.0</span>
                    <span>·</span>
                    <span className="text-emerald-600 font-bold">0 Violations</span>
                  </div>
                </div>

                {/* Run 2 */}
                <div className="rounded-xl border border-line bg-sand-50/60 p-3 space-y-1.5 font-mono text-[10.5px]">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-brand-700 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> sentinel.scan_expired_exceptions
                    </span>
                    <span className="text-muted text-[9px]">62ms</span>
                  </div>
                  <p className="text-muted text-[10px]">Verified 1 active exception (EX-2024-09, valid until 31 Dec 2026).</p>
                  <div className="flex items-center gap-1 text-[9px] text-brand-800 font-semibold pt-1 border-t border-line/60">
                    <span>Status: Valid Scope Enforced</span>
                  </div>
                </div>

                {/* Run 3 */}
                <div className="rounded-xl border border-line bg-sand-50/60 p-3 space-y-1.5 font-mono text-[10.5px]">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-purple-700 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> proofpass.mint_digest
                    </span>
                    <span className="text-muted text-[9px]">14ms</span>
                  </div>
                  <p className="text-muted text-[10px]">Tamper-evident SHA-256 seal issued for approved asset #1042.</p>
                  <div className="flex items-center gap-1 text-[9px] text-purple-800 font-semibold pt-1 border-t border-line/60">
                    <span>Digest: e3b0c44298fc1c14...</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
