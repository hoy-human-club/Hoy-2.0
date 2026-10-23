import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const base=process.env.QA_BASE??'http://127.0.0.1:5391',errors=[],checks=[];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
try{
 for(const lang of ['es','en']){
  const context=await browser.newContext({viewport:{width:390,height:900}});await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
  await context.addInitScript(lang=>{localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_cust',devMode:false,viewAs:null}));localStorage.setItem('hoyos.lang',lang);},lang);
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(20000);
  for(const table of ['payments','invoices','plans']){
   await p.goto(base+'/#/coming-soon');await p.evaluate(async table=>{const h=await import('/scripts/launch-receipts-harness.tsx');h.mountReceiptHistory(table);},table);
   const harness=p.locator('#receipt-history-harness');await harness.getByText(lang==='en'?'We could not load payments. Please retry.':'No pudimos cargar los pagos. Reintenta.',{exact:true}).waitFor();assert.equal(await harness.locator('.listrow').count(),0);
   const before=await p.evaluate(()=>localStorage.getItem('hoyos.db.v1'));await p.evaluate(()=>window.receiptFault='');await harness.getByRole('button',{name:lang==='en'?'Retry':'Reintentar',exact:true}).click();await harness.locator('.listrow').first().waitFor();assert.equal(await harness.getByText(lang==='en'?'We could not load payments. Please retry.':'No pudimos cargar los pagos. Reintenta.',{exact:true}).count(),0);assert.equal(await p.evaluate(()=>localStorage.getItem('hoyos.db.v1')),before);checks.push(`${lang}/${table}: actual History read failure contained, no stale payment actions, retry restores rows without writes`);
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log(checks.join('\n'));
}finally{await browser.close();}
