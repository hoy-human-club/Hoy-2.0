// Run against Vite: QA_BASE=http://127.0.0.1:5174 node scripts/test-promotions-guide.mjs
// CAPTURE=1 also writes the guide and Hub ES/EN, light/dark, 390/1280 captures and guide thumbnails.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const base = process.env.QA_BASE || 'http://127.0.0.1:5174';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const paths = ['/teach/promote', '/app/vouchers', '/staff/vouchers', '/admin/vouchers'];
const personas = [
  ['usr_super', paths], ['usr_admin', paths], ['usr_coord', ['/staff/vouchers']],
  ['usr_desk', ['/staff/vouchers']], ['usr_fin', []], ['usr_teach', ['/teach/promote', '/app/vouchers']],
  ['usr_maint', []], ['usr_mkt', []], ['usr_dev', []], ['usr_cust', ['/app/vouchers']], ['usr_public', []],
];
const as = async (userId, path, viewAs = null) => {
  await page.evaluate(({ userId, viewAs }) => {
    localStorage.setItem('hoyos.session', JSON.stringify({ userId, devMode: false, viewAs }));
    localStorage.setItem('hoyos.lang', 'en');
  }, { userId, viewAs });
  // Reload on an unguarded route before navigating with the newly selected test identity.
  await page.goto(`${base}/#/hub`);
  await page.reload();
  await page.goto(`${base}/#${path}`);
};
const stored = () => page.evaluate(() => ({ session: localStorage.getItem('hoyos.session'), data: localStorage.getItem('hoyos.db.v1') }));
const capture = async (code, path) => {
  await mkdir(`docs/screenshots/${code}`, { recursive: true });
  for (const lang of ['es', 'en']) for (const theme of ['light', 'dark']) for (const width of [390, 1280]) {
    await page.evaluate(({ lang, theme }) => {
      localStorage.setItem('hoyos.lang', lang);
      localStorage.setItem('hoyos.theme', JSON.stringify({ theme, skin: 'styled' }));
    }, { lang, theme });
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto(`${base}/#${path}`);
    await page.reload();
    await page.locator(code === 'P-02' ? '.promotion-practice' : '.hub-promotions-preview').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `docs/screenshots/${code}/${lang}-${width}${theme === 'dark' ? '-dark' : ''}.jpg`, quality: 75, fullPage: true });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${code} ${lang} ${theme} ${width}: overflow`);
    assert(!(await page.locator('body').innerText()).includes('⟨'), `${code}: untranslated string`);
  }
};

try {
  await page.goto(`${base}/#/hub/promotions`);
  await page.locator('.promotion-practice').waitFor();
  for (const [userId, allowed] of personas) {
    await as(userId, '/hub/promotions');
    await page.getByRole('heading', { name: 'Promotions and vouchers', exact: true }).waitFor();
    const links = await page.locator('.promotions-guide-workspaces a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href').slice(1)));
    assert.deepEqual(links.sort(), [...allowed].sort(), `${userId}: role-appropriate workspace links`);
    assert.equal(JSON.parse((await stored()).session).userId, userId, 'guide does not switch identity');
    assert.equal(await page.locator('iframe').count(), 0, 'guide has no role-switching frame');
  }

  await as('usr_super', '/hub/promotions', 'public');
  assert.equal(await page.locator('.promotions-guide-workspaces a').count(), 0, 'view-as role is respected');

  await as('usr_public', '/hub');
  await page.locator('.hub-promotions-preview').waitFor();
  const hubSession = (await stored()).session;
  await page.getByRole('button', { name: 'Open the practice', exact: true }).click();
  await page.getByRole('heading', { name: 'Promotions and vouchers', exact: true }).waitFor();
  assert.equal((await stored()).session, hubSession, 'Hub card retains identity');

  const before = await stored();
  assert(await page.getByRole('button', { name: 'Simulate claim and booking', exact: true }).isDisabled());
  assert(await page.getByRole('button', { name: 'Simulate check-in', exact: true }).isDisabled());
  await page.getByRole('button', { name: 'Simulate sharing', exact: true }).click();
  await page.getByRole('button', { name: 'Simulate claim and booking', exact: true }).click();
  await page.getByLabel('Enter the practice code', { exact: true }).fill('WRONG-CODE');
  await page.getByRole('button', { name: 'Verify example', exact: true }).click();
  await page.getByText('The code does not match. Use the practice code shown above.', { exact: true }).waitFor();
  assert(await page.getByRole('button', { name: 'Simulate check-in', exact: true }).isDisabled());
  await page.getByLabel('Enter the practice code', { exact: true }).fill(' training-01 ');
  await page.getByLabel('Enter the practice code', { exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Simulate check-in', exact: true }).click();
  await page.getByText('Journey complete', { exact: true }).waitFor();
  assert.deepEqual(await stored(), before, 'practice never changes stored data or identity');
  await page.getByRole('button', { name: 'Restart practice', exact: true }).click();
  assert(await page.getByRole('button', { name: 'Simulate sharing', exact: true }).isEnabled());
  assert(await page.getByRole('button', { name: 'Simulate claim and booking', exact: true }).isDisabled());
  assert.equal(await page.getByLabel('Enter the practice code', { exact: true }).inputValue(), '');

  await page.getByRole('button', { name: 'Simulate sharing', exact: true }).click();
  await page.reload();
  assert(await page.getByRole('button', { name: 'Simulate sharing', exact: true }).isEnabled(), 'reload clears practice');
  await as('usr_public', '/staff/vouchers');
  await page.waitForURL(/#\/no-access/);
  await as('usr_teach', '/admin/vouchers');
  await page.waitForURL(/#\/no-access/);

  if (process.env.CAPTURE === '1') {
    await as('usr_public', '/hub/promotions');
    await capture('P-02', '/hub/promotions');
    // The Hub preview uses these genuine page captures instead of a fabricated illustration.
    for (const lang of ['es', 'en']) for (const theme of ['light', 'dark']) {
      const thumbnailContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.5 });
      const thumbnail = await thumbnailContext.newPage();
      await thumbnail.addInitScript(({ lang, theme }) => {
        localStorage.setItem('hoyos.lang', lang);
        localStorage.setItem('hoyos.theme', JSON.stringify({ theme, skin: 'styled' }));
        localStorage.setItem('hoyos.session', JSON.stringify({ userId: 'usr_public', devMode: false, viewAs: null }));
      }, { lang, theme });
      await thumbnail.goto(`${base}/#/hub/promotions`);
      await thumbnail.locator('.promotion-practice').waitFor();
      await thumbnail.evaluate(() => document.fonts.ready);
      await thumbnail.screenshot({ path: `docs/screenshots/P-02/thumb-${lang}-desktop${theme === 'dark' ? '-dark' : ''}.jpg`, quality: 70 });
      await thumbnailContext.close();
    }
    await capture('HUB-01', '/hub');
  }
  assert.deepEqual(errors, []);
  console.log('PASS promotions guide: all 11 roles, super-admin view-as, Hub entry identity, sequential practice, invalid code, Enter verification, check-in, reset/reload, zero stored mutations, real route guards' + (process.env.CAPTURE === '1' ? ', ES/EN 390/1280 light/dark captures and guide thumbnails' : ''));
} finally {
  await browser.close();
}
