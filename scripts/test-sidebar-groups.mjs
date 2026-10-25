import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.QA_BASE || 'http://127.0.0.1:5192';
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
const errors=[], checks=[];
await mkdir('qa/sidebar', {recursive:true});
await mkdir('docs/screenshots/M-01', {recursive:true});
async function start(userId='usr_super',lang='en',width=1280,route='/admin',viewAs=null) {
 const ctx=await browser.newContext({viewport:{width,height:900}});
 await ctx.addInitScript(({userId,lang,viewAs})=>{if(!sessionStorage.getItem('qa-init')) {localStorage.setItem('hoyos.session',JSON.stringify({userId,viewAs,devMode:false}));localStorage.setItem('hoyos.lang',lang);sessionStorage.setItem('qa-init','yes');}}, {userId,lang,viewAs});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/#${route}`);await page.locator('.deskshell-nav').waitFor({state:'attached'});
 return {page,ctx};
}
async function group(page,name){return page.locator('.deskshell-grouplabel').filter({hasText:name});}
async function expanded(button){return await button.getAttribute('aria-expanded')==='true';}
try {
 const {page:p,ctx}=await start();
 // 0159 · IA phase 1: Studio is grouped by job; design tools moved to the Build workspace.
 const labels=await p.locator('.deskshell-grouplabel').allTextContents();assert.deepEqual(labels,['Today at the studio','People','Sales','Finance','Studio','Reports','Administration']);
 const today=await group(p,'Today at the studio');assert(await expanded(today));await today.click();assert(!await expanded(today));await today.focus();await p.keyboard.press('Space');assert(await expanded(today));
 const sales=await group(p,'Sales');assert(!await expanded(sales));await sales.click();assert(await expanded(sales));await p.reload();assert(await expanded(await group(p,'Sales')));
 await (await group(p,'People')).click();await p.evaluate(()=>location.hash='/admin/crm/deletions');await p.locator('.deskshell-link.is-active').filter({hasText:'Deletion'}).waitFor();assert(await expanded(await group(p,'People')));assert.equal(await p.locator('.deskshell-link.is-active').count(),1);
 await (await group(p,'People')).click();assert(!await expanded(await group(p,'People')));
 await p.evaluate(()=>location.hash='/admin');await p.waitForTimeout(200);await p.goBack();await p.waitForTimeout(200);assert(await expanded(await group(p,'People')));
 // One home at the top, the wordmark goes home (never the hub), no spec code with dev mode off, no build status in any label.
 await p.evaluate(()=>location.hash='/admin');await p.waitForTimeout(200);
 assert.equal(await p.locator('.deskshell-link').filter({hasText:/^Home$/}).count(),1);
 assert.equal(await p.locator('.deskshell-mark').getAttribute('href'),'#/admin');assert.equal(await p.locator('.topbar-code').count(),0);
 for(const text of await p.locator('.deskshell-linktext').allTextContents())assert(!/demo|prototype|local drafts|trial/i.test(text),`status in label: ${text}`);
 assert.equal(await p.locator('.deskshell-badge').count(),3);assert.equal(await p.locator('.deskshell-hublink').getAttribute('href'),'#/hub');
 // Studio / Build switcher: the Build workspace lists only the design-system routes.
 assert.deepEqual(await p.locator('.deskshell-ws').allTextContents(),['Studio','Build']);
 await p.locator('.deskshell-ws').filter({hasText:'Build'}).click();await p.waitForURL(/#\/dev$/);await p.locator('.deskshell-ws.is-on').filter({hasText:'Build'}).waitFor();
 assert.deepEqual(await p.locator('.deskshell-grouplabel').allTextContents(),['Design system']);
 await p.locator('.deskshell-ws').filter({hasText:'Studio'}).click();await p.waitForURL(/#\/admin$/);
 checks.push('one Home, wordmark home, no codes or status in labels, three badges, Studio/Build switcher');
 await p.evaluate(()=>location.hash='/dev/layout/M-01');await p.waitForTimeout(300);assert(await expanded(await group(p,'Design system')));
 await p.evaluate(()=>location.hash='/admin');await p.waitForTimeout(300);
 // Change actual users and effective roles in the mounted shell; no reload may hide stale callbacks.
 await p.locator('#rs-user').selectOption('usr_admin');await p.locator('.topbar-lead').click();assert(await p.locator('.deskshell').evaluate(el=>el.classList.contains('is-rail')));
 await p.locator('.topbar-lead').click();await p.locator('#rs-user').selectOption('usr_super');assert(!await p.locator('.deskshell').evaluate(el=>el.classList.contains('is-rail')));
 await p.getByLabel('View as', {exact:true}).selectOption('finance');await p.locator('.topbar-lead').focus();await p.keyboard.press('[');assert(await p.locator('.deskshell').evaluate(el=>el.classList.contains('is-rail')));await p.keyboard.press('[');
 await p.getByLabel('View as', {exact:true}).selectOption('');
 checks.push('user and view-as preference isolation, non-default layout editor reveal');
 checks.push('category order, repeated/keyboard toggles, reload persistence, nested active route and Back');
 await p.evaluate(()=>location.hash='/admin');await p.waitForTimeout(200);await p.locator('.deskshell-collapse').click();assert(await p.locator('.deskshell').evaluate(el=>el.classList.contains('is-rail')));
 await p.setViewportSize({width:390,height:844});await p.locator('.topbar-lead').click();assert.equal(await p.locator('.deskshell-grouplabel:visible').count(),7);assert(!(await p.locator('.deskshell').evaluate(el=>el.classList.contains('is-rail'))));
 await p.keyboard.press('Escape');assert(!await p.locator('.deskshell').evaluate(el=>el.classList.contains('is-open')));assert(await p.locator('.topbar-lead').evaluate(el=>el===document.activeElement));assert(await p.locator('.deskshell-side').evaluate(el=>el.inert));
 checks.push('desktop rail to mobile full drawer, Escape and hidden drawer inert');await ctx.close();
 for(const [user,route,absent,switcher] of [['usr_admin','/admin',['Design system'],false],['usr_coord','/admin',['Finance','Design system'],false],['usr_fin','/admin',['Studio','Design system'],false],['usr_desk','/staff',['Reports','Finance','Administration','Design system'],false],['usr_mkt','/admin/content',['Reports','Finance','Administration','Design system'],false],['usr_dev','/dev/specs',['Today at the studio','People','Finance','Studio'],true],['usr_maint','/staff',['Reports','People','Sales','Finance','Administration','Design system'],false]]) {
  const {page,ctx}=await start(user,'en',1280,route);const names=await page.locator('.deskshell-grouplabel').allTextContents();for(const label of absent)assert(!names.includes(label),`${user}: no ${label}`);
  for(const el of await page.locator('.deskshell-groupitems').all())assert(await el.locator('a').count()>0);
  assert.equal(await page.locator('.deskshell-workspace').count(),switcher?1:0,`${user}: workspace switcher`);
  if(!route.startsWith('/dev'))assert.equal(await page.locator('.deskshell-link').filter({hasText:/^Home$/}).count(),1,`${user}: one Home`);
  await page.screenshot({animations:'disabled',path:`docs/screenshots/M-01/sidebar-${user}-en-1280.jpg`,quality:85});
  checks.push(`${user}: filtered, nonempty categories`);await ctx.close();
 }
 for(const lang of ['es','en'])for(const width of [390,768,1280,1920,3840]) {
  const {page,ctx}=await start('usr_super',lang,width);
  if(width<=900)await page.locator('.topbar-lead').click();
  const bounds=await page.locator('.deskshell-grouplabel').evaluateAll(els=>els.map(el=>({h:el.getBoundingClientRect().height,w:el.getBoundingClientRect().width,scroll:el.scrollWidth,client:el.clientWidth})));
  assert(bounds.every(b=>b.h>=44 && b.w>=44 && b.scroll<=b.client));
  await page.waitForTimeout(350);
  if(width<=900)assert.equal(Math.round((await page.locator('.deskshell-side').boundingBox()).x),0);
  const file=`docs/screenshots/M-01/sidebar-${lang}-${width}.jpg`;await page.screenshot({animations:'disabled',path:file,quality:85});
  if(width===1280){await page.locator('.deskshell-iconbtn').click();await page.screenshot({animations:'disabled',path:`docs/screenshots/M-01/sidebar-${lang}-${width}-dark.jpg`,quality:85});}
  checks.push(`${lang} ${width}: targets, label fit, capture`);await ctx.close();
 }
 assert.deepEqual(errors,[]);await writeFile('qa/sidebar/results.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
} finally {await browser.close();}
