import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Find active port
  let baseUrl;
  for (const port of [5173, 5174]) {
    try {
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded', timeout: 5000 });
      console.log(`Connected on port ${port}`);
      baseUrl = `http://127.0.0.1:${port}`;
      break;
    } catch (e) {
      console.log(`Port ${port} failed: ${e.message}`);
    }
  }

  if (!baseUrl) {
    console.error('No active dev server found');
    process.exit(1);
  }

  // Wait for full render
  await page.waitForTimeout(3000);

  // Count sections to verify page rendered
  const sectionCount = await page.$$eval('section', els => els.length);
  console.log(`Found ${sectionCount} sections`);

  if (sectionCount === 0) {
    // Page might have a JS error, grab console errors
    console.log('Page may have a render error. Taking full page screenshot...');
    await page.screenshot({ path: 'public/images/debug_render.png', fullPage: true });
    await browser.close();
    return;
  }

  // Find the features section by text content
  const featSec = await page.$('#features');
  if (featSec) {
    await featSec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await featSec.screenshot({ path: 'public/images/verified_features_v2.png' });
    console.log('Captured #features section');
  } else {
    // Try by text
    const sec = await page.$('section:has-text("Six Core Product Capabilities")');
    if (sec) {
      await sec.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await sec.screenshot({ path: 'public/images/verified_features_v2.png' });
      console.log('Captured features section by text match');
    } else {
      console.log('Features section not found by any selector');
      await page.screenshot({ path: 'public/images/debug_render.png', fullPage: true });
    }
  }

  await browser.close();
}

main().catch(console.error);
