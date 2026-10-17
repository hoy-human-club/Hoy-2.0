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
 const labels=await p.locator('.deskshell-grouplabel').allTextContents();assert.deepEqual(labels,['Overview','Operations','Community','Content','Finance','Administration','Design system']);
 const overview=await group(p,'Overview');assert(await expanded(overview));await overview.click();assert(!await expanded(overview));await overview.focus();await p.keyboard.press('Space');assert(await expanded(overview));
 const community=await group(p,'Community');await community.click();assert(await expanded(community));await p.reload();assert(await expanded(await group(p,'Community')));
 await (await group(p,'Community')).click();await p.evaluate(()=>location.hash='/admin/crm/deletions');await p.locator('.deskshell-link.is-active').filter({hasText:'Deletion'}).waitFor();assert(await expanded(await group(p,'Community')));assert.equal(await p.locator('.deskshell-link.is-active').count(),1);
 await (await group(p,'Community')).click();assert(!await expanded(await group(p,'Community')));
 await p.evaluate(()=>location.hash='/admin');await p.waitForTimeout(200);await p.goBack();await p.waitForTimeout(200);assert(await expanded(await group(p,'Community')));
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
 for(const [user,route,absent] of [['usr_admin','/admin',['Design system']],['usr_coord','/admin',['Finance','Design system']],['usr_fin','/admin',['Content','Design system']],['usr_desk','/staff',['Overview','Finance','Administration','Design system']],['usr_mkt','/admin/content',['Overview','Finance','Administration','Design system']],['usr_dev','/dev/specs',['Overview','Community','Finance','Content']],['usr_maint','/staff',['Overview','Community','Finance','Content','Administration','Design system']]]) {
  const {page,ctx}=await start(user,'en',1280,route);const names=await page.locator('.deskshell-grouplabel').allTextContents();for(const label of absent)assert(!names.includes(label),`${user}: no ${label}`);
  for(const el of await page.locator('.deskshell-groupitems').all())assert(await el.locator('a').count()>0);
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
