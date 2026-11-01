import { chromium } from 'playwright-core'

const EXE = 'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe'
const BASE = 'http://127.0.0.1:5173'

const MANAGER = [
  ['overview', '/manager/overview'],
  ['review-queue', '/manager/review-queue'],
  ['all-submissions', '/manager/all-submissions'],
  ['brand-guidelines', '/manager/brand-guidelines'],
  ['rules-conflicts', '/manager/rules-conflicts'],
  ['exceptions', '/manager/exceptions'],
  ['rule-impact-sandbox', '/manager/rule-impact-sandbox'],
  ['sentinel', '/manager/sentinel'],
  ['asset-library', '/manager/asset-library'],
  ['analytics', '/manager/analytics'],
  ['audit-history', '/manager/audit-history'],
]
const CREATOR = [
  ['dashboard', '/creator/dashboard'],
  ['new-content', '/creator/new-content'],
  ['submissions', '/creator/submissions'],
  ['ai-review', '/creator/ai-review'],
  ['guidelines', '/creator/guidelines'],
  ['exceptions', '/creator/exceptions'],
  ['tasks', '/creator/tasks'],
  ['notifications', '/creator/notifications'],
  ['approved', '/creator/approved'],
  ['profile', '/creator/profile'],
]

async function login(page, email) {
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
  await page.fill('#email', email)
  await page.fill('#password', 'precedent')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(manager|creator)\//, { timeout: 30000 })
}

const browser = await chromium.launch({ executablePath: EXE, headless: true })
const results = []

async function sweep(email, routes, role) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  let errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

  await login(page, email)
  for (const [name, path] of routes) {
    errors = []
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1400)
    const text = (await page.textContent('body')) || ''
    const heading = await page.locator('h1, h2').first().textContent().catch(() => '')
    results.push({ role, page: name, path, url: page.url(), textLength: text.length, heading: (heading || '').trim().slice(0, 60), errors: [...errors] })
  }

  await page.goto(BASE + (role === 'manager' ? '/manager/overview' : '/creator/dashboard'), { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1400)
  await page.screenshot({ path: `.shots/v2-${role}-home.png`, fullPage: true })
  await ctx.close()
}

await sweep('david.kim@pureglow.co', MANAGER, 'manager')
await sweep('emily.carter@pureglow.co', CREATOR, 'creator')
await browser.close()

console.log(JSON.stringify(results, null, 2))
const failed = results.filter((r) => r.errors.length)
console.log('\nFAILED_ROUTES=' + failed.length)
for (const f of failed) console.log(f.role, f.page, f.errors.slice(0, 2))
