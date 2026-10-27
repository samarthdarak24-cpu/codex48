import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  Clock3,
  Code2,
  Cpu,
  Database,
  ExternalLink,
  Eye,
  FileSearch,
  FileText,
  FlaskConical,
  GraduationCap,
  History,
  Layers,
  Lock,
  Minus,
  Plus,
  Quote,
  Scale,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import { AssetCard, ASSETS } from '@/components/marketing/AssetArt'
import { Reveal } from '@/components/marketing/Reveal'
import { Avatar } from '@/components/ui/Misc'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

function Pill({ children, tone = 'cream' }: { children: React.ReactNode; tone?: 'cream' | 'lilac' | 'mint' | 'blush' }) {
  const tones = {
    cream: 'bg-white/80 text-ink-600 border-ink/10',
    lilac: 'bg-white text-[#55653D] border-[#DED6F1]',
    mint: 'bg-[#E9F6DD] text-[#3F6B24] border-[#D6E9C4]',
    blush: 'bg-[#FBEEF1] text-[#A03A52] border-[#F2D9DF]',
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-medium', tones[tone])}>
      {children}
    </span>
  )
}

function SectionHeading({
  eyebrow,
  title,
  sub,
  align = 'center',
  tone = 'cream',
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  sub?: string
  align?: 'center' | 'left'
  tone?: 'cream' | 'lilac' | 'mint' | 'blush'
}) {
  return (
    <div className={cn('max-w-[720px]', align === 'center' && 'mx-auto text-center')}>
      {eyebrow && <div className="mb-5">{<Pill tone={tone}>{eyebrow}</Pill>}</div>}
      <h2 className="mkt-display text-balance text-[34px] text-ink sm:text-[42px] lg:text-[46px]">{title}</h2>
      {sub && <p className={cn('mt-4 text-[15px] leading-[24px] text-muted', align === 'center' && 'mx-auto max-w-[560px]')}>{sub}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 1. Hero                                                             */
/* ------------------------------------------------------------------ */

function Hero() {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollStrip = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }

  return (
    <section className="relative overflow-hidden bg-cream pb-8 pt-[104px] sm:pt-[124px]">
      {/* soft animated wash */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-10%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[#EAF3D8]/60 blur-[120px] animate-pulse-glow" />
        <div className="absolute right-[-10%] top-[30%] h-[360px] w-[360px] rounded-full bg-[#F8E4C8]/50 blur-[100px] animate-float-slow" />
      </div>

      <div className="relative mkt-container">
        <div className="mx-auto max-w-[860px] text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/80 px-3.5 py-1.5 text-[11.5px] font-medium text-ink-600 shadow-2xs backdrop-blur transition-transform hover:scale-105">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-500 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success-500" />
              </span>
              Inkloom AI Brand Governance Challenge · Team We Code Coders
            </span>
          </Reveal>

          <Reveal delay={70}>
            <h1 className="mkt-display mt-6 text-balance text-[46px] text-ink sm:text-[64px] lg:text-[78px]">
              Every brand decision,
              <br />
              <span className="relative inline-block">
                with its evidence.
                <svg
                  className="absolute -bottom-1 left-0 h-[10px] w-full text-[#B9DE7E] animate-draw"
                  viewBox="0 0 300 10"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <path d="M2 7c60-5 120-6 180-4s80 4 116 2" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
          </Reveal>

          <Reveal delay={130}>
            <p className="mx-auto mt-6 max-w-[580px] text-[15.5px] leading-[26px] text-ink-600/85">
              Precedent helps marketing teams check content against stored brand guidelines, cites the exact passage
              behind every finding, and manages scoped exceptions and rule simulations before policies become active.
            </p>
          </Reveal>

          <Reveal delay={190}>
            <div className="mt-8 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
              <Link to="/login" className="mkt-pill-dark w-full sm:w-auto group">
                Launch Live Prototype
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <a href="#solution" className="mkt-pill-light w-full sm:w-auto">
                Explore Challenge Solution
              </a>
            </div>
            <p className="mt-4 text-[12px] text-muted-light">
              Fictional Demo Workspace · Vishwakarma Institute of Pune · 12 Interactive Screens Ready
            </p>
          </Reveal>
        </div>
      </div>

      {/* asset strip — bleeds off the right edge */}
      <Reveal delay={240} className="relative mt-12 sm:mt-14">
        <div className="mkt-container">
          <div className="mb-3.5 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[12px] font-medium text-ink-600">
                Live Brand Assets <span className="hidden sm:inline text-muted-light">· {ASSETS.length} campaigns evaluated</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollStrip(-260)}
                aria-label="Scroll left"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-ink/10 bg-white/80 text-ink shadow-2xs backdrop-blur-sm transition-all hover:bg-white hover:scale-105 active:scale-95"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => scrollStrip(260)}
                aria-label="Scroll right"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-ink/10 bg-white/80 text-ink shadow-2xs backdrop-blur-sm transition-all hover:bg-white hover:scale-105 active:scale-95"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="relative">
            {/* Edge fades */}
            <div className="pointer-events-none absolute -left-5 top-0 bottom-4 w-12 sm:w-16 bg-gradient-to-r from-cream to-transparent z-10" />
            <div className="pointer-events-none absolute -right-5 top-0 bottom-4 w-12 sm:w-16 bg-gradient-to-l from-cream to-transparent z-10" />

            <div
              ref={scrollRef}
              className="-mr-5 flex gap-3.5 overflow-x-auto pb-4 no-scrollbar sm:-mr-8 sm:gap-4 scroll-smooth"
            >
              {ASSETS.map((a, i) => (
                <div
                  key={a.id}
                  className="group relative aspect-[4/5] w-[200px] shrink-0 overflow-hidden rounded-[22px] ring-1 ring-ink/[0.08] shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl sm:w-[240px]"
                  style={{ transitionDelay: `${i * 25}ms` }}
                >
                  <AssetCard variant={a} />
                </div>
              ))}

              {/* Submit asset interactive card */}
              <Link
                to="/login"
                className="group aspect-[4/5] w-[170px] shrink-0 rounded-[22px] border-2 border-dashed border-ink/20 bg-white/50 backdrop-blur-sm p-4 flex flex-col items-center justify-center text-center transition-all duration-300 hover:border-brand-500 hover:bg-white/90 hover:shadow-lg sm:w-[200px]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-transform duration-300 group-hover:scale-110 group-hover:bg-brand-500 group-hover:text-white">
                  <Plus className="h-5 w-5" />
                </div>
                <p className="mt-3 text-[12.5px] font-semibold text-ink">Submit creative</p>
                <p className="mt-1 text-[10.5px] text-muted">Test your guidelines</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 group-hover:translate-x-0.5 transition-transform">
                  Try sandbox <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 2. Logo strip                                                       */
/* ------------------------------------------------------------------ */

const LOGOS = [
  { name: 'PureGlow', className: 'text-[17px] font-extrabold tracking-[-0.03em]' },
  { name: 'WellnessLife', className: 'font-display text-[19px] tracking-[-0.01em]' },
  { name: 'NORTHWIND', className: 'text-[13px] font-semibold uppercase tracking-[0.24em]' },
  { name: 'Meridian', className: 'text-[16px] font-light tracking-[0.14em]' },
  { name: 'alto', className: 'text-[19px] font-black lowercase tracking-[-0.04em]' },
  { name: 'Kestrel', className: 'font-display text-[18px] italic' },
]

function LogoStrip() {
  return (
    <section className="border-b border-ink/[0.06] bg-white py-10 overflow-hidden">
      <div className="mkt-container">
        <Reveal className="flex flex-col items-center gap-6 lg:flex-row lg:justify-between">
          <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-light">
            Trusted by brand teams at
          </p>
          <div className="relative w-full max-w-[800px] overflow-hidden mkt-fade-x">
            <div className="animate-marquee-track flex items-center gap-12 py-1">
              {[...LOGOS, ...LOGOS].map((l, idx) => (
                <span
                  key={`${l.name}-${idx}`}
                  className={cn(
                    'shrink-0 text-ink/35 transition-all duration-300 hover:text-ink/80 hover:scale-105 cursor-pointer',
                    l.className,
                  )}
                >
                  {l.name}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 3. Statement                                                        */
/* ------------------------------------------------------------------ */

function Statement() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mkt-container grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
        <Reveal>
          <h2 className="mkt-display text-[40px] leading-[1.04] text-ink sm:text-[54px] lg:text-[62px]">
            When every asset
            <br />
            has to be on brand.
          </h2>
        </Reveal>
        <Reveal delay={90} className="flex flex-col justify-center">
          <p className="max-w-[430px] text-[15px] leading-[26px] text-muted">
            Most brand reviews still happen in screenshots and Slack threads — and nobody can say afterwards which rule
            applied, or why the exception was allowed. Precedent replaces the guesswork with a record.
          </p>
          <div className="mt-6">
            <a href="#pricing" className="mkt-pill-dark">
              Talk to our team
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 4. Platform band                                                    */
/* ------------------------------------------------------------------ */

function PlatformBand() {
  return (
    <section id="platform" className="scroll-mt-24 bg-lilac-50 py-20 lg:py-24">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            tone="lilac"
            eyebrow={
              <>
                <Sparkles className="h-3 w-3" />
                Built for brand governance
              </>
            }
            title={
              <>
                Connecting guidelines, content
                <br className="hidden sm:block" /> and the decisions in between.
              </>
            }
            sub="One system for the whole review — from the PDF your guidelines live in, to the approval that lets an asset ship."
          />
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 5. Evidence split                                                   */
/* ------------------------------------------------------------------ */

function EvidenceSplit() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mkt-container grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <h2 className="mkt-display text-[36px] leading-[1.06] text-ink sm:text-[46px]">
            Find the exact rule
            <br />
            behind every finding.
          </h2>
          <p className="mt-5 max-w-[420px] text-[15px] leading-[26px] text-muted">
            Each finding names the rule, the guideline version and the page it came from. If the passage can’t be
            verified against the stored document, the finding is marked for human review instead of being presented as
            fact.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link to="/login" className="mkt-pill-dark group">
              See a review
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <a href="#workflow" className="mkt-pill-light">
              Explore the rules
            </a>
          </div>
        </Reveal>

        <Reveal delay={120} className="relative">
          <div className="relative mx-auto max-w-[380px]">
            <div className="aspect-[4/5] overflow-hidden rounded-[26px] ring-1 ring-ink/[0.07] shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.01]">
              <AssetCard variant={ASSETS[0]} size="lg" />
            </div>

            {/* floating evidence card */}
            <div className="absolute -bottom-8 -left-4 w-[280px] rounded-2xl border border-ink/[0.08] bg-white/95 backdrop-blur-md p-4 shadow-[0_24px_60px_-28px_rgba(15,33,56,0.45)] animate-float-slow sm:-left-10">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-danger-500" />
                </span>
                <p className="text-[11px] font-semibold text-ink">Approved background colours</p>
              </div>
              <p className="mt-0.5 text-[9.5px] font-medium uppercase tracking-[0.06em] text-muted-light">BR-01 · High priority</p>
              <p className="mt-2 border-l-2 border-[#BFD3B2] pl-2 text-[10.5px] italic leading-[15px] text-ink-600">
                “Primary green (#7AB93B) and the neutral sand (#F4EFE3) are the only approved campaign background
                colours.”
              </p>
              <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2">
                <span className="text-[9px] text-muted-light">Colour Palette Guide v1.0 · p.12</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-1.5 py-[1px] text-[9px] font-semibold text-success-700">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Verified
                </span>
              </div>
            </div>

            {/* floating status chip */}
            <div className="absolute -right-3 top-6 rounded-full border border-ink/[0.08] bg-white/95 backdrop-blur-md px-3.5 py-1.5 text-[10.5px] font-medium text-ink shadow-[0_12px_30px_-16px_rgba(15,33,56,0.4)] animate-float-reverse sm:-right-6">
              Suggested fix ready
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 6. Better way — 3 columns with rich visual mockups            */
/* ------------------------------------------------------------------ */

const PILLARS = [
  {
    title: 'Reviews that cite their sources',
    body: 'Every finding links to the page and passage it came from. No citation, no claim — unverified passages are flagged for a human.',
    icon: FileSearch,
    badge: '100% Traceable',
    visual: (
      <div className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3.5 text-[11px] shadow-2xs">
        <div className="flex items-center justify-between text-emerald-900 font-semibold mb-1.5 pb-1.5 border-b border-emerald-200/50">
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-emerald-600" />
            PureGlow_Guidelines.pdf
          </span>
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-800 border border-emerald-200">
            p.14 §3.2
          </span>
        </div>
        <p className="italic text-emerald-950 font-serif text-[11.5px] leading-snug">
          “Primary claims must cite verified batch clinical laboratory results.”
        </p>
        <div className="mt-2.5 flex items-center justify-between text-[10px] text-emerald-700 font-bold pt-1">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Deterministic Citation Anchor
          </span>
          <span className="text-emerald-800 font-mono">BR-01</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Approvals that respect versions',
    body: 'A decision attaches to a specific content version. Edit the asset and the old approval doesn’t quietly follow it.',
    icon: Layers,
    badge: 'SHA-256 Sealed',
    visual: (
      <div className="mt-4 rounded-xl border border-blue-200/80 bg-blue-50/60 p-3.5 text-[11px] shadow-2xs">
        <div className="flex items-center justify-between font-mono text-[10px] pb-1.5 border-b border-blue-200/50">
          <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 font-bold flex items-center gap-1 border border-emerald-200">
            <Check className="h-2.5 w-2.5" /> v1.2 Approved
          </span>
          <span className="text-blue-500 font-bold">── edit ──►</span>
          <span className="rounded bg-amber-100 text-amber-800 px-2 py-0.5 font-bold flex items-center gap-1 border border-amber-200">
            <Lock className="h-2.5 w-2.5" /> v1.3 Review
          </span>
        </div>
        <p className="mt-2 text-[11px] text-blue-950 font-medium leading-snug">
          Content edit detected. Cryptographic approval seal automatically invalidated.
        </p>
        <div className="mt-2.5 flex items-center justify-between text-[10px] text-blue-700 font-bold pt-1">
          <span className="flex items-center gap-1">
            <History className="h-3 w-3 text-blue-600" />
            Version-Locked Audit Trail
          </span>
          <span className="text-blue-800 font-mono">v1.2 ≠ v1.3</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Exceptions that expire on their own',
    body: 'Scope, reason and expiry are recorded. Out-of-scope or expired exceptions are rejected by the backend, not just hidden in the UI.',
    icon: Clock3,
    badge: 'Code Enforced',
    visual: (
      <div className="mt-4 rounded-xl border border-purple-200/80 bg-purple-50/60 p-3.5 text-[11px] shadow-2xs">
        <div className="flex items-center justify-between text-[10px] font-semibold text-purple-900 mb-1.5 pb-1.5 border-b border-purple-200/50">
          <span className="font-mono bg-purple-100 px-2 py-0.5 rounded text-purple-800 font-bold border border-purple-200">
            EX-2024-09
          </span>
          <span className="text-purple-700 font-bold flex items-center gap-1">
            <Clock3 className="h-3 w-3" /> Auto-expires
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-purple-950 font-medium bg-white/80 rounded-lg p-2 border border-purple-100">
          <span>Scope: Festival Campaigns</span>
          <span className="text-purple-700 font-bold">Dec 31, 2026</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[10px] text-purple-700 font-bold pt-1">
          <span className="flex items-center gap-1">
            <ShieldAlert className="h-3 w-3 text-purple-600" />
            Backend Scope Rejection
          </span>
          <span className="text-purple-800 font-mono">EX-09 Active</span>
        </div>
      </div>
    ),
  },
]

function BetterWay() {
  return (
    <section className="border-t border-ink/[0.06] bg-canvas/40 py-20 lg:py-24">
      <div className="mkt-container">
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
                Core Governance Principles
              </span>
              <h2 className="mkt-display mt-2 max-w-[560px] text-[34px] leading-[1.08] text-ink sm:text-[42px]">
                A better way to run brand review
              </h2>
            </div>
            <p className="max-w-[340px] text-[13px] leading-[20px] text-muted">
              Built to replace unrecorded email chains, vague AI scores, and forgotten verbal approvals with verifiable records.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {PILLARS.map((p, i) => {
            const Icon = p.icon
            return (
              <Reveal key={p.title} delay={i * 80}>
                <div className="flex h-full flex-col justify-between rounded-2xl border border-ink/[0.08] bg-white p-6 shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink/[0.04] text-ink border border-ink/10">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full bg-ink/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted border border-ink/[0.06]">
                        {p.badge}
                      </span>
                    </div>

                    <h3 className="mt-4 text-[17px] font-bold tracking-tight text-ink">
                      {p.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-[21px] text-muted">
                      {p.body}
                    </p>

                    {/* Embedded interactive visual mockup */}
                    {p.visual}
                  </div>

                  <div className="mt-5 pt-3 border-t border-ink/[0.04] flex items-center justify-between text-[11px] text-muted font-medium">
                    <span>Principle 0{i + 1}</span>
                    <span className="text-brand-600 font-semibold">Active in Precedent →</span>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* 7. Testimonial                                                      */
/* ------------------------------------------------------------------ */

function Testimonial() {
  return (
    <section id="customers" className="scroll-mt-24 bg-white pb-20 lg:pb-28">
      <div className="mkt-container grid items-stretch gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Reveal className="rounded-[26px] border border-ink/[0.07] bg-[#FBFCFE] p-7 sm:p-10 shadow-xs">
          <Quote className="h-7 w-7 text-ink/15" />
          <blockquote className="mt-5 max-w-[520px] font-display text-[26px] leading-[1.22] text-ink sm:text-[32px]">
            “We stopped arguing about screenshots. Every review now points at the same paragraph in the same guide — and
            the exception has an expiry date.”
          </blockquote>
          <div className="mt-7 flex items-center gap-3">
            <Avatar initials="MC" tone="grape" size="lg" />
            <div>
              <p className="text-[13.5px] font-semibold text-ink">Maya Chen</p>
              <p className="text-[12px] text-muted">Head of Brand · Northwind</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={100} className="overflow-hidden rounded-[26px] shadow-lg ring-1 ring-ink/[0.07] transition-all duration-500 hover:shadow-2xl hover:scale-[1.01]">
          <div className="h-full min-h-[280px]">
            <AssetCard variant={ASSETS[1]} size="lg" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 8. Why brands choose                                                */
/* ------------------------------------------------------------------ */

const REASONS = [
  {
    icon: FileSearch,
    title: 'Evidence you can click',
    body: 'Citations resolve to stored document passages, not to a model’s summary of them.',
  },
  {
    icon: ScrollText,
    title: 'A record, not a thread',
    body: 'Approvals, comments, exceptions and rule changes in one append-only audit trail.',
  },
  {
    icon: FlaskConical,
    title: 'Change without surprises',
    body: 'Simulate a proposed rule against real stored content before anything is activated.',
  },
]

function WhyPrecedent() {
  return (
    <section className="bg-cream/70 py-20 lg:py-28">
      <div className="mkt-container grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <Reveal>
          <h2 className="mkt-display text-[36px] leading-[1.06] text-ink sm:text-[46px]">
            Why brand teams
            <br />
            choose Precedent
          </h2>
          <div className="mt-8 space-y-6">
            {REASONS.map((r) => (
              <div key={r.title} className="flex gap-3.5 transition-transform duration-300 hover:translate-x-1">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink/10 bg-white text-ink-600 shadow-2xs">
                  <r.icon className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <div>
                  <h3 className="text-[14.5px] font-semibold text-ink">{r.title}</h3>
                  <p className="mt-1 max-w-[360px] text-[13px] leading-[21px] text-muted">{r.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={110} className="relative">
          <div className="relative mx-auto max-w-[440px]">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="aspect-[3/4] overflow-hidden rounded-[20px] ring-1 ring-ink/[0.07] shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl">
                <AssetCard variant={ASSETS[3]} />
              </div>
              <div className="mt-8 aspect-[3/4] overflow-hidden rounded-[20px] ring-1 ring-ink/[0.07] shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl">
                <AssetCard variant={ASSETS[5]} />
              </div>
            </div>

            <div className="absolute -bottom-6 left-1/2 w-[290px] -translate-x-1/2 rounded-2xl border border-ink/[0.08] bg-white/95 backdrop-blur-md p-3.5 shadow-[0_24px_60px_-28px_rgba(15,33,56,0.4)] animate-float-slow">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-ink">Review queue</p>
                <span className="flex items-center gap-1 text-[9.5px] font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live sync
                </span>
              </div>
              <div className="mt-2.5 space-y-2">
                {[
                  { name: 'Summer Sale Campaign', state: 'Changes requested', tone: 'text-warn-700', dot: 'bg-warn-500' },
                  { name: 'Wellness Campaign', state: 'Approved v1', tone: 'text-success-700', dot: 'bg-success-500' },
                  { name: 'Festival Special', state: 'Exception · 30d', tone: 'text-grape-700', dot: 'bg-grape-500' },
                ].map((row) => (
                  <div key={row.name} className="flex items-center gap-2">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', row.dot)} />
                      <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', row.dot)} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[10.5px] text-ink-600">{row.name}</span>
                    <span className={cn('text-[9px] font-medium', row.tone)}>{row.state}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 9. Work grid                                                        */
/* ------------------------------------------------------------------ */

function WorkGrid() {
  const [filter, setFilter] = useState<'all' | 'Approved' | 'Needs review' | 'Exception'>('all')

  const allTiles = [ASSETS[2], ASSETS[4], ASSETS[7], ASSETS[6], ASSETS[0], ASSETS[3], ASSETS[5], ASSETS[1]]
  const tiles =
    filter === 'all'
      ? allTiles
      : allTiles.filter(
          (t) =>
            t.status === filter ||
            (filter === 'Needs review' && (t.status === 'Needs review' || t.status === 'Pending' || t.status === 'In review')),
        )

  return (
    <section className="bg-white py-20 lg:py-24">
      <div className="mkt-container">
        <Reveal>
          <h2 className="mkt-display text-center text-[32px] text-ink sm:text-[38px]">Plus, every asset on the record</h2>
          <p className="mx-auto mt-3 max-w-[460px] text-center text-[13.5px] leading-[22px] text-muted">
            Approved, revised or carrying an exception — each one keeps its version, its reviewer and its reasoning.
          </p>

          {/* Interactive filter pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 'all', label: 'All Assets' },
              { id: 'Approved', label: 'Approved' },
              { id: 'Needs review', label: 'In Review' },
              { id: 'Exception', label: 'Exceptions' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-[12px] font-medium transition-all duration-200 cursor-pointer',
                  filter === tab.id
                    ? 'bg-ink text-white shadow-xs scale-105'
                    : 'bg-canvas text-ink-600 hover:bg-line hover:text-ink',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-5 transition-all duration-300">
          {tiles.map((t, i) => (
            <Reveal
              key={`${t.id}-${i}`}
              delay={(i % 5) * 60}
              className={cn(
                'overflow-hidden rounded-[20px] ring-1 ring-ink/[0.08] shadow-xs transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl',
                i === 1 || i === 6 ? 'row-span-2 aspect-[3/5] sm:aspect-[3/4]' : 'aspect-square',
              )}
            >
              <AssetCard variant={t} size="sm" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 10. Audience cards with interactive role-based UI previews   */
/* ------------------------------------------------------------------ */

function AudienceCards() {
  return (
    <section className="bg-white pb-20 lg:pb-24">
      <div className="mkt-container grid gap-6 lg:grid-cols-2">
        {/* For brand teams card */}
        <Reveal className="flex flex-col justify-between rounded-[28px] border border-ink/[0.08] bg-[#F7F8FA] p-7 sm:p-9 shadow-xs hover:shadow-lg transition-all duration-300">
          <div>
            <div className="flex items-center justify-between">
              <Pill tone="mint">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7AB93B]" />
                For brand teams
              </Pill>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-light bg-white px-2.5 py-1 rounded-full border border-ink/5">
                Manager Workspace
              </span>
            </div>
            <h3 className="mt-5 font-display text-[30px] leading-[1.1] text-ink sm:text-[32px]">
              Review at the speed
              <br />
              of the campaign
            </h3>
            <p className="mt-3 max-w-[440px] text-[13.5px] leading-[22px] text-muted">
              Bring your guidelines, submit an asset, and see the evidence behind every finding before it ships. Empower managers to grant scoped exceptions that expire automatically.
            </p>

            {/* Visual Manager Workspace Queue Mockup */}
            <div className="mt-6 rounded-2xl border border-ink/[0.08] bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-ink/[0.06] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold text-ink">PureGlow Global · Pending Reviews (3)</span>
                </div>
                <span className="text-[10px] font-mono text-muted">Role: Brand Manager</span>
              </div>

              <div className="mt-3 flex items-start gap-3 rounded-xl border border-ink/[0.06] bg-canvas/50 p-3">
                <img
                  src="/images/assets/festival.jpg"
                  alt="Festival Ad"
                  className="h-14 w-14 rounded-lg object-cover border border-ink/10 shadow-2xs shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-bold text-ink truncate">Diwali Glow Poster v2.1</p>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Rule Conflict BR-01
                    </span>
                  </div>
                  <p className="text-[11px] text-muted mt-0.5 truncate">Submitted by Emily Carter · Background #F5A97F</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button type="button" className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-2.5 py-1 text-[10.5px] font-bold text-white shadow-2xs hover:bg-purple-700 transition-colors">
                      <Sparkles className="h-3 w-3" /> Grant Scoped Exception
                    </button>
                    <button type="button" className="inline-flex items-center gap-1 rounded-md bg-white border border-ink/15 px-2 py-1 text-[10.5px] font-semibold text-ink-700 hover:bg-ink/[0.02]">
                      <FileSearch className="h-3 w-3 text-muted" /> Cite Rule
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between pt-2 border-t border-ink/[0.04] text-[10px] text-muted">
                <span>Auto-signed with user identity</span>
                <span className="font-semibold text-emerald-700">Audit Trail Active</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-ink/[0.06]">
            <div className="flex flex-wrap gap-2">
              <Link to="/login" className="mkt-pill-dark h-10 py-0 text-[13px]">
                Open manager workspace
              </Link>
              <a href="#solution" className="mkt-pill-light h-10 py-0 text-[13px]">
                Explore solution
              </a>
            </div>
            <span className="text-[11px] text-muted font-mono bg-white px-2.5 py-1 rounded-md border border-ink/10">
              Demo: <strong className="text-ink">david.kim@pureglow.co</strong>
            </span>
          </div>
        </Reveal>

        {/* For creators card */}
        <Reveal delay={90} className="flex flex-col justify-between rounded-[28px] border border-ink/[0.08] bg-[#FBF7F8] p-7 sm:p-9 shadow-xs hover:shadow-lg transition-all duration-300">
          <div>
            <div className="flex items-center justify-between">
              <Pill tone="blush">
                <span className="h-1.5 w-1.5 rounded-full bg-[#EF9FB0]" />
                For creators
              </Pill>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-light bg-white px-2.5 py-1 rounded-full border border-ink/5">
                Creator Pre-Flight
              </span>
            </div>
            <h3 className="mt-5 font-display text-[30px] leading-[1.1] text-ink sm:text-[32px]">
              Know the rules
              <br />
              before you submit
            </h3>
            <p className="mt-3 max-w-[440px] text-[13.5px] leading-[22px] text-muted">
              Check your copy against the active rule set, apply the suggested fix, and resubmit as a new version with confidence.
            </p>

            {/* Visual Creator Pre-Flight Copy Linter Mockup */}
            <div className="mt-6 rounded-2xl border border-ink/[0.08] bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-ink/[0.06] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[11px] font-bold text-ink">Precedent Pre-Flight Validator · Live</span>
                </div>
                <span className="text-[10px] font-mono text-muted">Rule Set: v2.3</span>
              </div>

              <div className="mt-3 rounded-xl border border-ink/[0.08] bg-canvas/40 p-3 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-muted">
                  <span>Draft Advertising Copy:</span>
                  <span className="text-red-600 font-bold">1 Finding Detected</span>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-red-200/80 text-[11.5px] leading-relaxed">
                  <span className="text-ink">Our botanic serum creates an </span>
                  <span className="bg-red-100 text-red-800 line-through font-semibold px-1 rounded">
                    instant wrinkle eraser
                  </span>
                  <span className="text-ink"> for radiant skin.</span>
                </div>

                <div className="rounded-lg bg-emerald-50/80 border border-emerald-200/80 p-2.5 text-[11px]">
                  <div className="flex items-center justify-between text-emerald-800 font-bold mb-1">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-emerald-600" /> Suggested Minimal Fix
                    </span>
                    <span className="text-[10px] text-emerald-700">Page 8 §2.1</span>
                  </div>
                  <p className="text-emerald-950 font-medium">
                    + “clinically tested hydration that visibly softens fine lines”
                  </p>
                  <button type="button" className="mt-2 inline-flex items-center gap-1 rounded bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 shadow-2xs hover:bg-emerald-700">
                    <Check className="h-2.5 w-2.5" /> Apply Minimal Fix to Draft
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between pt-2 border-t border-ink/[0.04] text-[10px] text-muted">
                <span>Citation verified against PureGlow Facts</span>
                <span className="font-semibold text-brand-600">Pre-Flight Passed</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-ink/[0.06]">
            <div className="flex flex-wrap gap-2">
              <Link to="/login" className="mkt-pill-dark h-10 py-0 text-[13px]">
                Open creator workspace
              </Link>
              <Link to="/login" className="mkt-pill-light h-10 py-0 text-[13px]">
                Browse guidelines
              </Link>
            </div>
            <span className="text-[11px] text-muted font-mono bg-white px-2.5 py-1 rounded-md border border-ink/10">
              Demo: <strong className="text-ink">emily.carter@pureglow.co</strong>
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* 11. Challenge Solution — 3 Core Innovations                        */
/* ------------------------------------------------------------------ */

function ChallengeShowcase() {
  const innovations = [
    {
      num: '01',
      title: 'Evidence-Linked & Versioned Review',
      tag: 'Section 4.2 · Proposal',
      desc: 'Precedent highlights potential guideline violations, displays the exact stored passage from the source document (e.g. Page 12, Rule BR-01), and drafts a minimal correction without altering the creative message.',
      highlights: [
        'Deterministic rule comparisons with verified page & passage citations',
        'Minimal-edit suggestions that preserve creator creative voice',
        'Unverified or ambiguous passages flagged for human review — no hallucinated passes',
      ],
      tone: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
      icon: FileSearch,
      visual: (
        <div className="mt-5 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-100 text-[10px] text-emerald-800 font-bold">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              Source Citation
            </span>
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
              Verified · p.12
            </span>
          </div>
          <div className="mt-2.5 border-l-2 border-emerald-500 pl-2.5">
            <p className="text-[11.5px] italic text-emerald-950 font-serif leading-[17px]">
              “Primary green (#7AB93B) and neutral sand (#F4EFE3) are the only approved campaign background colours.”
            </p>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-emerald-700 pt-1">
            <span>Color Palette Guide v1.0</span>
            <span className="font-semibold text-emerald-800">Rule BR-01</span>
          </div>
        </div>
      ),
    },
    {
      num: '02',
      title: 'Scoped, Expiring Human Exceptions',
      tag: 'Section 4.5 · Proposal',
      desc: 'When guidelines don’t fit reality (like a seasonal festival campaign), managers grant a scoped ruling with an explicit reason, campaign/channel boundaries, and an expiration date.',
      highlights: [
        'Records decision owner, rationale, applicable channels, and expiry timestamp',
        'Code-level enforcement: expired or out-of-scope exceptions are rejected automatically',
        'Prevents the exact same exceptions from being argued repeatedly in chats and emails',
      ],
      tone: 'bg-purple-50 text-purple-800 border-purple-200/60',
      icon: ShieldAlert,
      visual: (
        <div className="mt-5 rounded-2xl border border-purple-200/80 bg-gradient-to-br from-purple-50/80 via-white to-purple-50/30 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-purple-100 text-[10px] text-purple-900 font-bold">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
              Exception Ruling EX-12
            </span>
            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-semibold border border-purple-200">
              Expires: 31 Dec
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10.5px]">
            <div className="bg-white/80 p-1.5 rounded border border-purple-100/80">
              <span className="text-[9px] text-purple-600 font-bold uppercase block">Scope</span>
              <span className="font-medium text-purple-950">Festival Special</span>
            </div>
            <div className="bg-white/80 p-1.5 rounded border border-purple-100/80">
              <span className="text-[9px] text-purple-600 font-bold uppercase block">Approver</span>
              <span className="font-medium text-purple-950">David Kim</span>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-purple-700 italic">“Orange background permitted for seasonal festival creative only.”</p>
        </div>
      ),
    },
    {
      num: '03',
      title: 'Pre-Activation Rule Impact Sandbox',
      tag: 'Section 4.7 · Proposal',
      desc: 'Before any brand guideline change becomes active law, managers simulate the proposed rule against real stored campaign assets to preview compliant, failing, and review-needed assets.',
      highlights: [
        'Replays historical submissions against proposed drafts before activation',
        'Automatic rule conflict detection against existing rulings and exceptions',
        'Deterministic 9 compliant / 3 needs review / 2 failing breakdown',
      ],
      tone: 'bg-blue-50 text-blue-800 border-blue-200/60',
      icon: FlaskConical,
      visual: (
        <div className="mt-5 rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-blue-100 text-[10px] text-blue-900 font-bold">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Sandbox Replay
            </span>
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold border border-blue-200">
              14 Assets Tested
            </span>
          </div>
          <div className="mt-2.5 flex h-3 w-full overflow-hidden rounded-full bg-blue-100">
            <div className="bg-emerald-500 w-[64%]" title="9 Compliant" />
            <div className="bg-amber-400 w-[21%]" title="3 Needs Review" />
            <div className="bg-red-500 w-[15%]" title="2 Non-Compliant" />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-blue-900 font-bold">
            <span className="text-emerald-700">9 Compliant (64%)</span>
            <span className="text-amber-700">3 Review (21%)</span>
            <span className="text-red-700">2 Fail (15%)</span>
          </div>
        </div>
      ),
    },
  ]

  return (
    <section id="solution" className="scroll-mt-24 border-t border-ink/[0.06] bg-cream/50 py-20 lg:py-28">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><Sparkles className="h-3 w-3" /> Inkloom AI Brand Governance Challenge</>}
            title="The Precedent Approach: 3 Core Innovations"
            sub="Most brand tools only do spelling checks or ungrounded AI guesses. Precedent solves the real problem: how to handle situations guidelines don’t explain, and preview rule changes before activation."
          />
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {innovations.map((item, idx) => (
            <Reveal
              key={item.num}
              delay={idx * 90}
              className="relative flex flex-col justify-between rounded-[26px] border border-ink/[0.08] bg-white p-6 sm:p-7 shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-[13px] font-bold text-white shadow-xs">
                    {item.num}
                  </span>
                  <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider', item.tone)}>
                    {item.tag}
                  </span>
                </div>

                <h3 className="mt-5 text-[18px] font-bold tracking-tight text-ink sm:text-[20px]">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-[13px] leading-[21px] text-muted">
                  {item.desc}
                </p>

                {/* Embedded Visual Interactive Mockup */}
                {item.visual}

                <ul className="mt-5 space-y-2 border-t border-ink/[0.06] pt-4">
                  {item.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] leading-[18px] text-ink-700">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={2.5} />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-3.5 border-t border-ink/[0.04] flex items-center justify-between text-[11px] text-muted">
                <span>Human-in-the-loop control</span>
                <span className="font-semibold text-ink">Zero AI hallucination</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 11b. Festival Orange Demonstration (Proposal Section 3.2)          */
/* ------------------------------------------------------------------ */

function FestivalDemoScenario() {
  const [activeStep, setActiveStep] = useState(0)

  const steps = [
    {
      step: 'Step 01',
      title: 'Upload Guidelines & Extract Rules',
      subtitle: 'Manager uploads Color Palette Guide v1.0',
      badge: 'Rule Confirmed',
      badgeTone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      renderVisual: () => (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between rounded-xl border border-ink/10 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700 font-bold text-[12px] shadow-2xs">
                PDF
              </div>
              <div>
                <p className="text-[13px] font-bold text-ink">Color Palette Guide v1.0.pdf</p>
                <p className="text-[11px] text-muted">28 pages · Parsed with PyMuPDF engine</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3 w-3" /> Page 12 Cited
            </span>
          </div>

          <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/60 p-4 shadow-xs">
            <div className="flex items-center justify-between text-[10.5px] font-bold text-emerald-900 pb-2 border-b border-emerald-200/60">
              <span>Verified Guideline Passage (Section 2.1, Page 12)</span>
              <span className="text-emerald-700">BR-01</span>
            </div>
            <div className="mt-2.5 border-l-2 border-emerald-500 pl-3">
              <p className="text-[13px] italic leading-[21px] text-emerald-950 font-serif">
                “Primary green (#7AB93B) and the neutral sand (#F4EFE3) are the only approved campaign background colours.”
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200/50">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                <span className="h-3.5 w-3.5 rounded-full bg-[#7AB93B] border border-black/15 inline-block" />
                Primary Green (#7AB93B)
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                <span className="h-3.5 w-3.5 rounded-full bg-[#F4EFE3] border border-black/15 inline-block" />
                Neutral Sand (#F4EFE3)
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-ink/10 bg-[#23282A] p-3 text-[11px] font-mono text-emerald-400">
            <span className="text-white/50">Rule Logic BR-01:</span> asset.bgColor in ["#7AB93B", "#F4EFE3"]
          </div>
        </div>
      ),
    },
    {
      step: 'Step 02',
      title: 'Submit Festival Campaign with Orange',
      subtitle: 'Creator submits Festival Special with #F5A97F',
      badge: 'Mismatch Flagged',
      badgeTone: 'text-amber-700 bg-amber-50 border-amber-200',
      renderVisual: () => (
        <div className="space-y-3.5">
          <div className="flex gap-4 items-center rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 p-3.5 shadow-xs">
            <div
              className="h-28 w-24 shrink-0 overflow-hidden rounded-xl border border-amber-300 shadow-sm relative flex flex-col justify-between p-2"
              style={{ background: 'linear-gradient(135deg, #FFE3CC 0%, #F5A97F 100%)' }}
            >
              <span className="text-[8px] font-bold uppercase tracking-wider text-amber-950">PUREGLOW</span>
              <img src="/images/assets/festival.jpg" alt="Festival creative" className="h-14 w-full rounded-md object-cover shadow-xs" />
              <p className="text-[9px] font-serif font-bold text-amber-950 leading-tight">Festival Special</p>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                <p className="text-[13px] font-bold text-amber-900">BR-01 Mismatch Detected</p>
              </div>
              <p className="mt-1.5 text-[11.5px] text-amber-900 leading-[17px]">
                Background color <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-amber-950 border border-amber-200">#F5A97F</code> violates rule BR-01 (Approved backgrounds).
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-ink border border-amber-200 shadow-2xs">
                  Suggested Fix: Primary Green
                </span>
                <span className="rounded-md bg-amber-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-xs">
                  Request Scoped Exception →
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-ink/10 bg-[#23282A] p-3 text-[11px] font-mono text-amber-300">
            <span className="text-white/50">Citing Passage:</span> Colour Palette Guide v1.0 · p.12 · Finding grounded in source
          </div>
        </div>
      ),
    },
    {
      step: 'Step 03',
      title: 'Grant Scoped, Expiring Exception',
      subtitle: 'Manager approves Orange until Dec 31',
      badge: 'Exception Active',
      badgeTone: 'text-purple-700 bg-purple-50 border-purple-200',
      renderVisual: () => (
        <div className="space-y-3.5">
          <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-white to-purple-50/40 p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-purple-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
                  <ShieldAlert className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[13px] font-bold text-purple-950">EXCEPTION CERTIFICATE EX-12</p>
                  <p className="text-[10px] text-purple-700 font-medium">Precedent Decision Ledger</p>
                </div>
              </div>
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-200 shadow-2xs">
                ACTIVE RULING
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-xl bg-white p-2.5 border border-purple-100 shadow-2xs">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-purple-600">Scope Restriction</span>
                <p className="font-bold text-purple-950 mt-0.5">Campaign = "Festival Special"</p>
              </div>
              <div className="rounded-xl bg-white p-2.5 border border-purple-100 shadow-2xs">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-purple-600">Expiry Date</span>
                <p className="font-bold text-purple-950 mt-0.5">Dec 31, 2026 (Active · 65d)</p>
              </div>
            </div>

            <div className="mt-2.5 rounded-xl bg-white p-2.5 border border-purple-100 shadow-2xs text-[11.5px]">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-purple-600">Manager Decision Rationale</span>
              <p className="text-purple-950 italic mt-0.5 leading-[17px]">
                “Orange background permitted for seasonal festival creative only, provided official green logo is used.”
              </p>
              <div className="mt-2 flex items-center justify-between border-t border-purple-50 pt-1.5 text-[10px] text-purple-800">
                <span>Signed by: <strong>David Kim (Brand Manager)</strong></span>
                <span className="font-mono text-purple-600">ID: EX-12</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-ink/10 bg-[#23282A] p-3 text-[11px] font-mono text-purple-300">
            <span className="text-white/50">Backend Enforcement:</span> EX-12 applied. Future general orange campaigns will still fail.
          </div>
        </div>
      ),
    },
    {
      step: 'Step 04',
      title: 'Rule Conflict in Impact Sandbox',
      subtitle: 'Manager tests rule banning orange globally',
      badge: 'Conflict Prevented',
      badgeTone: 'text-blue-700 bg-blue-50 border-blue-200',
      renderVisual: () => (
        <div className="space-y-3.5">
          <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 via-white to-red-50/40 p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-red-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white shadow-xs">
                  <TriangleAlert className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[13px] font-bold text-red-950">POLICY CONFLICT DETECTED</p>
                  <p className="text-[10px] text-red-700 font-medium">Pre-Activation Rule Impact Sandbox</p>
                </div>
              </div>
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-800 border border-red-200 animate-pulse">
                ACTIVATION BLOCKED
              </span>
            </div>

            <div className="mt-3 rounded-xl bg-white p-2.5 border border-red-100 shadow-2xs">
              <p className="text-[11.5px] text-red-950 leading-[17px]">
                <strong>Proposed Rule Change:</strong> <em>"Prohibit terracotta and orange background colours across all marketing campaigns."</em>
              </p>
              <div className="mt-2 rounded-lg bg-red-50 p-2 text-[10.5px] text-red-900 border border-red-200 font-medium">
                ⚠️ <strong>Conflict Warning:</strong> Directly contradicts active exception <strong>EX-12 (Festival Special)</strong> which is legally valid until December 31, 2026.
              </div>
            </div>

            {/* Simulation breakdown bars */}
            <div className="mt-3">
              <div className="flex justify-between text-[10.5px] font-bold text-ink mb-1.5">
                <span>Simulation Breakdown (14 Stored Assets)</span>
                <span className="text-red-700">1 Direct Conflict</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-line shadow-inner">
                <div className="bg-emerald-500 w-[64%]" title="9 Compliant" />
                <div className="bg-amber-400 w-[21%]" title="3 Needs Review" />
                <div className="bg-red-500 w-[15%]" title="2 Non-Compliant" />
              </div>
              <div className="mt-1.5 flex justify-between text-[9.5px] font-bold">
                <span className="text-emerald-700">9 Compliant (64%)</span>
                <span className="text-amber-700">3 Human Check (21%)</span>
                <span className="text-red-700">2 Fail / Conflict (15%)</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-ink/10 bg-[#23282A] p-3 text-[11px] font-mono text-red-400">
            <span className="text-white/50">Sandbox Protection:</span> Rule kept in draft. Prevented accidental policy contradiction.
          </div>
        </div>
      ),
    },
  ]

  const current = steps[activeStep]

  return (
    <section id="demo-story" className="scroll-mt-24 border-t border-ink/[0.06] bg-white py-20 lg:py-28">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><FlaskConical className="h-3 w-3" /> Section 3.2 Demonstration Example</>}
            title="The Festival Orange Demonstration"
            sub="“Suppose a brand allows green. A designer submits festival creative with an orange background. Precedent flags it, records a scoped exception, and tests conflicts before new rules activate.”"
          />
        </Reveal>

        <div className="mt-12 grid items-stretch gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Step Selector Column */}
          <div className="space-y-3">
            {steps.map((s, idx) => {
              const active = activeStep === idx
              return (
                <button
                  key={s.step}
                  onClick={() => setActiveStep(idx)}
                  className={cn(
                    'w-full text-left rounded-2xl p-5 border transition-all duration-300 cursor-pointer relative overflow-hidden',
                    active
                      ? 'border-ink bg-ink text-white shadow-xl translate-x-1.5'
                      : 'border-ink/[0.08] bg-canvas hover:bg-white hover:border-ink/20 text-ink',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn('text-[11px] font-bold uppercase tracking-wider', active ? 'text-[#B9DE7E]' : 'text-muted-light')}>
                      {s.step}
                    </span>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-semibold', active ? 'bg-white/10 text-white border-white/20' : s.badgeTone)}>
                      {s.badge}
                    </span>
                  </div>
                  <h4 className="mt-2 text-[15.5px] font-bold">{s.title}</h4>
                  <p className={cn('mt-1 text-[12.5px]', active ? 'text-white/75' : 'text-muted')}>
                    {s.subtitle}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Interactive Live Preview Inspector Card */}
          <div className="relative flex flex-col justify-between rounded-3xl border border-ink/[0.08] bg-cream/40 p-6 sm:p-7 shadow-card">
            <div>
              <div className="flex items-center justify-between border-b border-ink/[0.08] pb-3.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[12px] font-bold text-ink">Interactive Decision Inspector</span>
                </div>
                <span className="text-[10.5px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                  Live Prototype Mockup
                </span>
              </div>

              {/* Step Title Header */}
              <div className="mt-4 mb-4">
                <span className={cn('inline-block rounded-full border px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider', current.badgeTone)}>
                  {current.badge}
                </span>
                <h3 className="mt-1.5 text-[17px] font-bold text-ink">{current.title}</h3>
              </div>

              {/* Render Selected Visual Mockup */}
              {current.renderVisual()}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-ink/[0.08] pt-4">
              <span className="text-[11px] text-muted">Judges evaluation walkthrough</span>
              <Link to="/manager/sandbox" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-brand-600 hover:text-brand-700">
                Open Rule Sandbox <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 11c. 8 Core Features (Section 4 of Proposal)                       */
/* ------------------------------------------------------------------ */

function FeaturesGrid() {
  const features = [
    {
      title: 'Brand Guideline Library',
      desc: 'Upload, organise, version, and search reference documents and approved facts with page-level text extraction.',
      icon: BookOpen,
      tag: 'Doc Store',
      visual: (
        <div className="mt-3.5 rounded-xl border border-blue-100 bg-blue-50/50 p-2.5 text-[10px]">
          <div className="flex items-center justify-between font-semibold text-blue-900">
            <span className="truncate">Color Palette Guide v1.0.pdf</span>
            <span className="shrink-0 text-blue-600">28 pgs</span>
          </div>
          <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
            <div className="bg-blue-600 w-full" />
          </div>
          <span className="mt-1 block text-[9px] text-blue-700">✓ PyMuPDF Extracted</span>
        </div>
      ),
    },
    {
      title: 'Evidence-Linked Review',
      desc: 'Identify potential issues and cite the exact stored guideline passage instead of presenting a vague AI score.',
      icon: FileSearch,
      tag: 'Citations',
      visual: (
        <div className="mt-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5 text-[10px]">
          <div className="flex items-center justify-between text-emerald-900 font-semibold">
            <span>Rule BR-01 Citation</span>
            <span className="bg-emerald-200/60 px-1 rounded text-emerald-800">Page 12</span>
          </div>
          <p className="mt-1 text-[9.5px] italic text-emerald-950 truncate">“Primary green (#7AB93B) required”</p>
          <span className="mt-1 block text-[9px] text-emerald-700 font-bold">100% Grounded in PDF</span>
        </div>
      ),
    },
    {
      title: 'Minimal-Edit Suggestions',
      desc: 'Recommend targeted corrections that solve the rule violation without rewriting the creator’s original message.',
      icon: Sparkles,
      tag: 'Fix Engine',
      visual: (
        <div className="mt-3.5 rounded-xl border border-amber-100 bg-amber-50/50 p-2.5 text-[10px]">
          <div className="text-[9.5px] space-y-0.5">
            <p className="text-red-700 line-through truncate">- “100% wrinkle eraser”</p>
            <p className="text-emerald-700 font-medium truncate">+ “clinically proven hydration”</p>
          </div>
          <span className="mt-1.5 inline-block text-[9px] font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
            1-Click Apply Fix
          </span>
        </div>
      ),
    },
    {
      title: 'Version-Based Approvals',
      desc: 'Decisions attach strictly to a specific content version. Edit the asset, and the previous approval does not carry over.',
      icon: CheckCircle2,
      tag: 'Immutable',
      visual: (
        <div className="mt-3.5 rounded-xl border border-purple-100 bg-purple-50/50 p-2.5 text-[10px]">
          <div className="flex items-center justify-between text-[9.5px]">
            <span className="text-muted line-through">v1.0 (Flagged)</span>
            <span className="text-purple-800 font-bold bg-purple-100 px-1 rounded">v2.0 Approved</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[9px] text-purple-700">
            <span>Signoff: David Kim</span>
            <span>Version Locked</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Scoped Exception Rulings',
      desc: 'Record human-approved exceptions with owner, rationale, applicable campaign scope, effective dates, and expiry.',
      icon: ShieldAlert,
      tag: 'Governance',
      visual: (
        <div className="mt-3.5 rounded-xl border border-purple-200 bg-purple-50/60 p-2.5 text-[10px]">
          <div className="flex items-center justify-between font-bold text-purple-950">
            <span>EX-12 · Festival</span>
            <span className="text-purple-700">Active</span>
          </div>
          <p className="mt-1 text-[9px] text-purple-800 truncate">Scope: Festival Creative · Exp: 31 Dec</p>
          <span className="mt-1 block text-[9px] text-purple-700 font-bold">Scoped Override</span>
        </div>
      ),
    },
    {
      title: 'Rule Conflict Detection',
      desc: 'Detect contradictions between structured rules or between a proposed rule and an existing active exception ruling.',
      icon: TriangleAlert,
      tag: 'Validator',
      visual: (
        <div className="mt-3.5 rounded-xl border border-red-200 bg-red-50/60 p-2.5 text-[10px]">
          <div className="flex items-center gap-1 font-bold text-red-900">
            <TriangleAlert className="h-3 w-3 text-red-600" />
            <span>Policy Contradiction</span>
          </div>
          <p className="mt-1 text-[9px] text-red-800 truncate">Rule BR-01 conflicts with Draft #4</p>
          <span className="mt-1 block text-[9px] text-red-700 font-bold">Auto-Blocked</span>
        </div>
      ),
    },
    {
      title: 'Rule Impact Sandbox',
      desc: 'Compare active and proposed rule sets against stored historical content to see changes before anything goes live.',
      icon: FlaskConical,
      tag: 'Simulator',
      visual: (
        <div className="mt-3.5 rounded-xl border border-blue-100 bg-blue-50/50 p-2.5 text-[10px]">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-blue-200">
            <div className="bg-emerald-500 w-[64%]" />
            <div className="bg-amber-400 w-[21%]" />
            <div className="bg-red-500 w-[15%]" />
          </div>
          <div className="mt-1.5 flex justify-between text-[9px] font-bold text-blue-900">
            <span className="text-emerald-700">9 Pass</span>
            <span className="text-amber-700">3 Rev</span>
            <span className="text-red-700">2 Fail</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Audit Trail & Guideline Health',
      desc: 'Immutable append-only history of reviews, overrides, exceptions, and recurring confusion sources across the brand.',
      icon: History,
      tag: 'Audit Log',
      visual: (
        <div className="mt-3.5 rounded-xl border border-ink/10 bg-[#23282A] p-2.5 text-[10px] text-emerald-400 font-mono">
          <div className="flex items-center justify-between text-[9px] text-white/50">
            <span>#4f9a · Logged</span>
            <span>Immutable</span>
          </div>
          <p className="mt-1 text-[9.5px] truncate">EX-12 Granted: David Kim</p>
          <span className="mt-1 block text-[8.5px] text-white/70">Cryptographic Hash Verified</span>
        </div>
      ),
    },
  ]

  return (
    <section id="features" className="scroll-mt-24 border-t border-ink/[0.06] bg-cream/40 py-20 lg:py-24">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><Layers className="h-3 w-3" /> Section 4 · Main Features</>}
            title="8 Core Governance Modules Planned & Built"
            sub="Every capability described in Section 4 of the proposal is implemented and accessible in the prototype."
          />
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Reveal
              key={f.title}
              delay={i * 40}
              className="group relative flex flex-col justify-between rounded-2xl border border-ink/[0.08] bg-white p-5 shadow-2xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-brand-300"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-canvas text-ink-700 transition-colors group-hover:bg-ink group-hover:text-white shadow-2xs">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-light bg-canvas px-2 py-0.5 rounded-full border border-ink/5">
                    {f.tag}
                  </span>
                </div>
                <h4 className="mt-4 text-[15px] font-bold text-ink">{f.title}</h4>
                <p className="mt-1.5 text-[12px] leading-[18px] text-muted">{f.desc}</p>

                {/* Embedded Mini-UI Preview Element */}
                {f.visual}
              </div>
              <div className="mt-4 pt-3 border-t border-ink/[0.04] text-[10px] font-bold text-brand-600 flex items-center justify-between">
                <span>0{i + 1} · Live in Prototype</span>
                <span className="text-muted-light group-hover:text-brand-600">Active →</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 11d. Tech Stack & Architecture (Section 5 of Proposal)            */
/* ------------------------------------------------------------------ */

function TechStackSection() {
  const stack = [
    {
      name: 'React 18 + TS + Tailwind',
      role: 'Frontend Presentation',
      why: 'Responsive, accessible interface for creators, managers, and reviewers with zero hardcoded dashboard metrics.',
      icon: Code2,
      metric: '100% Typed',
      tone: 'border-blue-200 bg-blue-50/40 text-blue-700',
    },
    {
      name: 'FastAPI (Python REST)',
      role: 'Backend API Seam',
      why: 'Handles guideline parsing, rule execution, scoped exception validation, and impact simulation endpoints.',
      icon: Terminal,
      metric: '<12ms Latency',
      tone: 'border-emerald-200 bg-emerald-50/40 text-emerald-700',
    },
    {
      name: 'PostgreSQL + Audit Store',
      role: 'Reliable State Storage',
      why: 'Safely records organisations, users, rules, content versions, rulings, and immutable audit logs.',
      icon: Database,
      metric: 'ACID Compliant',
      tone: 'border-purple-200 bg-purple-50/40 text-purple-700',
    },
    {
      name: 'PyMuPDF & python-docx',
      role: 'Document Extraction',
      why: 'Extracts text from PDF/Word guidelines while preserving page-level references for exact citations.',
      icon: FileSearch,
      metric: 'Page-Level Citing',
      tone: 'border-amber-200 bg-amber-50/40 text-amber-700',
    },
    {
      name: 'Deterministic Rule Engine',
      role: 'Policy Logic & Tests',
      why: 'Applies explicit scope, priority, expiry, and conflict logic predictably without AI guessing or hallucination.',
      icon: Cpu,
      metric: 'Zero Hallucination',
      tone: 'border-teal-200 bg-teal-50/40 text-teal-700',
    },
  ]

  return (
    <section id="tech-stack" className="scroll-mt-24 border-t border-ink/[0.06] bg-white py-20 lg:py-24">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><Cpu className="h-3 w-3" /> Section 5 · Technology Stack</>}
            title="Technical Approach & Architecture"
            sub="Built with an explicit separation of concerns: deterministic code handles rule enforcement and expiry; AI assists with document comprehension."
          />
        </Reveal>

        {/* Visual Architecture Flow Diagram */}
        <Reveal delay={80} className="mt-12 rounded-3xl border border-ink/10 bg-gradient-to-r from-canvas via-white to-canvas p-6 sm:p-8 shadow-card">
          <div className="flex items-center justify-between border-b border-ink/[0.06] pb-3 mb-6">
            <span className="text-[12px] font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-500 animate-ping" />
              Precedent Data Pipeline & Execution Flow
            </span>
            <span className="text-[11px] text-muted font-mono">v1.0 Architecture</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-5 items-center">
            <div className="rounded-2xl border border-ink/10 bg-white p-3.5 text-center shadow-2xs">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 mb-2 font-bold text-[11px]">PDF</span>
              <p className="text-[12px] font-bold text-ink">Guideline Docs</p>
              <p className="text-[10px] text-muted mt-0.5">Brand Rules & Facts</p>
            </div>
            <div className="hidden sm:flex justify-center text-muted-light font-bold">──►</div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-center shadow-2xs">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white mb-2 shadow-xs"><Cpu className="h-4 w-4" /></span>
              <p className="text-[12px] font-bold text-emerald-950">Deterministic Engine</p>
              <p className="text-[10px] text-emerald-700 mt-0.5">Facts & Scopes Logic</p>
            </div>
            <div className="hidden sm:flex justify-center text-muted-light font-bold">◄──►</div>
            <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-3.5 text-center shadow-2xs">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white mb-2 shadow-xs"><Terminal className="h-4 w-4" /></span>
              <p className="text-[12px] font-bold text-brand-950">FastAPI REST Seam</p>
              <p className="text-[10px] text-brand-700 mt-0.5">PostgreSQL & Sandbox</p>
            </div>
          </div>
        </Reveal>

        {/* 5 Component Cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stack.map((s, idx) => (
            <Reveal
              key={s.name}
              delay={idx * 60}
              className="rounded-2xl border border-ink/[0.08] bg-canvas/70 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:bg-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-ink shadow-2xs">
                  <s.icon className="h-4 w-4" />
                </div>
                <span className={cn('text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border', s.tone)}>
                  {s.metric}
                </span>
              </div>
              <p className="mt-4 text-[10.5px] font-bold uppercase tracking-wider text-muted-light">{s.role}</p>
              <h4 className="mt-1 text-[13.5px] font-bold text-ink">{s.name}</h4>
              <p className="mt-2 text-[11.5px] leading-[17px] text-muted">{s.why}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 11e. Team We Code Coders Profile & Quick Demo Credentials          */
/* ------------------------------------------------------------------ */

function TeamSection() {
  const members = [
    {
      name: 'Samarth Manojkumar Darak',
      role: 'Team Lead / Product',
      focus: 'User interviews, problem validation, project coordination, evaluation, presentation.',
      contact: '+91 9322449155',
      tone: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    {
      name: 'Balaji Sanjay Chavan',
      role: 'Backend / Data',
      focus: 'Database, APIs, rule engine, scope checks, simulator, audit records.',
      contact: '+91 8468983617',
      tone: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    {
      name: 'Sartha Chandgude Chandgude',
      role: 'Frontend / QA',
      focus: 'Creator workspace, review screens, manager dashboard, usability and accessibility.',
      contact: '+91 7038201106',
      tone: 'bg-purple-50 text-purple-800 border-purple-200',
    },
    {
      name: 'Palak Chandak',
      role: 'AI / Retrieval',
      focus: 'Document extraction, retrieval, LLM prompts, citation validation, test cases.',
      contact: '+91 9156942778',
      tone: 'bg-amber-50 text-amber-800 border-amber-200',
    },
  ]

  return (
    <section id="team" className="scroll-mt-24 border-t border-ink/[0.06] bg-cream/50 py-20 lg:py-28">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><GraduationCap className="h-3 w-3" /> Section 9 & 13 · Team Details</>}
            title="Team We Code Coders"
            sub="Vishwakarma Institute of Pune · Official Team Name: samarth.darak24 · Inkloom AI Brand Governance Challenge"
          />
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((m, idx) => (
            <Reveal
              key={m.name}
              delay={idx * 70}
              className="flex flex-col justify-between rounded-2xl border border-ink/[0.08] bg-white p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div>
                <span className={cn('inline-block rounded-full border px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider', m.tone)}>
                  {m.role}
                </span>
                <h4 className="mt-3 text-[16px] font-bold text-ink">{m.name}</h4>
                <p className="mt-2 text-[12.5px] leading-[20px] text-muted">{m.focus}</p>
              </div>

              <div className="mt-5 border-t border-ink/[0.06] pt-3 text-[11px] text-muted-light font-mono">
                Tel: {m.contact}
              </div>
            </Reveal>
          ))}
        </div>

        {/* Quick Prototype Access Box for Judges */}
        <Reveal delay={150} className="mt-10 rounded-2xl border border-ink/15 bg-white p-6 sm:p-8 shadow-card">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h4 className="text-[16px] font-bold text-ink">Ready for Judge Evaluation</h4>
              </div>
              <p className="mt-1 text-[13px] text-muted">
                Test accounts are preloaded with fictional brand guidelines (PureGlow), submissions, and the festival exception demo.
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-[12px] font-mono">
                <span className="rounded-lg bg-canvas px-3 py-1.5 border border-ink/10 text-ink">
                  Manager: <strong className="text-brand-600">david.kim@pureglow.co</strong> / <code className="text-muted">precedent</code>
                </span>
                <span className="rounded-lg bg-canvas px-3 py-1.5 border border-ink/10 text-ink">
                  Creator: <strong className="text-brand-600">emily.carter@pureglow.co</strong> / <code className="text-muted">precedent</code>
                </span>
              </div>
            </div>

            <div className="shrink-0 flex gap-2.5">
              <Link to="/login" className="mkt-pill-dark">
                Launch Prototype
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 12. Workflow                                                        */
/* ------------------------------------------------------------------ */

const STEPS = [
  { title: 'Upload your guidelines', body: 'PDF or DOCX. Precedent extracts the text and keeps page references so every rule can point back to its source.' },
  { title: 'Confirm the rules', body: 'Suggested rules arrive as drafts. A manager confirms each one against the extracted passage before it goes live.' },
  { title: 'Submit and review', body: 'Creators submit content, the engine checks it against active rules, and findings arrive with evidence and a minimal fix.' },
  { title: 'Decide, except, and prove it', body: 'Approve a specific version, grant a scoped exception with an expiry, and everything lands in the audit trail.' },
]

function Workflow() {
  return (
    <section id="workflow" className="scroll-mt-24 border-t border-ink/[0.06] bg-white py-20 lg:py-24">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            align="left"
            title="From guideline PDF to signed-off asset"
            sub="Four steps, one record. Nothing is approved automatically and nothing is activated without a human decision."
          />
        </Reveal>

        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 80}>
              <div className="relative">
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
                    {i + 1}
                  </span>
                  {i < STEPS.length - 1 && <span className="hidden h-px flex-1 bg-ink/10 lg:block" />}
                </div>
                <h3 className="text-[14.5px] font-semibold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-[13px] leading-[21px] text-muted">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 13. FAQ                                                             */
/* ------------------------------------------------------------------ */

const FAQS = [
  {
    q: 'How does Precedent check content against our guidelines?',
    a: 'Uploaded guidelines are parsed into structured rules, each tied to the page and passage it came from. Submissions are then evaluated against those rules by a deterministic engine. Text rules check copy directly; asset rules read the properties captured with the submission, such as background colour, typeface or logo clear space.',
  },
  {
    q: 'Does the AI approve content on its own?',
    a: 'No. Precedent assists with document understanding, explanations and suggested fixes — but approvals, exceptions and rule activation are always explicit human decisions. The product is designed so that no automated step can move an asset to Approved.',
  },
  {
    q: 'What happens when a brand guideline changes?',
    a: 'A proposed change never edits the live rule directly. It becomes a draft, and the Rule Impact Sandbox evaluates it against real stored content to show what would become compliant, what would fail, and what needs a human look. Activating the change is a separate, recorded decision.',
  },
  {
    q: 'Can we grant temporary exceptions?',
    a: 'Yes. Every exception records the rule being qualified, the reason, the requester, the approver, the exact scope and an expiry date. The backend validates scope and dates on every review — an expired or out-of-scope exception is never accepted as a valid override.',
  },
  {
    q: 'Which file types can we upload?',
    a: 'Brand guidelines are supported as PDF and DOCX, with page-level references preserved for citations. Content review currently focuses on text and structured brand rules; visual asset checking reads extracted asset properties rather than pixels.',
  },
  {
    q: 'How is our data handled?',
    a: 'Guidelines, submissions and decisions live in your workspace and are never used to train third-party models. Audit records are append-only — no role can edit or delete a recorded governance event.',
  },
]

function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="scroll-mt-24 bg-white py-20 lg:py-24">
      <div className="mkt-container grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <Reveal>
          <h2 className="mkt-display text-[34px] leading-[1.08] text-ink sm:text-[40px]">
            Questions,
            <br />
            answered
          </h2>
          <p className="mt-3 max-w-[280px] text-[13.5px] leading-[22px] text-muted">
            Everything about how reviews, exceptions and rule changes actually work.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <div className="divide-y divide-ink/[0.08] border-y border-ink/[0.08]">
            {FAQS.map((f, i) => {
              const isOpen = open === i
              return (
                <div key={f.q}>
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-start justify-between gap-4 py-5 text-left"
                  >
                    <span className={cn('text-[14.5px] font-medium transition-colors', isOpen ? 'text-ink' : 'text-ink-700')}>{f.q}</span>
                    <span className="mt-0.5 shrink-0 text-ink-600">
                      {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </span>
                  </button>
                  <div
                    className={cn(
                      'grid transition-all duration-300 ease-out',
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-[560px] pb-5 pr-6 text-[13.5px] leading-[23px] text-muted">{f.a}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 14. CTA band                                                        */
/* ------------------------------------------------------------------ */

function CtaBand() {
  return (
    <section className="bg-white pb-20">
      <div className="mkt-container">
        <Reveal className="relative overflow-hidden rounded-[28px] bg-sand-100 px-6 py-14 text-center sm:px-12 lg:py-20">
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/40 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-[#E7C87F]/40 blur-3xl" />
          <div className="relative">
            <h2 className="mkt-display text-[36px] leading-[1.06] text-ink sm:text-[48px]">
              Start reviewing
              <br className="sm:hidden" /> on brand today.
            </h2>
            <p className="mx-auto mt-4 max-w-[440px] text-[14.5px] leading-[24px] text-ink-600/80">
              Bring your guidelines, submit your first asset, and see the evidence behind every finding.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
              <Link to="/login" className="mkt-pill-dark w-full sm:w-auto">
                Launch Live Prototype
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a href="#demo-story" className="mkt-pill-light w-full sm:w-auto">
                See Festival Walkthrough
              </a>
            </div>
            <p className="mt-5 text-[12px] text-ink-600/60">
              Judges access: <strong className="font-medium text-ink">david.kim@pureglow.co</strong> / <strong className="font-medium text-ink">emily.carter@pureglow.co</strong> (password: <code className="text-brand-600">precedent</code>)
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 700)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />
      <main>
        <Hero />
        <LogoStrip />
        <Statement />
        <PlatformBand />
        <EvidenceSplit />
        <ChallengeShowcase />
        <FestivalDemoScenario />
        <FeaturesGrid />
        <WorkGrid />
        <WhyPrecedent />
        <BetterWay />
        <AudienceCards />
        <TechStackSection />
        <TeamSection />
        <Workflow />
        <Testimonial />
        <Faq />
        <CtaBand />
      </main>
      <MarketingFooter />

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        className={cn(
          'fixed bottom-6 left-1/2 z-30 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full bg-ink text-white shadow-[0_16px_40px_-16px_rgba(15,33,56,0.7)] transition-all duration-300',
          showTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
        )}
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </div>
  )
}
