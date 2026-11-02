/** Refresh Agent Studio screenshots against the tidy demo state. */
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
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: EXE, headless: true })

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('#email', email)
  await page.fill('#password', 'precedent')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(manager|creator)\/(overview|dashboard)/, { timeout: 30000 })
}

const managerCtx = await browser.newContext({ viewport: { width: 1440, height: 960 } })
const page = await managerCtx.newPage()
await login(page, 'david.kim@pureglow.co')

await page.goto(`${BASE}/manager/agent-studio`, { waitUntil: 'domcontentloaded' })
await page.getByRole('heading', { name: 'Agent Studio' }).waitFor({ timeout: 20000 })
await page.waitForTimeout(1000)
await page.screenshot({ path: `${OUT}/01-dashboard.png`, fullPage: true })

await page.getByRole('button', { name: 'Edit' }).first().click()
await page.waitForURL(/\/builder/, { timeout: 20000 })
await page.locator('.react-flow__node').first().waitFor({ timeout: 20000 })
await page.waitForTimeout(1200)
await page.locator('.react-flow__node').nth(1).click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/04-builder.png`, fullPage: false })

await page.goto(page.url().replace('/builder', ''), { waitUntil: 'domcontentloaded' })
await page.getByText('System instructions').waitFor({ timeout: 20000 })
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/06-detail.png`, fullPage: true })

await page.goto(`${BASE}/manager/agent-executions`, { waitUntil: 'domcontentloaded' })
await page.getByRole('heading', { name: 'Agent Executions' }).waitFor({ timeout: 20000 })
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/07-executions.png`, fullPage: true })

const creatorCtx = await browser.newContext({ viewport: { width: 1440, height: 960 } })
const creator = await creatorCtx.newPage()
await login(creator, 'emily.carter@pureglow.co')
await creator.goto(`${BASE}/creator/ai-assistants`, { waitUntil: 'domcontentloaded' })
await creator.getByRole('heading', { name: 'My AI Assistants' }).waitFor({ timeout: 20000 })
await creator.waitForTimeout(900)
await creator.screenshot({ path: `${OUT}/08-creator-assistants.png`, fullPage: true })

await managerCtx.close()
await creatorCtx.close()
await browser.close()
console.log('screenshots refreshed')
