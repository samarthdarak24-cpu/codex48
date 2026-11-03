import { chromium } from 'playwright'

const EXE = 'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe'
const BASE = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch({ executablePath: EXE, headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  console.log('Navigating to Home page...')
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.screenshot({ path: '.shots/clean_home_hero.png' })
  console.log('[OK] Captured .shots/clean_home_hero.png')

  // Innovations
  const innovations = page.locator('#innovations')
  if (await innovations.count() > 0) {
    await innovations.scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    await page.screenshot({ path: '.shots/clean_home_innovations.png' })
    console.log('[OK] Captured .shots/clean_home_innovations.png')
  }

  // Features
  const features = page.locator('#features')
  if (await features.count() > 0) {
    await features.scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    await page.screenshot({ path: '.shots/clean_home_features.png' })
    console.log('[OK] Captured .shots/clean_home_features.png')
  }

  // Architecture
  const arch = page.locator('#architecture')
  if (await arch.count() > 0) {
    await arch.scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    await page.screenshot({ path: '.shots/clean_home_architecture.png' })
    console.log('[OK] Captured .shots/clean_home_architecture.png')
  }

  // Team
  const team = page.locator('#team')
  if (await team.count() > 0) {
    await team.scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    await page.screenshot({ path: '.shots/clean_home_team.png' })
    console.log('[OK] Captured .shots/clean_home_team.png')
  }

  // Login page
  console.log('Navigating to Login page...')
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.screenshot({ path: '.shots/clean_login_page.png' })
  console.log('[OK] Captured .shots/clean_login_page.png')

  await browser.close()
  console.log('Visual audit complete!')
}

main().catch(console.error)
