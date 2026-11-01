import { Outlet } from 'react-router-dom'
import { X, CheckCircle2, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { AiCompareModal } from './components/modals/AiCompareModal'
import { useApp } from './context/AppContext'

export function V2Layout() {
  const { loading, error, toasts, removeToast } = useApp()

  const toastStyle = (type: string) => {
    if (type === 'success') return 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-500'
    if (type === 'error')   return 'bg-gradient-to-r from-red-600 to-rose-600 border-red-500'
    if (type === 'warning') return 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400'
    return 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-500'
  }
  const toastIcon = (type: string) => {
    if (type === 'success') return <CheckCircle2 className="h-4 w-4 shrink-0" />
    if (type === 'error')   return <AlertCircle  className="h-4 w-4 shrink-0" />
    if (type === 'warning') return <AlertTriangle className="h-4 w-4 shrink-0" />
    return <Info className="h-4 w-4 shrink-0" />
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans text-ink antialiased" style={{background:'linear-gradient(160deg,#fdfaf4 0%,#f5f0e8 40%,#f0f4fe 80%,#fce7f3 100%)'}}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto main-scroll" style={{background:'transparent'}}>
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-pink-500 animate-spin" />
                  <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-emerald-500 border-r-purple-500 animate-spin" style={{animationDirection:'reverse',animationDuration:'0.75s'}} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-brand-500 to-blue-500 animate-pulse" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-ink-900">Loading Workspace</p>
                  <p className="text-xs text-muted mt-0.5">Fetching your brand data…</p>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="m-6 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-pink-50 px-5 py-4 text-sm text-red-700 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" /><span>{error}</span>
            </div>
          ) : (
            <div className="h-full w-full animate-view-fade-in"><Outlet /></div>
          )}
        </main>
      </div>
      <AiCompareModal />
      {/* Colorful toasts */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex max-w-sm flex-col gap-2.5">
        {toasts.map(t => (
          <div key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-xs font-semibold shadow-2xl text-white animate-scale-in ${toastStyle(t.type)}`}>
            {toastIcon(t.type)}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button onClick={() => removeToast(t.id)}
              className="rounded-xl p-1.5 text-white/70 hover:bg-white/20 hover:text-white transition-colors shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
