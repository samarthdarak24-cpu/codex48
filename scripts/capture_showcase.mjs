import { chromium } from 'playwright'

const EXE = 'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe'
const BASE = 'http://127.0.0.1:5173'

async function capture() {
  const browser = await chromium.launch({ executablePath: EXE, headless: true })

  // 1. Capture Manager Overview
  const ctxManager = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const pageManager = await ctxManager.newPage()
  await pageManager.goto(BASE + '/login', { waitUntil: 'networkidle' })

  // Fill manager credentials
  await pageManager.fill('input[type="email"]', 'david.kim@pureglow.co')
  await pageManager.fill('input[type="password"]', 'precedent')
  await pageManager.click('button:has-text("Sign in")')
  await pageManager.waitForURL('**/manager/**', { timeout: 10000 })
  // wait for any loading spinner to vanish
  await pageManager.waitForSelector('text=Loading workspace', { state: 'detached', timeout: 8000 }).catch(() => {})
  await pageManager.waitForTimeout(1500)
  await pageManager.screenshot({ path: 'public/images/platform/manager-overview-live.png' })
  console.log('[OK] Captured public/images/platform/manager-overview-live.png')

  // 2. Capture Creator Dashboard
  const ctxCreator = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const pageCreator = await ctxCreator.newPage()
  await pageCreator.goto(BASE + '/login', { waitUntil: 'networkidle' })

  // Fill creator credentials
  await pageCreator.fill('input[type="email"]', 'emily.carter@pureglow.co')
  await pageCreator.fill('input[type="password"]', 'precedent')
  await pageCreator.click('button:has-text("Sign in")')
  await pageCreator.waitForURL('**/creator/**', { timeout: 10000 })
  await pageCreator.waitForSelector('text=Loading workspace', { state: 'detached', timeout: 8000 }).catch(() => {})
  await pageCreator.waitForTimeout(1500)
  await pageCreator.screenshot({ path: 'public/images/platform/creator-dashboard-live.png' })
  console.log('[OK] Captured public/images/platform/creator-dashboard-live.png')

  await browser.close()
  console.log('Done capturing live dashboards!')
}

capture().catch(console.error)
