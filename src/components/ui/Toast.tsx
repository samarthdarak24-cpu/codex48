import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastTone = 'success' | 'error' | 'info'

interface Toast {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

interface ToastApi {
  push: (t: Omit<Toast, 'id'>) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), [])

  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev.slice(-2), { ...t, id }])
      window.setTimeout(() => remove(id), 4600)
    },
    [remove],
  )

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
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[330px] flex-col gap-2">
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
                onClick={() => remove(t.id)}
                aria-label="Dismiss notification"
                className="mt-0.5 text-muted-light transition-colors hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
