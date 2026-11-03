import re

with open('src/pages/Login.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add creative product showcase card in left panel
target_before_diagram = "{/* Interactive animated governance visual */}"
replacement_with_card = """{/* Live Approved Creative Visual Showcase */}
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

          {/* Interactive animated governance visual */}"""

if target_before_diagram in text:
    text = text.replace(target_before_diagram, replacement_with_card, 1)
    print('[OK] Added live approved creative showcase to left brand panel')

# 2. Add PureGlow workspace logo pill in right header
old_right_header = """          <div className="hidden lg:flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
            </span>
            <span className="text-[11.5px] font-medium text-muted">System Operational · Live API</span>
          </div>"""

new_right_header = """          <div className="hidden lg:flex items-center gap-3">
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
          </div>"""

if old_right_header in text:
    text = text.replace(old_right_header, new_right_header, 1)
    print('[OK] Added workspace pill to right header')

with open('src/pages/Login.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('[COMPLETE] Login.tsx upgraded successfully!')
