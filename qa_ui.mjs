/**
 * Precedent — UI review harness.
 * Logs in as both roles, visits the screens being redesigned, and captures
 * desktop + mobile screenshots so text density and layout can be judged.
 *
 *   node qa_ui.mjs [creator|manager|all]
 */
import { chromium } from 'playwright-core'
import fs from 'fs'

const candidateExes = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe',
]
const EXE = candidateExes.find((p) => fs.existsSync(p)) || candidateExes[0]
const BASE = 'http://127.0.0.1:5173'
const OUT = '.shots/ui'
fs.mkdirSync(OUT, { recursive: true })

const which = (process.argv[2] || 'all').toLowerCase()

const browser = await chromium.launch({ executablePath: EXE, headless: true })

async function login(page, email) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.fill('#email', email)
  await page.fill('#password', 'precedent')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(app|manager|creator)\/(overview|dashboard)/, { timeout: 25000 })
}

async function shot(page, route, label, { full = true, wait = 600 } = {}) {
  const errors = []
  const onErr = (e) => errors.push(String(e))
  page.on('pageerror', onErr)
  try {
    await page.goto(BASE + route, { waitUntil: 'networkidle' })
    await page.waitForTimeout(wait)
    const info = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      textLen: (document.body.innerText || '').length,
      height: document.documentElement.scrollHeight,
    }))
    await page.screenshot({ path: `${OUT}/${label}.png`, fullPage: full })
    console.log(label.padEnd(30), 'text', String(info.textLen).padStart(5), 'overflow', info.overflow, errors.length ? 'ERR ' + errors[0] : '[OK]')
  } catch (e) {
    console.log(label.padEnd(30), 'FAILED', e.message)
  } finally {
    page.off('pageerror', onErr)
  }
}

if (which === 'creator' || which === 'all') {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await login(page, 'emily.carter@pureglow.co')
  await shot(page, '/creator/dashboard', 'creator-dashboard')
  await shot(page, '/creator/new', 'creator-new')
  await shot(page, '/creator/submissions', 'creator-submissions')
  await shot(page, '/creator/guidelines', 'creator-guidelines')
  await shot(page, '/creator/review', 'creator-review')
  await shot(page, '/creator/approved', 'creator-approved')
  await shot(page, '/creator/sentinel-tasks', 'creator-sentinel-tasks')
  await shot(page, '/creator/exceptions', 'creator-exceptions')
  await shot(page, '/creator/profile', 'creator-profile')
  await shot(page, '/creator/notifications', 'creator-notifications')
  await ctx.close()
}

if (which === 'manager' || which === 'all') {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await login(page, 'david.kim@pureglow.co')
  await shot(page, '/manager/overview', 'manager-overview')
  await shot(page, '/manager/queue', 'manager-queue')
  await shot(page, '/manager/submissions', 'manager-submissions')
  await shot(page, '/manager/guidelines', 'manager-guidelines')
  await shot(page, '/manager/rules', 'manager-rules')
  await shot(page, '/manager/exceptions', 'manager-exceptions')
  await shot(page, '/manager/sandbox', 'manager-sandbox')
  await shot(page, '/manager/sentinel', 'manager-sentinel')
  await shot(page, '/manager/assets', 'manager-assets')
  await shot(page, '/manager/health', 'manager-health')
  await shot(page, '/manager/audit', 'manager-audit')
  await shot(page, '/manager/notifications', 'manager-notifications')
  await ctx.close()
}

if (which === 'mobile' || which === 'all') {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await login(page, 'emily.carter@pureglow.co')
  await shot(page, '/creator/dashboard', 'mobile-dashboard', { full: true })
  await shot(page, '/creator/new', 'mobile-new')
  await ctx.close()
}

await browser.close()
console.log('UI REVIEW HARNESS COMPLETE!')
