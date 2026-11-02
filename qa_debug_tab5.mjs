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
await page.waitForTimeout(2500)
console.log('detail pages:', await page.locator('h1').filter({ hasText: 'Brand Compliance Reviewer' }).count())
console.log('test input before:', await page.getByText('Test input').count())
await page.locator('button').filter({ hasText: 'Test playground' }).first().click()
await page.waitForTimeout(1200)
console.log('test input after:', await page.getByText('Test input').count())
await page.screenshot({ path: '.shots/agent-studio/debug-wait.png', fullPage: true })
await browser.close()
