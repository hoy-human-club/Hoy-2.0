// 0155 — renders the link-preview card (1200 × 630, JPEG) for WhatsApp / Instagram / social shares from W-11 itself,
// so the card always matches the live pre-launch page. Run against a dev or preview server:
//   QA_BASE=http://localhost:5173 CHROMIUM_PATH=<chromium or edge> node scripts/gen-og-image.mjs [es|en]
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const base = process.env.QA_BASE ?? 'http://127.0.0.1:5173';
const lang = process.argv[2] === 'en' ? 'en' : 'es';
const out = fileURLToPath(new URL(`../public/brand/og-coming-soon${lang === 'en' ? '-en' : ''}.jpg`, import.meta.url));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await page.addInitScript((l) => { localStorage.setItem('hoyos.lang', l); }, lang);
  await page.goto(`${base}/#/coming-soon`);
  await page.waitForSelector('.coming-soon h1');
  await page.locator('img.coming-soon-scene').evaluate((img) => img.decode());
  await page.evaluate(() => document.fonts.ready);
  // A card, not a page: no controls, no small print, and the message centred in the frame.
  await page.addStyleTag({ content: '.coming-soon-tools, .coming-soon-cta, .coming-soon-intro { display: none !important; } .coming-soon-layout { padding-block: 2.5rem !important; } .coming-soon-message { padding-block: 1.5rem !important; } .coming-soon h1 { font-size: 4.25rem !important; }' });
  await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
  console.log(`wrote ${out}`);
} finally {
  await browser.close();
}
