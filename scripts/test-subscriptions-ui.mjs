import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
const pet=process.env.PROJECT==='petrock';const root=process.cwd();
const base=process.env.QA_BASE ?? (pet?'http://127.0.0.1:5193':'http://127.0.0.1:5192');const route=pet?'/admin/subscriptions':'/admin/finance/subscriptions';
const prefix=pet?'petrock':'hoyos';const code=pet?'A-28a':'M-09d';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const errors=[];
const ctx=await browser.newContext({viewport:{width:1280,height:960}});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
await ctx.addInitScript(({prefix})=>{if(!sessionStorage.getItem('init')){localStorage.setItem(prefix+'.session',JSON.stringify({userId:'usr_super',devMode:false,viewAs:null}));localStorage.setItem(prefix+'.lang','en');sessionStorage.setItem('init','1');}},{prefix});
await mkdir(`${root}/docs/screenshots/${code}`,{recursive:true});
try {
 await page.goto(`${base}/#${route}`);const panel=page.locator('.app-directory');await panel.getByRole('heading',{name:'Apps & subscriptions',exact:true}).waitFor();
 await panel.getByRole('button',{name:'Add app',exact:true}).click();
 for(const [name,value] of [['provider','QA Example'],['product','QA Cloud'],['purpose','TEST FIXTURE — not a real subscription'],['officialUrl','https://example.com'],['relatedProjects','QA only']]) await panel.locator(`[name="${name}"]`).fill(value);
 await panel.getByRole('button',{name:'Save record',exact:true}).click();await panel.getByRole('heading',{name:'QA Cloud',exact:true}).waitFor();
 await panel.getByRole('button',{name:'Add subscription',exact:true}).click();
 await panel.locator('[name="nextChargeDate"]').fill('2024-01-31');await panel.locator('[name="status"]').selectOption('active');
 await panel.getByRole('button',{name:'Save record',exact:true}).click();assert((await panel.textContent()).includes('Following: 2024-02-29'));
 assert((await panel.textContent()).includes('1 unknown'));assert((await panel.textContent()).includes('Unknown / monthly'));
 await page.reload();await panel.getByRole('heading',{name:'QA Cloud',exact:true}).waitFor();
 await panel.getByRole('button',{name:'Edit subscription',exact:true}).click();await panel.locator('[name="expectedAmount"]').fill('12');await panel.locator('[name="paymentAccountLabel"]').fill('QA account label');await panel.getByRole('button',{name:'Save record',exact:true}).click();
 await panel.getByRole('button',{name:'Record charge',exact:true}).click();
 for(const [name,value] of [['amount','12'],['currency','USD'],['chargedOn','2026-10-01'],['reference','qa-receipt-1'],['evidence','TEST ONLY receipt reference']]) await panel.locator(`[name="${name}"]`).fill(value);
 await panel.getByRole('button',{name:'Save record',exact:true}).click();
 await panel.getByRole('button',{name:'Record charge',exact:true}).click();
 for(const [name,value] of [['amount','12'],['currency','USD'],['chargedOn','2026-10-01'],['reference','qa-receipt-1'],['evidence','TEST ONLY receipt reference']]) await panel.locator(`[name="${name}"]`).fill(value);
 await panel.getByRole('button',{name:'Save record',exact:true}).click();await panel.getByRole('alert').filter({hasText:'already been recorded'}).waitFor();await panel.getByRole('button',{name:'Cancel',exact:true}).click();await page.reload();
 for(const lang of ['en','es']) {
  await page.evaluate(({prefix,lang})=>localStorage.setItem(prefix+'.lang',lang),{prefix,lang});await page.reload();await panel.waitFor();
  for(const width of [390,768,1280,1920,3840]) {
   await page.setViewportSize({width,height:960});await page.waitForTimeout(150);
   assert(await panel.getByRole('searchbox').evaluate(el=>el.getBoundingClientRect().width>=200),'search remains usable');
   assert(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1),`${prefix} ${lang} ${width} panel overflow`);
   await page.screenshot({path:`${root}/docs/screenshots/${code}/${lang}-${width}.jpg`,quality:80,fullPage:true});
  }
 }
 for(const width of [390,1280]) {
  await page.evaluate(prefix=>localStorage.setItem(prefix+'.theme',JSON.stringify({theme:'dark',skin:'styled',brand:'petrock'})),prefix);await page.reload();await panel.waitFor();await page.setViewportSize({width,height:960});await page.screenshot({path:`${root}/docs/screenshots/${code}/es-${width}-dark.jpg`,quality:80,fullPage:true});
 }
 // Failed storage writes must not create a record or report success.
 await page.evaluate(prefix=>localStorage.setItem(prefix+'.lang','en'),prefix);await page.reload();await panel.waitFor();
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('hub.app-subscriptions.'))throw new Error('Storage quota test');return original.call(this,k,v);};});
 await panel.getByRole('button',{name:'Edit app',exact:true}).click();await panel.locator('[name="product"]').fill('Must not persist');await panel.getByRole('button',{name:'Save record',exact:true}).click();await panel.getByRole('alert').filter({hasText:'Storage quota test'}).waitFor();await page.reload();await panel.getByRole('heading',{name:'QA Cloud',exact:true}).waitFor();
 // A stale editor must not overwrite a save from another tab.
 await panel.getByRole('button',{name:'Edit app',exact:true}).click();
 const other=await ctx.newPage();await other.goto(`${base}/#${route}`);const otherPanel=other.locator('.app-directory');await otherPanel.getByRole('button',{name:'Edit app',exact:true}).click();await otherPanel.locator('[name="purpose"]').fill('TEST FIXTURE updated in second tab');await otherPanel.getByRole('button',{name:'Save record',exact:true}).click();await other.close();
 await panel.getByRole('button',{name:'Save record',exact:true}).click();await panel.getByRole('alert').filter({hasText:'another tab'}).waitFor();
 // Independent restricted session must never mount the storage-backed panel.
 const denied=await browser.newContext();await denied.addInitScript(({prefix})=>localStorage.setItem(prefix+'.session',JSON.stringify({userId:'usr_customer',devMode:false,viewAs:null})),{prefix});const p=await denied.newPage();await p.goto(`${base}/#${route}`);await p.waitForTimeout(800);assert.equal(await p.locator('.app-directory').count(),0);await denied.close();
 assert.deepEqual(errors,[]);await writeFile(`${root}/docs/screenshots/${code}/results.json`,JSON.stringify({checks:['create/edit app and subscription','unknown amount','leap-day preview','reload persistence','record charge','duplicate reference rejected','customer denied','storage quota failure','stale tab conflict','dark mode','en/es responsive 390/768/1280/1920/3840'],errors},null,2));console.log('PASS UI '+prefix);
} finally {await browser.close();}
