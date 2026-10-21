import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.QA_BASE || 'http://127.0.0.1:5184';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ timezoneId: 'America/Bogota', viewport: { width: 1280, height: 1000 } });
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const now = new Date('2026-10-15T15:00:00Z');
await page.clock.install({ time: now });
try {
  await page.goto(`${base}/#/site/schedule`);
  await page.locator('.session-calendar').waitFor();
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('hoyos.db.v1')), db = stored.db;
    const common = { ...db.class_sessions[0], template_id: null, modality_id: 'mod_ligereza', capacity: 4, booked_count: 0, status: 'scheduled' };
    const row = (id, title, start, end, extra = {}) => ({ ...common, id, title, starts_at: `2026-10-15T${start}:00Z`, ends_at: `2026-10-15T${end}:00Z`, ...extra });
    db.class_templates.push({ ...db.class_templates[0], id: 'qa_unpublished_template', active: false });
    db.class_sessions = [
      row('qa_past', 'QA Past', '12:00', '13:00'),
      row('qa_progress', 'QA In progress', '14:30', '15:30'),
      row('qa_cancelled', 'QA Cancelled', '16:00', '17:00', { status: 'cancelled' }),
      row('qa_completed', 'QA Completed', '17:00', '18:00', { status: 'completed' }),
      row('qa_unpublished', 'QA Unpublished', '18:00', '19:00', { template_id: 'qa_unpublished_template' }),
      row('qa_active', 'QA Active', '19:00', '20:00'),
      row('qa_full', 'QA Full', '20:00', '21:00', { booked_count: 4 }),
    ];
    localStorage.setItem('hoyos.db.v1', JSON.stringify(stored));
    localStorage.setItem('hoyos.lang', 'en');
  });
  await page.reload(); await page.locator('.session-calendar').waitFor();
  // Keep fixture capacity stable: remove real seeded bookings, then refresh the same-tab storage snapshot.
  await page.evaluate(() => { const stored = JSON.parse(localStorage.getItem('hoyos.db.v1')); stored.db.bookings = []; stored.db.voucher_bookings = []; stored.db.class_sessions.find(s => s.id === 'qa_full').booked_count = 4; localStorage.setItem('hoyos.db.v1', JSON.stringify(stored)); dispatchEvent(new StorageEvent('storage', { key: 'hoyos.db.v1', newValue: JSON.stringify(stored) })); });
  const selectDay = async () => { await page.locator('.calendar-date-label input').fill('2026-10-15'); await page.getByRole('button', { name: 'Day', exact: true }).click(); };
  await selectDay();
  for (const title of ['QA Past', 'QA In progress', 'QA Cancelled', 'QA Completed', 'QA Unpublished']) {
    const row = page.locator('.classrow').filter({ hasText: title });
    assert(await row.isDisabled(), `${title} disabled in day view`);
    const hash = await page.evaluate(() => location.hash);
    await row.evaluate(el => el.click());
    assert.equal(await page.evaluate(() => location.hash), hash);
    assert.equal(await page.getByRole('dialog').count(), 0);
  }
  assert(await page.locator('.classrow').filter({ hasText: 'QA Past' }).innerText().then(s => s.includes('Ended')));
  assert(await page.locator('.classrow').filter({ hasText: 'QA In progress' }).innerText().then(s => s.includes('In progress')));
  await page.locator('.classrow').filter({ hasText: 'QA Active' }).click();
  await page.getByRole('dialog').waitFor(); await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);
  await page.getByRole('button', { name: 'Week', exact: true }).click();
  for (const title of ['QA Past', 'QA In progress', 'QA Cancelled', 'QA Completed', 'QA Unpublished']) assert(await page.locator('.calendar-session').filter({ hasText: title }).isDisabled(), `${title} disabled in desktop week`);
  assert(!(await page.locator('.calendar-session').filter({ hasText: 'QA Full' }).isDisabled()), 'full remains available for waitlist');
  // A still-open schedule becomes disabled when its start time arrives, without reloading.
  await page.clock.fastForward(4 * 3600000 + 1);
  assert(await page.locator('.calendar-session').filter({ hasText: 'QA Active' }).isDisabled(), 'start boundary updates without reload');
  await page.clock.setSystemTime(now); await page.evaluate(() => dispatchEvent(new Event('focus')));
  for (const [code, route, user] of [['W-04', '/site/schedule', 'usr_public'], ['C-02', '/app/schedule', 'usr_cust'], ['C-02b', '/app/schedule/week', 'usr_cust']]) {
    await mkdir(`docs/screenshots/${code}`, { recursive: true });
    for (const lang of ['es', 'en']) for (const width of [390, 1280]) {
      await page.evaluate(({ lang, user }) => { localStorage.setItem('hoyos.lang', lang); localStorage.setItem('hoyos.session', JSON.stringify({ userId: user, devMode: false, viewAs: null })); }, { lang, user });
      await page.setViewportSize({ width, height: 1000 }); await page.reload(); await page.goto(`${base}/#${route}`);
      await page.locator('.session-calendar').waitFor();
      await page.locator('.calendar-date-label input').fill('2026-10-15');
      const inactive = page.locator(width === 390 || route === '/app/schedule' ? '.classrow' : '.calendar-session').filter({ hasText: 'QA Past' });
      assert(await inactive.isDisabled(), `${code} ${lang} ${width}: past class disabled`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${code} ${lang} ${width}: no overflow`);
      await page.screenshot({ path: `docs/screenshots/${code}/inactive-${lang}-${width}.jpg`, fullPage: true, quality: 72 });
    }
    await page.evaluate(() => localStorage.setItem('hoyos.theme', JSON.stringify({ theme: 'dark', skin: 'styled' })));
    await page.reload(); await page.locator('.session-calendar').waitFor(); await page.screenshot({ path: `docs/screenshots/${code}/inactive-en-1280-dark.jpg`, fullPage: true, quality: 72 });
    await page.evaluate(() => localStorage.setItem('hoyos.theme', JSON.stringify({ theme: 'light', skin: 'styled' })));
  }
  await page.locator('.calendar-session').filter({ hasText: 'QA Full' }).click();
  await page.waitForURL('**/#/app/waitlist/qa_full');
  await page.goBack(); await page.locator('.session-calendar').waitFor();
  await page.locator('.calendar-session').filter({ hasText: 'QA Active' }).click();
  await page.waitForURL('**/#/app/class/qa_active');
  await page.goBack(); await page.locator('.session-calendar').waitFor();
  assert.deepEqual(errors, []);
  await mkdir('qa', { recursive: true });
  await writeFile('qa/session-availability.json', JSON.stringify({ passed: true, screenshots: 15, checks: ['day/week disabled states', 'native disabled programmatic clicks', 'active drawer Escape', 'full navigates to waitlist; active to details; Back restores schedule', 'clock boundary without reload', 'ES/EN mobile/desktop/dark', 'no overflow', 'no page errors'] }, null, 2));
  console.log('PASS: inactive session UI and 15 screenshots');
} catch (error) { await mkdir('qa', { recursive: true }); await page.screenshot({ path: 'qa/session-availability-failure.jpg', fullPage: true }); throw error; }
finally { await browser.close(); }
