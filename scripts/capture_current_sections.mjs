import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const sections = await page.$$('section');
  console.log(`Found ${sections.length} sections`);
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const id = await sec.getAttribute('id') || `sec_${i}`;
    await sec.screenshot({ path: `public/images/debug_sec_${i}_${id}.png` });
    console.log(`Saved section ${i}: ${id}`);
  }
  await browser.close();
}

main().catch(console.error);
