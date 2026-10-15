import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.QA_BASE || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const morning = new Date('2026-10-15T00:00:00-05:00').getTime();
const evening = new Date('2026-10-15T19:15:00-05:00').getTime();
const checks = [], errors = [];
await mkdir('qa/cached-sample', { recursive: true });

async function clockContext(now, storageState) {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, timezoneId: 'America/Bogota', storageState });
  await context.addInitScript(initial => {
    globalThis.__hoyQaNow = initial;
    const RealDate = Date;
    globalThis.Date = class extends RealDate {
      constructor(...args) { super(...(args.length ? args : [globalThis.__hoyQaNow])); }
      static now() { return globalThis.__hoyQaNow; }
    };
  }, now);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
}

async function assertResolved(page, label) {
  await page.waitForURL(/#\/app\/waitlist\/(?!sample)[^?]+/);
  await page.locator('.cust-page .classcard').waitFor();
  const result = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('hoyos.db.v1'));
    const id = location.hash.split('/').at(-1).split('?')[0];
    const session = stored.db.class_sessions.find(s => s.id === id);
    const mine = stored.db.bookings.some(b => b.session_id === id && b.user_id === 'usr_cust' && ['booked', 'checked_in'].includes(b.status));
    return { version: stored.version, starts: session?.starts_at, full: session?.booked_count >= session?.capacity, mine, userId: JSON.parse(localStorage.getItem('hoyos.session')).userId };
  });
  assert.equal(result.version, 10, 'no destructive seed-version reset');
  assert.equal(result.userId, 'usr_cust', 'genuine customer role');
  assert(new Date(result.starts).getTime() > evening, 'resolved class is still future');
  assert(result.full && !result.mine, 'full sample is eligible for this customer');
  assert(!page.url().includes('/no-access'));
  checks.push(label);
}

try {
  const open = await clockContext(morning);
  await open.page.goto(`${base}/#/coming-soon`);
  await open.page.locator('.coming-soon').waitFor();
  await open.page.evaluate(() => localStorage.setItem('hoyos.session', JSON.stringify({ userId: 'usr_cust', viewAs: null, devMode: false })));
  await open.page.reload();
  await open.page.locator('.coming-soon').waitFor();
  const morningState = await open.context.storageState();
  // Hash navigation leaves the same provider open; removing SampleRoute's refresh must fail this case.
  await open.page.evaluate(value => { globalThis.__hoyQaNow = value; }, evening);
  await open.page.goto(`${base}/#/app/waitlist/sample`);
  await assertResolved(open.page, 'already-open morning provider resolves evening sample through real route');
  await open.page.screenshot({ path: 'qa/cached-sample/already-open-customer-390.jpg', type: 'jpeg', quality: 72 });
  await open.context.close();

  const cached = await clockContext(evening, morningState);
  await cached.page.goto(`${base}/#/app/waitlist/sample`);
  await assertResolved(cached.page, 'same-day v10 morning cache reload resolves evening sample through real route');
  await cached.page.screenshot({ path: 'qa/cached-sample/cached-customer-390.jpg', type: 'jpeg', quality: 72 });
  await cached.context.close();
  assert.deepEqual(errors, []);
  console.log('Cached sample browser regression passed', checks);
} finally {
  await writeFile('qa/cached-sample/results.json', JSON.stringify({ checks, errors }, null, 2));
  await browser.close();
}
