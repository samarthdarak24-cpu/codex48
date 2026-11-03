with open('src/pages/marketing/Home.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Enhance Hero with floating badges
old_hero_target = """      <div className="relative mkt-container">
        <div className="mx-auto max-w-[860px] text-center">"""

new_hero_replacement = """      <div className="relative mkt-container">
        {/* Floating aesthetic feature pills for visual depth */}
        <div className="pointer-events-none hidden xl:flex absolute -left-8 top-12 animate-float-slow items-center gap-2.5 rounded-2xl border border-white/80 bg-white/75 p-3 shadow-[0_15px_30px_-10px_rgba(15,33,56,0.1)] backdrop-blur-md z-20">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-50 text-success-600 border border-success-100 shadow-2xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="text-left text-xs pr-2">
            <p className="font-bold text-ink">Deterministic Primacy</p>
            <p className="text-[10.5px] text-muted">13 Brand Rule Conditions</p>
          </div>
        </div>

        <div className="pointer-events-none hidden xl:flex absolute -right-8 top-8 animate-float-reverse items-center gap-2.5 rounded-2xl border border-white/80 bg-white/75 p-3 shadow-[0_15px_30px_-10px_rgba(15,33,56,0.1)] backdrop-blur-md z-20">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-100 shadow-2xs">
            <Sparkles className="h-5 w-5 text-brand-500" />
          </div>
          <div className="text-left text-xs pr-2">
            <p className="font-bold text-ink">Verifiable Evidence</p>
            <p className="text-[10.5px] text-muted">Zero Hallucination Shield</p>
          </div>
        </div>

        <div className="mx-auto max-w-[860px] text-center">"""

if old_hero_target in text:
    text = text.replace(old_hero_target, new_hero_replacement, 1)
    with open('src/pages/marketing/Home.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print('[OK] Floating badges added to Hero in Home.tsx')
else:
    print('[WARN] Target not found in Home.tsx')
