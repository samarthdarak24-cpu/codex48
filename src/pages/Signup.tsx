import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  Workflow,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { BrandMark } from '@/components/layout/Shell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

const HIGHLIGHTS = [
  { icon: ShieldCheck, title: 'Evidence-backed content reviews', copy: 'Every finding cites the exact guideline passage it came from.' },
  { icon: Workflow, title: 'Human-controlled approvals', copy: 'Approvals and exceptions stay with your brand managers.' },
  { icon: Sparkles, title: 'Rule-change impact simulation', copy: 'See which content a rule change would affect before you activate it.' },
]

export default function SignupPage() {
  const { register, status, user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'creator' | 'manager'>('creator')
  const [workspace, setWorkspace] = useState('PureGlow')
  const [showPassword, setShowPassword] = useState(false)
  const [agree, setAgree] = useState(true)
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; form?: string }>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && user) {
      navigate(user.role === 'manager' ? '/manager/overview' : '/app/overview', { replace: true })
    }
  }, [status, user, navigate])

  function validate() {
    const next: typeof errors = {}
    if (!name.trim()) next.name = 'Please enter your full name.'
    if (!email.trim()) next.email = 'Enter your work email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'That email address doesn’t look right.'
    if (!password) next.password = 'Enter a password.'
    else if (password.length < 6) next.password = 'Password must be at least 6 characters.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    if (!agree) {
      setErrors({ form: 'Please accept the Terms of Service to create an account.' })
      return
    }
    setErrors({})
    setLoading(true)
    try {
      const account = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        workspace: workspace.trim() || 'PureGlow',
      })
      navigate(account.role === 'manager' ? '/manager/overview' : '/app/overview', { replace: true })
    } catch (err: any) {
      setErrors({ form: err instanceof Error ? err.message : 'Unable to create account. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* ---------------- Brand panel (Left) ---------------- */}
      <div className="relative hidden w-[50%] overflow-hidden bg-[#1B231D] lg:flex lg:flex-col">
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
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark size={32} />
            <div>
              <p className="text-[17px] font-bold leading-[19px] tracking-[-0.02em] text-white">Precedent</p>
              <p className="text-[10px] font-medium tracking-[0.08em] text-[#A9B892] uppercase">
                Brand Governance
              </p>
            </div>
          </Link>

          <div className="my-auto max-w-[460px] py-8">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-[#8FE3B4] backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" /> Enterprise Onboarding
            </span>
            <h1 className="mt-4 font-serif text-3xl font-bold leading-[1.2] tracking-tight text-white xl:text-4xl">
              Start governing marketing copy with confidence.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Create an account to run deterministic brand compliance checks, configure AI agent workflows, and maintain an immutable governance audit trail.
            </p>

            <div className="mt-8 space-y-4">
              {HIGHLIGHTS.map((h) => {
                const Icon = h.icon
                return (
                  <div key={h.title} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[#8FE3B4]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-semibold text-white">{h.title}</h2>
                      <p className="text-[11px] text-white/60">{h.copy}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <p className="text-xs text-white/40">
            Protected by enterprise RBAC, append-only SHA-256 audit logs, and SOC 2 Type II controls.
          </p>
        </div>
      </div>

      {/* ---------------- Form panel (Right) ---------------- */}
      <div className="flex flex-1 flex-col justify-between overflow-y-auto">
        <header className="flex items-center justify-between border-b border-line px-6 py-4 sm:px-10">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <BrandMark size={24} />
            <span className="text-sm font-bold tracking-tight text-ink">Precedent</span>
          </Link>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-muted">Already have an account?</span>
            <Link
              to="/login"
              className="font-semibold text-brand-600 transition-colors hover:text-brand-700 underline underline-offset-4"
            >
              Sign in
            </Link>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-md">
            <div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Create your account
              </h2>
              <p className="mt-1.5 text-xs text-muted sm:text-sm">
                Get started with automated brand governance in seconds.
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {errors.form && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2.5 text-xs font-medium text-danger-700"
                >
                  <Lock className="mt-[1px] h-3.5 w-3.5 shrink-0" />
                  {errors.form}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label htmlFor="signup-name" className="label text-xs font-semibold text-ink-700">
                  Full name
                </label>
                <div className="relative mt-1">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-light" />
                  <Input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      setErrors((p) => ({ ...p, name: undefined, form: undefined }))
                    }}
                    placeholder="e.g. Sarah Jenkins"
                    className="pl-9"
                    invalid={Boolean(errors.name)}
                  />
                </div>
                {errors.name && <p className="mt-1 text-xs font-medium text-danger-600">{errors.name}</p>}
              </div>

              {/* Work Email */}
              <div>
                <label htmlFor="signup-email" className="label text-xs font-semibold text-ink-700">
                  Work email
                </label>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-light" />
                  <Input
                    id="signup-email"
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
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs font-medium text-danger-600">{errors.email}</p>}
              </div>

              {/* Role Selection */}
              <div>
                <label className="label text-xs font-semibold text-ink-700">Select your role</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRole('creator')}
                    className={cn(
                      'flex flex-col rounded-xl border p-3 text-left transition-all',
                      role === 'creator'
                        ? 'border-brand-500 bg-brand-50/60 shadow-xs'
                        : 'border-line bg-white hover:border-line-strong'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink">Content Creator</span>
                      {role === 'creator' && <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" />}
                    </div>
                    <span className="mt-1 text-[11px] text-muted leading-tight">
                      Drafts copy, runs AI pre-checks, submits for approval
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('manager')}
                    className={cn(
                      'flex flex-col rounded-xl border p-3 text-left transition-all',
                      role === 'manager'
                        ? 'border-brand-500 bg-brand-50/60 shadow-xs'
                        : 'border-line bg-white hover:border-line-strong'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink">Brand Manager</span>
                      {role === 'manager' && <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" />}
                    </div>
                    <span className="mt-1 text-[11px] text-muted leading-tight">
                      Reviews submissions, writes rules, oversees agents
                    </span>
                  </button>
                </div>
              </div>

              {/* Brand Workspace */}
              <div>
                <label htmlFor="signup-workspace" className="label text-xs font-semibold text-ink-700">
                  Brand workspace
                </label>
                <div className="relative mt-1">
                  <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-light" />
                  <Input
                    id="signup-workspace"
                    type="text"
                    value={workspace}
                    onChange={(e) => setWorkspace(e.target.value)}
                    placeholder="e.g. PureGlow"
                    className="pl-9"
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted">Demo workspace data defaults to PureGlow.</p>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="signup-password" className="label text-xs font-semibold text-ink-700">
                  Password
                </label>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-light" />
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setErrors((p) => ({ ...p, password: undefined, form: undefined }))
                    }}
                    placeholder="At least 6 characters"
                    className="pl-9 pr-9"
                    invalid={Boolean(errors.password)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-light transition-colors hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs font-medium text-danger-600">{errors.password}</p>}
              </div>

              {/* Agree checkbox */}
              <label className="flex cursor-pointer select-none items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="h-3.5 w-3.5 rounded-[4px] border-line-strong text-brand-600"
                />
                <span className="text-xs text-ink-600">
                  I agree to the <a href="#" className="underline text-brand-700">Terms</a> and{' '}
                  <a href="#" className="underline text-brand-700">Privacy Policy</a>
                </span>
              </label>

              <Button
                type="submit"
                block
                size="lg"
                loading={loading}
                iconRight={<ArrowRight className="h-3.5 w-3.5" />}
                className="mt-2"
              >
                Create Account
              </Button>
            </form>

            {/* Quick Demo Switcher banner */}
            <div className="mt-6 rounded-xl border border-line bg-[#FAF7EF] p-3 text-center">
              <p className="text-xs text-ink-700">
                Evaluating Precedent without signing up?
              </p>
              <Link
                to="/login"
                className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-800"
              >
                <span>Use 1-click Demo Accounts on the Sign In page</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-6 py-4 text-[11px] text-muted-light sm:px-10">
          <p>© {new Date().getFullYear()} Precedent. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <a href="#" className="transition-colors hover:text-muted">Privacy</a>
            <a href="#" className="transition-colors hover:text-muted">Terms</a>
            <a href="#" className="transition-colors hover:text-muted">Security</a>
          </div>
        </footer>
      </div>
    </div>
  )
}

