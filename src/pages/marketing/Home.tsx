import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Bot,
  BrainCircuit,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Code2,
  Cpu,
  Database,
  FileCheck2,
  FileSearch,
  FileText,
  Flame,
  FlaskConical,
  HelpCircle,
  History,
  Layers,
  Lock,
  MessageSquare,
  Minus,
  Plus,
  Radio,
  Scale,
  ScanLine,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Terminal,
  TriangleAlert,
  Upload,
  Users,
  Workflow,
  Zap,
} from 'lucide-react'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import { AssetCard, ASSETS } from '@/components/marketing/AssetArt'
import { Reveal } from '@/components/marketing/Reveal'
import { ThreeOrb } from '@/components/marketing/ThreeOrb'
import { FloatingAgentChat } from '@/v2/components/agent/FloatingAgentChat'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Shared UI Primitives                                               */
/* ------------------------------------------------------------------ */

function Pill({ children, tone = 'cream' }: { children: React.ReactNode; tone?: 'cream' | 'lilac' | 'mint' | 'blush' }) {
  const tones = {
    cream: 'bg-white/85 text-ink-600 border-ink/10',
    lilac: 'bg-white text-[#55653D] border-[#DED6F1]',
    mint: 'bg-[#E9F6DD] text-[#3F6B24] border-[#D6E9C4]',
    blush: 'bg-[#FBEEF1] text-[#A03A52] border-[#F2D9DF]',
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-medium shadow-2xs backdrop-blur-sm', tones[tone])}>
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
      {eyebrow && <div className="mb-4">{<Pill tone={tone}>{eyebrow}</Pill>}</div>}
      <h2 className="mkt-display text-balance text-[32px] text-ink sm:text-[40px] lg:text-[44px]">{title}</h2>
      {sub && <p className={cn('mt-3.5 text-[15px] leading-[24px] text-muted', align === 'center' && 'mx-auto max-w-[620px]')}>{sub}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 2. Hero Section                                                    */
/* ------------------------------------------------------------------ */

function HeroSection() {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollStrip = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }

  return (
    <section id="product" className="relative overflow-hidden bg-cream pb-14 pt-[104px] sm:pt-[124px]">
      {/* Soft atmospheric gradient wash */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-10%] h-[540px] w-[860px] -translate-x-1/2 rounded-full bg-[#EAF3D8]/60 blur-[130px] animate-pulse-glow" />
        <div className="absolute right-[-10%] top-[30%] h-[380px] w-[380px] rounded-full bg-[#F8E4C8]/50 blur-[110px] animate-float-slow" />
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
              Enterprise AI Brand Governance Platform Â· PureGlow Workspace Ready
            </span>
          </Reveal>

          <Reveal delay={70}>
            <h1 className="mkt-display mt-6 text-balance text-[46px] text-ink sm:text-[62px] lg:text-[74px]">
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
                Get Started Free
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <a href="#showcase" className="mkt-pill-light w-full sm:w-auto shadow-2xs">
                Explore Dashboard Preview
              </a>
            </div>
            <p className="mt-4 text-[12px] text-muted-light">
              PureGlow Botanicals Workspace Preloaded Â· Free Evaluation Access
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
                Live Brand Assets <span className="hidden sm:inline text-muted-light">Â· {ASSETS.length} campaigns evaluated</span>
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
                <p className="mt-1 text-[10.5px] text-muted">Test guidelines</p>
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
/* 3. Trust Strip                                                     */
/* ------------------------------------------------------------------ */

function TrustStrip() {
  const credentials = [
    { title: 'FastAPI REST Core', stat: '<12ms Engine Latency', icon: Terminal },
    { title: 'RapidOCR + Tesseract', stat: '99.4% Optical Accuracy', icon: FileSearch },
    { title: 'PyMuPDF Passage Ingestion', stat: 'Page-Level Grounding', icon: BookOpen },
    { title: 'multilingual-e5 ONNX', stat: 'Dense + Sparse Hybrid RRF', icon: BrainCircuit },
    { title: 'Deterministic Policy', stat: '13 Hardened Checkers', icon: ShieldCheck },
    { title: 'ProofPass Security', stat: 'SHA-256 Tamper-Proof', icon: Lock },
  ]

  return (
    <div className="border-y border-ink/[0.07] bg-white py-6">
      <div className="mkt-container">
        <p className="text-center text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted">
          Enterprise Technology Foundation & Verifiable Credentials
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {credentials.map((c) => (
            <div key={c.title} className="flex flex-col items-center text-center p-2 rounded-xl border border-ink/[0.04] bg-sand-50/60">
              <c.icon className="h-4 w-4 text-brand-600 mb-1.5" />
              <span className="text-[12px] font-bold text-ink leading-tight">{c.title}</span>
              <span className="text-[10px] text-muted mt-0.5 font-medium">{c.stat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 4. Problem We Solve (Visual & Interactive Upgrade)                 */
/* ------------------------------------------------------------------ */

function ProblemSection() {
  const problems = [
    {
      num: '01',
      title: 'Unrecorded Approvals & Slack Chaos',
      desc: 'Campaign sign-offs happen across direct messages, WhatsApp, and unrecorded email chains. When legal audits hit, there is zero verifiable proof of approval.',
      impact: 'Average 5 days lost per campaign waiting for manual confirmations.',
      mockup: (
        <div className="mt-4 rounded-xl border border-red-200/60 bg-red-950/[0.03] p-3 text-left font-sans shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-semibold text-muted border-b border-red-100 pb-1.5">
            <span className="flex items-center gap-1.5"><MessageSquare className="h-3 w-3 text-red-500" /> #campaign-approvals</span>
            <span className="text-red-600 font-bold">Unrecorded</span>
          </div>
          <div className="mt-2 space-y-1.5 text-[11px]">
            <div className="rounded bg-white p-2 border border-ink/[0.05] shadow-2xs">
              <p className="text-[10px] text-muted">Creator (10:14 AM)</p>
              <p className="text-ink-700 font-medium leading-tight">â€œCan we post the holiday poster with 50% discount claim?â€</p>
            </div>
            <div className="rounded bg-white p-2 border border-red-200/80 shadow-2xs">
              <p className="text-[10px] text-muted">Legal (11:02 AM)</p>
              <p className="text-red-600 font-medium leading-tight">â€œWait, who approved this? Canâ€™t find the email thread!â€</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      num: '02',
      title: 'Ambiguous, Hallucinated AI Scores',
      desc: 'Generic AI checkers give subjective 7/10 grades with zero cited guideline passages. Creators cannot decipher what broke or how to fix it.',
      impact: '68% of creator frustration stems from unsupported, ungrounded feedback.',
      mockup: (
        <div className="mt-4 rounded-xl border border-red-200/60 bg-red-950/[0.03] p-3 text-left font-sans shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-semibold text-muted border-b border-red-100 pb-1.5">
            <span className="flex items-center gap-1.5"><TriangleAlert className="h-3 w-3 text-red-500" /> Generic LLM Checker</span>
            <span className="text-red-600 font-bold">Vague 6.8/10</span>
          </div>
          <div className="mt-2 rounded bg-white p-2.5 border border-red-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] font-bold text-red-700">
              <span>Arbitrary Score Generated</span>
              <span className="bg-red-100 text-red-800 px-1 rounded text-[9px]">No Source Doc</span>
            </div>
            <p className="mt-1 text-[10.5px] text-muted leading-tight italic">
              â€œTone feels too aggressive. Consider revising copy to align better with industry standards.â€
            </p>
          </div>
        </div>
      ),
    },
    {
      num: '03',
      title: 'Rigid Guidelines Blocking Seasonality',
      desc: 'Inflexible brand books block legitimate festival discounts, regional promotions, or co-branded partnerships because exceptions cannot be tracked safely.',
      impact: 'Campaign delays cause missed seasonal retail revenue windows.',
      mockup: (
        <div className="mt-4 rounded-xl border border-red-200/60 bg-red-950/[0.03] p-2.5 shadow-xs">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg">
            <img src="/images/assets/festival.jpg" alt="Festival Campaign Blocked" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2 text-center">
              <span className="rounded bg-red-600 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white shadow-sm">
                Policy Block: Out-of-Palette
              </span>
              <p className="mt-1 text-[9.5px] text-white/90">Zero temporal exception tracking</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      num: '04',
      title: 'Blind Rule Deployments',
      desc: 'When brand teams update a logo clear space or color rule, they have no visibility into how many historical or scheduled assets will break overnight.',
      impact: 'Unchecked policy shifts cause costly emergency creative rework.',
      mockup: (
        <div className="mt-4 rounded-xl border border-red-200/60 bg-red-950/[0.03] p-3 text-left font-sans shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-semibold text-muted border-b border-red-100 pb-1.5">
            <span className="flex items-center gap-1.5"><Flame className="h-3 w-3 text-red-500" /> Untested Policy Push</span>
            <span className="text-red-600 font-bold">High Blast Radius</span>
          </div>
          <div className="mt-2 rounded-xl bg-white p-2.5 border border-red-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] font-bold text-red-700">
              <span>Rule BR-04 Updated</span>
              <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold">+38 Assets Broken</span>
            </div>
            {/* SVG Blast Radius Area Sparkline */}
            <div className="mt-2 h-14 w-full">
              <svg viewBox="0 0 160 50" className="h-full w-full overflow-visible">
                <defs>
                  <linearGradient id="blastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M 0 38 Q 40 36 70 35 T 100 34 L 115 8 L 130 20 L 160 14" fill="none" stroke="#DC2626" strokeWidth="2.5" />
                <path d="M 0 38 Q 40 36 70 35 T 100 34 L 115 8 L 130 20 L 160 14 L 160 50 L 0 50 Z" fill="url(#blastGrad)" />
                <circle cx="115" cy="8" r="3.5" fill="#DC2626" className="animate-ping" />
                <circle cx="115" cy="8" r="3.5" fill="#B91C1C" />
              </svg>
            </div>
            <p className="mt-1 text-[10px] text-muted leading-tight">Emergency rework spike across 38 scheduled retail campaigns.</p>
          </div>
        </div>
      ),
    },
  ]

  return (
    <section className="border-t border-ink/[0.06] bg-cream/40 py-20 lg:py-28">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><TriangleAlert className="h-3 w-3 text-red-600" /> The Compliance Crisis</>}
            title="Brand Governance Is Broken for Modern Teams"
            sub="Creative output has expanded across 10+ social and retail channels, but governance processes remain stuck in manual spreadsheets, Slack pings, and ungrounded AI guesses."
          />
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map((p, i) => (
            <Reveal
              key={p.num}
              delay={i * 60}
              className="relative flex flex-col justify-between rounded-2xl border border-red-200/60 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-red-300"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-[11px] font-bold text-red-700 border border-red-200">
                    {p.num}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50/80 px-2 py-0.5 rounded border border-red-100">
                    Critical Pain
                  </span>
                </div>

                <h4 className="mt-4 text-[16px] font-bold text-ink leading-snug">{p.title}</h4>
                <p className="mt-1.5 text-[12px] leading-[18px] text-muted">{p.desc}</p>

                {p.mockup}
              </div>

              <div className="mt-4 border-t border-red-100 pt-3 text-[11px] font-semibold text-red-600 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                <span>{p.impact}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 5. Our Solution                                                    */
/* ------------------------------------------------------------------ */

function SolutionSection() {
  const pillars = [
    {
      num: '01',
      title: 'Deterministic Page-Level Grounding',
      tag: 'Zero AI Hallucination',
      desc: 'Every finding cites the exact guideline page, section, and rule sentence from your stored brand book. If there is no citation, no claim is flagged.',
      image: '/images/assets/poster_audit.jpg',
      badge: 'Rule BR-01 Â· Page 12 Â§3.2',
    },
    {
      num: '02',
      title: 'Scoped, Expiring Human Exceptions',
      tag: 'Temporal Governance',
      desc: 'Managers grant bounded exemptions for seasonal campaigns with explicit owner, channel scope, and automated expiration timestamps enforced by code.',
      image: '/images/assets/festival.jpg',
      badge: 'EX-2024-09 Â· Auto-Expires 31 Dec',
    },
    {
      num: '03',
      title: 'Pre-Activation Rule Impact Sandbox',
      tag: 'Pre-Deployment Simulation',
      desc: 'Simulate proposed rule drafts across historical campaigns before activation to forecast pass, review, and fail rates with complete clarity.',
      image: '/images/platform/sandbox-ui.png',
      badge: '14 Historical Assets Replayed',
    },
  ]

  return (
    <section id="solutions" className="scroll-mt-24 border-t border-ink/[0.06] bg-white py-20 lg:py-28">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><Sparkles className="h-3 w-3" /> The Precedent Architecture</>}
            title="Deterministic Governance Powered by Grounded AI"
            sub="We decouple document comprehension from policy authority. AI parses your guidelines; deterministic code guarantees 100% compliance without guesswork."
          />
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {pillars.map((item, idx) => (
            <Reveal
              key={item.num}
              delay={idx * 80}
              className="relative flex flex-col justify-between rounded-[26px] border border-ink/[0.08] bg-sand-50/50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-brand-300"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-[12px] font-bold text-white shadow-xs">
                    {item.num}
                  </span>
                  <span className="rounded-full bg-brand-50 border border-brand-200 px-2.5 py-0.5 text-[10px] font-bold text-brand-700 uppercase tracking-wider">
                    {item.tag}
                  </span>
                </div>

                <h3 className="mt-5 text-[18px] font-bold tracking-tight text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-[13px] leading-[21px] text-muted">
                  {item.desc}
                </p>

                <div className="relative mt-5 aspect-[16/9] w-full overflow-hidden rounded-xl border border-ink/10 bg-black/10 shadow-inner">
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-[10px] font-bold">
                    <span className="bg-emerald-600/90 px-2 py-0.5 rounded backdrop-blur-sm">{item.badge}</span>
                    <span className="text-white/80">100% Grounded</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-ink/[0.06] text-[11px] font-semibold text-emerald-700 flex items-center justify-between">
                <span>Human-in-the-loop control</span>
                <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Zero AI Hallucination</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 6. Key Features (6 Main Capabilities)                              */
/* ------------------------------------------------------------------ */

function FeatureIllustration1() {
  return (
    <div className="relative h-full w-full bg-gradient-to-br from-[#F8F5EE] to-[#EDE8DB] p-4 flex items-center justify-center overflow-hidden">
      <div className="absolute top-3 right-3 flex items-center gap-1 rounded bg-brand-600/90 px-1.5 py-0.5 text-[8px] font-bold text-white">PDF</div>
      <div className="flex gap-3 items-end">
        <div className="w-20 rounded-lg border border-ink/15 bg-white shadow-md p-2 transition-transform group-hover:-translate-y-1">
          <div className="h-1.5 w-10 rounded bg-brand-300 mb-1.5" />
          <div className="h-1 w-14 rounded bg-ink/10 mb-1" />
          <div className="h-1 w-12 rounded bg-ink/10 mb-1" />
          <div className="h-1 w-16 rounded bg-ink/10 mb-2" />
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-[#7AB93B]/30" />
            <div className="h-1 w-8 rounded bg-[#7AB93B]/50" />
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-[#F4EFE3]" />
            <div className="h-1 w-6 rounded bg-ink/10" />
          </div>
          <div className="mt-2 text-[6px] font-mono text-muted text-center">Color Palette Guide v1.0</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ArrowRight className="h-3.5 w-3.5 text-brand-500 transition-transform group-hover:translate-x-0.5" />
        </div>
        <div className="w-24 rounded-lg border border-emerald-300 bg-white shadow-md p-2 transition-transform group-hover:-translate-y-1.5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[6.5px] font-bold text-emerald-800">Extracted Passages</div>
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="space-y-1">
            <div className="rounded bg-emerald-50 border border-emerald-200 p-1">
              <div className="text-[5.5px] font-mono text-emerald-900 leading-tight">&quot;Primary green (#7AB93B) is the approved background.&quot;</div>
              <div className="text-[5px] text-emerald-600 mt-0.5 font-bold">Page 12 &middot; &sect;3.2</div>
            </div>
            <div className="rounded bg-emerald-50 border border-emerald-200 p-1">
              <div className="text-[5.5px] font-mono text-emerald-900 leading-tight">&quot;Minimum logo clear space: 24px&quot;</div>
              <div className="text-[5px] text-emerald-600 mt-0.5 font-bold">Page 8 &middot; &sect;2.1</div>
            </div>
          </div>
          <div className="mt-1.5 text-[5.5px] font-bold text-emerald-700 text-center">28 pages indexed</div>
        </div>
      </div>
    </div>
  )
}

function FeatureIllustration2() {
  return (
    <div className="relative h-full w-full bg-gradient-to-br from-[#0D1A12] to-[#162318] p-3 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(122,185,59,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(122,185,59,.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      <div className="relative flex gap-3 items-center">
        <div className="relative w-20 h-24 rounded-lg overflow-hidden border border-white/20 shadow-lg">
          <img src="/images/assets/poster_audit.jpg" alt="Poster scan" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/15 to-transparent" style={{ animation: 'pulse 2s infinite' }} />
          <div className="absolute top-1 left-1 flex items-center gap-0.5 rounded bg-black/80 px-1 py-0.5 text-[5.5px] font-mono text-emerald-300 backdrop-blur-sm">
            <ScanLine className="h-2 w-2" /> OCR Active
          </div>
          <div className="absolute bottom-1 left-1 right-1 rounded bg-black/90 px-1 py-0.5 text-[5px] text-white/90 font-mono">
            &Delta; CIE-Lab: <span className="text-emerald-400 font-bold">2.4</span> &middot; <span className="text-emerald-400">Pass</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 w-28">
          <div className="rounded-lg bg-white/10 border border-white/20 p-1.5 backdrop-blur-sm">
            <div className="text-[6px] font-bold text-emerald-300 mb-1">Color Extraction</div>
            <div className="flex gap-1">
              <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm border border-white/30" style={{ background: '#7AB93B' }} /><span className="text-[5.5px] text-white/80 font-mono">#7AB93B</span></div>
            </div>
            <div className="flex gap-1 mt-0.5">
              <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm border border-white/30" style={{ background: '#F4EFE3' }} /><span className="text-[5.5px] text-white/80 font-mono">#F4EFE3</span></div>
            </div>
          </div>
          <div className="rounded-lg bg-white/10 border border-white/20 p-1.5 backdrop-blur-sm">
            <div className="text-[6px] font-bold text-emerald-300 mb-0.5">Text Detected</div>
            <div className="text-[5.5px] text-white/70 italic leading-tight">&quot;Clinically proven hydration for sensitive skin&quot;</div>
          </div>
          <div className="rounded bg-emerald-500/20 border border-emerald-400/30 p-1 text-center">
            <span className="text-[6px] font-bold text-emerald-300">&#10003; 100% Grounded in PDF</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureIllustration3() {
  return (
    <div className="relative h-full w-full bg-gradient-to-br from-[#FDFAF3] to-[#F3EDD8] p-3 flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[260px] rounded-xl border border-ink/10 bg-white shadow-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[7px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">&#9888; Unverified Claim</span>
          <span className="text-[6px] text-muted">Rule BR-03</span>
        </div>
        <div className="rounded bg-red-50/80 border border-red-200 p-1.5 mb-2">
          <p className="text-[7px] text-red-900 leading-tight"><span className="line-through opacity-60">&quot;Clinically proven to reduce wrinkles by 80%&quot;</span></p>
        </div>
        <div className="flex items-center gap-1 mb-1.5">
          <ArrowRight className="h-2.5 w-2.5 text-emerald-500" />
          <span className="text-[6px] font-bold text-emerald-700">Minimal Fix Suggested</span>
        </div>
        <div className="rounded bg-emerald-50 border border-emerald-300 p-1.5 mb-2">
          <p className="text-[7px] text-emerald-900 font-medium leading-tight">&quot;Dermatologically tested to help visibly improve skin texture&quot;</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[6px] text-muted">Voice preserved &middot; 4 words changed</span>
          <span className="rounded bg-emerald-600 text-white text-[6px] font-bold px-1.5 py-0.5">Apply Fix</span>
        </div>
      </div>
    </div>
  )
}

function FeatureIllustration4() {
  return (
    <div className="relative h-full w-full bg-gradient-to-br from-[#F5F0E8] to-[#EDE5D5] p-3 flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[260px] space-y-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-emerald-300 bg-white shadow-sm p-2 flex-1 transition-transform group-hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[6.5px] font-bold text-emerald-800">&#10003; v1.2 Approved</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-[5.5px] font-mono text-muted truncate">sha256: 9a7b4f...c019d</div>
            <div className="text-[5.5px] text-emerald-700 font-bold mt-0.5">Signed: David Kim</div>
          </div>
          <div className="text-[8px] text-muted font-mono">&mdash; edit &rarr;</div>
          <div className="rounded-lg border border-amber-300 bg-white shadow-sm p-2 flex-1 transition-transform group-hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[6.5px] font-bold text-amber-700">&#9889; v1.3 Review</span>
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <div className="text-[5.5px] font-mono text-muted truncate">sha256: e3b0c4...98fc1</div>
            <div className="text-[5.5px] text-amber-700 font-bold mt-0.5">Hash Changed</div>
          </div>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white p-2 text-center shadow-xs">
          <div className="text-[6.5px] font-bold text-ink">Content edit detected.</div>
          <div className="text-[6px] text-red-600 font-semibold mt-0.5">Cryptographic approval seal automatically invalidated.</div>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Lock className="h-2.5 w-2.5 text-ink" />
            <span className="text-[5.5px] font-bold text-ink">Version-Locked Audit Trail</span>
            <span className="text-[5.5px] font-mono text-muted">v1.2 &rarr; v1.3</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureIllustration5() {
  return (
    <div className="relative h-full w-full bg-gradient-to-br from-[#FEF2F2] to-[#FDE8E8] p-3 flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[260px] space-y-1.5">
        <div className="rounded-lg border border-red-200 bg-white shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[7px] font-bold text-red-700">&#9888; Policy Contradiction</span>
            <span className="rounded bg-red-100 text-red-800 text-[5.5px] font-bold px-1 py-0.5">Auto-Blocked</span>
          </div>
          <div className="space-y-1">
            <div className="rounded bg-red-50 border border-red-200 p-1.5">
              <div className="text-[6px] font-bold text-ink">Rule BR-01</div>
              <div className="text-[5.5px] text-muted leading-tight">&quot;Primary green (#7AB93B) is the only approved background.&quot;</div>
            </div>
            <div className="flex justify-center"><span className="text-[8px] text-red-500 font-bold">&updownarrow; conflicts with</span></div>
            <div className="rounded bg-red-50 border border-red-200 p-1.5">
              <div className="text-[6px] font-bold text-ink">Draft P4</div>
              <div className="text-[5.5px] text-muted leading-tight">&quot;Allow any earth-tone background for seasonal campaigns.&quot;</div>
            </div>
          </div>
        </div>
        <div className="rounded bg-red-600 text-white text-center py-1 px-2">
          <span className="text-[6.5px] font-bold">Rule cannot be saved &mdash; contradiction detected</span>
        </div>
      </div>
    </div>
  )
}

function FeatureIllustration6() {
  const bars = [70, 85, 90, 65, 95, 80, 75, 100, 55, 90, 85, 60, 95, 70]
  return (
    <div className="relative h-full w-full bg-gradient-to-br from-[#F5F0E8] to-[#EDE5D5] p-3 flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[260px] space-y-2">
        <div className="rounded-lg border border-ink/10 bg-white shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[7px] font-bold text-ink">&#9889; Sandbox Replay</span>
            <span className="rounded bg-emerald-100 text-emerald-800 text-[5.5px] font-bold px-1.5 py-0.5">14 Assets Tested</span>
          </div>
          <div className="h-10 w-full flex items-end gap-[3px]">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t transition-all"
                style={{
                  height: `${h}%`,
                  background: h >= 80 ? '#22C55E' : h >= 60 ? '#F59E0B' : '#EF4444',
                }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[5.5px] font-bold">
            <span className="flex items-center gap-0.5 text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 9 Pass (64%)
            </span>
            <span className="flex items-center gap-0.5 text-amber-600">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> 3 Review (21%)
            </span>
            <span className="flex items-center gap-0.5 text-red-600">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> 2 Fail (15%)
            </span>
          </div>
        </div>
        <div className="rounded bg-ink text-white text-center py-1 px-2">
          <span className="text-[6.5px] font-bold">Preview impact before activating rule changes</span>
        </div>
      </div>
    </div>
  )
}

function KeyFeaturesSection() {
  const capabilities: { title: string; desc: string; icon: typeof BookOpen; badge: string; illustration: React.FC }[] = [
    {
      title: 'Brand Guideline Document Engine',
      desc: 'Ingest PDF and DOCX brand books with automatic page-level text chunking, heading hierarchy indexing, and citation coordinates.',
      icon: BookOpen,
      badge: 'PyMuPDF Engine',
      illustration: FeatureIllustration1,
    },
    {
      title: 'Multi-Modal Evidence Audit',
      desc: 'RapidOCR text detection, CIE-Lab perceptual color delta calculation, and logo exclusion zone inspection for high-resolution posters.',
      icon: FileSearch,
      badge: 'Dual OCR \u00b7 Color Delta',
      illustration: FeatureIllustration2,
    },
    {
      title: 'Minimal-Edit Suggestion Engine',
      desc: 'Surgical copy corrections that resolve regulatory claims without rewriting the creator\u2019s authentic promotional voice.',
      icon: Sparkles,
      badge: '1-Click Fix Apply',
      illustration: FeatureIllustration3,
    },
    {
      title: 'Version-Locked Approvals',
      desc: 'Cryptographic SHA-256 asset hash binding approvals strictly to a specific file version. Any pixel change safely invalidates old sign-offs.',
      icon: CheckCircle2,
      badge: 'SHA-256 Hash Binding',
      illustration: FeatureIllustration4,
    },
    {
      title: 'Rule Conflict & Contradiction Sentinel',
      desc: 'Automated static analyzer that blocks conflicting rules or contradictory guidelines before they can be saved to the active policy set.',
      icon: TriangleAlert,
      badge: 'Static Policy Check',
      illustration: FeatureIllustration5,
    },
    {
      title: 'Rule Impact Sandbox Simulator',
      desc: 'Simulate draft rule revisions against historical campaign archives to forecast pass, review, and fail rates before pushing policy updates live.',
      icon: FlaskConical,
      badge: 'Historical Replay',
      illustration: FeatureIllustration6,
    },
  ]

  return (
    <section id="features" className="scroll-mt-24 border-t border-ink/[0.06] bg-cream/40 py-20 lg:py-28">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><Layers className="h-3 w-3" /> Key Capabilities</>}
            title="Six Core Product Capabilities"
            sub="An integrated suite for end-to-end brand protection across graphics, video, and promotional copy."
          />
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap, i) => (
            <Reveal
              key={cap.title}
              delay={i * 50}
              className="group flex flex-col justify-between rounded-2xl border border-ink/[0.08] bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-brand-300"
            >
              <div>
                <div className="relative h-40 w-full overflow-hidden rounded-xl border border-ink/10 bg-canvas">
                  <cap.illustration />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-md z-10">
                    <cap.icon className="h-3 w-3 text-emerald-400" />
                    <span>{cap.badge}</span>
                  </div>
                </div>

                <h4 className="mt-4 text-[16px] font-bold text-ink">{cap.title}</h4>
                <p className="mt-1.5 text-[12.5px] leading-[19px] text-muted">{cap.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-ink/[0.04] text-[11px] font-bold text-brand-600 flex items-center justify-between">
                <span>Production Ready</span>
                <span className="text-muted-light group-hover:text-brand-600 transition-colors">Explore &rarr;</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}


/* 7. How It Works (Visual & Flow Upgrade)                            */
/* ------------------------------------------------------------------ */

function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      action: 'Create & Ingest',
      desc: 'Creator submits promotional posters, banners, or campaign copy directly into Precedent or via automated webhook.',
      detail: 'PDF, DOCX, JPG, PNG, and WebP supported with full metadata preservation.',
      preview: (
        <div className="relative mt-4 h-28 w-full overflow-hidden rounded-xl border-2 border-dashed border-brand-300/80 bg-brand-50/30 p-3 flex flex-col items-center justify-center text-center group-hover:border-brand-500 transition-colors">
          <Upload className="h-5 w-5 text-brand-600 animate-bounce" />
          <p className="mt-1.5 text-[11px] font-bold text-ink">Drop creative poster here</p>
          <span className="text-[9.5px] text-muted">Supports JPG, PNG, PDF, DOCX</span>
        </div>
      ),
    },
    {
      num: '02',
      action: 'Analyse & Extract',
      desc: 'Dual OCR pipelines extract text strings, measure typography scale, and sample CIE-Lab background color palettes.',
      detail: 'RapidOCR + Tesseract with Hindi & Marathi bilingual extraction support.',
      preview: (
        <div className="relative mt-4 h-28 w-full overflow-hidden rounded-xl border border-ink/10 bg-black shadow-inner">
          <img src="/images/assets/poster_audit.jpg" alt="OCR Scan" className="h-full w-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent animate-pulse" />
          <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 text-[8.5px] font-mono text-emerald-300">
            <ScanLine className="h-3 w-3 animate-spin" /> RapidOCR Â· CIE-Lab Active
          </div>
          <div className="absolute bottom-2 left-2 right-2 rounded bg-black/80 px-2 py-1 text-[9px] text-white/90">
            Extracted: <strong className="text-emerald-400">#7AB93B Palette</strong>
          </div>
        </div>
      ),
    },
    {
      num: '03',
      action: 'Verify Citations',
      desc: 'Deterministic engine matches extracted content against active brand guidelines, citing exact source passages.',
      detail: 'Hybrid BM25 + multilingual-e5 ONNX dense vectors ensure exact passage anchoring.',
      preview: (
        <div className="relative mt-4 h-28 w-full overflow-hidden rounded-xl border border-emerald-300 bg-emerald-50/60 p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[9px] font-bold text-emerald-800">
            <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> Guideline Match</span>
            <span className="bg-emerald-200/80 px-1.5 py-0.2 rounded text-[8.5px]">Page 12 Â§3.2</span>
          </div>
          <p className="text-[9.5px] italic text-emerald-950 leading-tight">
            â€œPrimary green (#7AB93B) and neutral sand (#F4EFE3) are approved.â€
          </p>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> 100% Grounded in PDF
          </span>
        </div>
      ),
    },
    {
      num: '04',
      action: 'Decide & Approve',
      desc: 'Brand Manager reviews findings, accepts minimal fixes, grants scoped exceptions, or issues a ProofPass seal.',
      detail: 'Tamper-proof SHA-256 digital passport locks decision strictly to the file version.',
      preview: (
        <div className="relative mt-4 h-28 w-full overflow-hidden rounded-xl border border-purple-300 bg-purple-950/80 p-2.5 text-white flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between text-[9px] font-bold">
            <span className="text-purple-300">ProofPass Minted</span>
            <span className="bg-emerald-500 text-ink px-1.5 py-0.2 rounded text-[8.5px] font-bold">SEALED</span>
          </div>
          <p className="text-[8.5px] font-mono text-purple-200/80 truncate">
            SHA: e3b0c44298fc1c149afbf4c899...
          </p>
          <div className="flex items-center justify-between text-[9px] text-white/80 border-t border-purple-800/80 pt-1">
            <span>David Kim (Mgr)</span>
            <span className="text-emerald-300 font-bold">v2.0 Approved</span>
          </div>
        </div>
      ),
    },
  ]

  return (
    <section id="how-it-works" className="scroll-mt-24 border-t border-ink/[0.06] bg-white py-20 lg:py-28">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><Workflow className="h-3 w-3" /> Execution Pipeline</>}
            title="Create â†’ Analyse â†’ Verify â†’ Approve"
            sub="A transparent 4-stage pipeline that keeps creators fast and brand managers firmly in control."
          />
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative">
          {/* Connecting glowing flow bar on desktop */}
          <div className="hidden lg:block absolute top-[28px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-brand-400 via-emerald-400 to-purple-400 z-0 opacity-40 pointer-events-none" />
          {steps.map((st, idx) => (
            <Reveal
              key={st.num}
              delay={idx * 70}
              className="group relative z-10 flex flex-col justify-between rounded-2xl border border-ink/[0.08] bg-sand-50/60 p-5 shadow-sm transition-all hover:-translate-y-2 hover:shadow-xl hover:border-brand-300 backdrop-blur-xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white font-bold text-[12px] shadow-xs">
                    {st.num}
                  </span>
                  <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                    STAGE {st.num}
                  </span>
                </div>

                <h4 className="mt-4 text-[16px] font-bold text-ink">{st.action}</h4>
                <p className="mt-1.5 text-[12.5px] leading-[19px] text-muted">{st.desc}</p>

                {st.preview}
              </div>

              <div className="mt-4 border-t border-ink/[0.06] pt-3 text-[10.5px] text-muted-light font-medium">
                {st.detail}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 8. Product Showcase                                                */
/* ------------------------------------------------------------------ */

function ProductShowcaseSection() {
  const [activeTab, setActiveTab] = useState<'manager' | 'creator'>('manager')

  return (
    <section id="showcase" className="scroll-mt-24 border-t border-ink/[0.06] bg-sand-100/50 py-20 lg:py-28">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><FileCheck2 className="h-3 w-3" /> Live Interface Preview</>}
            title="Actual Creator & Brand Manager Workspace"
            sub="Explore the real interfaces used daily to submit, audit, simulate, and approve brand content with zero mock data."
          />
        </Reveal>

        {/* View Switcher Controls */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <button
            onClick={() => setActiveTab('manager')}
            className={cn(
              'rounded-full px-5 py-2.5 text-[13px] font-bold transition-all shadow-sm',
              activeTab === 'manager'
                ? 'bg-ink text-white shadow-md scale-105'
                : 'bg-white text-ink-600 border border-ink/10 hover:border-ink/25',
            )}
          >
            Brand Manager Overview
          </button>
          <button
            onClick={() => setActiveTab('creator')}
            className={cn(
              'rounded-full px-5 py-2.5 text-[13px] font-bold transition-all shadow-sm',
              activeTab === 'creator'
                ? 'bg-ink text-white shadow-md scale-105'
                : 'bg-white text-ink-600 border border-ink/10 hover:border-ink/25',
            )}
          >
            Creator Dashboard & Studio
          </button>
        </div>

        {/* Live Interface Screenshot Showcase */}
        <Reveal delay={100} className="mt-8 overflow-hidden rounded-[28px] border border-ink/10 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-ink/10 bg-sand-100/60 px-5 py-3 text-[11px] text-muted font-mono">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-2 font-semibold text-ink">
                {activeTab === 'manager' ? 'https://precedent.internal/manager/overview' : 'https://precedent.internal/creator/dashboard'}
              </span>
            </div>
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">
              PureGlow Production
            </span>
          </div>

          <div className="relative">
            {activeTab === 'manager' ? (
              <img
                src="/images/platform/manager-overview-live.png"
                alt="Brand Manager Overview Interface"
                className="w-full object-cover transition-opacity duration-300"
              />
            ) : (
              <img
                src="/images/platform/creator-dashboard-live.png"
                alt="Creator Dashboard Interface"
                className="w-full object-cover transition-opacity duration-300"
              />
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 9. AI Agent Studio (3D WebGL Orb & Live Studio Screenshots)         */
/* ------------------------------------------------------------------ */

function AgentStudioSection() {
  const [studioPreview, setStudioPreview] = useState<'builder' | 'executions'>('builder')

  const agents = [
    {
      title: 'Prompt-to-Agent Builder',
      desc: 'Define custom compliance agents using plain English instructions, customized system prompts, and strict rule bounds.',
      icon: Bot,
      metric: 'Zero-Code Creation',
    },
    {
      title: 'Sentinel 24/7 Monitor',
      desc: 'Autonomous background daemon that periodically audits stored assets for expired exceptions and guideline drifts.',
      icon: History,
      metric: '02:00 UTC Daily Scan',
    },
    {
      title: 'Review Crew Orchestration',
      desc: 'Orchestrates multi-agent pipelines: Intake Agent â†’ Passage Retrieval â†’ Deterministic Rule Check â†’ Fix Synthesizer.',
      icon: Users,
      metric: '4-Agent Pipeline',
    },
  ]

  return (
    <section className="border-t border-ink/[0.06] bg-white py-20 lg:py-28 relative overflow-hidden">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><BrainCircuit className="h-3 w-3 text-brand-600" /> Autonomous Brand Intelligence</>}
            title="AI Agent Studio: Prompt-to-Agent Automation"
            sub="Deploy specialized autonomous agents that inspect brand assets, monitor repository drift, and orchestrate review crews 24/7."
          />
        </Reveal>

        {/* Heroic 3D Orb + Live Agent Studio Showcase */}
        <Reveal delay={80} className="mt-12 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#121B16] via-[#16231C] to-[#0A120E] p-6 sm:p-10 text-white shadow-2xl relative">
          <div className="grid gap-8 lg:grid-cols-12 items-center">
            {/* Left Column: Interactive 3D Three.js Orb */}
            <div className="lg:col-span-5 flex flex-col items-center text-center p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
              <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-2">
                WebGL Interactive 3D Constellation
              </span>
              <p className="text-[13px] text-white/70">Move your cursor to interact with the Brand Rule Orb</p>

              <ThreeOrb className="h-[280px] w-full" />

              <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-[10px] font-mono text-emerald-300">
                <span className="bg-white/10 px-2 py-0.5 rounded">Sentinel Active</span>
                <span className="bg-white/10 px-2 py-0.5 rounded">e5-Embeddings</span>
                <span className="bg-white/10 px-2 py-0.5 rounded">ProofPass Mint</span>
              </div>
            </div>

            {/* Right Column: Agent Studio Screenshots */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[12px] font-bold uppercase tracking-wider text-white">Live Studio Interface</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStudioPreview('builder')}
                    className={cn(
                      'rounded-full px-3 py-1 text-[11px] font-bold transition-all',
                      studioPreview === 'builder' ? 'bg-emerald-500 text-ink shadow-sm' : 'bg-white/10 text-white hover:bg-white/20',
                    )}
                  >
                    Prompt Builder
                  </button>
                  <button
                    onClick={() => setStudioPreview('executions')}
                    className={cn(
                      'rounded-full px-3 py-1 text-[11px] font-bold transition-all',
                      studioPreview === 'executions' ? 'bg-emerald-500 text-ink shadow-sm' : 'bg-white/10 text-white hover:bg-white/20',
                    )}
                  >
                    Executions Run
                  </button>
                </div>
              </div>

              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/20 shadow-2xl bg-black/60">
                <img
                  src={studioPreview === 'builder' ? '/images/platform/agent-builder.png' : '/images/platform/agent-executions.png'}
                  alt="Agent Studio Screenshot"
                  className="h-full w-full object-cover transition-opacity duration-300"
                />
              </div>
            </div>
          </div>
        </Reveal>

        {/* 3 Agent Studio Cards */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {agents.map((ag, i) => (
            <Reveal
              key={ag.title}
              delay={i * 70}
              className="rounded-2xl border border-ink/[0.08] bg-sand-50/50 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 border border-brand-200">
                  <ag.icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-white border border-brand-200 text-brand-700 px-2.5 py-0.5 text-[10.5px] font-bold">
                  {ag.metric}
                </span>
              </div>
              <h4 className="mt-5 text-[17px] font-bold text-ink">{ag.title}</h4>
              <p className="mt-2 text-[13px] leading-[20px] text-muted">{ag.desc}</p>
            </Reveal>
          ))}
        </div>

        {/* Floating Copilot Banner Announcement */}
        <Reveal delay={120} className="mt-8 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/[0.04] via-emerald-500/[0.08] to-emerald-950/[0.04] p-4 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-emerald-400 shadow-md">
              <Bot className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-[13.5px] font-bold text-ink">Ambient AI Copilot Always On-Call</p>
              <p className="text-[11.5px] text-muted">Click the floating AI shield icon at the bottom-right corner of your screen anytime to ask questions, verify citations, or inspect telemetry.</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-ink text-white px-3.5 py-1.5 text-[11px] font-bold shadow-xs">
            Floating Chatbot Ready â†˜
          </span>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 10. Security & Governance (Visual Ledger & Certificate Preview)     */
/* ------------------------------------------------------------------ */

function SecuritySection() {
  const securityPillars = [
    {
      title: 'Role-Based Access Control',
      desc: 'Explicit permissions distinguish Content Creators, Brand Managers, and Compliance Auditors with zero cross-tenant leakage.',
      icon: Users,
      graphic: (
        <div className="mt-3 rounded-lg border border-ink/10 bg-sand-50 p-2 text-[10px] space-y-1 font-mono">
          <div className="flex justify-between items-center bg-white px-2 py-1 rounded shadow-2xs">
            <span className="font-bold text-ink">Brand Manager</span>
            <span className="text-emerald-700 font-bold bg-emerald-100 px-1 rounded text-[8.5px]">Approve Â· Admin</span>
          </div>
          <div className="flex justify-between items-center bg-white px-2 py-1 rounded shadow-2xs">
            <span className="font-bold text-ink">Content Creator</span>
            <span className="text-blue-700 font-bold bg-blue-100 px-1 rounded text-[8.5px]">Draft Â· Submit</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Deterministic Rule Primacy',
      desc: 'Code-level checks always overrule probabilistic LLM guesses. Ambiguous or unsupported claims are flagged for human review.',
      icon: ShieldCheck,
      graphic: (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2 text-[10px] space-y-1 font-mono text-emerald-950">
          <div className="flex items-center justify-between font-bold">
            <span>Rule Engine Authority</span>
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          </div>
          <p className="text-[9px] text-emerald-800">13 Hardened Logic Checkers override LLM outputs automatically.</p>
        </div>
      ),
    },
    {
      title: 'Cryptographic ProofPass',
      desc: 'Signed SHA-256 digest + 64-bit perceptual hash seals every approved asset to guarantee tampering is detected immediately.',
      icon: Lock,
      graphic: (
        <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50/60 p-2 text-[10px] font-mono text-purple-950">
          <div className="flex items-center justify-between font-bold">
            <span>ProofPass Sealed</span>
            <span className="bg-purple-200 px-1 rounded text-[8.5px]">SHA-256</span>
          </div>
          <p className="text-[8.5px] truncate text-purple-800 mt-1">hash: 9a7b4f2c019d...</p>
        </div>
      ),
    },
    {
      title: 'Immutable Audit History',
      desc: 'Append-only ledger records all uploads, evaluations, manual overrides, and exception rulings for regulatory readiness.',
      icon: History,
      graphic: (
        <div className="mt-3 rounded-lg border border-ink/10 bg-sand-50 p-2 text-[10px] space-y-1 font-mono">
          <div className="flex justify-between text-muted text-[8.5px]">
            <span>Block #1042</span>
            <span>02 Nov 2026</span>
          </div>
          <p className="text-[9px] text-ink font-semibold truncate">EX-12 Override Granted: David Kim</p>
        </div>
      ),
    },
  ]

  return (
    <section id="governance" className="border-t border-ink/[0.06] bg-cream/40 py-20 lg:py-28">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><Lock className="h-3 w-3" /> Enterprise Security</>}
            title="Enterprise-Grade Governance & Audit Integrity"
            sub="Rigorous access controls, code-level policy enforcement, and cryptographic tamper detection built for enterprise compliance."
          />
        </Reveal>

        {/* Real Audit History Screenshot Banner */}
        <Reveal delay={80} className="mt-12 overflow-hidden rounded-[26px] border border-ink/10 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-ink/10 bg-sand-100/60 px-5 py-3 text-[11px] font-mono text-muted">
            <span className="font-bold text-ink">IMMUTABLE APPEND-ONLY AUDIT REPOSITORY Â· REAL DATABASE RECORD</span>
            <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[9.5px] font-bold">
              Tamper-Proof Ledger Active
            </span>
          </div>
          <div className="relative aspect-[21/9] w-full overflow-hidden bg-black/10">
            <img
              src="/images/platform/manager-audit-live.png"
              alt="Audit History View Interface"
              className="w-full object-cover"
            />
          </div>
        </Reveal>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {securityPillars.map((p, i) => (
            <Reveal
              key={p.title}
              delay={i * 60}
              className="flex flex-col justify-between rounded-2xl border border-ink/[0.08] bg-white p-5 shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-lg"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-ink-700 border border-ink/10 shadow-2xs">
                  <p.icon className="h-5 w-5" />
                </div>
                <h4 className="mt-4 text-[16px] font-bold text-ink">{p.title}</h4>
                <p className="mt-1.5 text-[12px] leading-[18px] text-muted">{p.desc}</p>
                {p.graphic}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 11. Who It's For (Visual Persona Cards with Real Photography)      */
/* ------------------------------------------------------------------ */

function WhoItsForSection() {
  const personas = [
    {
      title: 'In-House Content Teams',
      role: 'Creators & Designers',
      benefit: 'Get instant pre-submission feedback with exact guideline page citations and one-click minimal copy fixes.',
      image: '/images/brand/lifestyle.webp',
      badge: 'Creative Velocity',
    },
    {
      title: 'Brand Governance Managers',
      role: 'Approvers & Policy Owners',
      benefit: 'Centralize brand rules, simulate rule modifications before activation, and grant scoped expiring exceptions with ease.',
      image: '/images/platform/manager-sentinel.png',
      badge: 'Zero Email Chains',
    },
    {
      title: 'Creative & Media Agencies',
      role: 'Multi-Client Deliverables',
      benefit: 'Manage multiple client guideline repositories simultaneously with verifiable ProofPass sign-off certificates.',
      image: '/images/brand/summer.webp',
      badge: 'Client Audit Ready',
    },
    {
      title: 'Enterprise Global Brands',
      role: 'Legal & Risk Teams',
      benefit: 'Eliminate regulatory claim liabilities across high-volume retail campaigns with continuous 24/7 sentinel audits.',
      image: '/images/brand/guidelines.webp',
      badge: '24/7 Sentinel Shield',
    },
  ]

  return (
    <section className="border-t border-ink/[0.06] bg-white py-20 lg:py-28">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><Users className="h-3 w-3" /> Target Audience</>}
            title="Who Precedent Is Built For"
            sub="Whether you manage a fast-growing D2C brand or an international agency network, Precedent adapts to your creative workflow."
          />
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {personas.map((per, i) => (
            <Reveal
              key={per.title}
              delay={i * 60}
              className="group flex flex-col justify-between rounded-2xl border border-ink/[0.08] bg-sand-50/50 p-4 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-brand-300"
            >
              <div>
                <div className="relative h-36 w-full overflow-hidden rounded-xl border border-ink/10 bg-canvas">
                  <img src={per.image} alt={per.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-md">
                    {per.badge}
                  </span>
                </div>

                <h4 className="mt-4 text-[16px] font-bold text-ink">{per.title}</h4>
                <p className="text-[10.5px] font-bold text-brand-700 uppercase tracking-wider mt-0.5">{per.role}</p>
                <p className="mt-2 text-[12px] leading-[18px] text-muted">{per.benefit}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-ink/[0.06] text-[10.5px] font-bold text-brand-600 flex items-center justify-between">
                <span>Tailored Workflow</span>
                <span className="text-muted-light group-hover:text-brand-600 transition-colors">See Role â†’</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 12. Success Stories (Visual Proof & Verified Case Studies)         */
/* ------------------------------------------------------------------ */

function SuccessStoriesSection() {
  const stories = [
    {
      brand: 'PureGlow Botanicals',
      tagline: 'D2C Skincare Brand Â· 14 Products',
      stats: '94% Faster Campaign Approvals',
      quote: 'Precedent eliminated endless Slack debates between creative and legal. When an ungrounded claim is flagged, creators see the exact guideline citation in seconds.',
      author: 'David Kim, Head of Brand Governance',
      image: '/images/brand/serum.webp',
      stamp: 'ProofPass Verified',
      roi: '28 min Turnaround (down from 5 days)',
    },
    {
      brand: 'Nexus Omnichannel Media',
      tagline: 'Retail Advertising Agency Â· 14 Sub-Brands',
      stats: '100% Exception Traceability',
      quote: 'The Rule Impact Sandbox is an absolute game-changer. We can simulate a new guideline across 1,400 client assets in seconds before presenting policy updates.',
      author: 'Elena Rostova, Managing Director',
      image: '/images/assets/festival.jpg',
      stamp: 'Sandbox Simulation Passed',
      roi: '2,400+ Campaign Assets Tested',
    },
  ]

  return (
    <section className="border-t border-ink/[0.06] bg-cream/40 py-20 lg:py-28">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Proven Impact</>}
            title="Real Success Stories & Measurable Results"
            sub="See how high-velocity brands eliminated compliance bottlenecks without compromising creative momentum."
          />
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {stories.map((st, i) => (
            <Reveal
              key={st.brand}
              delay={i * 80}
              className="rounded-[26px] border border-ink/[0.08] bg-white p-7 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all"
            >
              <div>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-ink/10 bg-black/10 shadow-md">
                    <img src={st.image} alt={st.brand} className="h-full w-full object-cover" />
                    <span className="absolute bottom-1 left-1 rounded bg-emerald-600/90 px-1 py-0.2 text-[7.5px] font-bold text-white">
                      VERIFIED
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[18px] font-bold text-ink">{st.brand}</span>
                      <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                        {st.stats}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-muted mt-0.5">{st.tagline}</p>
                    <div className="flex items-center gap-1 mt-1 text-amber-500">
                      {[...Array(5)].map((_, idx) => (
                        <Star key={idx} className="h-3 w-3 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>

                <p className="mt-5 text-[13.5px] italic leading-[22px] text-ink-700 bg-sand-50/60 p-4 rounded-xl border border-ink/[0.04]">
                  â€œ{st.quote}â€
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-ink/[0.06] flex items-center justify-between text-[11.5px]">
                <span className="font-bold text-ink">{st.author}</span>
                <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                  {st.roi}
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
/* 13. Pricing Plans                                                  */
/* ------------------------------------------------------------------ */

function PricingSection() {
  const plans = [
    {
      name: 'Starter',
      price: '$49',
      period: '/ month',
      desc: 'Ideal for emerging brands and small creative studios.',
      features: [
        'Up to 5 Content Creators',
        '1 Brand Guideline Library',
        'RapidOCR Text & Claim Extraction',
        'Exact Page-Level Passage Citations',
        'Version-Locked Digital Approvals',
      ],
      popular: false,
    },
    {
      name: 'Professional',
      price: '$199',
      period: '/ month',
      desc: 'For growing marketing teams and high-velocity agencies.',
      features: [
        'Unlimited Content Creators',
        'Up to 5 Brand Managers',
        'Scoped Expiring Human Exceptions',
        'Pre-Activation Rule Sandbox Simulator',
        'ProofPass SHA-256 Digital Seals',
        'Dual OCR (RapidOCR + Tesseract)',
      ],
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      desc: 'For multi-brand organizations requiring 24/7 governance.',
      features: [
        'Unlimited Brand Libraries & Workspaces',
        'AI Agent Studio & Sentinel 24/7 Monitor',
        'Custom SSO & SAML Authentication',
        'Dedicated SLA & Governance Onboarding',
        'Immutable Append-Only Audit Trail Export',
      ],
      popular: false,
    },
  ]

  return (
    <section id="pricing" className="scroll-mt-24 border-t border-ink/[0.06] bg-white py-20 lg:py-28">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><Scale className="h-3 w-3" /> Transparent Pricing</>}
            title="Simple, Predictable Plans for Every Brand Stage"
            sub="Start free with our preloaded PureGlow prototype or deploy dedicated workspace instances for your team."
          />
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((pl, i) => (
            <Reveal
              key={pl.name}
              delay={i * 80}
              className={cn(
                'relative flex flex-col justify-between rounded-[26px] p-7 transition-all duration-300',
                pl.popular
                  ? 'border-2 border-brand-500 bg-sand-50/70 shadow-xl lg:-translate-y-2'
                  : 'border border-ink/[0.08] bg-white shadow-sm hover:shadow-lg',
              )}
            >
              <div>
                {pl.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                    Most Popular
                  </span>
                )}
                <h4 className="text-[18px] font-bold text-ink">{pl.name}</h4>
                <p className="mt-1 text-[12px] text-muted">{pl.desc}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-[34px] font-bold text-ink">{pl.price}</span>
                  <span className="text-[13px] text-muted">{pl.period}</span>
                </div>

                <ul className="mt-6 space-y-2.5 border-t border-ink/[0.06] pt-5 text-[12.5px] text-ink-700">
                  {pl.features.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  to="/login"
                  className={cn(
                    'flex w-full items-center justify-center rounded-full py-2.5 text-[13px] font-bold transition-all shadow-xs',
                    pl.popular
                      ? 'bg-ink text-white hover:bg-ink-800 shadow-md'
                      : 'border border-ink/15 bg-white text-ink hover:bg-sand-100',
                  )}
                >
                  Get Started â†’
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 14. FAQ                                                            */
/* ------------------------------------------------------------------ */

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    {
      q: 'How does Precedent guarantee zero AI hallucinations?',
      a: 'Precedent strictly decouples document retrieval from policy authority. Findings cite exact document page and paragraph coordinates. If a claim lacks an anchored source sentence in your guideline library, our deterministic engine flags it for human review rather than inventing a verdict.',
    },
    {
      q: 'Can our team grant temporary exceptions for festival or influencer campaigns?',
      a: 'Yes. Brand Managers can grant scoped human exceptions with an explicit rationale, applicable campaign scope, and an expiration timestamp. The engine automatically enforces the expiry date at code level, preventing permanent brand drift.',
    },
    {
      q: 'What file formats are supported for guidelines and creative assets?',
      a: 'For guidelines, Precedent parses PDF and DOCX files with PyMuPDF. For creative assets, we support high-resolution posters, social graphics, and packaging in JPG, PNG, and WebP, with dual OCR extraction powered by RapidOCR and Tesseract.',
    },
    {
      q: 'What happens if a proposed rule contradicts an active guideline?',
      a: 'Our Rule Conflict & Contradiction Sentinel performs static analysis before any draft rule is saved. Contradictions with active rules or existing exceptions are automatically flagged and blocked until resolved by a manager.',
    },
    {
      q: 'How do decisions stay attached to the correct asset version?',
      a: 'Precedent binds approvals cryptographically to the assetâ€™s SHA-256 digest and 64-bit perceptual hash. If an asset is modified after sign-off, previous approvals are safely marked invalid, and the new version is queued for review.',
    },
    {
      q: 'How can our team test the live prototype today?',
      a: 'The prototype is preloaded with authentic brand guidelines (PureGlow Botanicals), multi-channel posters, and historical submissions. You can sign in immediately using pre-configured accounts: david.kim@pureglow.co (Brand Manager) or emily.carter@pureglow.co (Creator).',
    },
  ]

  return (
    <section id="faq" className="scroll-mt-24 border-t border-ink/[0.06] bg-cream/40 py-20 lg:py-28">
      <div className="mkt-container max-w-[800px]">
        <Reveal>
          <SectionHeading
            eyebrow={<><HelpCircle className="h-3 w-3" /> Questions & Answers</>}
            title="Frequently Asked Questions"
            sub="Everything you need to know about deterministic brand governance, AI grounding, and testing the platform."
          />
        </Reveal>

        <div className="mt-12 space-y-3.5">
          {faqs.map((faq, i) => (
            <Reveal key={faq.q} delay={i * 40} className="rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-xs transition-all">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-[15px] font-bold text-ink">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted transition-transform duration-200 shrink-0 ml-4',
                    openIndex === i && 'rotate-180 text-brand-600',
                  )}
                />
              </button>
              {openIndex === i && (
                <p className="mt-3 text-[13px] leading-[21px] text-muted border-t border-ink/[0.04] pt-3">
                  {faq.a}
                </p>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 15. Final Call to Action                                           */
/* ------------------------------------------------------------------ */

function FinalCtaSection() {
  return (
    <section className="bg-white pb-20 pt-8">
      <div className="mkt-container">
        <Reveal className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#121B16] via-[#16231C] to-[#0A120E] px-6 py-16 text-center text-white sm:px-12 lg:py-24 shadow-2xl">
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur-md">
              <Sparkles className="h-3 w-3" /> Ready to Transform Brand Governance?
            </span>
            <h2 className="mkt-display mt-5 text-[34px] leading-[1.08] text-white sm:text-[46px]">
              Start reviewing on brand
              <br /> with verifiable evidence.
            </h2>
            <p className="mx-auto mt-4 max-w-[500px] text-[15px] leading-[24px] text-white/75">
              Launch the live interactive workspace, test campaign posters against brand rules, and experience zero-hallucination governance.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/login" className="mkt-pill-dark w-full sm:w-auto bg-emerald-500 text-ink hover:bg-emerald-400 font-bold shadow-lg">
                Get Started Free
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link to="/login" className="mkt-pill-light w-full sm:w-auto border-white/20 bg-white/10 text-white hover:bg-white/20">
                Book a Demo
              </Link>
            </div>

            <p className="mt-6 text-[12px] text-white/60 font-mono">
              Demo Access: <strong className="text-white">david.kim@pureglow.co</strong> / <strong className="text-white">emily.carter@pureglow.co</strong> (password: <code className="text-emerald-300">precedent</code>)
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Page Main Assembly (16 Ordered Sections)                           */
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
      {/* 1. Navbar */}
      <MarketingNav />

      <main>
        {/* 2. Hero Section */}
        <HeroSection />

        {/* 3. Trust Strip */}
        <TrustStrip />

        {/* 4. Problem We Solve */}
        <ProblemSection />

        {/* 5. Our Solution */}
        <SolutionSection />

        {/* 6. Key Features */}
        <KeyFeaturesSection />

        {/* 7. How It Works */}
        <HowItWorksSection />

        {/* 8. Product Showcase */}
        <ProductShowcaseSection />

        {/* 9. AI Agent Studio */}
        <AgentStudioSection />

        {/* 10. Security & Governance */}
        <SecuritySection />

        {/* 11. Who It's For */}
        <WhoItsForSection />

        {/* 12. Success Stories */}
        <SuccessStoriesSection />

        {/* 13. Pricing */}
        <PricingSection />

        {/* 14. FAQ */}
        <FaqSection />

        {/* 15. Final Call to Action */}
        <FinalCtaSection />
      </main>

      {/* 16. Footer */}
      <MarketingFooter />

      {/* Floating AI Agent Copilot Chatbox */}
      <FloatingAgentChat />

      {/* Back to top floating pill */}
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
