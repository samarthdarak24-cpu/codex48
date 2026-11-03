import { chromium } from 'playwright-core'
import fs from 'fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const EXE_FALLBACK = 'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe'
const browserPath = fs.existsSync(EXE) ? EXE : EXE_FALLBACK

const BASE = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch({ executablePath: browserPath, headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  console.log('Navigating to Home page...')
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })

  // Scroll to Features
  const features = page.locator('#features')
  if (await features.count() > 0) {
    await features.scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)
    await page.screenshot({ path: '.shots/home_features_fixed.png' })
    console.log('[OK] Captured .shots/home_features_fixed.png')
  }

  // Scroll to Solution (Innovations)
  const solution = page.locator('#solution')
  if (await solution.count() > 0) {
    await solution.scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)
    await page.screenshot({ path: '.shots/home_innovations_fixed.png' })
    console.log('[OK] Captured .shots/home_innovations_fixed.png')
  }

  // Navigate to Login
  console.log('Navigating to Login page...')
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: '.shots/login_with_image.png' })
  console.log('[OK] Captured .shots/login_with_image.png')

  await browser.close()
  console.log('Capture script finished successfully!')
}

main().catch(console.error)
