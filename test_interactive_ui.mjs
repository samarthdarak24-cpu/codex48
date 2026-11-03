import { chromium } from 'playwright-core'

const EXE = 'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe'
const BASE = 'http://127.0.0.1:5173'

async function runInteractiveTests() {
  const browser = await chromium.launch({ executablePath: EXE, headless: true })
  const report = []

  // 1. Creator Interactive Test
  console.log('Testing Creator UI interactions...')
  const creatorCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const creatorPage = await creatorCtx.newPage()
  let creatorErrors = []
  creatorPage.on('console', (m) => { if (m.type() === 'error') creatorErrors.push(m.text()) })
  creatorPage.on('pageerror', (e) => creatorErrors.push(e.message))

  await creatorPage.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
  await creatorPage.fill('#email', 'emily.carter@pureglow.co')
  await creatorPage.fill('#password', 'precedent')
  await creatorPage.click('button[type="submit"]')
  await creatorPage.waitForURL(/\/creator\//, { timeout: 15000 })

  // Creator Dashboard
  await creatorPage.goto(BASE + '/creator/dashboard', { waitUntil: 'domcontentloaded' })
  await creatorPage.waitForTimeout(1000)
  report.push({ page: 'Creator Dashboard', status: 'PASS', errors: [...creatorErrors] })

  // Creator New Content
  creatorErrors = []
  await creatorPage.goto(BASE + '/creator/new-content', { waitUntil: 'domcontentloaded' })
  await creatorPage.waitForTimeout(1000)
  const hasSubmitBtn = await creatorPage.locator('button:has-text("Submit for Review"), button:has-text("Submit for Manager Approval")').count() > 0
  report.push({ page: 'New Content', status: hasSubmitBtn ? 'PASS' : 'WARN', errors: [...creatorErrors] })

  // Creator My Submissions
  creatorErrors = []
  await creatorPage.goto(BASE + '/creator/submissions', { waitUntil: 'domcontentloaded' })
  await creatorPage.waitForTimeout(1000)
  const hasCards = await creatorPage.locator('div[class*="cursor-pointer"]').count() > 0
  report.push({ page: 'My Submissions', status: hasCards ? 'PASS' : 'WARN', errors: [...creatorErrors] })

  // Creator AI Review
  creatorErrors = []
  await creatorPage.goto(BASE + '/creator/ai-review', { waitUntil: 'domcontentloaded' })
  await creatorPage.waitForTimeout(1000)
  report.push({ page: 'AI Review', status: 'PASS', errors: [...creatorErrors] })

  // Creator Guidelines
  creatorErrors = []
  await creatorPage.goto(BASE + '/creator/guidelines', { waitUntil: 'domcontentloaded' })
  await creatorPage.waitForTimeout(1000)
  report.push({ page: 'Creator Guidelines', status: 'PASS', errors: [...creatorErrors] })

  // Creator Exception Requests
  creatorErrors = []
  await creatorPage.goto(BASE + '/creator/exceptions', { waitUntil: 'domcontentloaded' })
  await creatorPage.waitForTimeout(1000)
  // Test opening new exception modal
  const openReqBtn = creatorPage.locator('button:has-text("Request Exception")').first()
  if (await openReqBtn.isVisible().catch(() => false)) {
    await openReqBtn.click()
    await creatorPage.waitForTimeout(500)
    const cancelBtn = creatorPage.locator('div.fixed.inset-0 button:has-text("Cancel")').first()
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click()
      await creatorPage.waitForTimeout(500)
    }
  }
  report.push({ page: 'Creator Exception Requests', status: 'PASS', errors: [...creatorErrors] })

  // Creator Tasks
  creatorErrors = []
  await creatorPage.goto(BASE + '/creator/tasks', { waitUntil: 'domcontentloaded' })
  await creatorPage.waitForTimeout(1000)
  report.push({ page: 'Creator Sentinel Tasks', status: 'PASS', errors: [...creatorErrors] })

  // Creator Notifications
  creatorErrors = []
  await creatorPage.goto(BASE + '/creator/notifications', { waitUntil: 'domcontentloaded' })
  await creatorPage.waitForTimeout(1000)
  const markAllBtn = creatorPage.locator('button:has-text("Mark all read"), button:has-text("Mark All Read")').first()
  if (await markAllBtn.isVisible().catch(() => false)) {
    await markAllBtn.click()
  }
  report.push({ page: 'Creator Notifications', status: 'PASS', errors: [...creatorErrors] })

  // Creator Approved
  creatorErrors = []
  await creatorPage.goto(BASE + '/creator/approved', { waitUntil: 'domcontentloaded' })
  await creatorPage.waitForTimeout(1000)
  report.push({ page: 'Creator Approved Content', status: 'PASS', errors: [...creatorErrors] })

  // Creator Profile
  creatorErrors = []
  await creatorPage.goto(BASE + '/creator/profile', { waitUntil: 'domcontentloaded' })
  await creatorPage.waitForTimeout(1000)
  // Test opening Edit Profile modal
  const editProfileBtn = creatorPage.locator('button:has-text("Edit Profile")').first()
  if (await editProfileBtn.isVisible().catch(() => false)) {
    await editProfileBtn.click()
    await creatorPage.waitForTimeout(500)
    const cancelEditBtn = creatorPage.locator('div.fixed.inset-0 button:has-text("Cancel")').first()
    if (await cancelEditBtn.isVisible().catch(() => false)) {
      await cancelEditBtn.click()
      await creatorPage.waitForTimeout(500)
    }
  }
  report.push({ page: 'Creator Profile', status: 'PASS', errors: [...creatorErrors] })
  await creatorCtx.close()

  // 2. Manager Interactive Test
  console.log('Testing Manager UI interactions...')
  const managerCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const managerPage = await managerCtx.newPage()
  let managerErrors = []
  managerPage.on('console', (m) => { if (m.type() === 'error') managerErrors.push(m.text()) })
  managerPage.on('pageerror', (e) => managerErrors.push(e.message))

  await managerPage.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
  await managerPage.fill('#email', 'david.kim@pureglow.co')
  await managerPage.fill('#password', 'precedent')
  await managerPage.click('button[type="submit"]')
  await managerPage.waitForURL(/\/manager\//, { timeout: 15000 })

  // Manager Overview
  managerErrors = []
  await managerPage.goto(BASE + '/manager/overview', { waitUntil: 'domcontentloaded' })
  await managerPage.waitForTimeout(1000)
  report.push({ page: 'Manager Overview', status: 'PASS', errors: [...managerErrors] })

  // Manager Review Queue
  managerErrors = []
  await managerPage.goto(BASE + '/manager/review-queue', { waitUntil: 'domcontentloaded' })
  await managerPage.waitForTimeout(1000)
  // Click first submission card if available
  const card = managerPage.locator('div[class*="cursor-pointer"]').first()
  if (await card.isVisible().catch(() => false)) {
    await card.click()
    await managerPage.waitForTimeout(500)
  }
  report.push({ page: 'Review Queue', status: 'PASS', errors: [...managerErrors] })

  // Manager All Submissions
  managerErrors = []
  await managerPage.goto(BASE + '/manager/all-submissions', { waitUntil: 'domcontentloaded' })
  await managerPage.waitForTimeout(1000)
  report.push({ page: 'All Submissions', status: 'PASS', errors: [...managerErrors] })

  // Manager Brand Guidelines
  managerErrors = []
  await managerPage.goto(BASE + '/manager/brand-guidelines', { waitUntil: 'domcontentloaded' })
  await managerPage.waitForTimeout(1000)
  // Test opening Upload Document modal
  const uploadDocBtn = managerPage.locator('button:has-text("Upload Document")').first()
  if (await uploadDocBtn.isVisible().catch(() => false)) {
    await uploadDocBtn.click()
    await managerPage.waitForTimeout(500)
    const cancelModal = managerPage.locator('div.fixed.inset-0 button:has-text("Cancel")').first()
    if (await cancelModal.isVisible().catch(() => false)) {
      await cancelModal.click()
      await managerPage.waitForTimeout(500)
    }
  }
  report.push({ page: 'Brand Guidelines', status: 'PASS', errors: [...managerErrors] })

  // Manager Rules & Conflicts
  managerErrors = []
  await managerPage.goto(BASE + '/manager/rules-conflicts', { waitUntil: 'domcontentloaded' })
  await managerPage.waitForTimeout(1000)
  // Test opening Create Rule modal
  const createRuleBtn = managerPage.locator('button:has-text("Create Rule")').first()
  if (await createRuleBtn.isVisible().catch(() => false)) {
    await createRuleBtn.click()
    await managerPage.waitForTimeout(500)
    const cancelRuleModal = managerPage.locator('div.fixed.inset-0 button:has-text("Cancel")').first()
    if (await cancelRuleModal.isVisible().catch(() => false)) {
      await cancelRuleModal.click()
      await managerPage.waitForTimeout(500)
    }
  }
  report.push({ page: 'Rules & Conflicts', status: 'PASS', errors: [...managerErrors] })

  // Manager Exceptions
  managerErrors = []
  await managerPage.goto(BASE + '/manager/exceptions', { waitUntil: 'domcontentloaded' })
  await managerPage.waitForTimeout(1000)
  report.push({ page: 'Exceptions Manager', status: 'PASS', errors: [...managerErrors] })

  // Manager Rule Impact Sandbox
  managerErrors = []
  await managerPage.goto(BASE + '/manager/rule-impact-sandbox', { waitUntil: 'domcontentloaded' })
  await managerPage.waitForTimeout(1000)
  report.push({ page: 'Rule Impact Sandbox', status: 'PASS', errors: [...managerErrors] })

  // Manager Sentinel Monitoring
  managerErrors = []
  await managerPage.goto(BASE + '/manager/sentinel', { waitUntil: 'domcontentloaded' })
  await managerPage.waitForTimeout(1000)
  report.push({ page: 'Sentinel Monitoring', status: 'PASS', errors: [...managerErrors] })

  // Manager Asset Library
  managerErrors = []
  await managerPage.goto(BASE + '/manager/asset-library', { waitUntil: 'domcontentloaded' })
  await managerPage.waitForTimeout(1000)
  report.push({ page: 'Asset Library', status: 'PASS', errors: [...managerErrors] })

  // Manager Analytics
  managerErrors = []
  await managerPage.goto(BASE + '/manager/analytics', { waitUntil: 'domcontentloaded' })
  await managerPage.waitForTimeout(1000)
  report.push({ page: 'Analytics & Health', status: 'PASS', errors: [...managerErrors] })

  // Manager Audit History
  managerErrors = []
  await managerPage.goto(BASE + '/manager/audit-history', { waitUntil: 'domcontentloaded' })
  await managerPage.waitForTimeout(1000)
  report.push({ page: 'Audit History', status: 'PASS', errors: [...managerErrors] })

  await managerCtx.close()
  await browser.close()

  console.log('\n--- INTERACTIVE TEST SUMMARY ---')
  console.table(report)
  const failed = report.filter(r => r.status !== 'PASS' || r.errors.length > 0)
  console.log('Total Tested:', report.length, 'Failed:', failed.length)
}

runInteractiveTests().catch(err => {
  console.error('Test suite failed:', err)
  process.exit(1)
})
