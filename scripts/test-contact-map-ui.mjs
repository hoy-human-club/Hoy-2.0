// SW-07: all map responses are intercepted deterministic HTML fixtures; no geographic verification claim.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
const base = process.env.QA_BASE ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
const output = 'docs/screenshots/W-06';
await mkdir(output, { recursive: true });
const checks = [], errors = [];
try {
 for (const lang of ['en', 'es']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  const requests = [];
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, async route => {
   const url = route.request().url();
   if (/google\.com\/maps\?|openstreetmap\.org\/export\/embed\.html/.test(url)) {
    requests.push(url);
    await route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body style="background:#e5e7d0;color:#20364a;font-family:sans-serif;padding:24px"><h2>Deterministic map fixture</h2><p>Configured pin URL tested. External geography is not verified.</p></body></html>' });
   } else await route.abort();
  });
  await ctx.addInitScript(lang => { if (window.top !== window) return; localStorage.setItem('hoyos.lang', lang); localStorage.setItem('hoyos.session', JSON.stringify({ userId: 'usr_public', devMode: false, viewAs: null })); }, lang);
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/#/site/contact?version=latest`);
  await page.waitForFunction(() => localStorage.getItem('hoyos.db.v1'));
  const load = () => page.getByRole('button', { name: lang === 'en' ? 'Load interactive map' : 'Cargar mapa interactivo', exact: true });
  await load().waitFor();
  assert.equal(requests.length, 0, 'default makes no external map request before load');
  const directions = page.locator('.mapslot-links a');
  assert((await directions.getAttribute('href')).includes('query=Cl.'), 'published address search remains intact');
  assert((await page.locator('.mapslot-addr').innerText()).includes('29C-100'));
  const capture = async state => {
   for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    const map = page.locator('.mapslot'); await map.scrollIntoViewIfNeeded();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'responsive website');
    assert(!(await page.locator('body').innerText()).includes('⟨'), 'all strings translated');
    await map.screenshot({ path: `${output}/${lang}-${width}-map-${state}.jpg`, quality: 72 });
   }
  };
  await capture('ready');
  await load().click();
  await page.locator('.mapslot iframe').waitFor();
  await page.waitForFunction(() => !document.querySelector('.mapslot-loading'));
  const google = new URL(await page.locator('.mapslot iframe').getAttribute('src'));
  assert.equal(google.hostname, 'www.google.com'); assert.equal(google.searchParams.get('q'), '6.19281,-75.56535');
  assert.equal(await page.locator('.mapslot iframe').getAttribute('title'), lang === 'en' ? 'Where we are' : 'Dónde estamos');
  await capture('loaded-fixture');
  await page.getByRole('button', { name: lang === 'en' ? 'Map not loading?' : '¿El mapa no carga?', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: lang === 'en' ? 'The map could not load.' : 'No se pudo cargar el mapa.' }).waitFor();
  assert(await directions.isVisible(), 'directions remain after map error');
  await capture('failure');
  await page.getByRole('button', { name: lang === 'en' ? 'Retry map' : 'Reintentar mapa', exact: true }).click();
  await page.locator('.mapslot iframe').waitFor();
  const setProvider = async provider => {
   await page.evaluate(provider => { const s = JSON.parse(localStorage.getItem('hoyos.db.v1')); const t = s.db.tenants.find(t => t.id === 'ten_hoy'); t.settings.content = { ...t.settings.content, mapProvider: provider }; localStorage.setItem('hoyos.db.v1', JSON.stringify(s)); }, provider);
   await page.reload();
  };
  await setProvider('none'); await page.locator('.mapslot-addr').waitFor();
  assert.equal(await load().count(), 0, 'saved none stays disabled'); assert.equal(await page.locator('.mapslot iframe').count(), 0);
  await setProvider('osm'); await load().click(); await page.locator('.mapslot iframe').waitFor();
  const osm = new URL(await page.locator('.mapslot iframe').getAttribute('src')); assert.equal(osm.hostname, 'www.openstreetmap.org'); assert.equal(osm.searchParams.get('marker'), '6.19281,-75.56535');
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('hoyos.db.v1')); const t = s.db.tenants.find(t => t.id === 'ten_hoy'); t.settings.profile = { ...t.settings.profile, mapLat: 200, mapLng: NaN }; localStorage.setItem('hoyos.db.v1', JSON.stringify(s)); });
  await page.reload(); await load().click();
  assert((await page.locator('.mapslot iframe').getAttribute('src')).includes('marker=6.19281,-75.56535'), 'invalid pair falls back to configured coordinates');
  checks.push(`${lang}: missing choice defaults Google, saved none preserved, click-to-load, exact configured Google/OSM coordinates, accessible title, failure/retry/directions, invalid pair fallback, 390/1280 screenshots`);
  await ctx.close();
 }
 assert.deepEqual(errors, []);
 await writeFile(`${output}/map-results.json`, JSON.stringify({ feature: 'SW-07', base, checks, errors, limits: ['External requests fulfilled with deterministic test HTML. No real provider render or geographic correctness claimed.', 'Configured published repository contact used without changing location or saved provider choices.'] }, null, 2));
 console.log(checks.join('\n'));
} finally { await browser.close(); }
