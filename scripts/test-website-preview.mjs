// Focused end-to-end checks for the isolated animated archive and standalone Coming Soon page.
// Uses the runner's installed Chrome; no extra package/browser download or external service.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const root = new URL('..', import.meta.url).pathname;
const url = 'http://127.0.0.1:5188';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...(process.env.QA_DIST === '1' ? ['preview'] : []), '--host', '127.0.0.1', '--port', '5188', '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = ''; server.stdout.on('data', b => serverLog += b); server.stderr.on('data', b => serverLog += b);
const result = { checks: [], errors: [], media: [], widths: [344, 390, 768, 1280, 3840] };
let browser;
let activePage;
const check = (name) => { result.checks.push(name); console.log('PASS', name); };
const archivedTeachers = ['Andrés Quintero', 'Paula Mejía', 'Santiago Vélez', 'Manuela Torres', 'Daniel Ochoa', 'Isabela Cano', 'Felipe Zapata', 'Carolina Pardo'];
const capture = async (page, code, lang, width, suffix = '') => {
  await mkdir(`${root}/docs/screenshots/${code}`, { recursive: true });
  if (code === 'W-11') {
    await page.locator('img.coming-soon-scene').evaluate(async image => { await image.decode(); });
    assert.ok(await page.locator('img.coming-soon-scene').evaluate(image => { const box = image.getBoundingClientRect(); return image.complete && image.naturalWidth > 0 && box.width > 0 && box.height > 0; }), 'Studio photo is decoded and visible');
    await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  }
  await page.screenshot({ path: `${root}/docs/screenshots/${code}/${lang}-${width}${suffix}.jpg`, type: 'jpeg', quality: 68, fullPage: false, animations: 'disabled' });
};
const noOverflow = async (page, label) => {
  const dims = await page.evaluate(() => ({ body: document.documentElement.scrollWidth, width: innerWidth }));
  assert.ok(dims.body <= dims.width + 1, `${label}: overflow ${JSON.stringify(dims)}`);
};
const version = page => page.locator('.site-actions .site-version select');
try {
  for (let n = 0; n < 80; n++) {
    if (server.exitCode !== null) throw new Error(`Vite stopped: ${serverLog}`);
    try { if ((await fetch(url)).ok) break; } catch { /* startup */ }
    await new Promise(r => setTimeout(r, 200));
  }
  const executablePath = process.env.BROWSER_BIN || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
  assert.ok(executablePath, 'A supported Chrome executable is required');
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });
  const page = await context.newPage(); activePage = page;
  page.on('pageerror', e => result.errors.push(e.message));
  page.on('response', r => { if (/\/video\/|teacher-.*\.webp/.test(r.url())) result.media.push({ url: r.url().replace(url, ''), status: r.status() }); });
  await page.goto(`${url}/#/site/teachers`);
  await page.waitForSelector('.site-teacher');
  const currentNames = await page.locator('.site-teacher h3').allTextContents();
  assert.equal(currentNames.length, 11);
  for (const name of ['Andrea','Jennifer Varela','Clara Zuluaga','Leandro Valencia']) assert.ok(currentNames.includes(name));
  assert.ok(!currentNames.includes(archivedTeachers[0]));
  assert.equal(await page.locator('.site').getAttribute('data-site-version'), 'latest');
  const dbBefore = await page.evaluate(() => localStorage.getItem('hoyos.db.v1'));
  check('Bare URL includes approved timetable teachers and retains existing profiles');
  await version(page).selectOption('archive');
  await page.waitForSelector('.site[data-site-version="archive"]');
  assert.deepEqual(await page.locator('.site-teacher h3').allTextContents(), archivedTeachers);
  assert.equal(await page.locator('.site-archive-notice').count(), 1);
  assert.equal(await page.locator('#hoyos-localbusiness').count(), 0);
  assert.ok(page.url().includes('version=archive'));
  await page.reload(); await page.waitForSelector('.site-teacher');
  assert.deepEqual(await page.locator('.site-teacher h3').allTextContents(), archivedTeachers);
  check('Selector, shared URL and reload restore the independent archived catalog');
  await page.locator('.site-teacher').first().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('.site-teacher video')].some(v => v.readyState >= 2 && !v.paused));
  const before = await page.locator('.site-teacher video').first().evaluate(v => v.currentTime);
  await page.waitForTimeout(400);
  const after = await page.locator('.site-teacher video').first().evaluate(v => v.currentTime);
  assert.notEqual(before, after);
  check('Archived teacher video loads and advances');
  const mediaPaths = [...archivedTeachers.map((_, i) => ['andres','paula','santiago','manuela','daniel','isabela','felipe','carolina'][i]).map(n => `video/living-teacher-${n}.mp4`), ...['hot-yoga','barre','pilates','meditacion','respiracion'].map(n => `video/living-${n}.mp4`)];
  for (const file of mediaPaths) { const response = await context.request.get(`${url}/${file}`); assert.equal(response.status(), 200, file); assert.ok(response.headers()['content-type']?.includes('video/mp4'), `${file}: MIME type`); const bytes = await response.body(); assert.ok(bytes.length > 1000, file); assert.equal(bytes.subarray(4,8).toString(), 'ftyp', `${file}: MP4 signature`); }
  assert.equal(await page.evaluate(() => localStorage.getItem('hoyos.db.v1')), dbBefore);
  check('All thirteen historical loops load and archive leaves operational storage unchanged');
  await page.goto(`${url}/#/site/teachers?version=latest`); await page.waitForSelector('.site-teacher');
  await version(page).selectOption('archive'); await page.waitForSelector('.site[data-site-version="archive"]');
  await page.locator('.site-nav a[href*="/site/classes"]').click();
  await page.waitForSelector('.site-classrow'); assert.equal(await page.locator('.site-classrow').count(), 5);
  assert.ok(page.url().includes('version=archive'));
  await page.goBack(); await page.waitForSelector('.site-teacher'); assert.equal(await page.locator('.site-teacher').count(), 8);
  await page.goBack(); await page.waitForSelector('.site-teacher'); assert.equal(await page.locator('.site-teacher').count(), currentNames.length);
  await page.goForward(); await page.waitForSelector('.site-teacher'); assert.equal(await page.locator('.site-teacher').count(), 8);
  check('Archive browsing and browser Back/Forward preserve edition boundaries');
  await page.goto(`${url}/#/site/classes/?version=archive&video=on&motion=on`); await page.waitForSelector('.site-classrow');
  assert.equal(await page.locator('.site-classrow').count(), 5);
  await page.locator('.site-classrow').first().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('.site-classrow video')].some(v => v.readyState >= 2 && !v.paused));
  check('Trailing-slash class index and living class photography work');
  await page.goto(`${url}/#/site/classes/hot-yoga?version=archive`); await page.waitForSelector('.site-main h1');
  await version(page).selectOption('latest'); await page.waitForSelector('.site-classrow');
  assert.ok(page.url().includes('/site/classes?'));
  assert.equal(await page.locator('.site-classrow').count(), 7);
  check('Switching incompatible class details returns to the correct current class index');
  await page.goto(`${url}/#/site/plans?version=archive`); await page.waitForSelector('.membership-card');
  assert.equal(await page.locator('.membership-card').count(), 2);
  await page.getByRole('button', { name: 'Ver planes actuales', exact: true }).first().click();
  await page.waitForSelector('.site[data-site-version="latest"]');
  assert.equal(await page.locator('.membership-card').count(), 0);
  assert.ok(page.url().includes('/site/plans?version=latest'));
  check('Historical offer action opens current plans without an obsolete checkout');
  await page.goto(`${url}/#/site/schedule?version=archive`); await page.waitForSelector('.site[data-site-version="latest"]');
  assert.ok(page.url().includes('version=latest'));
  await page.goto(`${url}/#/site/teachers?version=archive`); await page.waitForSelector('.site-teacher');
  await page.goto(`${url}/#/site/teachers`); await page.waitForSelector('.site-teacher');
  assert.equal(await page.locator('.site-teacher').count(), currentNames.length);
  assert.deepEqual(await page.locator('.site-teacher h3').allTextContents(), currentNames);
  check('Operational archive URLs exit safely; bare URLs still open Latest after archive');
  await page.goto(`${url}/#/site/classes/ligereza?version=classic&motion=off&video=off`); await page.waitForSelector('.classarch');
  await page.locator('a.classarch').first().click(); await page.waitForSelector('.site-main h1');
  assert.ok(page.url().includes('version=classic')); assert.ok(page.url().includes('video=off'));
  check('Classic class navigation retains its explicit style and media preferences');
  // Capture both languages at the repo-required viewports, plus Fold overflow checks.
  const routes = [['W-01','/site'],['W-02','/site/about'],['W-03','/site/modalities'],['W-05','/site/teachers'],['W-07','/site/classes'],['W-08','/site/classes/hot-yoga'],['P-01','/site/plans']];
  for (const lang of ['es', 'en']) {
    await page.getByRole('button', {name:lang.toUpperCase(),exact:true}).first().click();
    for (const width of [390, 1280]) {
      await page.setViewportSize({width,height:width < 600 ? 844 : 900});
      for (const [code, route] of routes) {
        await page.goto(`${url}/#${route}?version=archive&motion=off&video=off`); await page.waitForSelector('.site-archive-notice');
        await noOverflow(page, `${lang} ${width} ${route}`); await capture(page,code,lang,width,'-archive');
      }
      await page.goto(`${url}/#/coming-soon`); await page.waitForSelector('.coming-soon'); await noOverflow(page, `Coming Soon ${lang} ${width}`); await capture(page,'W-11',lang,width);
    }
  }
  for (const width of [344,768,3840]) {
    await page.setViewportSize({width,height:900});
    for (const route of ['/site/teachers?version=archive','/site/classes?version=archive','/coming-soon']) { await page.goto(`${url}/#${route}`); await page.waitForSelector(route.includes('coming')?'.coming-soon':'.site'); await noOverflow(page,`${width} ${route}`); if (route === '/coming-soon') await capture(page,'W-11','en',width); }
  }
  await page.setViewportSize({width:344,height:844});
  await page.goto(`${url}/#/site/teachers?version=latest`); await page.waitForSelector('.site-teacher');
  await page.locator('.site-burger').click();
  await page.locator('.site-nav-tools select').selectOption('archive'); await page.waitForSelector('.site[data-site-version="archive"]');
  assert.equal(await page.locator('.site-teacher').count(),8); await noOverflow(page,'344 open menu archive');
  check('Both languages fit mobile/desktop; 344px Fold menu selector and 768px layouts work');
  await page.goto(`${url}/#/coming-soon?version=archive`); await page.waitForSelector('.coming-soon');
  assert.equal(await page.locator('.site-version, .site-archive-notice').count(), 0);
  assert.ok((await page.locator('.coming-soon-follow').getAttribute('href')).startsWith('https://www.instagram.com/'));
  assert.equal(await page.locator('.coming-soon-motion, .coming-soon video').count(), 0);
  const studioPhoto = page.locator('img.coming-soon-scene');
  assert.ok((await studioPhoto.getAttribute('src')).includes('studio-2026/facility-red-studio-1600.webp'));
  await studioPhoto.evaluate(async image => { await image.decode(); });
  assert.ok(await studioPhoto.evaluate(image => image.naturalWidth > 0));
  check('Coming Soon shows the real studio photo with no obsolete concept video or playback control');
  await capture(page, 'W-11', 'en', 344);
  const login = page.getByRole('button', {name:'Login',exact:true});
  const dialog = page.getByRole('dialog', {name:'Coming soon',exact:true});
  await login.click(); await dialog.waitFor();
  assert.ok(page.url().includes('login=soon'));
  assert.equal(await page.locator('form input[type="email"]').count(),0);
  await page.keyboard.press('Shift+Tab');
  assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)));
  await page.keyboard.press('Tab');
  assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)));
  await page.keyboard.press('Shift+Tab');
  assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)));
  await page.keyboard.press('Escape'); await dialog.waitFor({state:'hidden'});
  assert.ok(await login.evaluate(el=>el===document.activeElement));
  await login.click(); await dialog.waitFor();
  await page.goBack(); await dialog.waitFor({state:'hidden'});
  await page.goForward(); await dialog.waitFor();
  await dialog.getByRole('button',{name:'Close',exact:true}).last().click(); await dialog.waitFor({state:'hidden'});
  assert.ok(await login.evaluate(el=>el===document.activeElement));
  await login.click(); await dialog.waitFor();
  await page.locator('.drawer-overlay').click({position:{x:4,y:4}}); await dialog.waitFor({state:'hidden'});
  assert.ok(await login.evaluate(el=>el===document.activeElement));
  check('Coming Soon Login is an accessible placeholder: no auth, Close/Escape/Back/overlay and focus restoration work');
  await page.goto(`${url}/#/?login=soon`); await page.getByRole('dialog').waitFor();
  await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).last().click();
  await page.getByRole('dialog').waitFor({state:'hidden'}); assert.ok(!page.url().includes('login=soon'));
  await page.goto(`${url}/`); await page.waitForSelector('.coming-soon');
  assert.equal(await page.locator('.hub-card').count(),0);
  await page.goto(`${url}/#/hub`); await page.waitForSelector('.hub-card');
  const hubCard = page.locator('.hub-card').filter({hasText:'/coming-soon'});
  assert.equal(await hubCard.count(),1); await hubCard.getByRole('button').first().click(); await page.waitForSelector('.coming-soon');
  check('Root opens Coming Soon; the public hub remains at #/hub and its Coming Soon card works');
  for (const lang of ['es','en']) {
    await page.getByRole('button',{name:lang.toUpperCase(),exact:true}).first().click();
    for (const width of [390,1280]) {
      await page.setViewportSize({width,height:width<600?844:900});
      await page.locator('.coming-soon-login').click(); await page.getByRole('dialog').waitFor();
      await page.getByRole('dialog').evaluate(async el => { await Promise.all(el.getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().iterations !== Infinity).map(a=>a.finished.catch(()=>{}))); });
      const box = await page.getByRole('dialog').boundingBox();
      assert.ok(box && box.y >= -1 && box.y + box.height <= page.viewportSize().height + 1, 'Dialog must fit the settled viewport');
      await noOverflow(page,`${lang} ${width} login dialog`); await capture(page,'W-11',lang,width,'-login-coming-soon');
      await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({state:'hidden'});
    }
  }
  const reduced = await browser.newContext({ viewport: {width:1280,height:900}, reducedMotion:'reduce' });
  const quiet = await reduced.newPage();
  const reducedVideoRequests = []; quiet.on('request', r => { if (r.url().includes('/video/')) reducedVideoRequests.push(r.url()); });
  for (const route of ['/site/teachers?version=archive&motion=on&video=on','/coming-soon']) {
    await quiet.goto(`${url}/#${route}`); await quiet.waitForSelector(route.includes('coming')?'.coming-soon':'.site-teacher');
    await quiet.waitForTimeout(300);
    assert.equal(await quiet.locator('video').count(), 0);
    assert.deepEqual(reducedVideoRequests, []);
  }
  check('Reduced-motion uses static posters in both experiences');
  assert.deepEqual(result.errors,[]);
  assert.ok(result.media.every(m=>m.status < 400));
  check('No browser runtime or restored-media errors');
} catch (error) { result.errors.push(error.stack ?? String(error)); console.error(error); await mkdir(`${root}/qa`, {recursive:true}); await activePage?.screenshot({path:`${root}/qa/failure.jpg`,type:'jpeg',quality:68}).catch(()=>{}); process.exitCode = 1; }
finally {
  await mkdir(`${root}/qa`,{recursive:true}); await writeFile(`${root}/qa/website-preview.json`,JSON.stringify(result,null,2));
  await browser?.close(); server.kill('SIGTERM');
  if(server.exitCode === null) await Promise.race([once(server,'exit'),new Promise(r=>setTimeout(r,1000))]);
}
