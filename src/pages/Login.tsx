import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Sparkles, Workflow } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { BrandMark } from '@/components/layout/Shell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

const DEMO_ACCOUNTS = [
  { role: 'Brand Manager', name: 'David Kim', email: 'david.kim@pureglow.co', tone: 'from-[#4E7A3D] to-[#74975F]' },
  { role: 'Content Creator', name: 'Emily Carter', email: 'emily.carter@pureglow.co', tone: 'from-[#2FB86B] to-[#5FD48F]' },
]

const HIGHLIGHTS = [
  { icon: ShieldCheck, title: 'Evidence-backed content reviews', copy: 'Every finding cites the exact guideline passage it came from.' },
  { icon: Workflow, title: 'Human-controlled approvals', copy: 'Approvals and exceptions stay with your brand managers.' },
  { icon: Sparkles, title: 'Rule-change impact simulation', copy: 'See which content a rule change would affect before you activate it.' },
]

export default function LoginPage() {
  const { login, status, user } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'reset'>('signin')
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && user) {
      navigate(user.role === 'manager' ? '/manager/overview' : '/app/overview', { replace: true })
    }
  }, [status, user, navigate])

  function validate() {
    const next: typeof errors = {}
    if (!email.trim()) next.email = 'Enter your work email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'That email address doesn’t look right.'
    if (mode === 'signin' && !password) next.password = 'Enter your password.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setErrors({})
    setLoading(true)
    try {
      if (mode === 'reset') {
        await new Promise((r) => setTimeout(r, 600))
        setResetSent(true)
        return
      }
      const account = await login(email, password)
      navigate(account.role === 'manager' ? '/manager/overview' : '/app/overview', { replace: true })
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Unable to sign in. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  function useDemo(demoEmail: string) {
    setEmail(demoEmail)
    setPassword('precedent')
    setErrors({})
    setMode('signin')
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* ---------------- Brand panel ---------------- */}
      <div className="relative hidden w-[52%] overflow-hidden bg-[#1B231D] lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_0%_0%,#14324F_0%,#1B231D_55%,#081421_100%)]" />
          <div className="absolute -left-24 top-10 h-[380px] w-[380px] rounded-full bg-[#4E7A3D]/25 blur-[110px]" />
          <div className="absolute -bottom-28 right-[-60px] h-[420px] w-[420px] rounded-full bg-[#2FB86B]/20 blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.10) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
              maskImage: 'radial-gradient(80% 60% at 30% 20%, black 0%, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(80% 60% at 30% 20%, black 0%, transparent 75%)',
            }}
          />
        </div>

        <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-14">
          <div className="flex items-center gap-2.5">
            <BrandMark size={32} />
            <div>
              <p className="text-[17px] font-bold leading-[19px] tracking-[-0.02em] text-white">Precedent</p>
              <p className="text-[10px] leading-[13px] text-white/45">AI-assisted brand governance</p>
            </div>
          </div>

          <div className="max-w-[430px]">
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[10.5px] font-medium tracking-[0.03em] text-white/70">
              <span className="h-1 w-1 rounded-full bg-[#5FD48F]" />
              BRAND GOVERNANCE, TRACEABLE BY DEFAULT
            </p>
            <h1 className="text-balance text-[38px] font-semibold leading-[1.14] tracking-[-0.03em] text-white">
              Your Brand Rules.
              <br />
              Clear Decisions.
              <br />
              <span className="bg-gradient-to-r from-[#8FE3B4] to-[#5FD48F] bg-clip-text text-transparent">
                Stronger Consistency.
              </span>
            </h1>
            <p className="mt-4 max-w-[380px] text-[13.5px] leading-[21px] text-white/55">
              Precedent helps teams review content against brand rules, manage scoped exceptions, and keep every
              decision traceable — including why it was made and when it expires.
            </p>
          </div>

          {/* Abstract governance visual */}
          <div className="relative my-8 hidden xl:block">
            <GovernanceDiagram />
          </div>

          <ul className="grid gap-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex items-start gap-2.5">
                <span className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/12 bg-white/[0.07]">
                  <h.icon className="h-3 w-3 text-[#8FE3B4]" strokeWidth={2} />
                </span>
                <div>
                  <p className="text-[12.5px] font-medium leading-[16px] text-white/85">{h.title}</p>
                  <p className="text-[11px] leading-[15px] text-white/40">{h.copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ---------------- Auth panel ---------------- */}
      <div className="flex w-full flex-1 flex-col lg:w-[48%]">
        <div className="flex items-center justify-between px-6 py-5 sm:px-10">
          <div className="flex items-center gap-2 lg:hidden">
            <BrandMark size={26} />
            <span className="text-[15px] font-bold tracking-[-0.02em] text-ink">Precedent</span>
          </div>
          <p className="ml-auto text-xs text-muted">
            New to Precedent?{' '}
            <a href="mailto:access@precedent.app" className="link">
              Request access
            </a>
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-10 sm:px-10">
          <div className="w-full max-w-[392px] animate-fade-up">
            {mode === 'reset' ? (
              <>
                <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Reset your password</h2>
                <p className="mt-1.5 text-base leading-[20px] text-muted">
                  Enter the email linked to your workspace and we’ll send a single-use reset link.
                </p>

                {resetSent ? (
                  <div className="mt-6 rounded-xl border border-success-100 bg-success-50 p-4">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-[1px] h-4 w-4 shrink-0 text-success-600" />
                      <div>
                        <p className="text-base font-semibold text-success-700">Check your inbox</p>
                        <p className="mt-0.5 text-xs leading-[17px] text-success-700/80">
                          If an account exists for <span className="font-medium">{email}</span>, a reset link is on its
                          way. The link expires in 30 minutes.
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => { setMode('signin'); setResetSent(false) }}>
                      Back to sign in
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} className="mt-6 space-y-3.5" noValidate>
                    <div>
                      <label htmlFor="reset-email" className="label">
                        Work email
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-light" />
                        <Input
                          id="reset-email"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          className={cn('pl-9', errors.email && 'field-error')}
                          invalid={Boolean(errors.email)}
                        />
                      </div>
                      {errors.email && <p className="mt-1 text-xs font-medium text-danger-600">{errors.email}</p>}
                    </div>
                    <Button type="submit" block size="lg" loading={loading}>
                      Send reset link
                    </Button>
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className="w-full text-center text-xs font-medium text-muted transition-colors hover:text-ink"
                    >
                      Back to sign in
                    </button>
                  </form>
                )}
              </>
            ) : (
              <>
                <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Sign in to your workspace</h2>
                <p className="mt-1.5 text-base leading-[20px] text-muted">
                  Your role and permissions are assigned by your workspace administrator.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-3.5" noValidate>
                  {errors.form && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2.5 text-xs font-medium text-danger-700"
                    >
                      <Lock className="mt-[1px] h-3.5 w-3.5 shrink-0" />
                      {errors.form}
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="label">
                      Work email
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-light" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          setErrors((p) => ({ ...p, email: undefined, form: undefined }))
                        }}
                        placeholder="you@company.com"
                        className="pl-9"
                        invalid={Boolean(errors.email)}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'email-error' : undefined}
                      />
                    </div>
                    {errors.email && (
                      <p id="email-error" className="mt-1 text-xs font-medium text-danger-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <label htmlFor="password" className="text-xs font-semibold text-ink-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setMode('reset')}
                        className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-light" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          setErrors((p) => ({ ...p, password: undefined, form: undefined }))
                        }}
                        placeholder="••••••••"
                        className="pl-9 pr-9"
                        invalid={Boolean(errors.password)}
                        aria-invalid={Boolean(errors.password)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-light transition-colors hover:text-ink"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1 text-xs font-medium text-danger-600">{errors.password}</p>}
                  </div>

                  <label className="flex cursor-pointer select-none items-center gap-2 pt-0.5">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-3.5 w-3.5 rounded-[4px] border-line-strong"
                    />
                    <span className="text-xs text-ink-600">Keep me signed in on this device</span>
                  </label>

                  <Button type="submit" block size="lg" loading={loading} iconRight={<ArrowRight className="h-3.5 w-3.5" />}>
                    Sign in
                  </Button>
                </form>

                <div className="mt-6 rounded-xl border border-line bg-[#FAF7EF] p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">
                    <ShieldCheck className="h-3 w-3" />
                    Demo accounts
                  </p>
                  <div className="space-y-1.5">
                    {DEMO_ACCOUNTS.map((a) => (
                      <button
                        key={a.email}
                        onClick={() => useDemo(a.email)}
                        className="group flex w-full items-center gap-2.5 rounded-lg border border-line bg-white px-2.5 py-2 text-left transition-all hover:border-brand-200 hover:shadow-[0_2px_8px_-4px_rgba(15,33,56,.18)]"
                      >
                        <span className={cn('flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br text-[9px] font-bold text-white', a.tone)}>
                          {a.name.split(' ').map((n) => n[0]).join('')}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold leading-[15px] text-ink">{a.role}</span>
                          <span className="block truncate text-2xs leading-[13px] text-muted">{a.email}</span>
                        </span>
                        <span className="text-2xs font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
                          Use
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-[13px] text-muted-light">
                    Fictional accounts · password <span className="font-medium text-muted">precedent</span>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-6 py-4 text-[11px] text-muted-light sm:px-10">
          <p>© {new Date().getFullYear()} Precedent. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <a href="#" className="transition-colors hover:text-muted">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-muted">
              Terms
            </a>
            <a href="#" className="transition-colors hover:text-muted">
              Security
            </a>
          </div>
        </footer>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Decorative governance diagram                                       */
/* ------------------------------------------------------------------ */

function GovernanceDiagram() {
  const nodes = [
    { x: 14, y: 52, label: 'Guidelines', tone: '#5FD48F' },
    { x: 118, y: 20, label: 'Rules', tone: '#74975F' },
    { x: 118, y: 84, label: 'Evidence', tone: '#F0A32A' },
    { x: 226, y: 52, label: 'Decision', tone: '#A9B892' },
  ]
  return (
    <svg viewBox="0 0 300 130" className="h-[130px] w-full max-w-[340px]" aria-hidden>
      <g stroke="rgba(255,255,255,.16)" strokeWidth="1" fill="none">
        <path d="M46 58 C86 58 82 30 110 28" />
        <path d="M46 66 C86 66 82 92 110 92" />
        <path d="M148 28 C182 28 186 52 206 56" />
        <path d="M148 92 C182 92 186 68 206 62" />
      </g>
      {nodes.map((n) => (
        <g key={n.label}>
          <rect x={n.x} y={n.y - 12} width="72" height="24" rx="7" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.16)" />
          <circle cx={n.x + 12} cy={n.y} r="2.6" fill={n.tone} />
          <text x={n.x + 21} y={n.y + 3.4} fill="rgba(255,255,255,.72)" fontSize="8.6" fontFamily="Inter, sans-serif">
            {n.label}
          </text>
        </g>
      ))}
      <g>
        <rect x="206" y="98" width="80" height="22" rx="7" fill="rgba(95,212,143,.14)" stroke="rgba(95,212,143,.35)" />
        <text x="216" y="112.6" fill="#8FE3B4" fontSize="8.6" fontFamily="Inter, sans-serif">
          Audit trail
        </text>
      </g>
      <path d="M246 64 C246 82 246 90 246 98" stroke="rgba(95,212,143,.35)" strokeWidth="1" fill="none" strokeDasharray="3 3" />
    </svg>
  )
}
