/** Screenshot the poster detail page to verify the A1 overlay renders. */
import { chromium } from 'playwright-core'
import fs from 'fs'

const EXE = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p))
const BASE = 'http://127.0.0.1:5173'
const SID = process.argv[2]

const browser = await chromium.launch({ executablePath: EXE, headless: true })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1100 } })).newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await page.fill('#email', 'david.kim@pureglow.co')
await page.fill('#password', 'precedent')
await page.click('button[type="submit"]')
await page.waitForURL(/\/(app|manager)\/overview/, { timeout: 25000 })

for (const [path, name] of [
  [`/manager/queue/${SID}`, 'poster-manager'],
  [`/app/feedback/${SID}`, 'poster-feedback'],
]) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `reports/round3/${name}.png`, fullPage: false })
  const imgs = await page.locator('img').count()
  const svgs = await page.locator('svg').count()
  const text = (await page.locator('body').innerText()).slice(0, 300).replace(/\n+/g, ' | ')
  console.log(`${name}: imgs=${imgs} svgs=${svgs}`)
  console.log(`  ${text}`)
}

console.log('console errors:', errors.length ? errors.slice(0, 6).join(' / ') : 'none')
await browser.close()
