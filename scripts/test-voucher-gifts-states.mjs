import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base=process.env.HOY_TEST_URL||'http://127.0.0.1:5174';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const results=[];
try{
const page=await browser.newPage({viewport:{width:390,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{localStorage.setItem('hoyos.lang','en');if(!localStorage.getItem('hoyos.session'))localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_cust',devMode:false,viewAs:null}));});
await page.goto(`${base}/#/app/voucher-gifts`);const prepare=page.getByRole('button',{name:'Prepare test transfer',exact:true});
await prepare.waitFor();await page.waitForFunction(()=>!!localStorage.getItem('hoyos.db.v1'));
const snapshot=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')));
for(const theme of ['light','dark']){
 await page.evaluate(theme=>localStorage.setItem('hoyos.theme',JSON.stringify({theme,skin:'styled'})),theme);await page.reload();await prepare.waitFor();
 await page.screenshot({path:`docs/screenshots/C-37/en-390-${theme}-empty.jpg`,fullPage:true,quality:72});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));results.push({theme,empty:true,noOverflow:true});
}
await page.evaluate(()=>{const fixture=JSON.parse(localStorage.getItem('hoyos.db.v1'));fixture.db.plans.filter(p=>p.id.startsWith('plan_gift')).forEach(p=>p.active=false);localStorage.setItem('hoyos.db.v1',JSON.stringify(fixture));});
await page.reload();await prepare.waitFor();await page.waitForFunction(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent==='Prepare test transfer');return button?.disabled;});
assert(await prepare.isDisabled(),'unavailable quotation cannot prepare transfer');results.push({quoteUnavailable:true,prepareDisabled:true});
await page.evaluate(snapshot=>{localStorage.setItem('hoyos.db.v1',JSON.stringify(snapshot));localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_super',devMode:true,viewAs:null}));},snapshot);
await page.goto(`${base}/?library=1#/dev/components`);await page.reload();const library=page.locator('#cmp-VoucherGiftDemo');await library.waitFor();
assert.equal(await library.locator('.lib-usage').count(),7);await library.getByRole('heading',{name:'This voucher has expired and cannot be redeemed.',exact:true}).waitFor();
assert.equal(await library.getByRole('button',{name:'Redeem once in rehearsal',exact:true}).count(),0);
results.push({libraryUsages:7,expiredPreview:true});assert.deepEqual(errors,[]);
await writeFile('docs/frontend-completion/evidence/voucher-gifts-states.json',JSON.stringify({base,results,pageErrors:errors},null,2)+'\n');
console.log('PASS production gift states: light/dark empty, unavailable quote blocked, seven D-02 usages and expired preview');
}finally{await browser.close();}
