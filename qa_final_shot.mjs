import { chromium } from 'playwright-core'
import fs from 'fs'

const EXE = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p))

const B = 'http://127.0.0.1:5173'
const SID = process.argv[2]
const br = await chromium.launch({ executablePath: EXE, headless: true })
const errs = []

async function shot(email, path, name) {
  const ctx = await br.newContext({ viewport: { width: 1440, height: 1200 } })
  const p = await ctx.newPage()
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message))
  await p.goto(B + '/login', { waitUntil: 'networkidle' })
  await p.fill('#email', email)
  await p.fill('#password', 'precedent')
  await p.click('button[type="submit"]')
  await p.waitForURL(/\/(app|manager)\/overview/, { timeout: 25000 })
  await p.goto(B + path, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2500)
  await p.screenshot({ path: 'reports/round3/' + name + '.png', fullPage: false })
  const t = await p.locator('body').innerText()
  console.log(
    name,
    '| chars',
    t.trim().length,
    '| AI group:',
    /AI suggestion/i.test(t),
    '| review group:',
    /human review/i.test(t),
  )
  await ctx.close()
}

await shot('emily.carter@pureglow.co', '/app/feedback/' + SID, 'creator-feedback')
await shot('david.kim@pureglow.co', '/manager/queue/' + SID, 'manager-poster-final')
console.log('errors:', errs.length ? errs.slice(0, 5).join(' / ') : 'none')
await br.close()
