import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://127.0.0.1:5174/login...');
  await page.goto('http://127.0.0.1:5174/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);

  // Fill manager login
  console.log('Logging in as Brand Manager...');
  await page.fill('input[type="email"]', 'david.kim@pureglow.co');
  await page.fill('input[type="password"]', 'precedent');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3000);

  const waitForSpinner = async () => {
    try {
      await page.waitForSelector('text=Loading Workspace', { state: 'detached', timeout: 6000 });
    } catch {}
    await page.waitForTimeout(1500);
  };

  const managerPages = [
    { url: 'http://127.0.0.1:5174/manager/rules', file: 'rules-ui.png' },
    { url: 'http://127.0.0.1:5174/manager/sandbox', file: 'sandbox-ui.png' },
    { url: 'http://127.0.0.1:5174/manager/sentinel', file: 'manager-sentinel.png' },
    { url: 'http://127.0.0.1:5174/manager/submissions', file: 'queue-ui.png' },
    { url: 'http://127.0.0.1:5174/manager/exceptions', file: 'exceptions-ui.png' },
  ];

  for (const item of managerPages) {
    console.log(`Loading ${item.url}...`);
    await page.goto(item.url, { waitUntil: 'domcontentloaded' });
    await waitForSpinner();
    await page.screenshot({ path: `public/images/platform/${item.file}` });
    console.log(`Captured public/images/platform/${item.file}`);
  }

  // Now login as creator
  console.log('Logging in as Content Creator...');
  await page.goto('http://127.0.0.1:5174/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', 'emily.carter@pureglow.co');
  await page.fill('input[type="password"]', 'precedent');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await waitForSpinner();

  await page.screenshot({ path: 'public/images/platform/creator-dashboard-live.png' });
  console.log('Captured creator-dashboard-live.png');

  await page.goto('http://127.0.0.1:5174/creator/review/1', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(2000);
  await waitForSpinner();
  await page.screenshot({ path: 'public/images/platform/review-ui.png' });
  console.log('Captured review-ui.png');

  await browser.close();
  console.log('All platform screenshots successfully updated without spinners!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
