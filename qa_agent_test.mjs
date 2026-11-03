/** Verify the Agent Studio test playground + human approval through the UI. */
import { chromium } from 'playwright-core'
import fs from 'fs'

const exes = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe',
]
const EXE = exes.find((p) => fs.existsSync(p)) || exes[0]
const BASE = 'http://127.0.0.1:8000'
const OUT = '.shots/agent-studio'
const SUBMISSION_ID = process.argv[2] || 'sub_dfac9746ad2c'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: EXE, headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.fill('#email', 'david.kim@pureglow.co')
await page.fill('#password', 'precedent')
await page.click('button[type="submit"]')
await page.waitForURL(/\/manager\/overview/, { timeout: 30000 })

await page.goto(`${BASE}/manager/agent-studio`, { waitUntil: 'domcontentloaded' })
await page.getByRole('heading', { name: 'Agent Studio' }).waitFor({ timeout: 20000 })
await page
  .locator('article')
  .filter({ hasText: 'Brand Compliance Reviewer' })
  .first()
  .getByRole('button', { name: 'Open' })
  .click()
await page.getByText('System instructions').waitFor({ timeout: 20000 })

await page.getByRole('button', { name: /Test playground/i }).click()
await page.getByText('Test input').waitFor({ timeout: 15000 })
await page.locator('input[placeholder="e.g. sub_dfac9746ad2c"]').fill(SUBMISSION_ID)
await page.getByRole('button', { name: /^Run test$/ }).click()

await page.getByText('Execution timeline').waitFor({ timeout: 60000 })
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/09-test-playground.png`, fullPage: true })

// If the graph paused for human approval, approve it from the test tab.
const approve = page.getByRole('button', { name: /Approve & resume/i })
if (await approve.count()) {
  await approve.first().click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/10-approval.png`, fullPage: true })
}

await page.waitForTimeout(800)
const body = await page.locator('body').innerText()
const completed = body.includes('Completed')
const steps = await page.locator('ol li').count()
await page.screenshot({ path: `${OUT}/11-test-complete.png`, fullPage: true })

console.log('completed:', completed)
console.log('timeline steps:', steps)
console.log('page errors:', errors.length)
await browser.close()
if (!completed || errors.length) process.exitCode = 1
