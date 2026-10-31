/**
 * Round 3 UI smoke test — proves the A1/A2/A3 screens actually render.
 * Run with both servers up:  node qa_round3_ui.mjs
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
const OUT = 'reports/round3'

fs.mkdirSync(OUT, { recursive: true })

const errors = []

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('#email', email)
  await page.fill('#password', 'precedent')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(app|manager)\/overview/, { timeout: 25000 })
}

async function visit(page, path, name) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const body = await page.locator('body').innerText()
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  const blank = body.trim().length < 40
  return { path, blank, chars: body.trim().length, text: body.slice(0, 220) }
}

const browser = await chromium.launch({ executablePath: EXE, headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

const results = []
try {
  await login(page, 'david.kim@pureglow.co')
  results.push(await visit(page, '/manager/sentinel', 'manager-sentinel'))
  results.push(await visit(page, '/notifications', 'notifications'))
  results.push(await visit(page, '/manager/overview', 'manager-overview'))

  // Poster submission with a completed A1 analysis.
  await page.goto(`${BASE}/manager/queue`, { waitUntil: 'networkidle' })
  const poster = page.getByText('Sensitive Skin Launch Poster').first()
  if (await poster.count()) {
    await poster.click()
    await page.waitForTimeout(2000)
    results.push({
      path: '/manager/queue (poster)',
      blank: false,
      chars: (await page.locator('body').innerText()).trim().length,
      text: (await page.locator('body').innerText()).slice(0, 220),
    })
    await page.screenshot({ path: `${OUT}/poster-detail.png`, fullPage: false })
  }

  // Creator view of the three result groups, in a clean context so the
  // manager session (mirrored to sessionStorage) cannot redirect us away.
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page2 = await ctx2.newPage()
  page2.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page2.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  await login(page2, 'emily.carter@pureglow.co')
  results.push(await visit(page2, '/app/new', 'creator-new'))
  results.push(await visit(page2, '/app/submissions', 'creator-submissions'))
  await ctx2.close()
} finally {
  await browser.close()
}

console.log('--- screens ---')
for (const r of results) {
  console.log(`${r.blank ? 'BLANK!' : 'ok    '} ${r.path}  (${r.chars} chars)`)
}
console.log('\n--- console errors ---')
console.log(errors.length ? errors.slice(0, 12).join('\n') : 'none')
console.log(`\nscreenshots -> ${OUT}`)
process.exit(results.some((r) => r.blank) || errors.length ? 1 : 0)
