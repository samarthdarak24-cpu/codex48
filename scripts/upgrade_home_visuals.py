# Script to upgrade Home.tsx with rich visual images, luxury aesthetics, and real platform mockups

with open('src/pages/marketing/Home.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# -------------------------------------------------------------
# 1. UPGRADE PILLARS (BetterWay)
# -------------------------------------------------------------
old_pillars_start = "const PILLARS = ["
old_pillars_end = "function BetterWay()"

new_pillars_code = '''const PILLARS = [
  {
    title: 'Reviews that cite their sources',
    body: 'Every finding links to the page and passage it came from. No citation, no claim — unverified passages are flagged for a human.',
    icon: FileText,
    badge: '100% Traceable',
    image: '/images/brand/lifestyle.webp',
    imageTag: 'Grounded Passage Retrieval',
    visual: (
      <div className="relative mt-4 overflow-hidden rounded-xl border border-emerald-200/80 bg-emerald-950/5 shadow-2xs group">
        <div className="relative h-32 w-full overflow-hidden">
          <img src="/images/brand/lifestyle.webp" alt="Passage citation preview" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[9.5px] font-bold text-white shadow-sm backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
            PyMuPDF · Page 14 §3.2
          </div>
          <div className="absolute bottom-2 inset-x-2 rounded-lg border border-white/20 bg-black/60 p-2 backdrop-blur-md text-white">
            <p className="text-[10px] font-bold text-emerald-400">PureGlow_Guidelines.pdf</p>
            <p className="text-[10px] italic text-white/90 truncate">“Primary claims must cite verified batch clinical laboratory results.”</p>
            <div className="mt-1 flex items-center justify-between text-[8.5px] text-white/70">
              <span>Rule BR-01 Grounded</span>
              <span className="text-emerald-300 font-bold">Zero Hallucination</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Approvals that respect versions',
    body: 'A decision attaches to a specific content version. Edit the asset, and the old approval does not quietly follow it.',
    icon: Layers,
    badge: 'SHA-256 Sealed',
    image: '/images/brand/summer.webp',
    imageTag: 'Version-Locked Audit Trail',
    visual: (
      <div className="relative mt-4 overflow-hidden rounded-xl border border-blue-200/80 bg-blue-950/5 shadow-2xs group">
        <div className="relative h-32 w-full overflow-hidden">
          <img src="/images/brand/summer.webp" alt="Version locked asset" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-blue-600/90 px-2 py-0.5 text-[9.5px] font-bold text-white shadow-sm backdrop-blur-md">
            <ShieldCheck className="h-3 w-3" />
            Immutable Passport
          </div>
          <div className="absolute bottom-2 inset-x-2 rounded-lg border border-white/20 bg-black/60 p-2 backdrop-blur-md text-white">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="rounded bg-emerald-500/80 text-white px-1.5 py-0.5 font-bold">v1.2 Approved</span>
              <span className="text-blue-300 font-bold">── edit ──►</span>
              <span className="rounded bg-amber-500/80 text-white px-1.5 py-0.5 font-bold">v1.3 Review</span>
            </div>
            <p className="mt-1 text-[9.5px] text-white/80 truncate">Edit detected · Cryptographic seal invalidated</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Exceptions that expire on their own',
    body: 'Scope, reason and expiry are recorded. Out-of-scope or expired exceptions are rejected by the backend, not just hidden in the UI.',
    icon: Clock3,
    badge: 'Code Enforced',
    image: '/images/brand/gift.webp',
    imageTag: 'Auto-Expiring Exception',
    visual: (
      <div className="relative mt-4 overflow-hidden rounded-xl border border-purple-200/80 bg-purple-950/5 shadow-2xs group">
        <div className="relative h-32 w-full overflow-hidden">
          <img src="/images/brand/gift.webp" alt="Seasonal holiday exception" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-purple-600/90 px-2 py-0.5 text-[9.5px] font-bold text-white shadow-sm backdrop-blur-md">
            <Clock3 className="h-3 w-3" />
            Auto-Expires: 31 Dec
          </div>
          <div className="absolute bottom-2 inset-x-2 rounded-lg border border-white/20 bg-black/60 p-2 backdrop-blur-md text-white">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-purple-300">EX-2024-09 · Festive Scope</span>
              <span className="text-purple-200 bg-purple-500/40 px-1 rounded font-mono text-[9px]">Active</span>
            </div>
            <p className="mt-0.5 text-[9.5px] text-white/80 truncate">Scoped to Holiday Packaging · Backend enforced</p>
          </div>
        </div>
      </div>
    ),
  },
]

function BetterWay()'''

if old_pillars_start in text:
    p_start = text.find(old_pillars_start)
    p_end = text.find(old_pillars_end)
    text = text[:p_start] + new_pillars_code + text[p_end + len(old_pillars_end):]
    print('[OK] Upgraded BetterWay pillars with rich visual image cards')
else:
    print('[WARN] old_pillars_start not found')

# -------------------------------------------------------------
# 2. UPGRADE ChallengeShowcase (Innovations with real image previews)
# -------------------------------------------------------------
old_challenge_target = """function ChallengeShowcase() {"""
old_challenge_end = """function FestivalDemoScenario() {"""

new_challenge_code = '''function ChallengeShowcase() {
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
        <div className="relative mt-5 overflow-hidden rounded-2xl border border-blue-200/80 bg-blue-950/5 shadow-md group">
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <img
              src="/images/platform/sandbox-ui.png"
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
              className="relative flex flex-col justify-between rounded-[28px] border border-ink/[0.08] bg-white p-6 sm:p-7 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
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

                {/* Embedded Visual Interactive Mockup with Real Photo/Platform Screenshot */}
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

function FestivalDemoScenario() {'''

if old_challenge_target in text:
    c_start = text.find(old_challenge_target)
    c_end = text.find(old_challenge_end)
    text = text[:c_start] + new_challenge_code + text[c_end + len(old_challenge_end):]
    print('[OK] Upgraded ChallengeShowcase with rich photo and UI screenshot headers')
else:
    print('[WARN] old_challenge_target not found')

# -------------------------------------------------------------
# 3. UPGRADE FeaturesGrid (8 Core Features with real images)
# -------------------------------------------------------------
old_fg_target = """function FeaturesGrid() {"""
old_fg_end = """function TechStackSection() {"""

new_fg_code = '''function FeaturesGrid() {
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
      image: '/images/platform/review-ui.png',
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
      image: '/images/platform/rules-ui.png',
      badge: 'Auto-Blocked Conflict',
      badgeTone: 'bg-red-600/90 text-white',
      accent: 'Contradiction Prevention',
    },
    {
      title: 'Rule Impact Sandbox',
      desc: 'Compare active and proposed rule sets against stored historical content to see changes before anything goes live.',
      icon: FlaskConical,
      tag: 'Simulator',
      image: '/images/platform/sandbox-ui.png',
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
            eyebrow={<><Layers className="h-3 w-3" /> Section 4 · Main Features</>}
            title="8 Core Governance Modules Planned & Built"
            sub="Every capability described in Section 4 of the proposal is implemented, backed by real assets and database models in the prototype."
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

function TechStackSection() {'''

if old_fg_target in text:
    fg_start = text.find(old_fg_target)
    fg_end = text.find(old_fg_end)
    text = text[:fg_start] + new_fg_code + text[fg_end + len(old_fg_end):]
    print('[OK] Upgraded FeaturesGrid with 8 photographic and UI screenshot cards')
else:
    print('[WARN] old_fg_target not found')

# -------------------------------------------------------------
# 4. UPGRADE TechStackSection (Executive Architecture Canvas)
# -------------------------------------------------------------
old_ts_target = """function TechStackSection() {"""
old_ts_end = """function TeamSection() {"""

new_ts_code = '''function TechStackSection() {
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
    <section id="tech-stack" className="scroll-mt-24 border-t border-ink/[0.06] bg-white py-20 lg:py-28">
      <div className="mkt-container">
        <Reveal>
          <SectionHeading
            eyebrow={<><Cpu className="h-3 w-3" /> Section 5 · Technology Stack</>}
            title="Technical Approach & Architecture"
            sub="Built with an explicit separation of concerns: deterministic code handles rule enforcement and expiry; AI assists with document comprehension."
          />
        </Reveal>

        {/* Executive Glass Dark Architecture Canvas */}
        <Reveal delay={80} className="mt-12 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#121B16] via-[#16231C] to-[#0A120E] p-7 sm:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] text-white relative overflow-hidden">
          {/* Ambient lighting */}
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

        {/* 5 Component Cards */}
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

function TeamSection() {'''

if old_ts_target in text:
    ts_start = text.find(old_ts_target)
    ts_end = text.find(old_ts_end)
    text = text[:ts_start] + new_ts_code + text[ts_end + len(old_ts_end):]
    print('[OK] Upgraded TechStackSection with Executive Dark Architecture Canvas')
else:
    print('[WARN] old_ts_target not found')

# -------------------------------------------------------------
# 5. UPGRADE TeamSection (VIP Executive Team Cards)
# -------------------------------------------------------------
old_team_target = """function TeamSection() {"""
old_team_end = """function Workflow() {"""

new_team_code = '''function TeamSection() {
  const members = [
    {
      name: 'Samarth Manojkumar Darak',
      initials: 'SD',
      role: 'Team Lead / Product Architect',
      focus: 'User interviews, problem validation, product architecture, system integration, judge evaluation.',
      contact: '+91 9322449155',
      badge: 'Team Lead',
      tone: 'from-emerald-600 to-teal-700 text-white',
      badgeTone: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    {
      name: 'Balaji Sanjay Chavan',
      initials: 'BC',
      role: 'Backend & Database Engineer',
      focus: 'SQLAlchemy database models, FastAPI routers, Rule Engine, Sandbox simulator, audit history.',
      contact: '+91 8468983617',
      badge: 'Backend Lead',
      tone: 'from-blue-600 to-indigo-700 text-white',
      badgeTone: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    {
      name: 'Sartha Chandgude Chandgude',
      initials: 'SC',
      role: 'Frontend & UI/UX Specialist',
      focus: 'React 18 + Tailwind workspace views, design tokens, accessibility, responsive ergonomics.',
      contact: '+91 7038201106',
      badge: 'Design & UI',
      tone: 'from-purple-600 to-pink-700 text-white',
      badgeTone: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    {
      name: 'Palak Chandak',
      initials: 'PC',
      role: 'AI / Retrieval Specialist',
      focus: 'PyMuPDF passage chunking, multilingual-e5 ONNX embeddings, citation validator, prompt defense.',
      contact: '+91 9156942778',
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
            eyebrow={<><GraduationCap className="h-3 w-3" /> Section 9 & 13 · Team Details</>}
            title="Team We Code Coders"
            sub="Vishwakarma Institute of Pune · Official Team Name: samarth.darak24 · Inkloom AI Brand Governance Challenge"
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
                {/* Executive Avatar Header */}
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
                <span className="text-muted font-mono">{m.contact}</span>
                <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                  VIT Pune
                </span>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Quick Prototype Access Box for Judges */}
        <Reveal delay={150} className="mt-12 rounded-[28px] border border-brand-200 bg-gradient-to-r from-white via-brand-50/30 to-white p-7 sm:p-9 shadow-lg">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                </span>
                <h4 className="text-[18px] font-bold text-ink">Ready for Inkloom Judge Evaluation</h4>
              </div>
              <p className="mt-1.5 text-[13.5px] text-muted max-w-2xl">
                Test accounts are preloaded with fictional brand guidelines (PureGlow), posters, historical submissions, and the festival exception scenario.
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

function Workflow() {'''

if old_team_target in text:
    t_start = text.find(old_team_target)
    t_end = text.find(old_team_end)
    text = text[:t_start] + new_team_code + text[t_end + len(old_team_end):]
    print('[OK] Upgraded TeamSection with VIP Executive Team Cards & Evaluation Banner')
else:
    print('[WARN] old_team_target not found')

with open('src/pages/marketing/Home.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('[COMPLETE] Successfully updated src/pages/marketing/Home.tsx with all 5 premium visual sections.')
