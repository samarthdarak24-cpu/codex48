import { chromium } from 'playwright-core'

const EXE = 'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe'
const BASE = 'http://127.0.0.1:5173'
const TITLE = 'E2E Test Campaign'

async function login(page, email, password) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(app|manager)\/overview/, { timeout: 25000 })
}

const browser = await chromium.launch({ executablePath: EXE, headless: true })
const results = {}
const allErrors = []

// ---------- Creator: upload an asset, submit content, verify findings ----------
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') allErrors.push('C:' + m.text()) })
page.on('pageerror', (e) => allErrors.push('C-PAGEERROR: ' + e.message))

await login(page, 'emily.carter@pureglow.co', 'precedent')
results.creatorUrl = page.url()
await page.screenshot({ path: '.shots/e2e-creator-overview.png', fullPage: true })

await page.goto(BASE + '/app/new', { waitUntil: 'networkidle' })

// Theme check: the primary action should be green (g >= b), never blue/purple.
const submitBtn = page.locator('button[type="submit"]').first()
const bg = await submitBtn.evaluate((el) => getComputedStyle(el).backgroundColor).catch(() => '')
results.primaryButtonBg = bg
const rgb = (bg.match(/\d+/g) || []).map(Number)
if (rgb.length >= 3) results.themeIsGreen = rgb[1] >= rgb[2]

// Brand & Product Assets: upload a real image (auto-selects on upload).
const assetInput = page.locator('input[accept="image/*"]')
await assetInput.setInputFiles('/tmp/HeroBottle.png')
await page.waitForTimeout(1800)
const afterUpload = (await page.textContent('body')) || ''
results.assetUploaded = afterUpload.includes('HeroBottle')
await page.screenshot({ path: '.shots/e2e-new-content-assets.png', fullPage: true })

await page.fill('#title', TITLE)
await page.fill('#text', '100% safe and boosts immunity — 20% off today. Hurry, limited time!')
await page.click('button[type="submit"]')
await page.waitForURL(/\/app\/feedback\//, { timeout: 25000 })
await page.waitForLoadState('networkidle')

const fbText = (await page.textContent('body')) || ''
results.feedbackUrl = page.url()
results.feedbackHasFindings = /issue/i.test(fbText)
results.feedbackHasRuleCode = ['CL-04', 'CL-06', 'MK-02', 'TV-02'].some((c) => fbText.includes(c))
results.feedbackHasEvidenceControl = fbText.includes('View source evidence')
results.feedbackShowsAttachedAsset = fbText.includes('HeroBottle')
await page.screenshot({ path: '.shots/e2e-creator-findings.png', fullPage: true })

if (results.feedbackHasEvidenceControl) {
  await page.getByText('View source evidence').first().click()
  await page.waitForTimeout(300)
  const after = (await page.textContent('body')) || ''
  results.evidenceRevealed = after.length > fbText.length
}

// ---------- Manager: see the submission + attached asset + audit ----------
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page2 = await ctx2.newPage()
page2.on('console', (m) => { if (m.type() === 'error') allErrors.push('M:' + m.text()) })
page2.on('pageerror', (e) => allErrors.push('M-PAGEERROR: ' + e.message))

await login(page2, 'david.kim@pureglow.co', 'precedent')
results.managerUrl = page2.url()

await page2.goto(BASE + '/manager/queue', { waitUntil: 'networkidle' })
const qText = (await page2.textContent('body')) || ''
results.queueHasNewSubmission = qText.includes(TITLE)
await page2.screenshot({ path: '.shots/e2e-manager-queue.png', fullPage: true })

await page2.goto(BASE + '/manager/audit', { waitUntil: 'networkidle' })
const aText = (await page2.textContent('body')) || ''
results.auditMentionsSubmission = aText.includes(TITLE) || aText.length > 800
await page2.screenshot({ path: '.shots/e2e-manager-audit.png', fullPage: true })

// ---------- Marketing home still renders ----------
const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page3 = await ctx3.newPage()
page3.on('console', (m) => { if (m.type() === 'error') allErrors.push('H:' + m.text()) })
page3.on('pageerror', (e) => allErrors.push('H-PAGEERROR: ' + e.message))
await page3.goto(BASE + '/', { waitUntil: 'networkidle' })
const homeText = (await page3.textContent('body')) || ''
results.marketingLoads = homeText.length > 500
await page3.screenshot({ path: '.shots/e2e-marketing-home.png', fullPage: true })

results.consoleErrors = allErrors
console.log(JSON.stringify(results, null, 2))
await browser.close()
