import { chromium } from 'playwright'

const EXE = 'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe'
const BASE = 'http://127.0.0.1:5173'

async function capture() {
  const browser = await chromium.launch({ executablePath: EXE, headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', 'david.kim@pureglow.co')
  await page.fill('input[type="password"]', 'precedent')
  await page.click('button:has-text("Sign In"), button:has-text("Sign in")')
  await page.waitForURL('**/manager/**', { timeout: 10000 })

  // Navigate to audit history
  await page.goto(BASE + '/manager/audit-history', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=Loading workspace', { state: 'detached', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(2000)

  await page.screenshot({ path: 'public/images/platform/manager-audit-live.png' })
  console.log('[OK] Captured public/images/platform/manager-audit-live.png')

  await browser.close()
}

capture().catch(console.error)
