// RS-09: deterministic fictional booking fixture. No network services or real customer data.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
const base = process.env.QA_BASE ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
const output = 'docs/screenshots/C-08b';
await mkdir(output, { recursive: true });
const errors = [], checks = [];
try {
 for (const lang of ['en', 'es']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, r => r.abort());
  await ctx.addInitScript(lang => { localStorage.setItem('hoyos.session', JSON.stringify({ userId: 'usr_cust', devMode: false, viewAs: null })); localStorage.setItem('hoyos.lang', lang); }, lang);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({ time: new Date('2026-11-01T06:09:59Z') });
  await page.clock.pauseAt(new Date('2026-11-01T06:09:59Z'));
  await page.goto(`${base}/#/app`);
  await page.waitForFunction(() => localStorage.getItem('hoyos.db.v1'));
  await page.evaluate(() => {
   const stored = JSON.parse(localStorage.getItem('hoyos.db.v1')), db = stored.db;
   const base = db.class_sessions.find(s => s.status === 'scheduled');
   const stamp = new Date().toISOString();
   const original = { ...base, id: 'qa_rs_original', title: 'QA Original Class', starts_at: '2026-11-01T18:10:00Z', ends_at: '2026-11-01T19:00:00Z', capacity: 6, booked_count: 1, status: 'scheduled' };
   const target = { ...original, id: 'qa_rs_target', title: 'QA Replacement Class', starts_at: '2026-11-01T20:10:00Z', ends_at: '2026-11-01T21:00:00Z', booked_count: 0 };
   db.class_sessions = [original, target];
   db.bookings = [{ id: 'qa_rs_booking', tenant_id: base.tenant_id, created_at: stamp, updated_at: stamp, user_id: 'usr_cust', session_id: original.id, status: 'booked', paid_with: 'single', ledger_id: null, checked_in_at: null, cancelled_at: null, rated: false }];
   db.waitlist = [];
   localStorage.setItem('hoyos.db.v1', JSON.stringify(stored));
  });
  await page.goto(`${base}/#/app/booking/qa_rs_booking/change`); await page.reload();
  const move = () => page.getByRole('button', { name: lang === 'en' ? /Reschedule to another class/ : /Reprogramar a otra clase/ });
  await move().waitFor();
  const fixture = await page.evaluate(() => localStorage.getItem('hoyos.db.v1'));
  assert(await move().isEnabled(), 'before deadline');
  await page.clock.runFor(1000);
  assert(await move().isEnabled(), 'exact deadline');
  await move().click(); await page.getByText('QA Replacement Class', { exact: true }).click();
  await page.waitForURL(url => !url.hash.endsWith('/change'));
  const moved = await page.evaluate(() => JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
  assert.equal(moved.bookings.find(b => b.id === 'qa_rs_booking').status, 'cancelled');
  assert.equal(moved.bookings.filter(b => b.session_id === 'qa_rs_target' && b.status === 'booked').length, 1, 'exact deadline reschedule works');
  assert.equal(moved.class_sessions.find(s => s.id === 'qa_rs_original').booked_count, 0);
  assert.equal(moved.class_sessions.find(s => s.id === 'qa_rs_target').booked_count, 1);
  await page.evaluate(fixture => localStorage.setItem('hoyos.db.v1', fixture), fixture);
  await page.goto(`${base}/#/app/booking/qa_rs_booking/change`); await page.reload();
  await move().click(); await page.getByText('QA Replacement Class', { exact: true }).waitFor();
  await page.clock.runFor(1000);
  await page.getByText(lang === 'en' ? 'Rescheduling closes 12 hours before class.' : 'La reprogramación cierra 12 horas antes de la clase.', { exact: true }).waitFor();
  assert.equal(await page.getByText('QA Replacement Class', { exact: true }).count(), 0, 'open replacement list closes after cutoff');
  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
  assert.equal(snapshot.bookings.filter(b => b.session_id === 'qa_rs_target').length, 0, 'no replacement booking written after deadline');
  assert.equal(snapshot.bookings.find(b => b.id === 'qa_rs_booking').status, 'booked');
  for (const width of [390, 1280]) {
   await page.setViewportSize({ width, height: 1000 });
   assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'responsive page');
   await page.screenshot({ path: `${output}/${lang}-${width}-cutoff.jpg`, quality: 72, fullPage: true });
  }
  const back = page.getByRole('button', { name: lang === 'en' ? 'Back' : 'Volver', exact: true });
  if (await back.count()) await back.click();
  assert(await move().isDisabled(), 'menu unavailable after cutoff');
  await page.evaluate(() => localStorage.setItem('hoyos.theme', JSON.stringify({ theme: 'dark', skin: 'styled' })));
  await page.reload(); await move().waitFor();
  assert(await move().isDisabled(), 'cutoff survives reload in dark theme');
  await page.screenshot({ path: `${output}/${lang}-1280-dark-cutoff.jpg`, quality: 72, fullPage: true });
  checks.push(`${lang}: before allowed / exact reschedule succeeds with conserved capacity; open list and menu unavailable after deadline; unchanged booking; desktop/mobile screenshots`);
  await ctx.close();
 }
 assert.deepEqual(errors, []);
 await writeFile(`${output}/cutoff-results.json`, JSON.stringify({ feature: 'RS-09', base, checks, errors, limits: ['Frontend mock only; server deadline and atomic reschedule remain pending.', 'Cancellation credit rules are unchanged draft settings.'] }, null, 2));
 console.log(checks.join('\n'));
} finally { await browser.close(); }
