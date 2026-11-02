import { chromium } from 'playwright'

const EXE = 'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe'
const BASE = 'http://127.0.0.1:5173'

async function run() {
  const browser = await chromium.launch({ executablePath: EXE, headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  console.log('Navigating to http://127.0.0.1:5173/ ...')
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForTimeout(2000)

  // 1. Problem Section (comparing with user image 2)
  const problem = page.locator('text=Brand Governance Is Broken for Modern Teams')
  if (await problem.count() > 0) {
    await problem.scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)
    await page.screenshot({ path: '.shots/aesthetic_problem.png' })
    console.log('[OK] .shots/aesthetic_problem.png')
  }

  // 2. How It Works Section
  const how = page.locator('#how-it-works')
  if (await how.count() > 0) {
    await how.scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)
    await page.screenshot({ path: '.shots/aesthetic_how_it_works.png' })
    console.log('[OK] .shots/aesthetic_how_it_works.png')
  }

  // 3. AI Agent Studio (with 3D Orb & Studio screenshots)
  const agent = page.locator('text=AI Agent Studio: Prompt-to-Agent Automation')
  if (await agent.count() > 0) {
    await agent.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: '.shots/aesthetic_agent_studio.png' })
    console.log('[OK] .shots/aesthetic_agent_studio.png')
  }

  // 4. Security Section (comparing with user image 1)
  const security = page.locator('#governance')
  if (await security.count() > 0) {
    await security.scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)
    await page.screenshot({ path: '.shots/aesthetic_security.png' })
    console.log('[OK] .shots/aesthetic_security.png')
  }

  // 5. Who It's For & Success Stories
  const audience = page.locator('text=Who Precedent Is Built For')
  if (await audience.count() > 0) {
    await audience.scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)
    await page.screenshot({ path: '.shots/aesthetic_audience_stories.png' })
    console.log('[OK] .shots/aesthetic_audience_stories.png')
  }

  await browser.close()
  console.log('Aesthetic audit completed!')
}

run().catch(console.error)
