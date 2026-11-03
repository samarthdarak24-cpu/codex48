import { chromium } from 'playwright'

const EXE = 'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe'
const BASE = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch({ executablePath: EXE, headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  // 1. Login as manager
  console.log('Logging in as manager...')
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.fill('#email', 'david.kim@pureglow.co')
  await page.fill('#password', 'precedent')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/manager\//, { timeout: 15000 })
  console.log('[OK] Logged in as manager')

  // Wait for overview to fully load
  await page.waitForSelector('text=Loading Workspace', { state: 'detached', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'public/images/platform/manager-overview.png' })
  console.log('[OK] Saved manager-overview.png')

  // Go to Sandbox
  console.log('Navigating to Sandbox...')
  await page.goto(BASE + '/manager/rule-impact-sandbox', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Loading Workspace', { state: 'detached', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'public/images/platform/sandbox-ui.png' })
  console.log('[OK] Saved sandbox-ui.png (fully loaded)')

  // Go to Rules & Conflicts
  console.log('Navigating to Rules & Conflicts...')
  await page.goto(BASE + '/manager/rules-conflicts', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Loading Workspace', { state: 'detached', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'public/images/platform/rules-ui.png' })
  console.log('[OK] Saved rules-ui.png (fully loaded)')

  // Go to Review Queue
  console.log('Navigating to Review Queue...')
  await page.goto(BASE + '/manager/review-queue', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Loading Workspace', { state: 'detached', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'public/images/platform/queue-ui.png' })
  console.log('[OK] Saved queue-ui.png (fully loaded)')

  // 2. Login as creator
  console.log('Navigating to Creator AI Review...')
  await page.goto(BASE + '/creator/ai-review', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Loading Workspace', { state: 'detached', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'public/images/platform/review-ui.png' })
  console.log('[OK] Saved review-ui.png (fully loaded)')

  await browser.close()
  console.log('Capture script finished successfully!')
}

main().catch(console.error)
