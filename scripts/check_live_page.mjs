import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // Try 5174 first, then 5173
  let url = 'http://127.0.0.1:5174/';
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 4000 });
  } catch {
    url = 'http://127.0.0.1:5173/';
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 4000 });
  }
  console.log(`Connected to ${url}`);
  await page.waitForTimeout(1500);

  const sections = await page.$$('section');
  console.log(`Total sections rendered: ${sections.length}`);
  for (let i = 0; i < sections.length; i++) {
    const text = await sections[i].innerText();
    const firstLine = text.split('\n').filter(Boolean).slice(0, 2).join(' | ');
    console.log(`Sec ${i}: ${firstLine}`);
  }
  await browser.close();
}

main().catch(console.error);
