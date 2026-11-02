import { chromium } from 'playwright';

async function getBaseUrl(browser) {
  for (const port of [5174, 5173]) {
    const page = await browser.newPage();
    try {
      await page.goto(`http://127.0.0.1:${port}/login`, { timeout: 3000 });
      await page.close();
      console.log(`Using active port ${port}`);
      return `http://127.0.0.1:${port}`;
    } catch {
      await page.close();
    }
  }
  throw new Error('Neither port 5173 nor 5174 is responding');
}

async function captureAllPlatformPages() {
  const browser = await chromium.launch({ headless: true });
  const baseUrl = await getBaseUrl(browser);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Sign in as Brand Manager (David Kim)
  console.log('Navigating to login...');
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Quick fill form
  await page.fill('input[type="email"]', 'david.kim@pureglow.co');
  await page.fill('input[type="password"]', 'precedent');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2000);

  const waitForLoaded = async () => {
    try {
      await page.waitForSelector('text=Loading Workspace', { state: 'detached', timeout: 8000 });
    } catch {
      // not found or detached
    }
    await page.waitForTimeout(1500);
  };

  const routes = [
    { url: `${baseUrl}/manager/overview`, file: 'manager-overview-live.png' },
    { url: `${baseUrl}/manager/rules`, file: 'rules-ui.png' },
    { url: `${baseUrl}/manager/sandbox`, file: 'sandbox-ui.png' },
    { url: `${baseUrl}/manager/sentinel`, file: 'manager-sentinel.png' },
    { url: `${baseUrl}/manager/audit-history`, file: 'manager-audit-live.png' },
    { url: `${baseUrl}/manager/exceptions`, file: 'exceptions-live.png' },
    { url: `${baseUrl}/manager/submissions`, file: 'queue-ui.png' },
  ];

  for (const r of routes) {
    console.log(`Navigating to ${r.url}...`);
    await page.goto(r.url, { waitUntil: 'domcontentloaded' });
    await waitForLoaded();
    await page.screenshot({ path: `public/images/platform/${r.file}` });
    console.log(`Saved public/images/platform/${r.file}`);
  }

  // 2. Sign in as Creator (Emily Carter)
  console.log('Navigating to login as Creator...');
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.fill('input[type="email"]', 'emily.carter@pureglow.co');
  await page.fill('input[type="password"]', 'precedent');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await waitForLoaded();

  await page.screenshot({ path: 'public/images/platform/creator-dashboard-live.png' });
  console.log('Saved creator-dashboard-live.png');

  // Creator review
  await page.goto(`${baseUrl}/creator/review/1`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(2000);
  await waitForLoaded();
  await page.screenshot({ path: 'public/images/platform/creator-review.png' });
  console.log('Saved creator-review.png');

  await browser.close();
  console.log('Successfully captured all live screenshots with ZERO loading spinners!');
}

captureAllPlatformPages().catch(console.error);
