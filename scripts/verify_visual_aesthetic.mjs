import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  let baseUrl = 'http://127.0.0.1:5174';
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 3000 });
  } catch {
    baseUrl = 'http://127.0.0.1:5173';
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 3000 });
  }
  console.log(`Auditing landing page on ${baseUrl}...`);
  await page.waitForTimeout(2000);

  // 1. Capture Problem section
  const problemSec = await page.$('section:has-text("The Compliance Crisis")');
  if (problemSec) {
    await problemSec.screenshot({ path: 'public/images/verified_problem.png' });
    console.log('Saved public/images/verified_problem.png');
  }

  // 2. Capture Solution section
  const solSec = await page.$('section#solutions');
  if (solSec) {
    await solSec.screenshot({ path: 'public/images/verified_solution.png' });
    console.log('Saved public/images/verified_solution.png');
  }

  // 3. Capture Features section
  const featSec = await page.$('section#features');
  if (featSec) {
    await featSec.screenshot({ path: 'public/images/verified_features.png' });
    console.log('Saved public/images/verified_features.png');
  }

  // 4. Capture How it works section
  const howSec = await page.$('section#how-it-works');
  if (howSec) {
    await howSec.screenshot({ path: 'public/images/verified_how_it_works.png' });
    console.log('Saved public/images/verified_how_it_works.png');
  }

  // 5. Test opening Floating Agent Chatbox
  console.log('Testing Floating Agent Chatbox...');
  const chatTrigger = await page.$('button[aria-label="Open AI Brand Copilot"]');
  if (chatTrigger) {
    await chatTrigger.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'public/images/verified_floating_agent_open.png' });
    console.log('Saved public/images/verified_floating_agent_open.png (Floating Agent Chatbox open!)');
  } else {
    console.log('Chat trigger not found');
  }

  // 6. Capture Login page
  console.log('Testing Login page...');
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'public/images/verified_login.png' });
  console.log('Saved public/images/verified_login.png');

  await browser.close();
  console.log('Visual audit complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
