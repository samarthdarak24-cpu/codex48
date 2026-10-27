import { chromium } from 'playwright-core'
import fs from 'fs'

const EXE = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe',
].find((p) => fs.existsSync(p))
const BASE = 'http://127.0.0.1:5173'

const browser = await chromium.launch({ executablePath: EXE, headless: true })
const page = await (await browser.newContext()).newPage()
const logs = []
page.on('console', (m) => logs.push(m.type() + ':' + m.text()))
page.on('response', (r) => {
  if (r.url().includes('/auth/')) logs.push(r.url().replace(BASE, '') + ' -> ' + r.status())
})
await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
await page.evaluate(() =>
  sessionStorage.setItem(
    'precedent.session',
    JSON.stringify({
      token: 'stale.invalid.token',
      user: { id: 'u_stale', name: 'x', email: 'x@x', role: 'creator', workspace: 'PureGlow' },
    }),
  ),
)
await page.goto(BASE + '/app/overview', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3500)
console.log('url =', page.url())
console.log('emailField =', await page.locator('#email').count())
console.log('session =', await page.evaluate(() => sessionStorage.getItem('precedent.session')))
console.log('body =', (await page.textContent('body')).slice(0, 180).replace(/\s+/g, ' '))
console.log('logs =', logs.join(' | '))
await browser.close()
