import { chromium } from 'playwright'

const EXE = 'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe'
const BASE = 'http://127.0.0.1:5173'

async function run() {
  const browser = await chromium.launch({ executablePath: EXE, headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  console.log('Navigating to http://127.0.0.1:5173/ ...')
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })

  // 1. Hero
  await page.screenshot({ path: '.shots/16sec_hero.png' })
  console.log('[OK] .shots/16sec_hero.png')

  // 2. Showcase
  const showcase = page.locator('#showcase')
  if (await showcase.count() > 0) {
    await showcase.scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    await page.screenshot({ path: '.shots/16sec_showcase.png' })
    console.log('[OK] .shots/16sec_showcase.png')
  }

  // 3. Features & How It Works
  const features = page.locator('#features')
  if (await features.count() > 0) {
    await features.scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    await page.screenshot({ path: '.shots/16sec_features.png' })
    console.log('[OK] .shots/16sec_features.png')
  }

  // 4. Pricing & FAQ
  const pricing = page.locator('#pricing')
  if (await pricing.count() > 0) {
    await pricing.scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    await page.screenshot({ path: '.shots/16sec_pricing.png' })
    console.log('[OK] .shots/16sec_pricing.png')
  }

  await browser.close()
  console.log('Audit completed successfully!')
}

run().catch(console.error)
