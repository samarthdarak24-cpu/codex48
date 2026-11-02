const fs = require('fs');
let content = fs.readFileSync('src/pages/marketing/Home.tsx', 'utf8');

// Replace Grant Scoped Exception button
content = content.replace(
  '<button type="button" className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-2.5 py-1 text-[10.5px] font-bold text-white shadow-2xs hover:bg-purple-700 transition-colors">\r\n                      <Sparkles className="h-3 w-3" /> Grant Scoped Exception\r\n                    </button>',
  `<button
                      type="button"
                      onClick={() => setExceptionGranted((prev) => !prev)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10.5px] font-bold text-white shadow-2xs transition-colors cursor-pointer",
                        exceptionGranted ? "bg-emerald-600 hover:bg-emerald-700" : "bg-purple-600 hover:bg-purple-700"
                      )}
                    >
                      <Sparkles className="h-3 w-3" /> {exceptionGranted ? "✓ Exception Granted (90d)" : "Grant Scoped Exception"}
                    </button>`
);
// In case LF
content = content.replace(
  '<button type="button" className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-2.5 py-1 text-[10.5px] font-bold text-white shadow-2xs hover:bg-purple-700 transition-colors">\n                      <Sparkles className="h-3 w-3" /> Grant Scoped Exception\n                    </button>',
  `<button
                      type="button"
                      onClick={() => setExceptionGranted((prev) => !prev)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10.5px] font-bold text-white shadow-2xs transition-colors cursor-pointer",
                        exceptionGranted ? "bg-emerald-600 hover:bg-emerald-700" : "bg-purple-600 hover:bg-purple-700"
                      )}
                    >
                      <Sparkles className="h-3 w-3" /> {exceptionGranted ? "✓ Exception Granted (90d)" : "Grant Scoped Exception"}
                    </button>`
);

// Replace Cite Rule button
content = content.replace(
  '<button type="button" className="inline-flex items-center gap-1 rounded-md bg-white border border-ink/15 px-2 py-1 text-[10.5px] font-semibold text-ink-700 hover:bg-ink/[0.02]">\r\n                      <FileSearch className="h-3 w-3 text-muted" /> Cite Rule\r\n                    </button>',
  `<button
                      type="button"
                      onClick={() => setRuleCited((prev) => !prev)}
                      className="inline-flex items-center gap-1 rounded-md bg-white border border-ink/15 px-2 py-1 text-[10.5px] font-semibold text-ink-700 hover:bg-ink/[0.04] transition-colors cursor-pointer"
                    >
                      <FileSearch className="h-3 w-3 text-muted" /> {ruleCited ? "BR-01 §3 Cited" : "Cite Rule"}
                    </button>`
);
content = content.replace(
  '<button type="button" className="inline-flex items-center gap-1 rounded-md bg-white border border-ink/15 px-2 py-1 text-[10.5px] font-semibold text-ink-700 hover:bg-ink/[0.02]">\n                      <FileSearch className="h-3 w-3 text-muted" /> Cite Rule\n                    </button>',
  `<button
                      type="button"
                      onClick={() => setRuleCited((prev) => !prev)}
                      className="inline-flex items-center gap-1 rounded-md bg-white border border-ink/15 px-2 py-1 text-[10.5px] font-semibold text-ink-700 hover:bg-ink/[0.04] transition-colors cursor-pointer"
                    >
                      <FileSearch className="h-3 w-3 text-muted" /> {ruleCited ? "BR-01 §3 Cited" : "Cite Rule"}
                    </button>`
);

// Replace Apply Minimal Fix to Draft button
content = content.replace(
  '<button type="button" className="mt-2 inline-flex items-center gap-1 rounded bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 shadow-2xs hover:bg-emerald-700">\r\n                    <Check className="h-2.5 w-2.5" /> Apply Minimal Fix to Draft\r\n                  </button>',
  `<button
                    type="button"
                    onClick={() => setFixApplied((prev) => !prev)}
                    className={cn(
                      "mt-2 inline-flex items-center gap-1 rounded font-bold text-[10px] px-2 py-0.5 shadow-2xs transition-colors cursor-pointer",
                      fixApplied ? "bg-emerald-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    )}
                  >
                    <Check className="h-2.5 w-2.5" /> {fixApplied ? "Fix Applied to Version 2.2" : "Apply Minimal Fix to Draft"}
                  </button>`
);
content = content.replace(
  '<button type="button" className="mt-2 inline-flex items-center gap-1 rounded bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 shadow-2xs hover:bg-emerald-700">\n                    <Check className="h-2.5 w-2.5" /> Apply Minimal Fix to Draft\n                  </button>',
  `<button
                    type="button"
                    onClick={() => setFixApplied((prev) => !prev)}
                    className={cn(
                      "mt-2 inline-flex items-center gap-1 rounded font-bold text-[10px] px-2 py-0.5 shadow-2xs transition-colors cursor-pointer",
                      fixApplied ? "bg-emerald-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    )}
                  >
                    <Check className="h-2.5 w-2.5" /> {fixApplied ? "Fix Applied to Version 2.2" : "Apply Minimal Fix to Draft"}
                  </button>`
);

fs.writeFileSync('src/pages/marketing/Home.tsx', content, 'utf8');
console.log('Successfully updated marketing buttons!');
