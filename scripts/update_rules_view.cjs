const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/v2/components/views/manager/RulesConflictsView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace Drawer Header
const oldHeader = `                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-bold text-ink uppercase tracking-wider">
                    Rule Conflict Details
                  </span>
                  {activeConflict.status === 'Conflict' && (
                    <span className="bg-rose-100 text-rose-700 font-bold text-[10px] px-2 py-0.5 rounded-full">
                      Conflict
                    </span>
                  )}
                </div>`;

const newHeader = `                <div className="flex items-center gap-2">
                  {activeConflict.status === 'Conflict' ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-bold text-ink uppercase tracking-wider">
                        Rule Conflict Details
                      </span>
                      <span className="bg-rose-100 text-rose-700 font-bold text-[10px] px-2 py-0.5 rounded-full">
                        Conflict
                      </span>
                    </>
                  ) : (
                    <>
                      <Scale className="w-4 h-4 text-brand-600" />
                      <span className="text-xs font-bold text-ink uppercase tracking-wider">
                        Brand Rule Policy
                      </span>
                      <span className="bg-emerald-100 text-emerald-700 font-bold text-[10px] px-2 py-0.5 rounded-full">
                        {activeConflict.status}
                      </span>
                    </>
                  )}
                </div>`;

if (content.includes(oldHeader.replace(/\r\n/g, '\n'))) {
  content = content.replace(oldHeader.replace(/\r\n/g, '\n'), newHeader);
  console.log('Replaced Drawer Header (LF)');
} else if (content.includes(oldHeader)) {
  content = content.replace(oldHeader, newHeader);
  console.log('Replaced Drawer Header (CRLF)');
} else {
  console.error('Could not find oldHeader');
}

// 2. Replace Conflict Source Box
const oldSourceBox = `            {/* Conflict Source Box */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-ink">Conflict Source</span>
              <div className="grid grid-cols-11 items-center gap-1.5 p-3 rounded-xl border border-line bg-[#FAF7EF]/70">
                {/* Source 1 */}
                <div className="col-span-5 text-center p-2 rounded-lg bg-white border border-line/80 shadow-2xs">
                  <div className="w-7 h-7 mx-auto rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mb-1">
                    <Megaphone className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-bold text-ink text-xs">Marketing Guidelines</div>
                  <div className="text-[11px] text-muted font-medium mt-0.5">
                    {activeConflict.source1?.requirement || 'Min. 24px (for digital)'}
                  </div>
                </div>

                {/* Lightning Bolt */}
                <div className="col-span-1 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                  </div>
                </div>

                {/* Source 2 */}
                <div className="col-span-5 text-center p-2 rounded-lg bg-white border border-line/80 shadow-2xs">
                  <div className="w-7 h-7 mx-auto rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mb-1">
                    <Box className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-bold text-ink text-xs">Product Guidelines</div>
                  <div className="text-[11px] text-muted font-medium mt-0.5">
                    {activeConflict.source2?.requirement || 'Min. 32px (for product)'}
                  </div>
                </div>
              </div>
            </div>`;

const newSourceBox = `            {/* Conflict Source / Policy Specification Box */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-ink">
                {activeConflict.status === 'Conflict' ? 'Conflict Source' : 'Policy Specification'}
              </span>
              {activeConflict.status === 'Conflict' ? (
                <div className="grid grid-cols-11 items-center gap-1.5 p-3 rounded-xl border border-line bg-[#FAF7EF]/70">
                  <div className="col-span-5 text-center p-2 rounded-lg bg-white border border-line/80 shadow-2xs">
                    <div className="w-7 h-7 mx-auto rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mb-1">
                      <Megaphone className="w-3.5 h-3.5" />
                    </div>
                    <div className="font-bold text-ink text-xs truncate">{activeConflict.source1?.name || 'Marketing Guidelines'}</div>
                    <div className="text-[11px] text-muted font-medium mt-0.5 line-clamp-2">
                      {activeConflict.source1?.requirement || 'Min. 24px (for digital)'}
                    </div>
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 fill-current" />
                    </div>
                  </div>

                  <div className="col-span-5 text-center p-2 rounded-lg bg-white border border-line/80 shadow-2xs">
                    <div className="w-7 h-7 mx-auto rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mb-1">
                      <Box className="w-3.5 h-3.5" />
                    </div>
                    <div className="font-bold text-ink text-xs truncate">{activeConflict.source2?.name || 'Product Guidelines'}</div>
                    <div className="text-[11px] text-muted font-medium mt-0.5 line-clamp-2">
                      {activeConflict.source2?.requirement || 'Min. 32px (for product)'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-line bg-[#FAF7EF]/70 space-y-2">
                  <div className="p-2.5 rounded-lg bg-white border border-line/80 shadow-2xs">
                    <div className="text-[11px] font-bold text-ink-700">Condition &amp; Requirement</div>
                    <div className="text-xs text-ink-900 font-mono mt-1 bg-[#F1ECE0]/50 p-1.5 rounded">
                      {activeConflict.source1?.requirement || activeConflict.description}
                    </div>
                  </div>
                  {activeConflict.source2?.requirement && (
                    <div className="p-2.5 rounded-lg bg-white border border-line/80 shadow-2xs">
                      <div className="text-[11px] font-bold text-ink-700">{activeConflict.source2.name}</div>
                      <div className="text-xs text-muted mt-0.5 italic">
                        "{activeConflict.source2.requirement}"
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>`;

if (content.includes(oldSourceBox.replace(/\r\n/g, '\n'))) {
  content = content.replace(oldSourceBox.replace(/\r\n/g, '\n'), newSourceBox);
  console.log('Replaced Source Box (LF)');
} else if (content.includes(oldSourceBox)) {
  content = content.replace(oldSourceBox, newSourceBox);
  console.log('Replaced Source Box (CRLF)');
} else {
  console.error('Could not find oldSourceBox');
}

// 3. Replace Button text
const oldBtn = `<button
              onClick={() => resolveRuleConflict(activeConflict.id)}
              className="flex-1 py-2.5 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs transition text-center shadow-xs flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Resolve Conflict
            </button>`;

const newBtn = `<button
              onClick={() => resolveRuleConflict(activeConflict.id)}
              className="flex-1 py-2.5 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs transition text-center shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              {activeConflict.status === 'Conflict'
                ? 'Resolve Conflict'
                : activeConflict.status === 'Review Required'
                ? 'Confirm Rule'
                : 'Enforce Policy'}
            </button>`;

if (content.includes(oldBtn.replace(/\r\n/g, '\n'))) {
  content = content.replace(oldBtn.replace(/\r\n/g, '\n'), newBtn);
  console.log('Replaced Button (LF)');
} else if (content.includes(oldBtn)) {
  content = content.replace(oldBtn, newBtn);
  console.log('Replaced Button (CRLF)');
} else {
  console.error('Could not find oldBtn');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('RulesConflictsView.tsx updated.');
