import { chromium } from 'playwright'

const EXE = 'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe'
const BASE = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch({ executablePath: EXE, headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  console.log('Navigating to Home page...')
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.screenshot({ path: '.shots/home_desktop.png' })
  console.log('[OK] Captured .shots/home_desktop.png')

  console.log('Navigating to Login page...')
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.screenshot({ path: '.shots/login_desktop.png' })
  console.log('[OK] Captured .shots/login_desktop.png')

  console.log('Testing demo account click on Login...')
  const emilyBtn = page.locator('text=Emily Carter')
  if (await emilyBtn.count() > 0) {
    await emilyBtn.first().click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: '.shots/login_filled.png' })
    console.log('[OK] Captured .shots/login_filled.png with filled demo credentials')
  }

  await browser.close()
  console.log('Visual audit complete!')
}

main().catch(console.error)
