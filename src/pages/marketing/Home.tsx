import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  Clock3,
  FileSearch,
  FlaskConical,
  Layers,
  Minus,
  Plus,
  Quote,
  ScrollText,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
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
    lilac: 'bg-white text-[#5F32BE] border-[#DED6F1]',
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
              New — Rule Impact Sandbox is live
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
            <p className="mx-auto mt-6 max-w-[560px] text-[15.5px] leading-[26px] text-ink-600/85">
              Precedent checks content against your brand guidelines, cites the exact passage behind every finding, and
              keeps approvals, exceptions and rule changes traceable.
            </p>
          </Reveal>

          <Reveal delay={190}>
            <div className="mt-8 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
              <Link to="/login" className="mkt-pill-dark w-full sm:w-auto group">
                Start free trial
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <a href="#platform" className="mkt-pill-light w-full sm:w-auto">
                See how it works
              </a>
            </div>
            <p className="mt-4 text-[12px] text-muted-light">No credit card · 14-day trial · Set up in an afternoon</p>
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
              <p className="mt-2 border-l-2 border-[#BFD5FD] pl-2 text-[10.5px] italic leading-[15px] text-ink-600">
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
/* 6. Better way — 3 columns                                           */
/* ------------------------------------------------------------------ */

const PILLARS = [
  {
    title: 'Reviews that cite their sources',
    body: 'Every finding links to the page and passage it came from. No citation, no claim — unverified passages are flagged for a human.',
  },
  {
    title: 'Approvals that respect versions',
    body: 'A decision attaches to a specific content version. Edit the asset and the old approval doesn’t quietly follow it.',
  },
  {
    title: 'Exceptions that expire on their own',
    body: 'Scope, reason and expiry are recorded. Out-of-scope or expired exceptions are rejected by the backend, not just hidden in the UI.',
  },
]

