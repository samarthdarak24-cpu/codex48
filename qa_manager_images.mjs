/**
 * Verifies attached images now render in the manager tables:
 *  - Exceptions (Content column)
 *  - Rule Impact Sandbox (Content Item column)
 *  - Audit History (Content column)
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
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
await page.fill('#email', 'david.kim@pureglow.co')
await page.fill('#password', 'precedent')
await page.click('button[type="submit"]')
await page.waitForURL(/\/manager\/overview/, { timeout: 25000 })

async function count(route, label) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  const r = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('table img'))
    return { total: imgs.length, loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length }
  })
  await page.screenshot({ path: `.shots/${label}.png`, fullPage: true })
  return r
}

out.exceptions = await count('/manager/exceptions', 'mgr-exceptions-images')
out.sandbox = await count('/manager/sandbox', 'mgr-sandbox-images')
out.audit = await count('/manager/audit', 'mgr-audit-images')

out.consoleErrors = errors
out.pass =
  out.exceptions.total >= 3 &&
  out.exceptions.loaded >= 3 &&
  out.sandbox.total >= 4 &&
  out.sandbox.loaded >= 4 &&
  out.audit.total >= 1 &&
  out.audit.loaded >= 1 &&
  errors.length === 0

fs.mkdirSync('reports', { recursive: true })
fs.writeFileSync('reports/qa_manager_images.json', JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 2))
await browser.close()
