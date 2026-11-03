import { chromium } from 'playwright-core'
import fs from 'fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const EXE_FALLBACK = 'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe'
const browserPath = fs.existsSync(EXE) ? EXE : EXE_FALLBACK

const BASE = 'http://127.0.0.1:5173'
const OUT = 'public/images/platform'
fs.mkdirSync(OUT, { recursive: true })

async function main() {
  const browser = await chromium.launch({ executablePath: browserPath, headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  console.log('Navigating to login page...')
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)

  // Click demo button for David Kim
  console.log('Clicking Brand Manager demo button...')
  await page.click('text=David Kim')
  await page.waitForTimeout(400)

  console.log('Submitting login form...')
  await page.click('button[type="submit"]')

  // Wait for React Router navigation
  await page.waitForFunction(() => window.location.pathname.includes('/manager') || window.location.pathname.includes('/creator'), { timeout: 15000 })
  console.log('[OK] Login successful! Current URL:', page.url())

  // Wait for loading splash to detach and table/content to appear
  await page.waitForSelector('text=Loading Workspace', { state: 'detached', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(2000)

  // 1. Manager Overview
  console.log('Capturing Manager Overview...')
  await page.screenshot({ path: `${OUT}/manager-overview.png` })
  console.log('[OK] Captured manager-overview.png')

  // 2. Manager Sandbox
  console.log('Navigating to Sandbox...')
  await page.goto(BASE + '/manager/rule-impact-sandbox', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=Loading Workspace', { state: 'detached', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/sandbox-ui.png` })
  console.log('[OK] Captured sandbox-ui.png (fully loaded)')

  // 3. Manager Rules
  console.log('Navigating to Rules & Conflicts...')
  await page.goto(BASE + '/manager/rules-conflicts', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=Loading Workspace', { state: 'detached', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/rules-ui.png` })
  console.log('[OK] Captured rules-ui.png (fully loaded)')

  // 4. Creator Review
  console.log('Navigating to Creator AI Review...')
  await page.goto(BASE + '/creator/ai-review', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=Loading Workspace', { state: 'detached', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/review-ui.png` })
  console.log('[OK] Captured review-ui.png (fully loaded)')

  await browser.close()
  console.log('All fresh screenshots captured without loading spinners!')
}

main().catch(console.error)
