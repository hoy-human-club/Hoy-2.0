// 0167 · Captures the team-seat pages (S-02, S-06, S-04, M-10, M-09, marketing) as each seat's demo user, at the
// viewport the desk uses (1440×900) and full page, so layout reviews look at real pixels instead of measurements.
// Usage: QA_BASE=http://localhost:5173 CHROMIUM_PATH=<chromium/edge> node scripts/capture-seats.mjs [outDir]
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const base = process.env.QA_BASE || 'http://localhost:5173';
const out = process.argv[2] || 'docs/screenshots/seats';
const pages = [
  ['checkin', 'usr_desk', '/staff/checkin'],
  ['inbox', 'usr_desk', '/staff/inbox'],
  ['register', 'usr_desk', '/staff/register'],
  ['emails', 'usr_coord', '/admin/emails'],
  ['finance', 'usr_fin', '/admin/finance'],
  ['marketing', 'usr_mkt', '/admin/marketing'],
  ['hub', 'usr_super', '/hub'],
  // 0168 · every role's home
  ['home-desk', 'usr_desk', '/staff'],
  ['home-coord', 'usr_coord', '/staff'],
  ['home-maint', 'usr_maint', '/staff'],
  ['home-admin', 'usr_admin', '/admin'],
  ['home-finance', 'usr_fin', '/admin'],
  ['home-marketing', 'usr_mkt', '/admin/content'],
  ['home-dev', 'usr_dev', '/dev'],
  ['home-teacher', 'usr_teach', '/teach'],
  ['home-member', 'usr_cust', '/app'],
];
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  for (const [name, userId, route] of pages) {
    if (only && !only.includes(name)) continue;
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(({ userId }) => {
      if (!sessionStorage.getItem('qa-init')) {
        localStorage.setItem('hoyos.session', JSON.stringify({ userId, viewAs: null, devMode: false }));
        localStorage.setItem('hoyos.lang', 'en');
        sessionStorage.setItem('qa-init', 'yes');
      }
    }, { userId });
    const page = await ctx.newPage();
    await page.goto(`${base}/#${route}`);
    await page.locator(name === 'hub' ? '.hub-bento-bottom' : 'main').first().waitFor();
    await page.waitForTimeout(1500);
    if (name === 'hub') {
      await page.locator('.hub-bento-bottom').screenshot({ path: `${out}/hub-bottom-1440.png`, animations: 'disabled' });
    } else {
      await page.screenshot({ path: `${out}/${name}-1440.png`, animations: 'disabled' });
      await page.screenshot({ path: `${out}/${name}-1440-full.png`, animations: 'disabled', fullPage: true });
    }
    await ctx.close();
  }
} finally { await browser.close(); }
console.log('captured', out);
