import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const pet=process.env.PROJECT==='petrock',prefix=pet?'petrock':'hoyos',code=pet?'A-28a':'M-09d';
const base=process.env.QA_BASE || (pet?'http://127.0.0.1:5193':'http://127.0.0.1:5192');
const route=pet?'/admin/subscriptions':'/admin/finance/subscriptions';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:1280,height:1000}}),page=await ctx.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await ctx.addInitScript(prefix=>{if(!sessionStorage.getItem('catalog-init')){localStorage.setItem(prefix+'.session',JSON.stringify({userId:'usr_super',devMode:false,viewAs:null}));localStorage.setItem(prefix+'.lang','en');sessionStorage.setItem('catalog-init','yes');}},prefix);
await mkdir(`docs/screenshots/${code}/catalog`,{recursive:true});
try{
 await page.goto(`${base}/#${route}`);const panel=page.locator('.app-directory');await panel.getByRole('heading',{name:'Apps & subscriptions',exact:true}).waitFor();
 assert.equal(await panel.locator('.service-card').count(),5);assert(await panel.locator('.service-logo').evaluateAll(imgs=>imgs.every(img=>img.complete && img.naturalWidth>0)));
 assert((await panel.textContent()).includes('No active subscriptions recorded.'));
 assert((await panel.textContent()).includes('Not recorded'));
 for(const lang of ['en','es']){
  await page.evaluate(({prefix,lang})=>localStorage.setItem(prefix+'.lang',lang),{prefix,lang});await page.reload();await panel.waitFor();
  for(const width of [390,768,1280,1920,3840]){
   await page.setViewportSize({width,height:1000});await page.waitForTimeout(150);assert(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   if(lang==='en' && width===1280) { await page.setViewportSize({width,height:3000});await page.evaluate(()=>window.scrollTo(0,0));await panel.locator('.service-catalog').screenshot({path:`docs/screenshots/${code}/catalog/overview-1280.png`});await page.setViewportSize({width,height:1000}); }
   await page.screenshot({path:`docs/screenshots/${code}/catalog/${lang}-${width}.jpg`,quality:85,fullPage:true});
  }
 }
 await page.evaluate(prefix=>localStorage.setItem(prefix+'.lang','en'),prefix);await page.reload();await page.setViewportSize({width:1280,height:1000});
 const clerk=panel.locator('.service-card').filter({has:page.getByRole('heading',{name:'Clerk',exact:true})});await clerk.getByRole('button',{name:'Track service'}).click();
 await panel.locator('[name="accountOwner"]').fill('QA owner — fictional');await panel.locator('[name="loginEmail"]').fill('owner@example.test');await panel.locator('[name="accountLabel"]').fill('QA workspace');await panel.locator('[name="passwordManagerRef"]').fill('1Password · QA vault / Clerk test item');await panel.getByRole('button',{name:'Save record',exact:true}).click();
 assert((await panel.textContent()).includes('No active subscriptions recorded.'));
 await panel.getByRole('button',{name:'Add subscription',exact:true}).click();await panel.locator('[name="selectedPlan"]').fill('QA negotiated plan — fixture');await panel.locator('[name="billingEmail"]').fill('finance@example.test');await panel.locator('[name="receiptInbox"]').fill('receipts@example.test');await panel.locator('[name="receiptMailbox"]').selectOption('gmail');await panel.locator('[name="receiptPortalUrl"]').fill('https://dashboard.clerk.com');await panel.locator('[name="status"]').selectOption('active');await panel.getByRole('button',{name:'Save record',exact:true}).click();
 assert.equal(await panel.locator('a[href*="mail.google.com"]').count(),1);assert((await panel.textContent()).includes('1 unknown'));
 await panel.getByRole('button',{name:'Record charge',exact:true}).click();for(const [n,v] of [['amount','13'],['chargedOn','2026-10-17'],['reference','QA-only-001'],['evidence','Fictional QA receipt']])await panel.locator(`[name="${n}"]`).fill(v);await panel.getByRole('button',{name:'Save record',exact:true}).click();
 assert((await panel.textContent()).includes('excluded: 1'));
 const history=panel.locator('details').filter({has:page.locator('summary').filter({hasText:'Actual charge history'})});await history.locator('summary').click();await history.getByRole('button',{name:'Link / verify receipt'}).click();
 await panel.locator('[name="currency"]').fill('USD');await panel.locator('[name="receiptUrl"]').fill('https://mail.google.com/mail/u/0/#inbox/qa123');await panel.locator('[name="currencyVerified"]').check();await panel.getByRole('button',{name:'Save record',exact:true}).click();
 assert.equal(await panel.locator('a[href="https://mail.google.com/mail/u/0/#inbox/qa123"]').count(),1);assert((await panel.textContent()).includes('excluded: 0'));
 const download=page.waitForEvent('download');await panel.getByRole('button',{name:'Export backup'}).click();assert((await download).suggestedFilename().endsWith('-app-records.json'));
 await page.reload();assert((await panel.textContent()).includes('receipts@example.test'));
 await page.screenshot({path:`docs/screenshots/${code}/catalog/account-receipts-1280.jpg`,quality:85,fullPage:true});
 await page.evaluate(prefix=>localStorage.setItem(prefix+'.theme',JSON.stringify({theme:'dark',skin:'styled',brand:'petrock'})),prefix);await page.reload();await panel.waitFor();await page.screenshot({path:`docs/screenshots/${code}/catalog/en-1280-dark.jpg`,quality:85,fullPage:true});
 assert.deepEqual(errors,[]);await writeFile(`docs/screenshots/${code}/catalog/results.json`,JSON.stringify({checks:['5 real logos loaded','public prices do not create subscriptions','en/es 390–3840 no overflow','account owner/login/vault reference','selected plan separate from list price','billing contact separate from receipt inbox','manual Gmail receipt search','unverified currency excluded','existing charge receipt linking/verification','backup export','reload persistence','dark mode'],errors},null,2));console.log('PASS service catalog '+prefix);
}finally{await browser.close();}
