import { chromium } from 'playwright-core'
import fs from 'fs'
const exes = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']
const EXE = exes.find((p) => fs.existsSync(p)) || exes[0]
const BASE = 'http://127.0.0.1:8000'
const browser = await chromium.launch({ executablePath: EXE, headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
const page = await ctx.newPage()
page.on('console', (m) => console.log('CONSOLE', m.type(), m.text().slice(0, 200)))
page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 300)))

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
console.log('tab count', await tabBtn.count())
await tabBtn.first().click()
await page.waitForTimeout(1200)
console.log('has Test input', await page.getByText('Test input').count())
console.log('has Run test', await page.getByRole('button', { name: 'Run test' }).count())
console.log('all buttons', JSON.stringify((await page.locator('button').allInnerTexts()).slice(0, 30)))
await page.screenshot({ path: '.shots/agent-studio/debug-tab.png', fullPage: true })
console.log('body start:', (await page.locator('body').innerText()).slice(0, 500))
await browser.close()
