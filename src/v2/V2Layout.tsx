import { Outlet } from 'react-router-dom'
import { X } from 'lucide-react'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { AiCompareModal } from './components/modals/AiCompareModal'
import { useApp } from './context/AppContext'

/** Shared shell for both v2 role workspaces (sidebar + header + page outlet). */
export function V2Layout() {
  const { loading, error, toasts, removeToast } = useApp()

  return (
    <div className="flex h-screen overflow-hidden bg-canvas font-sans text-ink antialiased">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-canvas">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-500" />
                <p className="text-xs font-medium tracking-[0.06em] text-muted">LOADING WORKSPACE</p>
              </div>
            </div>
          ) : error ? (
            <div className="m-6 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              {error}
            </div>
          ) : (
            <div className="h-full w-full animate-view-fade-in">
              <Outlet />
            </div>
          )}
        </main>
      </div>

      <AiCompareModal />

      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex max-w-sm flex-col gap-2.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-xl ${
              t.type === 'error'
                ? 'border-danger-500 bg-danger-600 text-white'
                : t.type === 'warning'
                  ? 'border-warn-500 bg-warn-600 text-white'
                  : t.type === 'info'
                    ? 'border-line bg-ink-900 text-white'
                    : 'border-brand-600 bg-brand-700 text-white'
            }`}
          >
            <span className="leading-snug">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="rounded-lg p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
