import { chromium } from 'playwright-core'
import fs from 'fs'
const exes = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']
const EXE = exes.find((p) => fs.existsSync(p)) || exes[0]
const BASE = 'http://127.0.0.1:8000'
const browser = await chromium.launch({ executablePath: EXE, headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
const page = await ctx.newPage()
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.fill('#email', 'david.kim@pureglow.co')
await page.fill('#password', 'precedent')
await page.click('button[type="submit"]')
await page.waitForURL(/\/manager\/overview/, { timeout: 30000 })
await page.goto(`${BASE}/manager/agent-studio`, { waitUntil: 'domcontentloaded' })
await page.getByRole('heading', { name: 'Agent Studio' }).waitFor({ timeout: 20000 })
await page.locator('article').filter({ hasText: 'Brand Compliance Reviewer' }).first().getByRole('button', { name: 'Open' }).click()
await page.getByText('System instructions').waitFor({ timeout: 20000 })
const tabBtn = page.locator('button').filter({ hasText: 'Test playground' })
const box = await tabBtn.boundingBox()
console.log('box', box)
const top = await page.evaluate(({ x, y }) => {
  const el = document.elementFromPoint(x, y)
  return el ? el.tagName + ' ' + (el.textContent || '').slice(0, 40) : null
}, { x: box.x + box.width / 2, y: box.y + box.height / 2 })
console.log('elementFromPoint:', top)
await tabBtn.evaluate((el) => el.click())
await page.waitForTimeout(1000)
console.log('after evaluate click, has Test input:', await page.getByText('Test input').count())
console.log('active tab class:', await page.locator('button').filter({ hasText: 'Test playground' }).getAttribute('class'))
await page.screenshot({ path: '.shots/agent-studio/debug-tab2.png', fullPage: true })
await browser.close()
