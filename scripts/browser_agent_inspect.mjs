import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('docs/browser_agent_audit');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const BASE_URL = 'http://127.0.0.1:5173';

async function runBrowserAgent() {
  console.log('🤖 Launching Chromium Browser Agent...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const auditLog = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!txt.includes('favicon') && !txt.includes('ERR_CONNECTION_REFUSED')) {
        console.error('Browser Console Error:', txt);
        auditLog.push({ type: 'CONSOLE_ERROR', message: txt });
      }
    }
  });

  page.on('pageerror', err => {
    console.error('Browser Uncaught Page Error:', err.message);
    auditLog.push({ type: 'PAGE_ERROR', message: err.message });
  });

  // 1. Check Login Page
  console.log('Visiting Login Page...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '00_login.png') });
  console.log('✓ Captured Login view');

  // 2. Login as Creator
  console.log('Authenticating as Content Creator...');
  await page.fill('input[type="email"]', 'emily.carter@pureglow.co');
  await page.fill('input[type="password"]', 'precedent');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/creator/dashboard', { timeout: 10000 });
  await page.waitForTimeout(1000);
  console.log('✓ Creator authenticated');

  // Creator Dashboard
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_creator_dashboard.png') });
  console.log('✓ Captured Creator Dashboard');

  // Creator New Content
  await page.goto(`${BASE_URL}/creator/new-content`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_creator_new_content.png') });
  console.log('✓ Captured New Content view');

  // Creator My Submissions
  await page.goto(`${BASE_URL}/creator/my-submissions`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_creator_my_submissions.png') });
  console.log('✓ Captured My Submissions view');

  // Creator AI Review
  await page.goto(`${BASE_URL}/creator/ai-review`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_creator_ai_review.png') });
  console.log('✓ Captured AI Review view');

  // Creator Guidelines & Drawer
  await page.goto(`${BASE_URL}/creator/guidelines`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  // Click first guideline card to verify drawer
  const firstGuide = page.locator('.cursor-pointer').first();
  if (await firstGuide.count() > 0) {
    await firstGuide.click();
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_creator_guidelines_drawer.png') });
  console.log('✓ Captured Creator Guidelines with active detail drawer');

  // Creator Exception Requests
  await page.goto(`${BASE_URL}/creator/exceptions`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_creator_exceptions.png') });
  console.log('✓ Captured Creator Exception Requests');

  // Creator Sentinel Tasks
  await page.goto(`${BASE_URL}/creator/sentinel-tasks`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_creator_sentinel_tasks.png') });
  console.log('✓ Captured Creator Sentinel Tasks');

  // 3. Switch to Brand Manager
  console.log('Authenticating as Brand Manager in fresh browser context...');
  const managerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const managerPage = await managerContext.newPage();
  managerPage.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!txt.includes('favicon') && !txt.includes('ERR_CONNECTION_REFUSED')) {
        auditLog.push({ type: 'CONSOLE_ERROR', message: txt });
      }
    }
  });

  await managerPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await managerPage.fill('input[type="email"]', 'david.kim@pureglow.co');
  await managerPage.fill('input[type="password"]', 'precedent');
  await managerPage.click('button[type="submit"]');
  await managerPage.waitForURL('**/manager/overview', { timeout: 10000 });
  await managerPage.waitForTimeout(1000);
  console.log('✓ Brand Manager authenticated');

  // Manager Overview
  await managerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '08_manager_overview.png') });
  console.log('✓ Captured Manager Overview');

  // Manager Review Queue & AI Compare Modal
  await managerPage.goto(`${BASE_URL}/manager/review-queue`, { waitUntil: 'networkidle' });
  await managerPage.waitForTimeout(500);
  await managerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '09_manager_review_queue.png') });
  console.log('✓ Captured Manager Review Queue');

  // Open Compare Modal
  const compareBtn = managerPage.locator('button:has-text("Compare")').first();
  if (await compareBtn.count() > 0) {
    await compareBtn.click();
    await managerPage.waitForTimeout(500);
    await managerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '10_manager_compare_modal.png') });
    console.log('✓ Captured AI Compare Modal');
    const closeBtn = managerPage.locator('button:has-text("Done Inspecting"), button:has-text("Close")').first();
    if (await closeBtn.count() > 0) await closeBtn.click();
    await managerPage.waitForTimeout(300);
  }

  // Manager Brand Guidelines
  await managerPage.goto(`${BASE_URL}/manager/guidelines`, { waitUntil: 'networkidle' });
  await managerPage.waitForTimeout(500);
  await managerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '11_manager_brand_guidelines.png') });
  console.log('✓ Captured Brand Guidelines view');

  // Manager Rules & Conflicts
  await managerPage.goto(`${BASE_URL}/manager/rules-conflicts`, { waitUntil: 'networkidle' });
  await managerPage.waitForTimeout(500);
  await managerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '12_manager_rules_conflicts.png') });
  console.log('✓ Captured Rules & Conflicts view');

  // Manager Rule Impact Sandbox
  await managerPage.goto(`${BASE_URL}/manager/rule-sandbox`, { waitUntil: 'networkidle' });
  await managerPage.waitForTimeout(500);
  // Trigger simulation
  const runSimBtn = managerPage.locator('button:has-text("Run Simulation"), button:has-text("Simulate Rule Impact")').first();
  if (await runSimBtn.count() > 0 && await runSimBtn.isEnabled()) {
    await runSimBtn.click();
    await managerPage.waitForTimeout(1000);
  }
  await managerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '13_manager_rule_sandbox.png') });
  console.log('✓ Captured Rule Impact Sandbox with live simulation');

  // Manager Sentinel Monitoring
  await managerPage.goto(`${BASE_URL}/manager/sentinel`, { waitUntil: 'networkidle' });
  await managerPage.waitForTimeout(500);
  await managerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '14_manager_sentinel_monitoring.png') });
  console.log('✓ Captured Sentinel Monitoring view');

  await browser.close();
  console.log('\n=======================================');
  console.log('🎉 Browser Agent Inspection Completed!');
  console.log(`Total Errors Logged: ${auditLog.length}`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log('=======================================');

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'audit_report.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), errors: auditLog }, null, 2)
  );
}

runBrowserAgent().catch(err => {
  console.error('Browser Agent Failed:', err);
  process.exit(1);
});
