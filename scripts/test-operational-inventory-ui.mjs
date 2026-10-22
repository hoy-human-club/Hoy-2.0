// Actual shared expense feedback inventory. Read-only examples must not write any fixture rows.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE??'http://127.0.0.1:5276',checks=[],errors=[];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
try{for(const lang of ['en','es'])for(const theme of ['light','dark']){
 const ctx=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
 await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
 await ctx.addInitScript(({lang,theme})=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.theme',JSON.stringify({theme,skin:'styled'}));localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_super',viewAs:null,devMode:false}));},{lang,theme});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);await page.goto(`${base}/#/dev/components`);
 const section=page.locator('#cmp-ExpenseLedgerStatus');await section.locator('[data-expense-status]').first().waitFor();
 const before=await page.evaluate(()=>localStorage.getItem('hoyos.db.v1'));
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:1000});await section.scrollIntoViewIfNeeded();assert(await section.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'feedback inventory overflow');
  const panels=section.locator('[data-expense-status]');assert.equal(await panels.count(),7,'default/saved/stopped/conflict/busy/retry/readerror actual shared views');
  for(const index of [1,3,6]){await panels.nth(index).scrollIntoViewIfNeeded();await page.screenshot({path:`docs/screenshots/M-09c/${lang}-${width}-${theme}-inventory-${index}.jpg`,quality:72,animations:'disabled'});}
 }
 await section.getByRole('button',{name:lang==='en'?'Retry':'Reintentar',exact:true}).first().click();assert.equal(await page.evaluate(()=>localStorage.getItem('hoyos.db.v1')),before,'inventory examples must not write');checks.push(`${lang}/${theme}: actual shared expense feedback default/saved/stopped/conflict/busy/retry/readerror fit390/1280; read-only example leaves database unchanged`);await ctx.close();
}assert.deepEqual(errors,[]);await writeFile('docs/frontend-completion/evidence/operational-inventory-ui.json',JSON.stringify({base,checks,errors,browserClosed:true,limits:'Fictional library feedback examples only; no accounting, role or backend acceptance.'},null,2)+'\n');console.log('PASS operational inventory '+checks.length+' matrices');}finally{await browser.close();}
