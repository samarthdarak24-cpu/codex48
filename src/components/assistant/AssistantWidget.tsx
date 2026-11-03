import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Bot,
  X,
  Send,
  Sparkles,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  CornerDownLeft,
} from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import type { AssistantConversation, AssistantMessage, AssistantStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

export function AssistantWidget() {
  const { user } = useAuth()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<AssistantStatus | null>(null)
  const [conversation, setConversation] = useState<AssistantConversation | null>(null)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, number>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. Fetch Assistant operational status
  useEffect(() => {
    api.assistant.status()
      .then(setStatus)
      .catch(() => setStatus({ status: 'degraded', provider: 'none', model: 'fallback', retrieval_only: true, version: 'assistant_v1' }))
  }, [])

  // 2. Fetch contextual suggestions on route change
  useEffect(() => {
    if (user) {
      api.assistant.getSuggestions(location.pathname)
        .then(setSuggestions)
        .catch(() => {})
    }
  }, [location.pathname, user])

  // 3. Initialize or restore conversation when drawer opens
  useEffect(() => {
    if (isOpen && !conversation && user) {
      initConversation()
    }
  }, [isOpen, conversation, user])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const initConversation = async () => {
    try {
      const conv = await api.assistant.createConversation({
        context_route: location.pathname,
      })
      setConversation(conv)
      if (conv.messages) {
        setMessages(conv.messages)
      }
    } catch (err) {
      console.error('Failed to create assistant conversation', err)
    }
  }

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text || loading) return

    setInput('')
    setLoading(true)

    // Optimistic user message
    const tempUserMsg: AssistantMessage = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      let convId = conversation?.id
      if (!convId) {
        const newConv = await api.assistant.createConversation({ context_route: location.pathname })
        setConversation(newConv)
        convId = newConv.id
      }

      const res = await api.assistant.sendMessage(convId, text, location.pathname)
      // Replace optimistic message and append real assistant message
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        res.user_message,
        res.assistant_message,
      ])
    } catch (err) {
      const errorMsg: AssistantMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        content: 'I encountered an error communicating with the governance engine. Please try again or check your active network connection.',
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleFeedback = async (msgId: string, rating: number) => {
    try {
      await api.assistant.submitFeedback(msgId, rating)
      setFeedbackGiven((prev) => ({ ...prev, [msgId]: rating }))
    } catch (err) {
      console.error('Failed to submit feedback', err)
    }
  }

  const handleNewChat = () => {
    setConversation(null)
    setMessages([])
    initConversation()
  }

  if (!user) return null

  const isHealthy = status?.status === 'healthy'
  const isDegraded = status?.status === 'degraded'

  return (
    <>
      {/* Floating launcher button fixed bottom-right on all 21 screens */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open Precedent Assistant"
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#1C3A27] text-white shadow-xl transition-all duration-300 hover:scale-105 hover:bg-[#254F35] focus:outline-none focus:ring-4 focus:ring-brand-500/20"
        >
          <Bot className="h-6 w-6 text-brand-300 transition-transform group-hover:rotate-6" />
          
          {/* Status dot (green = healthy, amber = degraded) */}
          <span
            className={cn(
              'absolute right-1 top-1 h-3.5 w-3.5 rounded-full border-2 border-white',
              isHealthy ? 'bg-emerald-500 ring-2 ring-emerald-400/30' : isDegraded ? 'bg-amber-500 ring-2 ring-amber-400/30' : 'bg-stone-400'
            )}
            title={isHealthy ? 'Precedent Assistant Active (LLM Connected)' : 'Retrieval-Only Governance Mode'}
          />
        </button>
      </div>

      {/* Slide-over assistant drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-line bg-canvas shadow-2xl animate-in slide-in-from-right duration-300">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1C3A27] text-brand-300">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-ink">Precedent Assistant</h3>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                      isHealthy ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', isHealthy ? 'bg-emerald-500' : 'bg-amber-500')} />
                    {isHealthy ? 'Grounded AI' : 'Retrieval Mode'}
                  </span>
                </div>
                <p className="text-[11px] text-muted">
                  Context: <span className="font-medium text-ink">{location.pathname}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleNewChat}
                title="Start New Conversation"
                className="rounded-lg p-1.5 text-muted hover:bg-stone-100 hover:text-ink"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                className="rounded-lg p-1.5 text-muted hover:bg-stone-100 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Degraded mode banner */}
          {isDegraded && (
            <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50/70 px-4 py-2 text-[11px] text-amber-800">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <span>AI explanation in retrieval-only mode — verified guideline citations and deterministic findings active.</span>
            </div>
          )}

          {/* Message History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => {
              const isUser = m.sender === 'user'
              return (
                <div
                  key={m.id}
                  className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}
                >
                  <div
                    className={cn(
                      'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm',
                      isUser
                        ? 'bg-[#1C3A27] text-white rounded-br-xs'
                        : 'bg-white text-ink border border-line rounded-bl-xs'
                    )}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>

                    {/* Verified Guideline Citations */}
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-line/60 space-y-1.5">
                        <div className="flex items-center gap-1 text-[10px] font-semibold tracking-wider text-muted uppercase">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Verified Citations ({m.citations.length})
                        </div>
                        {m.citations.map((c, i) => (
                          <div
                            key={i}
                            className="rounded-md bg-stone-50 p-2 text-[11px] text-ink border border-stone-200/60"
                          >
                            <div className="flex items-center justify-between text-[10px] font-medium text-brand-700">
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {c.document_name || 'Brand Guidelines'}
                              </span>
                              <span>Page {c.page_number || 1}</span>
                            </div>
                            <blockquote className="mt-1 italic text-muted-dark border-l-2 border-brand-400 pl-1.5">
                              "{c.quote}"
                            </blockquote>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Suggested Actions */}
                    {m.suggested_actions && m.suggested_actions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-line/50 flex flex-wrap gap-1.5">
                        {m.suggested_actions.map((act, i) => (
                          <a
                            key={i}
                            href={act.route || '#'}
                            className="inline-flex items-center gap-1 rounded bg-stone-100 px-2 py-1 text-[10px] font-medium text-brand-800 hover:bg-stone-200 transition-colors"
                          >
                            <span>{act.label}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Draft Action Preview */}
                    {m.draft && (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/60 p-2 text-[11px]">
                        <span className="font-semibold text-amber-900 block mb-1">Proposed Draft:</span>
                        <p className="text-stone-700">{m.draft.preview}</p>
                      </div>
                    )}
                  </div>

                  {/* Feedback on Assistant Messages */}
                  {!isUser && (
                    <div className="mt-1 flex items-center gap-2 px-1 text-[10px] text-muted">
                      <span>Was this helpful?</span>
                      <button
                        onClick={() => handleFeedback(m.id, 1)}
                        className={cn(
                          'p-1 rounded hover:bg-stone-200',
                          feedbackGiven[m.id] === 1 && 'text-emerald-600 font-bold'
                        )}
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleFeedback(m.id, -1)}
                        className={cn(
                          'p-1 rounded hover:bg-stone-200',
                          feedbackGiven[m.id] === -1 && 'text-rose-600 font-bold'
                        )}
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </button>
                      {m.latency_ms && <span className="text-[9px] text-muted-light">{m.latency_ms}ms</span>}
                    </div>
                  )}
                </div>
              )
            })}

            {loading && (
              <div className="flex items-center gap-2 rounded-xl bg-white border border-line p-3 text-xs text-muted shadow-sm">
                <Sparkles className="h-3.5 w-3.5 animate-spin text-brand-600" />
                <span>Checking brand guidelines and verifying citations...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Contextual Suggestions Carousel */}
          {suggestions.length > 0 && (
            <div className="border-t border-line bg-white/70 px-3 py-2">
              <p className="text-[10px] font-semibold tracking-wider text-muted uppercase mb-1.5">Suggested Prompts</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.slice(0, 3).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s)}
                    disabled={loading}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-[11px] text-ink hover:border-brand-500 hover:text-brand-800 transition-colors text-left"
                  >
                    <span>{s}</span>
                    <ChevronRight className="h-3 w-3 text-muted" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <div className="border-t border-line bg-white p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-end gap-2"
            >
              <div className="relative flex-1">
                <textarea
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Ask about brand guidelines, claims, or findings..."
                  className="w-full resize-none rounded-xl border border-line bg-stone-50 px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-brand-500 focus:bg-white focus:outline-none"
                  maxLength={4000}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1C3A27] text-white shadow-sm hover:bg-[#254F35] disabled:opacity-40 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

