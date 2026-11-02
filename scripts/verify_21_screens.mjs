/**
 * FEAT-006 verification harness.
 *
 * Walks all 21 screens against the running dev server as both roles, records
 * console errors, page errors, failed requests and horizontal overflow, and
 * captures 1920x1080 screenshots into docs/screenshots/.
 *
 * Usage: node scripts/verify_21_screens.mjs
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173'
const SHOTS = 'docs/screenshots'

const MANAGER = [
  ['manager-overview', '/manager/overview'],
  ['review-queue', '/manager/review-queue'],
  ['all-submissions', '/manager/all-submissions'],
  ['brand-guidelines', '/manager/brand-guidelines'],
  ['rules-conflicts', '/manager/rules-conflicts'],
  ['exceptions', '/manager/exceptions'],
  ['rule-impact-sandbox', '/manager/rule-impact-sandbox'],
  ['sentinel-monitoring', '/manager/sentinel'],
  ['asset-library', '/manager/asset-library'],
  ['analytics-health', '/manager/analytics'],
  ['audit-history', '/manager/audit-history'],
]

const CREATOR = [
  ['creator-dashboard', '/creator/dashboard'],
  ['new-content', '/creator/new-content'],
  ['my-submissions', '/creator/my-submissions'],
  ['ai-review', '/creator/ai-review'],
  ['creator-guidelines', '/creator/guidelines'],
  ['exception-requests', '/creator/exception-requests'],
  ['sentinel-tasks', '/creator/sentinel-tasks'],
  ['notifications', '/creator/notifications'],
  ['approved-content', '/creator/approved-content'],
  ['profile', '/creator/profile'],
]

const results = []

function attach(page, bucket) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') bucket.console.push(msg.text().slice(0, 240))
  })
  page.on('pageerror', (err) => bucket.pageErrors.push(String(err).slice(0, 240)))
  page.on('requestfailed', (req) => {
    const url = req.url()
    if (url.startsWith('data:') || url.includes('favicon')) return
    bucket.failed.push(`${req.method()} ${url.slice(0, 120)} — ${req.failure()?.errorText ?? ''}`)
  })
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(manager|creator)\//, { timeout: 20000 })
  await page.waitForSelector('text=Loading Workspace', { state: 'detached', timeout: 15000 }).catch(() => {})
}

async function visit(page, name, path, shot) {
  const bucket = { console: [], pageErrors: [], failed: [] }
  attach(page, bucket)
  const started = Date.now()
  let status = 'ok'
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForSelector('text=Loading Workspace', { state: 'detached', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(700)
    const overflow = await page.evaluate(() => {
      const el = document.documentElement
      return el.scrollWidth - el.clientWidth
    })
    const h1 = await page.locator('h1').count()
    const h1Text = h1 ? (await page.locator('h1').first().innerText()).trim().slice(0, 60) : ''
    if (shot) await page.screenshot({ path: `${SHOTS}/${name}.png` })
    results.push({
      name, path, ms: Date.now() - started, h1, h1Text,
      overflowX: overflow > 2 ? overflow : 0,
      consoleErrors: bucket.console.length,
      pageErrors: bucket.pageErrors.length,
      failedRequests: bucket.failed.length,
      detail: [...bucket.console, ...bucket.pageErrors, ...bucket.failed].slice(0, 3),
    })
    if (h1 === 0) status = 'no-h1'
  } catch (err) {
    status = 'error'
    results.push({ name, path, status, error: String(err).slice(0, 200) })
  }
  process.stdout.write(`${status === 'ok' ? 'PASS' : 'FAIL'} ${name}\n`)
}

async function main() {
  await mkdir(SHOTS, { recursive: true })
  const browser = await chromium.launch({ headless: true })

  // ---- Manager pass, desktop, with screenshots ----
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const page = await ctx.newPage()
  await login(page, 'david.kim@pureglow.co', 'precedent')
  for (const [name, path] of MANAGER) await visit(page, name, path, true)

  // ---- Mobile pass (375px) on 4 representative screens ----
  await page.setViewportSize({ width: 375, height: 812 })
  for (const [name, path] of [MANAGER[0], MANAGER[1], MANAGER[6], MANAGER[8]]) {
    await visit(page, `${name}@375`, path, false)
  }
  await ctx.close()

  // ---- Creator pass ----
  const ctx2 = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const page2 = await ctx2.newPage()
  await login(page2, 'emily.carter@pureglow.co', 'precedent')
  for (const [name, path] of CREATOR) await visit(page2, name, path, true)

  // ---- Reduced motion spot-check ----
  const ctx3 = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  })
  const page3 = await ctx3.newPage()
  await login(page3, 'emily.carter@pureglow.co', 'precedent')
  for (const [name, path] of [CREATOR[0], CREATOR[3]]) {
    await visit(page3, `${name}@reduced`, path, false)
  }
  await ctx3.close()
  await browser.close()

  const bad = results.filter(
    (r) => r.status || r.consoleErrors || r.pageErrors || r.failedRequests || r.overflowX,
  )
  console.log('\n=== SUMMARY ===')
  console.log(`screens visited: ${results.length}`)
  console.log(`clean: ${results.length - bad.length}`)
  console.log(`with findings: ${bad.length}`)
  if (bad.length) console.log(JSON.stringify(bad, null, 2))
  const slow = [...results].sort((a, b) => (b.ms ?? 0) - (a.ms ?? 0)).slice(0, 3)
  console.log('slowest:', slow.map((r) => `${r.name}:${r.ms}ms`).join(', '))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
