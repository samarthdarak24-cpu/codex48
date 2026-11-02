import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { BrandMark } from '@/components/layout/Shell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { authApi } from '@/services/api'
import { cn } from '@/lib/utils'

const DEMO_ACCOUNTS = [
  {
    role: 'Brand Manager',
    name: 'David Kim',
    email: 'david.kim@pureglow.co',
    badge: 'Approver & Admin',
    tone: 'from-[#4E7A3D] to-[#74975F]',
    borderHover: 'hover:border-[#4E7A3D]/40 hover:shadow-[#4E7A3D]/10',
  },
  {
    role: 'Content Creator',
    name: 'Emily Carter',
    email: 'emily.carter@pureglow.co',
    badge: 'Creator & Submissions',
    tone: 'from-[#2FB86B] to-[#5FD48F]',
    borderHover: 'hover:border-[#2FB86B]/40 hover:shadow-[#2FB86B]/10',
  },
]

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: 'Evidence-backed content reviews',
    copy: 'Every finding cites the exact guideline passage it came from.',
  },
  {
    icon: Workflow,
    title: 'Human-controlled approvals',
    copy: 'Deterministic rules ensure approvals and exceptions stay with brand managers.',
  },
  {
    icon: Sparkles,
    title: 'Rule-change impact simulation',
    copy: 'See which content a rule change would affect before you activate it.',
  },
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
  const [activeDemo, setActiveDemo] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated' && user) {
      navigate(user.role === 'manager' ? '/manager/overview' : '/creator/dashboard', { replace: true })
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
        await authApi.requestReset(email)
        setResetSent(true)
        return
      }
      const account = await login(email, password)
      navigate(account.role === 'manager' ? '/manager/overview' : '/creator/dashboard', { replace: true })
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Unable to sign in. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  function useDemo(demoEmail: string) {
    setActiveDemo(demoEmail)
    setEmail(demoEmail)
    setPassword('precedent')
    setErrors({})
    setMode('signin')
    setTimeout(() => setActiveDemo(null), 1200)
  }

  return (
    <div className="flex min-h-screen bg-[#FDFBF7]">
      {/* ---------------- Brand panel (Left) ---------------- */}
      <div className="relative hidden w-[50%] overflow-hidden bg-[#1B231D] lg:flex lg:flex-col">
        {/* Animated ambient mesh lighting */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_0%_0%,#14324F_0%,#1B231D_55%,#081421_100%)]" />

          {/* Floating aurora orb 1 */}
          <div className="absolute -left-20 top-12 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-[#4E7A3D]/30 via-[#2FB86B]/25 to-[#8FE3B4]/15 blur-[120px] animate-float-slow" />

          {/* Floating aurora orb 2 */}
          <div className="absolute -bottom-24 right-[-40px] h-[460px] w-[460px] rounded-full bg-gradient-to-br from-[#14324F]/50 via-[#2FB86B]/20 to-[#4E7A3D]/30 blur-[130px] animate-float-reverse" />

          {/* Subtle pulsating center aura */}
          <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8FE3B4]/10 blur-[90px] animate-pulse-glow" />

          {/* Tech blueprint grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.10) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'radial-gradient(80% 60% at 30% 20%, black 0%, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(80% 60% at 30% 20%, black 0%, transparent 75%)',
            }}
          />
        </div>

        {/* Content wrapper */}
        <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">
          {/* Top Brand Link */}
          <div className="flex items-center justify-between">
            <Link to="/" className="group flex items-center gap-3 transition-transform hover:scale-[1.02]">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-md">
                <BrandMark size={24} />
              </div>
              <div>
                <p className="text-[18px] font-bold leading-[20px] tracking-[-0.02em] text-white">Precedent</p>
                <p className="text-[11px] leading-[14px] text-white/50">AI-Assisted Brand Governance</p>
              </div>
            </Link>

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-2xs font-medium text-white/70 backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/[0.12] hover:text-white"
            >
              <ArrowLeft className="h-3 w-3" />
              Product Home
            </Link>
          </div>

          {/* Hero Statement */}
          <div className="max-w-[460px] py-4">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-3 py-1 text-[11px] font-medium tracking-[0.03em] text-white/80 backdrop-blur-md shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5FD48F] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5FD48F]" />
              </span>
              TRACEABLE BRAND GOVERNANCE · CODEX SPEC
            </div>

            <h1 className="text-balance text-[38px] font-semibold leading-[1.15] tracking-[-0.03em] text-white xl:text-[42px]">
              Your Brand Rules.
              <br />
              Clear Decisions.
              <br />
              <span className="bg-gradient-to-r from-[#8FE3B4] via-[#5FD48F] to-[#A8F3C7] bg-clip-text text-transparent">
                Stronger Consistency.
              </span>
            </h1>

            <p className="mt-4 text-[14px] leading-[22px] text-white/60">
              Precedent helps teams review content against deterministic brand rules, manage scoped exceptions, and keep
              every approval traceable with verifiable evidence and cryptographic passports.
            </p>
          </div>

          {/* Live Approved Creative Visual Showcase */}
          <div className="relative my-2 rounded-2xl border border-white/15 bg-gradient-to-r from-white/[0.09] via-white/[0.04] to-white/[0.08] p-3.5 backdrop-blur-xl shadow-2xl overflow-hidden group transition-all duration-300 hover:border-white/30">
            <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#5FD48F]/20 blur-xl animate-pulse-glow" />

            <div className="flex items-center gap-3.5">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-black/40 shadow-md">
                <img
                  src="/images/brand/serum.webp"
                  alt="PureGlow Botanical Serum"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-emerald-500/90 px-1 py-0.2 text-[8px] font-bold text-white shadow-2xs">
                  <ShieldCheck className="h-2.5 w-2.5" /> PASSED
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-bold text-white truncate">Radiant Botanical Serum v2.0</span>
                  <span className="rounded-full bg-emerald-500/25 px-2 py-0.5 text-[9px] font-bold text-[#8FE3B4] border border-emerald-400/40 shadow-xs">
                    SHA-256 Sealed
                  </span>
                </div>
                <p className="mt-0.5 text-[10.5px] text-white/65 truncate">
                  Approved by David Kim · 0 Violations · ProofPass Issued
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-[9px] text-white/50">
                  <span className="flex items-center gap-1 font-mono text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#5FD48F] animate-ping" />
                    #7AB93B Primacy
                  </span>
                  <span>·</span>
                  <span>Verified Page 12 §3.2</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive animated governance visual */}
          <div className="relative my-4 hidden xl:block">
            <GovernanceDiagram />
          </div>

          {/* Highlights in glassmorphic cards */}
          <ul className="grid gap-2.5">
            {HIGHLIGHTS.map((h) => (
              <li
                key={h.title}
                className="group flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-3 backdrop-blur-md transition-all duration-300 hover:border-[#8FE3B4]/40 hover:bg-white/[0.09] hover:translate-x-1"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.08] shadow-sm transition-transform group-hover:scale-110">
                  <h.icon className="h-3.5 w-3.5 text-[#8FE3B4]" strokeWidth={2.2} />
                </span>
                <div>
                  <p className="text-[13px] font-medium leading-[17px] text-white/90">{h.title}</p>
                  <p className="text-[11.5px] leading-[16px] text-white/45">{h.copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ---------------- Auth panel (Right) ---------------- */}
      <div className="relative flex w-full flex-1 flex-col overflow-y-auto lg:w-[50%]">
        {/* Soft floating background aura */}
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-gradient-to-bl from-brand-100/40 via-emerald-100/20 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-gradient-to-tr from-cream-100/60 to-transparent blur-3xl" />

        {/* Top Navbar */}
        <div className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
          <div className="flex items-center gap-2.5 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <BrandMark size={28} />
              <span className="text-[16px] font-bold tracking-[-0.02em] text-ink">Precedent</span>
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
              </span>
              <span className="text-[11.5px] font-medium text-muted">System Live · API 8000</span>
            </div>

            <span className="text-line-strong">|</span>

            <div className="flex items-center gap-1.5 rounded-full border border-line bg-white/90 px-2.5 py-1 text-[11px] font-medium text-ink shadow-2xs backdrop-blur-sm">
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-500 text-[8px] font-bold text-white">PG</span>
              <span>Workspace: <strong className="font-semibold text-brand-700">PureGlow</strong></span>
            </div>
          </div>

          <Link
            to="/"
            className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-white/80 px-3 py-1.5 text-xs font-medium text-ink-600 shadow-2xs backdrop-blur-sm transition-all hover:border-brand-300 hover:text-ink hover:shadow-sm"
          >
            <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
            Back to Home
          </Link>
        </div>

        {/* Form Container */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-[420px] animate-fade-up">
            {/* Card wrapper */}
            <div className="rounded-2xl border border-line/90 bg-white/90 p-7 shadow-[0_20px_50px_-20px_rgba(15,33,56,0.12)] backdrop-blur-md sm:p-8">
              {mode === 'reset' ? (
                <>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-warn-50 text-warn-600 border border-warn-100">
                      <Lock className="h-4 w-4" />
                    </span>
                    <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Reset password</h2>
                  </div>
                  <p className="mt-1 text-sm leading-[20px] text-muted">
                    Enter the email linked to your workspace to request a reset.
                  </p>

                  {resetSent ? (
                    <div className="mt-6 rounded-xl border border-success-200 bg-success-50/80 p-4 animate-scale-in">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-[1px] h-4 w-4 shrink-0 text-success-600" />
                        <div>
                          <p className="text-sm font-semibold text-success-800">Request recorded</p>
                          <p className="mt-0.5 text-xs leading-[17px] text-success-700">
                            A workspace administrator will reset the credentials for{' '}
                            <span className="font-semibold">{email}</span>.
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => {
                          setMode('signin')
                          setResetSent(false)
                        }}
                      >
                        Back to sign in
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                      <div>
                        <label htmlFor="reset-email" className="label text-xs font-semibold text-ink-700">
                          Work email
                        </label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-light" />
                          <Input
                            id="reset-email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@pureglow.co"
                            className={cn('pl-9 h-11', errors.email && 'field-error')}
                            invalid={Boolean(errors.email)}
                          />
                        </div>
                        {errors.email && <p className="mt-1 text-xs font-medium text-danger-600">{errors.email}</p>}
                      </div>

                      <Button type="submit" block size="lg" loading={loading} className="h-11 shadow-md">
                        Send reset link
                      </Button>

                      <button
                        type="button"
                        onClick={() => setMode('signin')}
                        className="w-full text-center text-xs font-medium text-muted transition-colors hover:text-ink"
                      >
                        ← Back to sign in
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold tracking-[-0.025em] text-ink">Sign in to Precedent</h2>
                      <p className="mt-1 text-sm leading-[20px] text-muted">
                        Select a demo account or sign in with work email.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                    {errors.form && (
                      <div
                        role="alert"
                        className="flex items-start gap-2 rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-3 text-xs font-medium text-danger-700 animate-shake"
                      >
                        <Lock className="mt-[1px] h-3.5 w-3.5 shrink-0 text-danger-600" />
                        {errors.form}
                      </div>
                    )}

                    <div>
                      <label htmlFor="email" className="label text-xs font-semibold text-ink-700">
                        Work email
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-light" />
                        <Input
                          id="email"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value)
                            setErrors((p) => ({ ...p, email: undefined, form: undefined }))
                          }}
                          placeholder="you@pureglow.co"
                          className="h-11 pl-10 text-sm transition-all focus:ring-2 focus:ring-brand-500/20"
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
                        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-light" />
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
                          className="h-11 pl-10 pr-10 text-sm transition-all focus:ring-2 focus:ring-brand-500/20"
                          invalid={Boolean(errors.password)}
                          aria-invalid={Boolean(errors.password)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-light transition-transform hover:scale-110 hover:text-ink"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="mt-1 text-xs font-medium text-danger-600">{errors.password}</p>}
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <label className="flex cursor-pointer select-none items-center gap-2">
                        <input
                          type="checkbox"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                          className="h-4 w-4 rounded-[4px] border-line-strong text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-xs text-ink-600">Keep me signed in</span>
                      </label>
                    </div>

                    <Button
                      type="submit"
                      block
                      size="lg"
                      loading={loading}
                      iconRight={<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                      className="h-11 font-semibold shadow-md transition-all hover:shadow-lg"
                    >
                      Sign in to Workspace
                    </Button>
                  </form>

                  {/* 1-Click Demo Accounts Container */}
                  <div className="mt-6 rounded-xl border border-brand-200/70 bg-gradient-to-b from-[#F5F8F2] to-[#FAF7EF] p-3.5 shadow-sm">
                    <div className="mb-2.5 flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-brand-700">
                        <Zap className="h-3 w-3 fill-brand-600 text-brand-600" />
                        1-Click Instant Demo
                      </p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-brand-600 border border-brand-200/60 shadow-2xs">
                        pre-filled credentials
                      </span>
                    </div>

                    <div className="space-y-2">
                      {DEMO_ACCOUNTS.map((a) => {
                        const isFilled = activeDemo === a.email
                        return (
                          <button
                            key={a.email}
                            type="button"
                            onClick={() => useDemo(a.email)}
                            className={cn(
                              'group flex w-full items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5 text-left transition-all duration-200',
                              a.borderHover,
                              'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
                              isFilled && 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[11px] font-bold text-white shadow-sm transition-transform group-hover:scale-105',
                                a.tone,
                              )}
                            >
                              {a.name.split(' ').map((n) => n[0]).join('')}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5">
                                <span className="block text-xs font-bold leading-[16px] text-ink">{a.role}</span>
                                <span className="rounded px-1.5 py-0.2 text-[9.5px] font-medium bg-canvas text-muted">
                                  {a.name}
                                </span>
                              </span>
                              <span className="block truncate text-2xs leading-[14px] text-muted-light">{a.email}</span>
                            </span>
                            <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-2xs font-semibold text-brand-700 transition-all group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-sm">
                              {isFilled ? 'Filled ✓' : 'Use'}
                              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    <p className="mt-2.5 text-center text-[10.5px] leading-[14px] text-muted">
                      Default password: <span className="font-semibold text-ink">precedent</span> · Fully seeded data
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Access help */}
            <p className="mt-4 text-center text-xs text-muted">
              Need access for a custom enterprise workspace?{' '}
              <a href="mailto:access@precedent.app" className="font-medium text-brand-600 underline hover:text-brand-700">
                Contact team
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 bg-white/50 px-6 py-4 text-[11px] text-muted-light backdrop-blur-sm sm:px-10">
          <p>© {new Date().getFullYear()} Precedent — AI-Assisted Brand Governance</p>
          <div className="flex items-center gap-4">
            <Link to="/" className="transition-colors hover:text-ink">
              Home
            </Link>
            <Link to="/verify" className="transition-colors hover:text-ink">
              Verify Passport
            </Link>
            <span className="text-line-strong">·</span>
            <span>Security</span>
            <span>Privacy</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Decorative Governance Diagram with animated connectors             */
/* ------------------------------------------------------------------ */

function GovernanceDiagram() {
  const nodes = [
    { x: 14, y: 52, label: 'Guidelines', tone: '#5FD48F', desc: 'PyMuPDF' },
    { x: 118, y: 20, label: 'Rules Engine', tone: '#74975F', desc: 'Deterministic' },
    { x: 118, y: 84, label: 'Evidence', tone: '#F0A32A', desc: 'BM25 + RRF' },
    { x: 226, y: 52, label: 'Decision', tone: '#8FE3B4', desc: 'Human Mgr' },
  ]

  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between text-2xs text-white/50">
        <span className="font-semibold uppercase tracking-wider text-white/70">Governance Architecture</span>
        <span className="inline-flex items-center gap-1 text-[#8FE3B4]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#5FD48F] animate-pulse" />
          Live Engine
        </span>
      </div>

      <svg viewBox="0 0 320 135" className="h-[135px] w-full" aria-hidden>
        <defs>
          <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5FD48F" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#8FE3B4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#A8F3C7" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Animated Connector paths */}
        <g stroke="rgba(255,255,255,.2)" strokeWidth="1.2" fill="none">
          <path d="M60 58 C86 58 84 28 114 26" strokeDasharray="3 3" />
          <path d="M60 66 C86 66 84 94 114 94" strokeDasharray="3 3" />
          <path d="M168 26 C194 26 196 52 222 56" stroke="url(#flowGrad)" strokeWidth="1.6" />
          <path d="M168 94 C194 94 196 68 222 62" stroke="url(#flowGrad)" strokeWidth="1.6" />
        </g>

        {/* Nodes */}
        {nodes.map((n) => (
          <g key={n.label} className="cursor-pointer transition-transform hover:scale-105">
            <rect
              x={n.x}
              y={n.y - 14}
              width="80"
              height="28"
              rx="8"
              fill="rgba(255,255,255,.09)"
              stroke="rgba(255,255,255,.2)"
              strokeWidth="1"
            />
            <circle cx={n.x + 10} cy={n.y} r="3" fill={n.tone} />
            <text x={n.x + 18} y={n.y + 3.5} fill="rgba(255,255,255,.9)" fontSize="9" fontWeight="600" fontFamily="Inter, sans-serif">
              {n.label}
            </text>
          </g>
        ))}

        {/* Audit Trail Badge */}
        <g>
          <rect
            x="210"
            y="98"
            width="96"
            height="24"
            rx="7"
            fill="rgba(95,212,143,.16)"
            stroke="rgba(95,212,143,.45)"
            strokeWidth="1"
          />
          <circle cx="220" cy="110" r="2.5" fill="#8FE3B4" className="animate-ping" />
          <circle cx="220" cy="110" r="2.5" fill="#8FE3B4" />
          <text x="228" y="113.5" fill="#8FE3B4" fontSize="8.5" fontWeight="600" fontFamily="Inter, sans-serif">
            ProofPass Trail
          </text>
        </g>

        {/* Link from decision to audit */}
        <path d="M266 66 C266 80 266 88 266 98" stroke="rgba(95,212,143,.4)" strokeWidth="1.2" fill="none" strokeDasharray="2 2" />
      </svg>
    </div>
  )
}
