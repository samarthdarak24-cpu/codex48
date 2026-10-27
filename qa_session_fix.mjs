/**
 * Regression test for the "Could not submit — User not found" bug.
 *  A) A stale/invalid stored token must be rejected on boot and redirect to /login
 *     (instead of rendering a dashboard whose actions all 401).
 *  B) A fresh login works.
 *  C) Submitting content after re-login succeeds (no "User not found").
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

// A) Stale session must not be trusted.
await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
await page.evaluate(() => {
  sessionStorage.setItem(
    'precedent.session',
    JSON.stringify({
      token: 'stale.invalid.token',
      user: { id: 'u_stale', name: 'Stale User', email: 'stale@x.test', role: 'creator', workspace: 'PureGlow' },
    }),
  )
})
await page.goto(BASE + '/app/overview', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
out.staleRedirectedToLogin = /\/login/.test(page.url())
out.staleSessionCleared = await page.evaluate(() => !sessionStorage.getItem('precedent.session'))

// B) Fresh login.
await page.fill('#email', 'emily.carter@pureglow.co')
await page.fill('#password', 'precedent')
await page.click('button[type="submit"]')
await page.waitForURL(/\/app\/overview/, { timeout: 25000 })
out.loginLanded = page.url()

// C) Submit content.
await page.goto(BASE + '/app/new', { waitUntil: 'networkidle' })
await page.fill('#title', 'Session Fix Test')
await page.fill('#text', 'Gentle care for sensitive skin. Made without added fragrance.')
await page.click('button[type="submit"]')
let submitted = false
try {
  await page.waitForURL(/\/app\/feedback\//, { timeout: 20000 })
  submitted = true
} catch {
  submitted = false
}
out.submitSucceeded = submitted
out.submitUrl = page.url()
const body = await page.textContent('body')
out.showsUserNotFound = (body || '').includes('User not found')

out.consoleErrors = errors
out.pass =
  out.staleRedirectedToLogin &&
  out.staleSessionCleared &&
  /\/app\/overview/.test(out.loginLanded) &&
  out.submitSucceeded &&
  !out.showsUserNotFound

fs.mkdirSync('reports', { recursive: true })
fs.writeFileSync('reports/qa_session_fix.json', JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 2))
await browser.close()
