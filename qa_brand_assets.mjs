/**
 * Verifies brand-scoped image upload/library and the attached image in the
 * Content column:
 *  - seeded submissions show real images in Content columns
 *  - the asset panel has a Brand selector
 *  - switching brand filters the library (PureGlow 8, WellnessLife 2)
 */
import { chromium } from 'playwright-core'
import fs from 'fs'

const EXE = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe',
].find((p) => fs.existsSync(p))
const BASE = 'http://127.0.0.1:5173'
const errors = []
const out = {}

const browser = await chromium.launch({ executablePath: EXE, headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

async function login(email) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.fill('#email', email)
  await page.fill('#password', 'precedent')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(app|manager)\/overview/, { timeout: 25000 })
}

const libCount = async () => {
  const t = await page.evaluate(() => document.body.innerText)
  const m = t.match(/(\d+)\s+in library/)
  return m ? Number(m[1]) : null
}

await login('emily.carter@pureglow.co')

// Overview content column
await page.goto(BASE + '/app/overview', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
out.overviewImgs = await page.evaluate(() => document.querySelectorAll('table img').length)
out.overviewHasSummer = await page.evaluate(() => {
  const i = document.querySelector('img[alt="Summer Vibes"]')
  return !!i && i.complete && i.naturalWidth > 0
})
await page.screenshot({ path: '.shots/brand-overview.png', fullPage: true })

// My Submissions content column
await page.goto(BASE + '/app/submissions', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
out.submissionsImgs = await page.evaluate(() => document.querySelectorAll('table img').length)
out.submissionsHasSummer = await page.evaluate(() => {
  const i = document.querySelector('img[alt="Summer Vibes"]')
  return !!i && i.complete && i.naturalWidth > 0
})
await page.screenshot({ path: '.shots/brand-submissions.png', fullPage: true })

// Asset panel: brand selector + filtered library
await page.goto(BASE + '/app/new', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
out.brandSelector = await page.locator('select[aria-label="Brand for the uploaded image"]').count()
out.libraryPureGlow = await libCount()
await page.selectOption('select[aria-label="Brand for the uploaded image"]', 'WellnessLife')
await page.waitForTimeout(400)
out.libraryWellness = await libCount()
out.wellnessBadge = await page.evaluate(() =>
  Array.from(document.querySelectorAll('span')).some((s) => s.textContent?.trim() === 'WellnessLife'),
)
await page.screenshot({ path: '.shots/brand-asset-panel.png', fullPage: true })

out.consoleErrors = errors
out.pass =
  out.overviewImgs >= 1 &&
  out.overviewHasSummer &&
  out.submissionsImgs >= 4 &&
  out.submissionsHasSummer &&
  out.brandSelector === 1 &&
  out.libraryPureGlow === 6 &&
  out.libraryWellness === 2 &&
  errors.length === 0

fs.mkdirSync('reports', { recursive: true })
fs.writeFileSync('reports/qa_brand_assets.json', JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 2))
await browser.close()
