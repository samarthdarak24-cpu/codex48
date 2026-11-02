import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173/login');
  await page.fill('input[type="email"]', 'david.kim@pureglow.co');
  await page.fill('input[type="password"]', 'precedent');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/manager/overview');
  await page.goto('http://127.0.0.1:5173/manager/rules-conflicts');
  await page.waitForTimeout(2000);

  const heading = await page.textContent('h2');
  const metricCards = await page.$$eval('.text-2xl.font-bold', els => els.map(e => e.textContent.trim()));
  const tabBadges = await page.$$eval('button', els => els.map(e => e.textContent.trim()).filter(t => t.includes('Rules') || t.includes('Active') || t.includes('Conflicts') || t.includes('Exceptions')));
  const rows = await page.$$eval('h4.font-bold', els => els.map(e => e.textContent.trim()));

  console.log('Heading:', heading);
  console.log('Metric card values:', metricCards);
  console.log('Tabs:', tabBadges);
  console.log('Rule rows count:', rows.length);
  console.log('First 5 rule titles:', rows.slice(0, 5));

  await browser.close();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
