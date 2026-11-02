import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Code2,
  Cpu,
  Database,
  FileSearch,
  FlaskConical,
  History,
  Layers,
  Plus,
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
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Shared UI Primitives                                               */
/* ------------------------------------------------------------------ */

function Pill({ children, tone = 'cream' }: { children: React.ReactNode; tone?: 'cream' | 'lilac' | 'mint' | 'blush' }) {
  const tones = {
    cream: 'bg-white/80 text-ink-600 border-ink/10',
    lilac: 'bg-white text-[#55653D] border-[#DED6F1]',
    mint: 'bg-[#E9F6DD] text-[#3F6B24] border-[#D6E9C4]',
    blush: 'bg-[#FBEEF1] text-[#A03A52] border-[#F2D9DF]',
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-medium shadow-2xs', tones[tone])}>
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
    <div className={cn('max-w-[760px]', align === 'center' && 'mx-auto text-center')}>
      {eyebrow && <div className="mb-5">{<Pill tone={tone}>{eyebrow}</Pill>}</div>}
      <h2 className="mkt-display text-balance text-[34px] text-ink sm:text-[42px] lg:text-[46px]">{title}</h2>
      {sub && <p className={cn('mt-4 text-[15px] leading-[24px] text-muted', align === 'center' && 'mx-auto max-w-[620px]')}>{sub}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 1. Hero Section                                                    */
/* ------------------------------------------------------------------ */

function Hero() {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollStrip = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }

  return (
    <section id="platform" className="relative overflow-hidden bg-cream pb-12 pt-[104px] sm:pt-[124px]">
      {/* Soft animated wash background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-10%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[#EAF3D8]/60 blur-[120px] animate-pulse-glow" />
        <div className="absolute right-[-10%] top-[30%] h-[360px] w-[360px] rounded-full bg-[#F8E4C8]/50 blur-[100px] animate-float-slow" />
      </div>

      <div className="relative mkt-container">
        {/* Floating trust badges */}
        <div className="pointer-events-none hidden xl:flex absolute -left-8 top-12 animate-float-slow items-center gap-2.5 rounded-2xl border border-white/80 bg-white/80 p-3 shadow-[0_15px_30px_-10px_rgba(15,33,56,0.1)] backdrop-blur-md z-20">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-50 text-success-600 border border-success-100 shadow-2xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="text-left text-xs pr-2">
            <p className="font-bold text-ink">Deterministic Primacy</p>
            <p className="text-[10.5px] text-muted">13 Brand Rule Checkers</p>
          </div>
        </div>

        <div className="pointer-events-none hidden xl:flex absolute -right-8 top-8 animate-float-reverse items-center gap-2.5 rounded-2xl border border-white/80 bg-white/80 p-3 shadow-[0_15px_30px_-10px_rgba(15,33,56,0.1)] backdrop-blur-md z-20">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-100 shadow-2xs">
            <Sparkles className="h-5 w-5 text-brand-500" />
          </div>
          <div className="text-left text-xs pr-2">
            <p className="font-bold text-ink">Verifiable Citations</p>
            <p className="text-[10.5px] text-muted">Zero Hallucination Shield</p>
          </div>
        </div>

        <div className="mx-auto max-w-[860px] text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/85 px-4 py-1.5 text-[12px] font-medium text-ink-600 shadow-2xs backdrop-blur transition-transform hover:scale-105">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Enterprise AI Brand Governance Platform · PureGlow Workspace Ready
            </span>
          </Reveal>

          <Reveal delay={70}>
            <h1 className="mkt-display mt-6 text-balance text-[46px] text-ink sm:text-[64px] lg:text-[76px]">
              Every brand decision,
              <br />
              <span className="relative inline-block">
                with verifiable evidence.
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
            <p className="mx-auto mt-6 max-w-[620px] text-[16px] leading-[26px] text-ink-600/85">
              The deterministic brand governance platform for high-velocity creative teams. Replace ambiguous AI scores and unrecorded Slack approvals with passage-grounded citations, scoped expiring exceptions, and pre-activation sandbox simulation.
            </p>
          </Reveal>

          <Reveal delay={190}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/login" className="mkt-pill-dark w-full sm:w-auto group shadow-md hover:shadow-lg transition-all">
                Launch Live Prototype
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <a href="#innovations" className="mkt-pill-light w-full sm:w-auto shadow-2xs">
                Explore Innovations
              </a>
            </div>
            <p className="mt-4 text-[12px] text-muted-light">
              PureGlow Botanicals Production Workspace · 12 Interactive Screens Seeded
            </p>
          </Reveal>
        </div>
      </div>

      {/* Asset Strip */}
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
/* 2. Deterministic Rule Marquee Strip                                */
/* ------------------------------------------------------------------ */

const CHECKED_RULES = [
  'Approved typefaces',
  'Logo clear space',
  'Approved claims only',
  'No medical claims',
  'No fake scarcity',
  'Paid partnership disclosure',
  'Platform aspect ratios',
  'Warm, plain-spoken tone',
  'Verifiable discounts',
  'Approved backgrounds',
]

function RuleStrip() {
  return (
    <div className="border-y border-ink/[0.06] bg-white py-5">
      <div className="mkt-container">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            13 Deterministic Checkers
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] font-medium text-ink-600">
            {CHECKED_RULES.map((rule) => (
              <span key={rule} className="inline-flex items-center gap-1.5 transition-colors hover:text-ink">
                <Check className="h-3.5 w-3.5 text-success-600" />
                {rule}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 3. Core Innovations (3 Pillars)                                    */
/* ------------------------------------------------------------------ */

function InnovationsSection() {
  const innovations = [
    {
      num: '01',
      title: 'Evidence-Linked & Versioned Review',
      tag: 'Deterministic Grounding',
      desc: 'Precedent highlights potential guideline violations, displays the exact stored passage from the source document (e.g. Page 12, Rule BR-01), and drafts a minimal correction without altering the creative voice.',
      highlights: [
        'Deterministic rule comparisons with verified page & passage citations',
        'Minimal-edit suggestions that preserve creator creative voice',
        'Unverified or ambiguous passages flagged for human review — zero hallucinated passes',
      ],
      tone: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
      visual: (
        <div className="relative mt-5 overflow-hidden rounded-2xl border border-emerald-200/80 bg-emerald-950/5 shadow-md group">
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <img
              src="/images/assets/poster_audit.jpg"
              alt="Poster OCR and Evidence Verification"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-emerald-600/90 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              RapidOCR + CIE-Lab · 99.4% Match
            </div>
            <div className="absolute bottom-2.5 inset-x-2.5 rounded-xl border border-white/20 bg-black/65 p-2.5 backdrop-blur-md text-white">
              <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400">
                <span>Rule BR-01 · Verified Page Citation</span>
                <span className="bg-emerald-500/30 text-emerald-300 px-1.5 py-0.2 rounded text-[9px] border border-emerald-400/40">p.12 §3.2</span>
              </div>
              <p className="mt-1 text-[10.5px] italic text-white/95 leading-tight truncate">
                “Primary green (#7AB93B) and neutral sand (#F4EFE3) are the only approved campaign background colours.”
              </p>
              <div className="mt-1.5 flex items-center justify-between text-[9px] text-white/70 pt-0.5 border-t border-white/10">
                <span>Color Palette Guide v1.0</span>
                <span className="text-emerald-300 font-semibold">100% Grounded in PDF</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      num: '02',
      title: 'Scoped, Expiring Human Exceptions',
      tag: 'Temporal Governance',
      desc: 'When guidelines don’t fit reality (like a seasonal festival campaign), managers grant a scoped ruling with an explicit reason, campaign/channel boundaries, and an expiration date.',
      highlights: [
        'Records decision owner, rationale, applicable channels, and expiry timestamp',
        'Code-level enforcement: expired or out-of-scope exceptions are rejected automatically',
        'Prevents the exact same exceptions from being argued repeatedly in chats and emails',
      ],
      tone: 'bg-purple-50 text-purple-800 border-purple-200/60',
      visual: (
        <div className="relative mt-5 overflow-hidden rounded-2xl border border-purple-200/80 bg-purple-950/5 shadow-md group">
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <img
              src="/images/assets/festival.jpg"
              alt="Seasonal Festival Exception Campaign"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-purple-600/90 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-md">
              <Clock3 className="h-3.5 w-3.5" />
              Auto-Expires: 31 Dec 2026
            </div>
            <div className="absolute bottom-2.5 inset-x-2.5 rounded-xl border border-white/20 bg-black/65 p-2.5 backdrop-blur-md text-white">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-300">EX-2024-09 · Seasonal Exemption</span>
                <span className="text-[9px] bg-purple-500/40 text-purple-200 px-1.5 py-0.5 rounded font-mono border border-purple-400/30">Active Override</span>
              </div>
              <p className="mt-1 text-[10px] text-white/90 leading-tight">
                “Orange background permitted for seasonal festival creative only.”
              </p>
              <div className="mt-1.5 flex items-center justify-between text-[9px] text-white/70 pt-0.5 border-t border-white/10">
                <span>Approver: David Kim (Brand Mgr)</span>
                <span className="text-purple-300 font-semibold">Scope: Social Ads Only</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      num: '03',
      title: 'Pre-Activation Rule Impact Sandbox',
      tag: 'Policy Simulation',
      desc: 'Before any brand guideline change becomes active law, managers simulate the proposed rule against real stored campaign assets to preview compliant, failing, and review-needed assets.',
      highlights: [
        'Replays historical submissions against proposed drafts before activation',
        'Automatic rule conflict detection against existing rulings and exceptions',
        'Deterministic 9 compliant / 3 needs review / 2 failing breakdown',
      ],
      tone: 'bg-blue-50 text-blue-800 border-blue-200/60',
      visual: (
        <div className="relative mt-5 overflow-hidden rounded-2xl border border-blue-200/80 bg-blue-950/5 shadow-md group">
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <img
              src="/images/assets/summer.jpg"
              alt="Rule Impact Sandbox Replay"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-blue-600/90 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-md">
              <FlaskConical className="h-3.5 w-3.5" />
              14 Historical Assets Replayed
            </div>
            <div className="absolute bottom-2.5 inset-x-2.5 rounded-xl border border-white/20 bg-black/65 p-2.5 backdrop-blur-md text-white">
              <div className="flex justify-between text-[10.5px] font-bold">
                <span className="text-emerald-400">9 Compliant (64%)</span>
                <span className="text-amber-300">3 Review (21%)</span>
                <span className="text-red-400">2 Fail (15%)</span>
              </div>
              <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-white/20">
                <div className="bg-emerald-400 w-[64%]" />
                <div className="bg-amber-300 w-[21%]" />
                <div className="bg-red-400 w-[15%]" />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[9px] text-white/70 pt-0.5 border-t border-white/10">
                <span>Deterministic Replay Delta</span>
                <span className="text-blue-300 font-semibold">+14% Safety Increase</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ]

  return (
    <section id="innovations" className="scroll-mt-24 border-t border-ink/[0.06] bg-cream/50 py-20 lg:py-28">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><Sparkles className="h-3 w-3" /> Core Innovations</>}
            title="The Precedent Architecture: 3 Pillars of Governance"
            sub="Most brand tools only do spelling checks or ungrounded AI guesses. Precedent solves the real problem: how to handle situations guidelines don’t explain, and preview rule changes before activation."
          />
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {innovations.map((item, idx) => (
            <Reveal
              key={item.num}
              delay={idx * 90}
              className="relative flex flex-col justify-between rounded-[28px] border border-ink/[0.08] bg-white p-6 sm:p-7 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-brand-300"
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

                {item.visual}

                <ul className="mt-5 space-y-2 border-t border-ink/[0.06] pt-4">
                  {item.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] leading-[18px] text-ink-700">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 border-t border-ink/[0.06] pt-4 flex items-center justify-between text-[11px]">
                <span className="text-muted font-medium">Human-in-the-loop control</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Zero AI hallucination
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 4. Enterprise Capabilities (8 Modules)                             */
/* ------------------------------------------------------------------ */

function FeaturesGrid() {
  const features = [
    {
      title: 'Brand Guideline Library',
      desc: 'Upload, organise, version, and search reference documents and approved facts with page-level text extraction.',
      icon: BookOpen,
      tag: 'Doc Store',
      image: '/images/brand/guidelines.webp',
      badge: '28 pgs · PyMuPDF',
      badgeTone: 'bg-blue-600/90 text-white',
      accent: 'Color Palette Guide v1.0.pdf',
    },
    {
      title: 'Evidence-Linked Review',
      desc: 'Identify potential issues and cite the exact stored guideline passage instead of presenting a vague AI score.',
      icon: FileSearch,
      tag: 'Citations',
      image: '/images/assets/poster_audit.jpg',
      badge: '100% Grounded in PDF',
      badgeTone: 'bg-emerald-600/90 text-white',
      accent: 'Rule BR-01 · Page 12',
    },
    {
      title: 'Minimal-Edit Suggestions',
      desc: 'Recommend targeted corrections that solve the rule violation without rewriting the creator’s original message.',
      icon: Sparkles,
      tag: 'Fix Engine',
      image: '/images/brand/serum.webp',
      badge: '1-Click Apply Fix',
      badgeTone: 'bg-amber-600/90 text-white',
      accent: 'Clinical Copy Correction',
    },
    {
      title: 'Version-Based Approvals',
      desc: 'Decisions attach strictly to a specific content version. Edit the asset, and the previous approval does not carry over.',
      icon: CheckCircle2,
      tag: 'Immutable',
      image: '/images/brand/jar.webp',
      badge: 'v2.0 Version-Locked',
      badgeTone: 'bg-purple-600/90 text-white',
      accent: 'Signoff: David Kim',
    },
    {
      title: 'Scoped Exception Rulings',
      desc: 'Record human-approved exceptions with owner, rationale, applicable campaign scope, effective dates, and expiry.',
      icon: ShieldAlert,
      tag: 'Governance',
      image: '/images/assets/festival.jpg',
      badge: 'EX-12 · Exp: 31 Dec',
      badgeTone: 'bg-purple-600/90 text-white',
      accent: 'Festival Campaign Scope',
    },
    {
      title: 'Rule Conflict Detection',
      desc: 'Detect contradictions between structured rules or between a proposed rule and an existing active exception ruling.',
      icon: TriangleAlert,
      tag: 'Validator',
      image: '/images/assets/sensitive.jpg',
      badge: 'Auto-Blocked Conflict',
      badgeTone: 'bg-red-600/90 text-white',
      accent: 'Contradiction Prevention',
    },
    {
      title: 'Rule Impact Sandbox',
      desc: 'Compare active and proposed rule sets against stored historical content to see changes before anything goes live.',
      icon: FlaskConical,
      tag: 'Simulator',
      image: '/images/assets/summer.jpg',
      badge: '14 Historical Assets',
      badgeTone: 'bg-blue-600/90 text-white',
      accent: '9 Pass · 3 Rev · 2 Fail',
    },
    {
      title: 'Audit Trail & Guideline Health',
      desc: 'Immutable append-only history of reviews, overrides, exceptions, and recurring confusion sources across the brand.',
      icon: History,
      tag: 'Audit Log',
      image: '/images/brand/lifestyle.webp',
      badge: 'SHA-256 Hash Verified',
      badgeTone: 'bg-emerald-600/90 text-white',
      accent: 'ProofPass Sealed',
    },
  ]

  return (
    <section id="features" className="scroll-mt-24 border-t border-ink/[0.06] bg-cream/40 py-20 lg:py-24">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><Layers className="h-3 w-3" /> Platform Capabilities</>}
            title="8 Core Governance Modules"
            sub="Enterprise-grade brand protection across reference documents, campaign posters, human overrides, and historical simulations."
          />
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Reveal
              key={f.title}
              delay={i * 40}
              className="group relative flex flex-col justify-between rounded-2xl border border-ink/[0.08] bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-brand-300"
            >
              <div>
                {/* Visual Image Header */}
                <div className="relative h-32 w-full overflow-hidden rounded-xl border border-ink/10 bg-canvas shadow-inner">
                  <img
                    src={f.image}
                    alt={f.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold backdrop-blur-md shadow-xs" style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff' }}>
                    <f.icon className="h-3 w-3 text-emerald-400" />
                    <span>{f.tag}</span>
                  </div>
                  <div className="absolute bottom-2 inset-x-2 flex items-center justify-between text-[9.5px]">
                    <span className="truncate font-semibold text-white/90">{f.accent}</span>
                    <span className={cn('shrink-0 px-1.5 py-0.2 rounded font-bold text-[8.5px]', f.badgeTone)}>
                      {f.badge}
                    </span>
                  </div>
                </div>

                <h4 className="mt-4 text-[15px] font-bold text-ink">{f.title}</h4>
                <p className="mt-1.5 text-[12px] leading-[18px] text-muted">{f.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-ink/[0.04] text-[10px] font-bold text-brand-600 flex items-center justify-between">
                <span>0{i + 1} · Live in Prototype</span>
                <span className="text-muted-light group-hover:text-brand-600 transition-colors">Explore →</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 5. System Architecture & Execution Pipeline                        */
/* ------------------------------------------------------------------ */

function ArchitectureSection() {
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
    <section id="architecture" className="scroll-mt-24 border-t border-ink/[0.06] bg-white py-20 lg:py-28">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><Cpu className="h-3 w-3" /> System Architecture</>}
            title="Technical Approach & Execution Pipeline"
            sub="Built with an explicit separation of concerns: deterministic code handles rule enforcement and expiry; AI assists with document comprehension."
          />
        </Reveal>

        {/* Executive Glass Dark Architecture Canvas */}
        <Reveal delay={80} className="mt-12 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#121B16] via-[#16231C] to-[#0A120E] p-7 sm:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] text-white relative overflow-hidden">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl" />

          <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4 mb-8">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[13px] font-bold uppercase tracking-wider text-white">
                Precedent Live Data Pipeline & Architecture
              </span>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-mono text-emerald-300 border border-white/10">
              FastAPI + PyTorch ONNX + PostgreSQL
            </span>
          </div>

          <div className="relative z-10 grid gap-4 lg:grid-cols-4 items-stretch">
            {/* Stage 1 */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-md transition-all hover:bg-white/[0.1] hover:border-emerald-500/40">
              <div className="flex items-center justify-between mb-3">
                <span className="rounded-lg bg-red-500/20 text-red-300 px-2.5 py-1 text-[10px] font-bold border border-red-500/30">STAGE 01</span>
                <span className="text-[10px] text-white/50 font-mono">PyMuPDF</span>
              </div>
              <h5 className="text-[14px] font-bold text-white">Guideline Ingestion</h5>
              <p className="mt-1 text-[11px] leading-[16px] text-white/60">
                Parses PDF/DOCX brand books, extracts page hierarchies & sentence boundaries.
              </p>
              <div className="mt-3 text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                <Check className="h-3 w-3" /> Page-level text indexing
              </div>
            </div>

            {/* Stage 2 */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-md transition-all hover:bg-white/[0.1] hover:border-emerald-500/40">
              <div className="flex items-center justify-between mb-3">
                <span className="rounded-lg bg-emerald-500/20 text-emerald-300 px-2.5 py-1 text-[10px] font-bold border border-emerald-500/30">STAGE 02</span>
                <span className="text-[10px] text-white/50 font-mono">multilingual-e5</span>
              </div>
              <h5 className="text-[14px] font-bold text-white">Evidence Intelligence</h5>
              <p className="mt-1 text-[11px] leading-[16px] text-white/60">
                Hybrid BM25 sparse + ONNX dense 384-dim vector retrieval blended via RRF.
              </p>
              <div className="mt-3 text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                <Check className="h-3 w-3" /> Exact quote verification
              </div>
            </div>

            {/* Stage 3 */}
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-5 backdrop-blur-md transition-all hover:bg-emerald-900/50 shadow-glow-emerald">
              <div className="flex items-center justify-between mb-3">
                <span className="rounded-lg bg-emerald-500 text-ink px-2.5 py-1 text-[10px] font-bold">STAGE 03 · SOLE AUTHORITY</span>
                <span className="text-[10px] text-emerald-300 font-mono">Deterministic</span>
              </div>
              <h5 className="text-[14px] font-bold text-white">Brand Rule Engine</h5>
              <p className="mt-1 text-[11px] leading-[16px] text-emerald-100/80">
                Evaluates 13 condition types. Rules override AI — zero hallucinated passes.
              </p>
              <div className="mt-3 text-[10px] font-semibold text-emerald-300 flex items-center gap-1">
                <Check className="h-3 w-3" /> 13 Deterministic Checkers
              </div>
            </div>

            {/* Stage 4 */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-md transition-all hover:bg-white/[0.1] hover:border-emerald-500/40">
              <div className="flex items-center justify-between mb-3">
                <span className="rounded-lg bg-purple-500/20 text-purple-300 px-2.5 py-1 text-[10px] font-bold border border-purple-500/30">STAGE 04</span>
                <span className="text-[10px] text-white/50 font-mono">ProofPass</span>
              </div>
              <h5 className="text-[14px] font-bold text-white">Cryptographic Mint</h5>
              <p className="mt-1 text-[11px] leading-[16px] text-white/60">
                Mints tamper-evident SHA-256 digest + 64-bit perceptual image hash passport.
              </p>
              <div className="mt-3 text-[10px] font-semibold text-purple-300 flex items-center gap-1">
                <Check className="h-3 w-3" /> Immutable Audit Passport
              </div>
            </div>
          </div>
        </Reveal>

        {/* 5 Architecture Pillar Cards */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {stack.map((s, i) => (
            <Reveal
              key={s.name}
              delay={i * 50}
              className="flex flex-col justify-between rounded-2xl border border-ink/[0.08] bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-canvas text-ink-700 shadow-2xs">
                    <s.icon className="h-4 w-4" />
                  </div>
                  <span className={cn('text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border', s.tone)}>
                    {s.metric}
                  </span>
                </div>
                <p className="mt-4 text-[10.5px] font-bold uppercase tracking-wider text-muted-light">{s.role}</p>
                <h4 className="mt-1 text-[14px] font-bold text-ink">{s.name}</h4>
                <p className="mt-2 text-[11.5px] leading-[18px] text-muted">{s.why}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 6. Founding & Engineering Team                                     */
/* ------------------------------------------------------------------ */

function TeamSection() {
  const members = [
    {
      name: 'Samarth Manojkumar Darak',
      initials: 'SD',
      role: 'Product Architect & Team Lead',
      focus: 'User interviews, problem validation, product architecture, system integration, judge evaluation.',
      badge: 'Team Lead',
      tone: 'from-emerald-600 to-teal-700 text-white',
      badgeTone: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    {
      name: 'Balaji Sanjay Chavan',
      initials: 'BC',
      role: 'Backend & Database Engineer',
      focus: 'SQLAlchemy database models, FastAPI routers, Rule Engine, Sandbox simulator, audit history.',
      badge: 'Backend Lead',
      tone: 'from-blue-600 to-indigo-700 text-white',
      badgeTone: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    {
      name: 'Sartha Chandgude',
      initials: 'SC',
      role: 'Frontend & UI/UX Specialist',
      focus: 'React 18 + Tailwind workspace views, design tokens, accessibility, responsive ergonomics.',
      badge: 'Design & UI',
      tone: 'from-purple-600 to-pink-700 text-white',
      badgeTone: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    {
      name: 'Palak Chandak',
      initials: 'PC',
      role: 'AI / Retrieval Specialist',
      focus: 'PyMuPDF passage chunking, multilingual-e5 ONNX embeddings, citation validator, prompt defense.',
      badge: 'AI & Retrieval',
      tone: 'from-amber-600 to-orange-700 text-white',
      badgeTone: 'bg-amber-100 text-amber-800 border-amber-200',
    },
  ]

  return (
    <section id="team" className="scroll-mt-24 border-t border-ink/[0.06] bg-cream/50 py-20 lg:py-28">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><Users className="h-3 w-3" /> Founding & Engineering Team</>}
            title="Team We Code Coders"
            sub="Vishwakarma Institute of Technology (VIT Pune) · Inkloom AI Brand Governance Challenge"
          />
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((m, idx) => (
            <Reveal
              key={m.name}
              delay={idx * 70}
              className="flex flex-col justify-between rounded-[26px] border border-ink/[0.08] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-brand-300"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br font-bold text-lg shadow-md ring-4 ring-black/5', m.tone)}>
                    {m.initials}
                  </div>
                  <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', m.badgeTone)}>
                    {m.badge}
                  </span>
                </div>

                <h4 className="mt-5 text-[17px] font-bold text-ink leading-snug">{m.name}</h4>
                <p className="mt-1 text-[11px] font-semibold text-brand-700 uppercase tracking-wide">{m.role}</p>
                <p className="mt-2.5 text-[12.5px] leading-[20px] text-muted">{m.focus}</p>
              </div>

              <div className="mt-6 border-t border-ink/[0.06] pt-3.5 flex items-center justify-between text-[11px]">
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Verified Builder
                </span>
                <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                  VIT Pune
                </span>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Prototype Access Banner */}
        <Reveal delay={150} className="mt-12 rounded-[28px] border border-brand-200 bg-gradient-to-r from-white via-brand-50/30 to-white p-7 sm:p-9 shadow-lg">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                </span>
                <h4 className="text-[18px] font-bold text-ink">Ready for Live Prototype Evaluation</h4>
              </div>
              <p className="mt-1.5 text-[13.5px] text-muted max-w-2xl">
                Preloaded with enterprise brand guidelines (PureGlow Botanicals), posters, historical submissions, and the festival exception scenario.
              </p>
              <div className="mt-3.5 flex flex-wrap gap-2.5 sm:gap-4 text-[12px] font-mono">
                <span className="rounded-xl bg-white px-3.5 py-2 border border-brand-200 text-ink shadow-2xs">
                  Brand Manager: <strong className="text-brand-600">david.kim@pureglow.co</strong> / <code className="text-muted">precedent</code>
                </span>
                <span className="rounded-xl bg-white px-3.5 py-2 border border-brand-200 text-ink shadow-2xs">
                  Content Creator: <strong className="text-brand-600">emily.carter@pureglow.co</strong> / <code className="text-muted">precedent</code>
                </span>
              </div>
            </div>

            <Link
              to="/login"
              className="mkt-pill-dark h-12 px-6 text-[13.5px] font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all shrink-0"
            >
              Launch Live Prototype →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 7. Bottom Call to Action                                           */
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
              <a href="#features" className="mkt-pill-light w-full sm:w-auto">
                Explore Features
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
/* Page Main Assembly                                                 */
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
        <RuleStrip />
        <InnovationsSection />
        <FeaturesGrid />
        <ArchitectureSection />
        <TeamSection />
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