function BetterWay() {
  return (
    <section className="border-t border-ink/[0.06] bg-white py-20 lg:py-24">
      <div className="mkt-container">
        <Reveal>
          <h2 className="mkt-display max-w-[520px] text-[34px] leading-[1.08] text-ink sm:text-[42px]">
            A better way to run brand review
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 80}>
              <div className="border-t border-ink/10 pt-5 transition-transform duration-300 hover:-translate-y-1">
                <span className="text-[11px] font-semibold text-muted-light">0{i + 1}</span>
                <h3 className="mt-2 text-[16px] font-semibold tracking-[-0.01em] text-ink">{p.title}</h3>
                <p className="mt-2 text-[13.5px] leading-[22px] text-muted">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
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
/* 10. Audience cards                                                  */
/* ------------------------------------------------------------------ */

function AudienceCards() {
  return (
    <section className="bg-white pb-20 lg:pb-24">
      <div className="mkt-container grid gap-4 sm:grid-cols-2">
        <Reveal className="rounded-[26px] border border-ink/[0.07] bg-[#F7F8FA] p-7 sm:p-9">
          <Pill tone="mint">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7AB93B]" />
            For brand teams
          </Pill>
          <h3 className="mt-5 font-display text-[30px] leading-[1.1] text-ink">
            Review at the speed
            <br />
            of the campaign
          </h3>
          <p className="mt-3 max-w-[320px] text-[13.5px] leading-[22px] text-muted">
            Bring your guidelines, submit an asset, and see the evidence behind every finding before it ships.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/login" className="mkt-pill-dark h-10 py-0 text-[13px]">
              Book a demo
            </Link>
            <a href="#pricing" className="mkt-pill-light h-10 py-0 text-[13px]">
              See pricing
            </a>
          </div>
        </Reveal>

        <Reveal delay={90} className="rounded-[26px] border border-ink/[0.07] bg-[#FBF7F8] p-7 sm:p-9">
          <Pill tone="blush">
            <span className="h-1.5 w-1.5 rounded-full bg-[#EF9FB0]" />
            For creators
          </Pill>
          <h3 className="mt-5 font-display text-[30px] leading-[1.1] text-ink">
            Know the rules
            <br />
            before you submit
          </h3>
          <p className="mt-3 max-w-[320px] text-[13.5px] leading-[22px] text-muted">
            Check your copy against the active rule set, apply the suggested fix, and resubmit as a new version.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/login" className="mkt-pill-dark h-10 py-0 text-[13px]">
              Open creator workspace
            </Link>
            <Link to="/login" className="mkt-pill-light h-10 py-0 text-[13px]">
              Browse guidelines
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 11. Pricing                                                         */
/* ------------------------------------------------------------------ */

const PLANS = [
  {
    name: 'Starter',
    tagline: 'For a single brand finding its rhythm.',
    monthly: 0,
    annual: 0,
    unit: 'free forever',
    cta: 'Start free',
    features: ['1 brand workspace', '3 guideline documents', '10 reviews per month', 'Evidence-linked findings', 'Audit history (30 days)'],
    highlight: false,
  },
  {
    name: 'Growth',
    tagline: 'For teams running campaigns every week.',
    monthly: 39,
    annual: 31,
    unit: 'per seat / month',
    cta: 'Start 14-day trial',
    features: [
      'Unlimited brands & guidelines',
      'Unlimited reviews',
      'Rule Impact Sandbox',
      'Scoped exceptions with expiry',
      'Rule conflict detection',
      'Full audit history & CSV export',
    ],
    highlight: true,
  },
  {
    name: 'Enterprise',
    tagline: 'For governance across markets and agencies.',
    monthly: null,
    annual: null,
    unit: 'custom pricing',
    cta: 'Talk to sales',
    features: ['Everything in Growth', 'SSO & SCIM provisioning', 'Multi-brand rule inheritance', 'Dedicated CSM & onboarding', 'Custom retention & DPA'],
    highlight: false,
  },
]

function Pricing() {
  const [annual, setAnnual] = useState(true)
  return (
    <section id="pricing" className="scroll-mt-24 border-t border-ink/[0.06] bg-cream/50 py-20 lg:py-28">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<>Simple, per-seat pricing</>}
            title="Priced for the team that owns the brand"
            sub="Every plan includes evidence-linked reviews, versioned approvals and the full audit trail. No automatic approvals, ever."
          />
        </Reveal>

        <Reveal delay={80} className="mt-8 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-white p-1">
            <button
              onClick={() => setAnnual(false)}
              className={cn('rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-colors', !annual ? 'bg-ink text-white' : 'text-ink-600')}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn('rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-colors', annual ? 'bg-ink text-white' : 'text-ink-600')}
            >
              Annual
              <span className={cn('ml-1.5 text-[10px]', annual ? 'text-white/70' : 'text-success-600')}>−20%</span>
            </button>
          </div>
        </Reveal>

        <div className="mt-8 grid items-start gap-4 lg:grid-cols-3">
          {PLANS.map((p, i) => {
            const price = annual ? p.annual : p.monthly
            return (
              <Reveal
                key={p.name}
                delay={i * 80}
                className={cn(
                  'relative flex h-full flex-col rounded-[24px] border p-6 sm:p-7',
                  p.highlight
                    ? 'border-ink bg-ink text-white shadow-[0_30px_70px_-40px_rgba(15,33,56,0.8)]'
                    : 'border-ink/[0.08] bg-white',
                )}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-[#B9DE7E] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#1F3D12]">
                    Most popular
                  </span>
                )}
                <p className={cn('text-[13px] font-semibold', p.highlight ? 'text-white' : 'text-ink')}>{p.name}</p>
                <p className={cn('mt-1 text-[12.5px] leading-[19px]', p.highlight ? 'text-white/55' : 'text-muted')}>{p.tagline}</p>

                <div className="mt-5 flex items-baseline gap-1.5">
                  {price === null ? (
                    <span className={cn('font-display text-[34px] leading-none', p.highlight ? 'text-white' : 'text-ink')}>Custom</span>
                  ) : (
                    <>
                      <span className={cn('font-display text-[40px] leading-none', p.highlight ? 'text-white' : 'text-ink')}>
                        ${price}
                      </span>
                      <span className={cn('text-[11.5px]', p.highlight ? 'text-white/50' : 'text-muted-light')}>{p.unit}</span>
                    </>
                  )}
                </div>
                {price === null && <p className={cn('mt-1 text-[11.5px]', p.highlight ? 'text-white/50' : 'text-muted-light')}>Volume & market-based</p>}

                <Link
                  to="/login"
                  className={cn(
                    'mt-5 inline-flex h-11 w-full items-center justify-center rounded-full text-[13px] font-medium transition-all',
                    p.highlight
                      ? 'bg-white text-ink hover:bg-white/90'
                      : 'border border-ink/15 text-ink hover:border-ink/30 hover:bg-[#FAFBFC]',
                  )}
                >
                  {p.cta}
                </Link>

                <ul className="mt-6 space-y-2.5 border-t pt-5" style={{ borderColor: p.highlight ? 'rgba(255,255,255,.12)' : '#E7EEF8' }}>
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className={cn('mt-[2px] h-3.5 w-3.5 shrink-0', p.highlight ? 'text-[#B9DE7E]' : 'text-success-500')} strokeWidth={2.6} />
                      <span className={cn('text-[12.5px] leading-[19px]', p.highlight ? 'text-white/75' : 'text-ink-600')}>{f}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )
          })}
        </div>
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
                Start free trial
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a href="#pricing" className="mkt-pill-light w-full sm:w-auto">
                Talk to sales
              </a>
            </div>
            <p className="mt-5 text-[12px] text-ink-600/60">
              Already have a workspace?{' '}
              <Link to="/login" className="font-medium text-ink underline decoration-ink/25 underline-offset-2 hover:decoration-ink/60">
                Sign in
              </Link>
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
        <BetterWay />
        <Testimonial />
        <WhyPrecedent />
        <WorkGrid />
        <AudienceCards />
        <Pricing />
        <Workflow />
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
