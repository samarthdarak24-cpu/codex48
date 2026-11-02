import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { CheckCircle2, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Toaster } from 'sonner'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { AiCompareModal } from './components/modals/AiCompareModal'
import { FloatingAgentChat } from './components/agent/FloatingAgentChat'
import { useApp } from './context/AppContext'
import { EASE } from './components/motion'

export function V2Layout() {
  const { loading, error } = useApp()
  const location = useLocation()
  const reduce = useReducedMotion()
  const [mobileNav, setMobileNav] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden font-sans text-ink antialiased bg-canvas">
      <Sidebar mobileOpen={mobileNav} onClose={() => setMobileNav(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onOpenNav={() => setMobileNav(true)} />
        <main className="main-scroll flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-5">
                <div className="relative h-12 w-12">
                  <span className="absolute inset-0 rounded-full border-2 border-line" />
                  <motion.span
                    className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-500"
                    animate={reduce ? undefined : { rotate: 360 }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                  />
                  <span className="absolute inset-[14px] rounded-full bg-brand-100" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-ink">Loading workspace</p>
                  <p className="mt-0.5 text-xs text-muted">Fetching your brand data…</p>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="m-6 flex items-center gap-3 rounded-2xl border border-danger-200 bg-danger-50 px-5 py-4 text-sm text-danger-700">
              <AlertCircle className="h-5 w-5 shrink-0 text-danger-500" />
              <span>{error}</span>
            </div>
          ) : (
            <motion.div
              key={location.pathname}
              className="min-h-full w-full"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.26, ease: EASE }}
            >
              <Outlet />
            </motion.div>
          )}
        </main>
      </div>
      <AiCompareModal />
      <FloatingAgentChat />
      {/* Toasts — Sonner owns the queue, animation and a11y announcements. */}
      <Toaster
        position="bottom-right"
        offset={20}
        gap={10}
        closeButton
        visibleToasts={3}
        icons={{
          success: <CheckCircle2 className="h-4 w-4 text-sage-600" />,
          error: <AlertCircle className="h-4 w-4 text-danger-600" />,
          warning: <AlertTriangle className="h-4 w-4 text-warn-600" />,
          info: <Info className="h-4 w-4 text-olive-600" />,
        }}
        toastOptions={{
          classNames: {
            toast:
              'rounded-2xl border border-line bg-white px-4 py-3 text-xs font-semibold text-ink shadow-pop',
            title: 'text-xs font-semibold text-ink',
            description: 'text-2xs font-normal text-muted',
            closeButton:
              'border-line bg-white text-muted hover:border-line-strong hover:text-ink',
          },
        }}
      />
    </div>
  )
}
