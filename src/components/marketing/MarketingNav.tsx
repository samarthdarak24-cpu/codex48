import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { BrandMark } from '@/components/layout/Shell'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const LINKS = [
  { label: 'Platform', href: '#platform' },
  { label: 'Solution', href: '#solution' },
  { label: 'Festival Demo', href: '#demo-story' },
  { label: 'Features', href: '#features' },
  { label: 'Tech Stack', href: '#tech-stack' },
  { label: 'Team', href: '#team' },
  { label: 'FAQ', href: '#faq' },
]

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { status, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const signedIn = status === 'authenticated' && user
  const workspace = user?.role === 'manager' ? '/manager/overview' : '/app/overview'

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-40 transition-all duration-300',
          scrolled ? 'border-b border-ink/[0.07] bg-white/85 backdrop-blur-xl' : 'border-b border-transparent bg-cream/70 backdrop-blur-sm',
        )}
      >
        <div className="mkt-container flex h-[68px] items-center justify-between gap-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Precedent home">
            <BrandMark size={26} />
            <span className="text-[17px] font-bold tracking-[-0.025em] text-ink">Precedent</span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-[13.5px] font-medium text-ink-600 transition-colors hover:text-ink">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            {signedIn ? (
              <button onClick={() => navigate(workspace)} className="mkt-pill-dark h-10 py-0 text-[13px]">
                Open workspace
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <>
                <Link to="/login" className="rounded-full px-4 py-2.5 text-[13.5px] font-medium text-ink-600 transition-colors hover:text-ink">
                  Sign in
                </Link>
                <Link to="/login" className="mkt-pill-dark h-10 py-0 text-[13px]">
                  Launch Prototype
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white/70 text-ink lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/25 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-3 top-3 animate-pop-in rounded-3xl border border-ink/[0.07] bg-cream p-5 shadow-pop max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BrandMark size={26} />
                <span className="text-[17px] font-bold tracking-[-0.025em] text-ink">Precedent</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex flex-col" aria-label="Mobile">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-ink/[0.07] py-3.5 text-[17px] font-medium text-ink last:border-0"
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="mt-5 flex flex-col gap-2">
              {signedIn ? (
                <button
                  onClick={() => {
                    setOpen(false)
                    navigate(workspace)
                  }}
                  className="mkt-pill-dark w-full"
                >
                  Open workspace
                </button>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="mkt-pill-dark w-full">
                    Launch Prototype
                  </Link>
                  <Link to="/login" onClick={() => setOpen(false)} className="mkt-pill-light w-full">
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
