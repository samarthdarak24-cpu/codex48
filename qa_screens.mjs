/**
 * Precedent — 11-screen browser audit.
 * Logs in as both roles, visits every dashboard route, captures console
 * errors, checks content rendered, and checks horizontal overflow (desktop +
 * mobile). Writes reports/qa_screens.json.
 */
import { chromium } from 'playwright-core'
import fs from 'fs'
import path from 'path'

const candidateExes = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe',
]
const EXE = candidateExes.find((p) => fs.existsSync(p)) || candidateExes[0]
const BASE = 'http://127.0.0.1:5173'
const API = 'http://127.0.0.1:8000'

const results = { screens: [], interactions: {}, mobile: [], consoleErrors: [] }
fs.mkdirSync('.shots', { recursive: true })
fs.mkdirSync('reports', { recursive: true })

function attach(page, tag) {
  page.on('console', (m) => {
    if (m.type() === 'error') results.consoleErrors.push(tag + ': ' + m.text())
  })
  page.on('pageerror', (e) => results.consoleErrors.push(tag + '-PAGEERROR: ' + e.message))
}

async function login(page, email) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.fill('#email', email)
  await page.fill('#password', 'precedent')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(app|manager)\/overview/, { timeout: 25000 })
}

async function apiGet(page, p) {
  const token = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem('precedent.session') || '{}').token,
  )
  return page.evaluate(
    async ({ p, token }) => {
      const r = await fetch('http://127.0.0.1:8000' + p, { headers: { Authorization: 'Bearer ' + token } })
      return r.ok ? await r.json() : null
    },
    { p, token },
  )
}

async function visit(page, route, label, marker) {
  const before = results.consoleErrors.length
  let info = { textLen: 0, overflow: 0, url: route }
  try {
    await page.goto(BASE + route, { waitUntil: 'networkidle' })
    await page.waitForTimeout(350)
    info = await page.evaluate(() => ({
      textLen: (document.body.innerText || '').length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      url: location.pathname,
      text: (document.body.innerText || '').slice(0, 4000),
    }))
    await page.screenshot({ path: `.shots/qa-${label}.png`, fullPage: true })
  } catch (e) {
    results.consoleErrors.push(label + '-NAV: ' + e.message)
  }
  const errs = results.consoleErrors.slice(before)
  const markerOk = !marker || (info.text || '').toLowerCase().includes(marker.toLowerCase())
  const ok = info.textLen > 150 && errs.length === 0 && markerOk && info.overflow <= 2
  results.screens.push({
    route,
    label,
    ok,
    textLen: info.textLen,
    overflow: info.overflow,
    markerOk,
    errors: errs,
  })
  return ok
}

const browser = await chromium.launch({ executablePath: EXE, headless: true })

// ---------------- Creator dashboard (screens 1-5) ----------------
const cctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const cp = await cctx.newPage()
attach(cp, 'creator')
await login(cp, 'emily.carter@pureglow.co')
results.creatorLanded = cp.url()

await visit(cp, '/app/overview', 'creator-overview', 'overview')
await visit(cp, '/app/new', 'creator-new', 'content')
await visit(cp, '/app/submissions', 'creator-submissions', 'submission')
await visit(cp, '/app/guidelines', 'creator-guidelines', 'guideline')

const subs = await apiGet(cp, '/submissions')
if (Array.isArray(subs) && subs.length) {
  const target = subs.find((s) => (s.issueCount || 0) > 0) || subs[0]
  await visit(cp, `/app/feedback/${target.id}`, 'creator-feedback', 'issue')
} else {
  await visit(cp, '/app/feedback', 'creator-feedback', '')
}

// Interaction: New Content form validation (empty submit should not navigate away)
await cp.goto(BASE + '/app/new', { waitUntil: 'networkidle' })
const beforeUrl = cp.url()
await cp.click('button[type="submit"]').catch(() => {})
await cp.waitForTimeout(500)
results.interactions.emptyFormBlocked = cp.url() === beforeUrl

// ---------------- Manager dashboard (screens 6-11) ----------------
const mctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const mp = await mctx.newPage()
attach(mp, 'manager')
await login(mp, 'david.kim@pureglow.co')
results.managerLanded = mp.url()

await visit(mp, '/manager/overview', 'manager-overview', 'overview')
await visit(mp, '/manager/queue', 'manager-queue', 'queue')
await visit(mp, '/manager/guidelines', 'manager-guidelines', 'guideline')
await visit(mp, '/manager/exceptions', 'manager-exceptions', 'exception')
await visit(mp, '/manager/sandbox', 'manager-sandbox', '')
await visit(mp, '/manager/audit', 'manager-audit', 'audit')

// Interactions: manager queue has rows, exceptions list has rows, audit has events
const queueText = await mp.evaluate(() => document.body.innerText)
results.interactions.queueHasContent = queueText.length > 200
const excs = await apiGet(mp, '/exceptions')
results.interactions.exceptionsLoaded = Array.isArray(excs) && excs.length > 0
const events = await apiGet(mp, '/audit')
results.interactions.auditLoaded = Array.isArray(events) && events.length > 0

// ---------------- Marketing + login ----------------
const hctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const hp = await hctx.newPage()
attach(hp, 'marketing')
await visit(hp, '/', 'marketing-home', '')
await visit(hp, '/login', 'login', 'sign in')

// ---------------- Mobile usability ----------------
const mob = await browser.newContext({ viewport: { width: 390, height: 844 } })
const mobp = await mob.newPage()
attach(mobp, 'mobile')
await login(mobp, 'emily.carter@pureglow.co')
for (const [route, label] of [
  ['/app/overview', 'mobile-creator-overview'],
  ['/app/submissions', 'mobile-creator-submissions'],
]) {
  try {
    await mobp.goto(BASE + route, { waitUntil: 'networkidle' })
    await mobp.waitForTimeout(300)
    const info = await mobp.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      textLen: (document.body.innerText || '').length,
    }))
    results.mobile.push({ route, label, ...info, ok: info.textLen > 100 && info.overflow <= 4 })
  } catch (e) {
    results.mobile.push({ route, label, ok: false, error: e.message })
  }
}

results.summary = {
  screens: results.screens.length,
  screensPassed: results.screens.filter((s) => s.ok).length,
  consoleErrors: results.consoleErrors.length,
  mobilePassed: results.mobile.filter((m) => m.ok).length,
}
fs.writeFileSync('reports/qa_screens.json', JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
await browser.close()
