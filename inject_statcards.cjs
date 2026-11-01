/**
 * inject_statcards.cjs
 * 
 * For each view file, find the 4-card KPI grid block and replace it
 * with a <StatCardGrid> call, preserving the original card data.
 * 
 * The old pattern is always:
 *   <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 *     { [ { label, value, icon, ... }, ... ].map((card, i?) => (
 *       <div key={...} className="bg-... rounded-2xl p-4 ...">
 *         ...
 *       </div>
 *     )) }
 *   </div>
 *
 * We extract the 4 {label, value, icon, ...} objects and build:
 *   <StatCardGrid cards={[ ... ]} />
 */

const fs = require('fs');
const path = require('path');

const VIEWS = path.join(__dirname, 'src/v2/components/views');

// Per-view color palettes [v0, v1, v2, v3]
const PALETTES = {
  'ReviewQueueView':              ['blue',   'green',   'amber',  'pink'],
  'AllSubmissionsView':           ['blue',   'green',   'amber',  'orange'],
  'BrandGuidelinesView':          ['green',  'blue',    'amber',  'purple'],
  'RulesConflictsView':           ['blue',   'green',   'amber',  'purple'],
  'ExceptionsView':               ['blue',   'green',   'amber',  'red'],
  'RuleImpactSandboxView':        ['blue',   'green',   'amber',  'purple'],
  'SentinelMonitoringView':       ['blue',   'red',     'green',  'purple'],
  'AssetLibraryView':             ['blue',   'green',   'amber',  'red'],
  'AnalyticsHealthView':          ['green',  'blue',    'amber',  'purple'],
  'AuditHistoryView':             ['blue',   'green',   'amber',  'red'],
  'CreatorDashboardView':         ['blue',   'green',   'amber',  'pink'],
  'MySubmissionsView':            ['blue',   'green',   'amber',  'purple'],
  'AIReviewView':                 ['blue',   'green',   'amber',  'red'],
  'CreatorGuidelinesView':        ['green',  'blue',    'amber',  'purple'],
  'CreatorExceptionRequestsView': ['blue',   'green',   'amber',  'red'],
  'CreatorSentinelTasksView':     ['blue',   'green',   'amber',  'purple'],
  'NotificationsView':            ['blue',   'green',   'amber',  'purple'],
  'ApprovedContentView':          ['green',  'blue',    'amber',  'purple'],
  'MyProfileView':                ['blue',   'green',   'amber',  'purple'],
  'NewContentView':               ['blue',   'green',   'amber',  'pink'],
};

function getAllFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir)) {
    const f = path.join(dir, e);
    fs.statSync(f).isDirectory() ? out.push(...getAllFiles(f)) : e.endsWith('.tsx') && out.push(f);
  }
  return out;
}

/** Find the balanced closing tag position for an opening div at `start` */
function findClosingDiv(src, start) {
  let depth = 0, i = start;
  while (i < src.length) {
    if (src.startsWith('<div', i) && (src[i + 4] === ' ' || src[i + 4] === '\n' || src[i + 4] === '\r' || src[i + 4] === '>')) {
      depth++; i += 4; continue;
    }
    if (src.startsWith('</div>', i)) {
      depth--;
      if (depth === 0) return i + 6;
      i += 6; continue;
    }
    i++;
  }
  return -1;
}

/** Extract label strings from JSX card array block */
function extractLabels(block) {
  const results = [];
  // Match label: 'Some Text' or label: "Some Text" or 'LABEL_NAME' text inside xs/[10px]/[11px] tags
  const re1 = /label:\s*['"]([^'"]{2,40})['"]/g;
  let m;
  while ((m = re1.exec(block)) !== null) results.push(m[1]);
  return results;
}

/** Extract icon JSX from card object (e.g. <FileText className="w-5 h-5" />) */
function extractIcons(block) {
  const icons = [];
  // Match icon: <SomeName className=... />
  const re = /icon:\s*(<[A-Z][A-Za-z]+[^>]*\/>)/g;
  let m;
  while ((m = re.exec(block)) !== null) icons.push(m[1]);
  return icons;
}

