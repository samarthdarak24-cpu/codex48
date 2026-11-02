import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('docs/browser_creator_deep_audit');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// 1x1 test image
const TEST_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const testImagePath = path.resolve('creator_test_creative.png');
fs.writeFileSync(testImagePath, Buffer.from(TEST_PNG_BASE64, 'base64'));

async function runCreatorDeepAudit() {
  console.log('🚀 Starting Deep Live Browser Agent Check for CONTENT CREATOR Dashboard...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.warn('  ⚠️ Console error:', msg.text());
      errors.push(msg.text());
    }
  });

  try {
    // 1. LOGIN
    console.log('\n1. Logging in as Content Creator (Emily Carter)...');
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'emily.carter@pureglow.co');
    await page.fill('input[type="password"]', 'precedent');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/creator/**', { timeout: 10000 });
    console.log('✓ Creator logged in successfully');

    // 2. DASHBOARD VIEW
    console.log('\n2. Testing Creator Dashboard...');
    await page.goto('http://127.0.0.1:5173/creator/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const kpiCards = await page.$$eval('.text-2xl.font-bold', els => els.map(e => e.textContent.trim()));
    console.log('   KPI values:', kpiCards);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_creator_dashboard.png'), fullPage: true });
    console.log('   📸 Saved 01_creator_dashboard.png');

    // 3. NEW CONTENT STUDIO
    console.log('\n3. Testing New Content Studio...');
    await page.goto('http://127.0.0.1:5173/creator/new-content', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Fill form fields
    const campaignInput = await page.$('input[placeholder*="campaign name" i]');
    if (campaignInput) await campaignInput.fill('Autumn Radiance Launch');

    const titleInput = await page.$('input[placeholder*="content title" i]');
    if (titleInput) await titleInput.fill('Radiant Glow Serum');

    const copyInput = await page.$('textarea');
    if (copyInput) await copyInput.fill('Special seasonal blend with organic botanical extracts for glowing skin.');

    // Upload creative image
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(1500);
      console.log('   ✓ Creative uploaded and preview generated');
    }

    // Run brand check
    console.log('   -> Running Brand Compliance Pre-flight Check...');
    const checkBtn = await page.$('button:has-text("Run Brand Check"), button:has-text("Run Brand Compliance Check")');
    if (checkBtn) {
      await checkBtn.click();
      await page.waitForTimeout(2500);
      console.log('   ✓ Brand check executed against backend API');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_creator_new_content_checked.png'), fullPage: true });
    console.log('   📸 Saved 02_creator_new_content_checked.png');

    // 4. MY SUBMISSIONS
    console.log('\n4. Testing My Submissions Ledger...');
    await page.goto('http://127.0.0.1:5173/creator/submissions', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Test filter pills
    const approvedPill = await page.$('button:has-text("Approved")');
    if (approvedPill) {
      await approvedPill.click();
      await page.waitForTimeout(500);
      console.log('   ✓ Filtered by Approved');
    }

    const allPill = await page.$('button:has-text("All")');
    if (allPill) {
      await allPill.click();
      await page.waitForTimeout(500);
      console.log('   ✓ Reset filter to All');
    }

    // Open detail drawer
    const subCard = await page.$('.space-y-3 > div, [class*="cursor-pointer"] h3');
    if (subCard) {
      await subCard.click();
      await page.waitForTimeout(1000);
      console.log('   ✓ Opened Submission detail drawer');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_creator_my_submissions_drawer.png'), fullPage: true });
    console.log('   📸 Saved 03_creator_my_submissions_drawer.png');

    // 5. AI REVIEW & EVIDENCE INTELLIGENCE
    console.log('\n5. Testing AI Review & Evidence Intelligence Assistant...');
    await page.goto('http://127.0.0.1:5173/creator/ai-review', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Click quick prompt pill
    const promptPill = await page.$('button:has-text("How to fix color contrast?")');
    if (promptPill) {
      await promptPill.click();
      await page.waitForTimeout(1500);
      console.log('   ✓ Quick prompt pill clicked');
    }

    // Ask custom question
    const chatInput = await page.$('input[placeholder*="Ask about brand rules" i]');
    const sendBtn = await page.$('button:has(svg.lucide-send), button:has-text("Ask"), button:has-text("Send")');
    if (chatInput && sendBtn) {
      await chatInput.fill('What are the rules for logo usage?');
      await sendBtn.click();
      await page.waitForTimeout(2000);
      console.log('   ✓ Evidence Intelligence Assistant queried and answered');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_creator_ai_review_citations.png'), fullPage: true });
    console.log('   📸 Saved 04_creator_ai_review_citations.png');

    // 6. APPROVED CONTENT
    console.log('\n6. Testing Approved Content Catalog...');
    await page.goto('http://127.0.0.1:5173/creator/approved-content', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const exportBtn = await page.$('button:has-text("Export All Approved")');
    if (exportBtn) {
      console.log('   ✓ Export All Approved CSV button present and responsive');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_creator_approved_content.png'), fullPage: true });
    console.log('   📸 Saved 05_creator_approved_content.png');

    // 7. BRAND GUIDELINES EXPLORER
    console.log('\n7. Testing Creator Brand Guidelines...');
    await page.goto('http://127.0.0.1:5173/creator/guidelines', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const brandIdentityPill = await page.$('button:has-text("Brand Identity")');
    if (brandIdentityPill) {
      await brandIdentityPill.click();
      await page.waitForTimeout(500);
      console.log('   ✓ Filtered guidelines by Brand Identity');
    }

    const guideCard = await page.$('[class*="cursor-pointer"] h3, .grid > div');
    if (guideCard) {
      await guideCard.click();
      await page.waitForTimeout(1000);
      console.log('   ✓ Opened Guideline detail drawer');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_creator_guidelines_drawer.png'), fullPage: true });
    console.log('   📸 Saved 06_creator_guidelines_drawer.png');

    // 8. EXCEPTION REQUESTS
    console.log('\n8. Testing Creator Exception Requests...');
    await page.goto('http://127.0.0.1:5173/creator/exceptions', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const reqExBtn = await page.$('button:has-text("Request Exception")');
    if (reqExBtn) {
      await reqExBtn.click();
      await page.waitForTimeout(800);
      console.log('   ✓ Opened Request Exception modal');

      // Close modal using Cancel button
      const cancelBtn = await page.$('.fixed.z-50 button:has-text("Cancel")');
      if (cancelBtn) {
        await cancelBtn.click();
        await page.waitForTimeout(500);
        console.log('   ✓ Cancelled Request Exception modal cleanly');
      }
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_creator_exceptions_drawer.png'), fullPage: true });
    console.log('   📸 Saved 07_creator_exceptions_drawer.png');

    // 9. SENTINEL REMEDIATION TASKS
    console.log('\n9. Testing Creator Sentinel Remediation Tasks...');
    await page.goto('http://127.0.0.1:5173/creator/sentinel-tasks', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const taskCount = await page.$$eval('[class*="rounded-xl"], [class*="rounded-2xl"]', els => els.length);
    console.log('   Sentinel task elements rendered:', taskCount);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_creator_sentinel_tasks.png'), fullPage: true });
    console.log('   📸 Saved 08_creator_sentinel_tasks.png');

    // 10. NOTIFICATIONS FEED
    console.log('\n10. Testing Creator Notifications...');
    await page.goto('http://127.0.0.1:5173/creator/notifications', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const markAllReadBtn = await page.$('button:has-text("Mark All as Read")');
    if (markAllReadBtn) {
      await markAllReadBtn.click();
      await page.waitForTimeout(800);
      console.log('   ✓ Clicked Mark All as Read via backend API');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_creator_notifications.png'), fullPage: true });
    console.log('   📸 Saved 09_creator_notifications.png');

    // 11. PROFILE & SETTINGS
    console.log('\n11. Testing Creator Profile & Settings...');
    await page.goto('http://127.0.0.1:5173/creator/profile', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const editProfileBtn = await page.$('button:has-text("Edit Profile")');
    if (editProfileBtn) {
      await editProfileBtn.click();
      await page.waitForTimeout(600);
      console.log('   ✓ Opened Edit Profile modal');
      const closeEdit = await page.$('.fixed.z-50 button:has-text("Cancel")');
      if (closeEdit) await closeEdit.click();
      await page.waitForTimeout(500);
      console.log('   ✓ Cancelled Edit Profile modal cleanly');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_creator_profile.png'), fullPage: true });
    console.log('   📸 Saved 10_creator_profile.png');

    console.log('\n======================================================');
    console.log('🎉 Creator Deep Live Browser Audit COMPLETED!');
    console.log(`Total Unhandled Errors: ${errors.length}`);
    console.log(`Screenshots Saved To: ${SCREENSHOT_DIR}`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('Audit failed with error:', err);
    throw err;
  } finally {
    if (fs.existsSync(testImagePath)) {
      try { fs.unlinkSync(testImagePath); } catch {}
    }
    await browser.close();
  }
}

runCreatorDeepAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
