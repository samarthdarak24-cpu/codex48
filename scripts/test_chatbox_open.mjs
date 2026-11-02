import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  let connected = false;
  for (const port of [5174, 5173]) {
    try {
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded', timeout: 3000 });
      console.log(`Connected to http://127.0.0.1:${port}/`);
      connected = true;
      break;
    } catch {}
  }

  if (!connected) throw new Error('Could not connect to port 5174 or 5173');

  await page.waitForTimeout(2000);

  const btn = await page.$('button[aria-label="Open Precedent AI Agent Copilot"]');
  if (btn) {
    console.log('Found trigger button, clicking...');
    await btn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'public/images/verified_floating_agent_open.png' });
    console.log('Saved public/images/verified_floating_agent_open.png');
  } else {
    console.log('Trigger button not found');
  }
  await browser.close();
}

main().catch(console.error);