/** Extract value expressions */
function extractValues(block) {
  const vals = [];
  const re = /value:\s*([^,}\n]+)/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const v = m[1].trim().replace(/,$/, '');
    vals.push(v);
  }
  return vals;
}

/** Extract trend values */
function extractTrends(block) {
  const trends = [];
  const re = /trend:\s*(-?\d+)/g;
  let m;
  while ((m = re.exec(block)) !== null) trends.push(parseInt(m[1]));
  return trends;
}

/** Extract sparkPathIndex values */
function extractSparks(block) {
  const sparks = [];
  const re = /sparkPathIndex:\s*(\d+)/g;
  let m;
  while ((m = re.exec(block)) !== null) sparks.push(parseInt(m[1]));
  return sparks;
}

let totalPatched = 0;

for (const file of getAllFiles(VIEWS)) {
  const base = path.basename(file, '.tsx');
  const palette = PALETTES[base];
  if (!palette) continue;

  let src = fs.readFileSync(file, 'utf-8');

  // Skip if already has <StatCardGrid in JSX
  if (/<StatCardGrid\s/.test(src)) {
    console.log('SKIP (has StatCardGrid JSX):', base);
    continue;
  }

  const orig = src;

  // ── Step 1: Add import ──────────────────────────────────────
  if (!src.includes('StatCardGrid')) {
    const importLine = `import { StatCardGrid } from '../../ui/StatCard';\n`;
    // Insert after first import statement
    src = src.replace(/^(import\s[\s\S]*?;\n)/m, `$1${importLine}`);
  }

  // ── Step 2: Find the grid div ───────────────────────────────
  const gridMarker = '"grid grid-cols-2 lg:grid-cols-4 gap-4"';
  const markerPos = src.indexOf(gridMarker);
  if (markerPos === -1) {
    console.log('NO GRID:', base);
    continue;
  }

  // Find the opening <div of this grid
  const divOpen = src.lastIndexOf('<div', markerPos);
  if (divOpen === -1) continue;

  // Find the closing </div>
  const divEnd = findClosingDiv(src, divOpen);
  if (divEnd === -1) continue;

  const gridBlock = src.slice(divOpen, divEnd);

  // ── Step 3: Extract card data ───────────────────────────────
  const labels  = extractLabels(gridBlock);
  const icons   = extractIcons(gridBlock);
  const values  = extractValues(gridBlock);
  const trends  = extractTrends(gridBlock);
  const sparks  = extractSparks(gridBlock);

  // Need at least 2 labels to proceed
  if (labels.length < 2) {
    console.log('SKIP (cannot extract cards):', base, 'labels:', labels.length);
    continue;
  }

  // Build up to 4 card entries
  const count = Math.min(4, labels.length);
  const cardLines = [];
  for (let i = 0; i < count; i++) {
    const label   = labels[i] || `Card ${i+1}`;
    const icon    = icons[i]  || '<FileText className="w-5 h-5" />';
    const value   = values[i] || '0';
    const variant = palette[i] || 'blue';
    const trend   = trends[i] !== undefined ? `, trend: ${trends[i]}` : '';
    const spark   = sparks[i] !== undefined ? `, sparkPathIndex: ${sparks[i]}` : `, sparkPathIndex: ${i}`;

    cardLines.push(
      `    { label: '${label}', value: ${value}, icon: ${icon}, variant: '${variant}'${trend}${spark} }`
    );
  }

  const replacement = `<StatCardGrid cards={[\n${cardLines.join(',\n')},\n  ]} />`;

  // ── Step 4: Replace the old grid block ──────────────────────
  src = src.slice(0, divOpen) + replacement + src.slice(divEnd);

  fs.writeFileSync(file, src, 'utf-8');
  totalPatched++;
  console.log(`✓ ${base}  (${count} cards extracted)`);
}

console.log(`\nTotal patched: ${totalPatched}`);
