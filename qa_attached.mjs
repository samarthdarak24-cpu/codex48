/**
 * Verifies the "attached image reference in Content column" feature:
 * upload an image, submit content, then confirm the Content column on
 * /app/overview and /app/submissions renders the attached image (<img>)
 * instead of the generated glyph.
 */
import { chromium } from 'playwright-core'
import fs from 'fs'
import path from 'path'

const EXE = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe',
].find((p) => fs.existsSync(p))
const BASE = 'http://127.0.0.1:5173'
const TITLE = 'Attached Image Reference Test'
const IMG = path.resolve('scratch/HeroBottle.png')

const errors = []
const out = {}

const browser = await chromium.launch({ executablePath: EXE, headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

async function login() {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.fill('#email', 'emily.carter@pureglow.co')
  await page.fill('#password', 'precedent')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/app\/overview/, { timeout: 25000 })
}

await login()
await page.goto(BASE + '/app/new', { waitUntil: 'networkidle' })

// Upload the image through the Brand & Product Assets picker.
await page.locator('input[accept="image/*"]').setInputFiles(IMG)
await page.waitForTimeout(1800)
out.uploaded = (await page.textContent('body'))?.includes('HeroBottle') ?? false

await page.fill('#title', TITLE)
await page.fill('#text', 'Gentle care for sensitive skin. Made without added fragrance.')
await page.click('button[type="submit"]')
await page.waitForURL(/\/app\/feedback\//, { timeout: 25000 })
out.feedbackUrl = page.url()

// Creator Overview — the Content column is the table shown in the screenshot.
await page.goto(BASE + '/app/overview', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
out.overviewHasAttachedImg = await page.evaluate(
  (title) => {
    const rows = Array.from(document.querySelectorAll('tr'))
    const row = rows.find((r) => (r.innerText || '').includes(title))
    return !!(row && row.querySelector('img'))
  },
  TITLE,
)
out.overviewImgLoaded = await page.evaluate(() => {
  const img = document.querySelector('img[alt="HeroBottle"]')
  return !!img && img.complete && img.naturalWidth > 0
})
await page.screenshot({ path: '.shots/attached-content-column.png', fullPage: true })

// My Submissions — same column.
await page.goto(BASE + '/app/submissions', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
out.submissionsHasAttachedImg = await page.evaluate(
  (title) => {
    const rows = Array.from(document.querySelectorAll('tr'))
    const row = rows.find((r) => (r.innerText || '').includes(title))
    return !!(row && row.querySelector('img'))
  },
  TITLE,
)

// Manager Queue — same column.
const mctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const mp = await mctx.newPage()
mp.on('console', (m) => { if (m.type() === 'error') errors.push('M:' + m.text()) })
mp.on('pageerror', (e) => errors.push('M-PAGEERROR: ' + e.message))
await mp.goto(BASE + '/login', { waitUntil: 'networkidle' })
await mp.fill('#email', 'david.kim@pureglow.co')
await mp.fill('#password', 'precedent')
await mp.click('button[type="submit"]')
await mp.waitForURL(/\/manager\/overview/, { timeout: 25000 })
await mp.goto(BASE + '/manager/queue', { waitUntil: 'networkidle' })
await mp.waitForTimeout(1000)
out.queueHasAttachedImg = await mp.evaluate(
  (title) => {
    const rows = Array.from(document.querySelectorAll('tr'))
    const row = rows.find((r) => (r.innerText || '').includes(title))
    return !!(row && row.querySelector('img'))
  },
  TITLE,
)

out.consoleErrors = errors
out.pass =
  out.uploaded &&
  out.overviewHasAttachedImg &&
  out.overviewImgLoaded &&
  out.submissionsHasAttachedImg &&
  out.queueHasAttachedImg &&
  errors.length === 0

fs.mkdirSync('reports', { recursive: true })
fs.writeFileSync('reports/qa_attached.json', JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 2))
await browser.close()
