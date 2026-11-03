// Live smoke test of the running app (vite dev server + FastAPI).
// Logs in as both roles, walks the main screens, and records any console error.
import { chromium } from 'playwright-core'
import fs from 'fs'

const EXE = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p))

const BASE = 'http://127.0.0.1:5173'
const OUT = 'reports/runcheck'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: EXE, headless: true })
const failures = []

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('#email', email)
  await page.fill('#password', 'precedent')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(creator|manager)\//, { timeout: 30000 })
  await page.waitForLoadState('networkidle')
}

async function visit(page, path, name, mustMatch) {
  const errors = []
  const onConsole = (m) => { if (m.type() === 'error') errors.push(m.text()) }
  const onPageError = (e) => errors.push('pageerror: ' + e.message)
  page.on('console', onConsole)
  page.on('pageerror', onPageError)

  const res = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const body = (await page.locator('body').innerText()).trim()
  const shot = `${OUT}/${name}.png`
  await page.screenshot({ path: shot, fullPage: false })

  page.off('console', onConsole)
  page.off('pageerror', onPageError)

  const missing = (mustMatch || []).filter((re) => !new RegExp(re, 'i').test(body))
  const blank = body.length < 60
  const ok = res && res.ok() && !blank && missing.length === 0 && errors.length === 0

  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(24)} http=${res ? res.status() : '??'} chars=${String(body.length).padStart(5)}` +
    (missing.length ? `  missing=${missing.join(',')}` : '') +
    (blank ? '  BLANK' : '') +
    (errors.length ? `  errors=${errors.slice(0, 2).join(' | ')}` : ''),
  )
  if (!ok) failures.push({ name, path, missing, errors, body: body.slice(0, 200) })
  return body
}

// ---- Manager -------------------------------------------------------------
let ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
let page = await ctx.newPage()
await login(page, 'david.kim@pureglow.co')
console.log('manager login ->', page.url())

const managerPages = [
  ['/manager/overview', 'm-overview', ['overview|dashboard|queue']],
  ['/manager/review-queue', 'm-review-queue', ['review']],
  ['/manager/all-submissions', 'm-submissions', ['submission']],
  ['/manager/brand-guidelines', 'm-guidelines', ['guideline']],
  ['/manager/rules-conflicts', 'm-conflicts', ['conflict|rule']],
  ['/manager/exceptions', 'm-exceptions', ['exception']],
  ['/manager/rule-impact-sandbox', 'm-sandbox', ['impact|sandbox']],
  ['/manager/sentinel', 'm-sentinel', ['sentinel|reassess']],
  ['/manager/asset-library', 'm-assets', ['asset']],
  ['/manager/analytics', 'm-analytics', ['analytic|health']],
  ['/manager/audit-history', 'm-audit', ['audit']],
  ['/manager/notifications', 'm-notifications', ['notification']],
]
for (const [p, n, m] of managerPages) await visit(page, p, n, m)

// Open one submission detail if the queue exposes one.
await page.goto(`${BASE}/manager/review-queue`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
const detailLink = await page.locator('a[href*="submissions/"], button:has-text("Review"), tr[role="button"]').first()
if (await detailLink.count()) {
  try {
    await detailLink.click()
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `${OUT}/m-detail.png`, fullPage: false })
    const body = (await page.locator('body').innerText()).trim()
    console.log(`PASS  m-detail                 chars=${body.length}`)
  } catch (e) {
    console.log('WARN  m-detail could not be opened:', e.message.slice(0, 80))
  }
}
await ctx.close()

// ---- Creator -------------------------------------------------------------
ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
page = await ctx.newPage()
await login(page, 'emily.carter@pureglow.co')
console.log('creator login ->', page.url())

const creatorPages = [
  ['/creator/dashboard', 'c-dashboard', ['dashboard']],
  ['/creator/new-content', 'c-new-content', ['content']],
  ['/creator/submissions', 'c-submissions', ['submission']],
  ['/creator/ai-review', 'c-ai-review', ['review']],
  ['/creator/guidelines', 'c-guidelines', ['guideline']],
  ['/creator/exceptions', 'c-exceptions', ['exception']],
  ['/creator/tasks', 'c-tasks', ['task|sentinel']],
  ['/creator/notifications', 'c-notifications', ['notification']],
  ['/creator/approved', 'c-approved', ['approved']],
  ['/creator/profile', 'c-profile', ['profile']],
]
for (const [p, n, m] of creatorPages) await visit(page, p, n, m)
await ctx.close()

await browser.close()

console.log('\n--- summary ---')
console.log('failures:', failures.length)
for (const f of failures) {
  console.log(` ${f.name} ${f.path} missing=${f.missing.join(',')} errors=${f.errors.slice(0, 2).join(' | ')}`)
  console.log(`   body: ${f.body.replace(/\n/g, ' ').slice(0, 140)}`)
}
process.exit(failures.length ? 1 : 0)
