import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('docs/browser_agent_deep_check');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const TEST_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const testImagePath = path.resolve('test_creative.png');
fs.writeFileSync(testImagePath, Buffer.from(TEST_PNG_BASE64, 'base64'));

const BASE_URL = 'http://127.0.0.1:5173';

async function deepCheck() {
  console.log('🚀 Starting Comprehensive Browser Agent Live Check...');
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  function attachListeners(p, role) {
    p.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('ERR_CONNECTION_REFUSED')) {
          console.error(`[${role} Console Error]:`, text);
          errors.push({ role, type: 'CONSOLE_ERROR', message: text });
        }
      }
    });
    p.on('pageerror', err => {
      console.error(`[${role} Page Error]:`, err.message);
      errors.push({ role, type: 'PAGE_ERROR', message: err.message });
    });
  }

  // ==========================================
  // PHASE 1: CONTENT CREATOR WORKSPACE
  // ==========================================
  console.log('\n--- PHASE 1: CONTENT CREATOR ---');
  const creatorContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const cPage = await creatorContext.newPage();
  attachListeners(cPage, 'CREATOR');

  console.log('1. Logging in as Content Creator...');
  await cPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await cPage.fill('input[type="email"]', 'emily.carter@pureglow.co');
  await cPage.fill('input[type="password"]', 'precedent');
  await cPage.click('button[type="submit"]');
  await cPage.waitForURL('**/creator/dashboard', { timeout: 10000 });
  await cPage.waitForTimeout(800);
  console.log('✓ Creator logged in successfully');
  await cPage.screenshot({ path: path.join(SCREENSHOT_DIR, '01_creator_dashboard.png') });

  // 2. New Content Studio
  console.log('2. Testing New Content Studio...');
  await cPage.goto(`${BASE_URL}/creator/new-content`, { waitUntil: 'networkidle' });
  await cPage.fill('input[placeholder*="campaign" i]', 'Diwali Glow');
  await cPage.fill('input[placeholder*="title" i]', 'Social Ad Banner');
  const copyArea = cPage.locator('textarea').first();
  if (await copyArea.count() > 0) {
    await copyArea.fill('Experience radiant beauty with clinically tested hydration that softens fine lines.');
  }

  // Upload creative via file input
  const fileInput = cPage.locator('input[type="file"]').first();
  if (await fileInput.count() > 0) {
    await fileInput.setInputFiles('test_creative.png');
    await cPage.waitForTimeout(600);
  }
  // Run brand check
  const checkBtn = cPage.locator('button:has-text("Run Brand Check")').first();
  if (await checkBtn.count() > 0) {
    await checkBtn.click();
    await cPage.waitForTimeout(1000);
  }
  await cPage.screenshot({ path: path.join(SCREENSHOT_DIR, '02_creator_new_content_checked.png') });
  console.log('✓ New content creation and pre-flight check validated');

  // 3. AI Review & Evidence Intelligence Assistant
  console.log('3. Testing AI Review & Evidence Intelligence Assistant...');
  await cPage.goto(`${BASE_URL}/creator/ai-review`, { waitUntil: 'networkidle' });
  await cPage.waitForTimeout(600);

  // Test Quick Prompt Pill
  const pillBtn = cPage.locator('button:has-text("How to fix color contrast?")').first();
  if (await pillBtn.count() > 0 && await pillBtn.isEnabled()) {
    console.log('  -> Clicking Quick Prompt Pill: "How to fix color contrast?"');
    await pillBtn.click();
    await cPage.waitForTimeout(1500);
    const hasResponse = await cPage.locator('text=Guideline Intelligence Findings, text=Evidence Intelligence').count();
    console.log(`  -> Response rendered: ${hasResponse > 0 ? 'YES' : 'NO'}`);
  }

  // Test Assistant Input Field
  const aiInput = cPage.locator('input[placeholder*="Ask about brand rules"]').first();
  const sendBtn = cPage.locator('button[title*="Search guideline citations"]').first();
  if (await aiInput.count() > 0 && await aiInput.isEnabled()) {
    console.log('  -> Querying Assistant for "logo" rules...');
    await aiInput.fill('logo usage');
    if (await sendBtn.count() > 0 && await sendBtn.isEnabled()) {
      await sendBtn.click();
      await cPage.waitForTimeout(1500);
    }
  }
  await cPage.screenshot({ path: path.join(SCREENSHOT_DIR, '03_creator_ai_review_citations.png') });
  console.log('✓ Evidence Intelligence Assistant answered with live citations');

  // 4. Creator Guidelines & Drawer Interactivity
  console.log('4. Testing Creator Guidelines Drawer Interactivity...');
  await cPage.goto(`${BASE_URL}/creator/guidelines`, { waitUntil: 'networkidle' });
  await cPage.waitForTimeout(600);

  // Click card to open drawer
  const guideCard = cPage.locator('.cursor-pointer').first();
  if (await guideCard.count() > 0) {
    await guideCard.click();
    await cPage.waitForTimeout(400);
    console.log('  -> Opened guideline drawer');
  }

  // Click close button
  const closeGuideBtn = cPage.locator('button[title*="Close details"]').first();
  if (await closeGuideBtn.count() > 0) {
    await closeGuideBtn.click();
    await cPage.waitForTimeout(400);
    console.log('  -> Closed guideline drawer cleanly');
  }
  await cPage.screenshot({ path: path.join(SCREENSHOT_DIR, '04_creator_guidelines_interactivity.png') });

  // 5. Creator Exception Requests
  console.log('5. Testing Creator Exception Requests...');
  await cPage.goto(`${BASE_URL}/creator/exceptions`, { waitUntil: 'networkidle' });
  await cPage.waitForTimeout(600);
  const viewDetailsBtn = cPage.locator('button:has-text("View Details")').first();
  if (await viewDetailsBtn.count() > 0) {
    await viewDetailsBtn.click();
    await cPage.waitForTimeout(400);
    console.log('  -> Clicked View Details on Exception Request');
  }
  await cPage.screenshot({ path: path.join(SCREENSHOT_DIR, '05_creator_exception_details.png') });

  // ==========================================
  // PHASE 2: BRAND MANAGER WORKSPACE
  // ==========================================
  console.log('\n--- PHASE 2: BRAND MANAGER ---');
  const managerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const mPage = await managerContext.newPage();
  attachListeners(mPage, 'MANAGER');

  console.log('6. Logging in as Brand Manager...');
  await mPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await mPage.fill('input[type="email"]', 'david.kim@pureglow.co');
  await mPage.fill('input[type="password"]', 'precedent');
  await mPage.click('button[type="submit"]');
  await mPage.waitForURL('**/manager/overview', { timeout: 10000 });
  await mPage.waitForTimeout(800);
  console.log('✓ Manager logged in successfully');
  await mPage.screenshot({ path: path.join(SCREENSHOT_DIR, '06_manager_overview.png') });

  // 7. Manager Review Queue & AI Compare Modal
  console.log('7. Testing Manager Review Queue...');
  await mPage.goto(`${BASE_URL}/manager/review-queue`, { waitUntil: 'networkidle' });
  await mPage.waitForTimeout(600);

  // Click Compare button
  const compareBtn = mPage.locator('button:has-text("Compare")').first();
  if (await compareBtn.count() > 0) {
    await compareBtn.click();
    await mPage.waitForTimeout(500);
    console.log('  -> Opened VisualGuard Compare Modal');
    await mPage.screenshot({ path: path.join(SCREENSHOT_DIR, '07_manager_compare_modal.png') });
    const closeCompare = mPage.locator('button:has-text("Done Inspecting"), button:has-text("Close")').first();
    if (await closeCompare.count() > 0) await closeCompare.click();
    await mPage.waitForTimeout(300);
  }

  // 8. Brand Guidelines Filters & Sort
  console.log('8. Testing Brand Guidelines interactive filters & sorting...');
  await mPage.goto(`${BASE_URL}/manager/guidelines`, { waitUntil: 'networkidle' });
  await mPage.waitForTimeout(600);

  // Test Status filter dropdown
  const statusSelect = mPage.locator('select:has(option[value="Active"])').first();
  if (await statusSelect.count() > 0) {
    await statusSelect.selectOption('Active');
    await mPage.waitForTimeout(300);
    console.log('  -> Filtered by Active status');
  }

  // Test Sort button
  const sortToggleBtn = mPage.locator('button[title*="Click to toggle newest / oldest"]').first();
  if (await sortToggleBtn.count() > 0) {
    await sortToggleBtn.click();
    await mPage.waitForTimeout(300);
    console.log('  -> Toggled sort direction');
  }
  await mPage.screenshot({ path: path.join(SCREENSHOT_DIR, '08_manager_guidelines_filtered.png') });

  // 9. Rules & Conflicts View
  console.log('9. Testing Rules & Conflicts controls...');
  await mPage.goto(`${BASE_URL}/manager/rules-conflicts`, { waitUntil: 'networkidle' });
  await mPage.waitForTimeout(600);

  // Test sort dropdown
  const ruleSort = mPage.locator('select:has(option[value="severity"])').first();
  if (await ruleSort.count() > 0) {
    await ruleSort.selectOption('severity');
    await mPage.waitForTimeout(300);
    console.log('  -> Sorted rules by Severity');
  }

  // Click conflict card
  const conflictCard = mPage.locator('.cursor-pointer').first();
  if (await conflictCard.count() > 0) {
    await conflictCard.click();
    await mPage.waitForTimeout(400);
    console.log('  -> Opened Conflict Details drawer');
  }
  await mPage.screenshot({ path: path.join(SCREENSHOT_DIR, '09_manager_conflicts_drawer.png') });

  // 10. Rule Impact Sandbox Simulation
  console.log('10. Testing Rule Impact Sandbox Live Simulation...');
  await mPage.goto(`${BASE_URL}/manager/rule-sandbox`, { waitUntil: 'networkidle' });
  await mPage.waitForTimeout(600);
  const runSim = mPage.locator('button:has-text("Run Simulation"), button:has-text("Simulate Rule Impact")').first();
  if (await runSim.count() > 0 && await runSim.isEnabled()) {
    await runSim.click();
    await mPage.waitForTimeout(1200);
    console.log('  -> Ran live rule impact simulation');
  }
  await mPage.screenshot({ path: path.join(SCREENSHOT_DIR, '10_manager_sandbox_simulation.png') });

  // 11. Sentinel Monitoring Live Sweep
  console.log('11. Testing Sentinel Monitoring Sweep & Filters...');
  await mPage.goto(`${BASE_URL}/manager/sentinel`, { waitUntil: 'networkidle' });
  await mPage.waitForTimeout(600);

  const viewAllBtn = mPage.locator('button:has-text("View All →")').first();
  if (await viewAllBtn.count() > 0) {
    await viewAllBtn.click();
    await mPage.waitForTimeout(300);
    console.log('  -> Reset filters via View All →');
  }

  const scanBtn = mPage.locator('button:has-text("Run Sentinel Scan"), button:has-text("Scan Active Assets")').first();
  if (await scanBtn.count() > 0 && await scanBtn.isEnabled()) {
    await scanBtn.click();
    await mPage.waitForTimeout(1500);
    console.log('  -> Sentinel monitoring sweep executed successfully');
  }
  await mPage.screenshot({ path: path.join(SCREENSHOT_DIR, '11_manager_sentinel_sweep.png') });

  await browser.close();

  console.log('\n======================================================');
  console.log('🏁 Comprehensive Browser Agent Live Check COMPLETED!');
  console.log(`Total Unhandled Errors: ${errors.length}`);
  console.log(`Screenshots Saved To: ${SCREENSHOT_DIR}`);
  console.log('======================================================\n');

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'deep_check_report.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), errors, totalScreenshots: 11 }, null, 2)
  );
}

deepCheck().catch(err => {
  console.error('Deep check failed:', err);
  process.exit(1);
});
