import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  title: string
  description?: string
  tone?: ToastTone
}

interface ToastApi {
  push: (toast: Omit<ToastItem, 'id'>) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9)
    const item: ToastItem = { ...t, id }
    setToasts((prev) => [...prev, item])
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 4500)
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (title, description) => push({ title, description, tone: 'success' }),
      error: (title, description) => push({ title, description, tone: 'error' }),
      info: (title, description) => push({ title, description, tone: 'info' }),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[330px] max-w-[calc(100vw-32px)] flex-col gap-2">
        {toasts.map((t) => {
          const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'error' ? AlertTriangle : Info
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                'pointer-events-auto flex animate-slide-in items-start gap-2.5 rounded-xl border bg-white px-3.5 py-3 shadow-lift',
                t.tone === 'success' && 'border-success-100',
                t.tone === 'error' && 'border-danger-100',
                t.tone === 'info' && 'border-brand-100',
              )}
            >
              <Icon
                className={cn(
                  'mt-[1px] h-4 w-4 shrink-0',
                  t.tone === 'success' && 'text-success-500',
                  t.tone === 'error' && 'text-danger-500',
                  t.tone === 'info' && 'text-brand-500',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold leading-[19px] text-ink">{t.title}</p>
                {t.description && <p className="mt-0.5 text-xs leading-[16px] text-muted">{t.description}</p>}
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                aria-label="Dismiss toast"
                className="inline-flex h-5 w-5 items-center justify-center rounded text-muted transition-colors hover:text-ink"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
