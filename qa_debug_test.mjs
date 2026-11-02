import { chromium } from 'playwright-core'
import fs from 'fs'

const exes = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
]
const EXE = exes.find((p) => fs.existsSync(p)) || exes[0]
const BASE = 'http://127.0.0.1:8000'
const browser = await chromium.launch({ executablePath: EXE, headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
const page = await ctx.newPage()
const logs = []
page.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`))
page.on('pageerror', (e) => logs.push(`pageerror: ${e}`))
page.on('response', async (res) => {
  if (res.url().includes('/agents/') && res.url().includes('/test')) {
    let body = ''
    try { body = await res.text() } catch {}
    logs.push(`NET ${res.status()} ${res.url()} :: ${body.slice(0, 600)}`)
  }
})

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.fill('#email', 'david.kim@pureglow.co')
await page.fill('#password', 'precedent')
await page.click('button[type="submit"]')
await page.waitForURL(/\/manager\/overview/, { timeout: 30000 })

await page.goto(`${BASE}/manager/agent-studio`, { waitUntil: 'domcontentloaded' })
await page.getByRole('heading', { name: 'Agent Studio' }).waitFor({ timeout: 20000 })
await page.locator('article').filter({ hasText: 'Brand Compliance Reviewer' }).first().getByRole('button', { name: 'Open' }).click()
await page.getByText('System instructions').waitFor({ timeout: 20000 })
await page.getByRole('button', { name: /Test playground/i }).click()
await page.getByText('Test input').waitFor({ timeout: 15000 })
const inputs = await page.locator('input').evaluateAll((els) => els.map((e) => e.placeholder))
console.log('inputs:', inputs)
await page.locator('input').first().fill('sub_dfac9746ad2c')
const buttons = await page.locator('button').allInnerTexts()
console.log('buttons:', JSON.stringify(buttons))
await page.screenshot({ path: '.shots/agent-studio/debug-test.png', fullPage: true })
console.log('--- BODY ---')
console.log((await page.locator('body').innerText()).slice(0, 2200))
await browser.close()
