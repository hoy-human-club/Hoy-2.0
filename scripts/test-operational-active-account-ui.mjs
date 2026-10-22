// Rendered active-account boundary supplement; all data is isolated fictional browser storage.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE??'http://127.0.0.1:5276',checks=[],errors=[];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
try{for(const lang of ['en','es'])for(const scope of ['email','expense']){
 const ctx=await browser.newContext({viewport:{width:lang==='en'?390:1280,height:1000},reducedMotion:'reduce'});
 await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
 await ctx.addInitScript(lang=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_admin',viewAs:null,devMode:false}));},lang);
 const page=await ctx.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/#/${scope==='email'?'admin/emails':'admin/finance/expenses'}`);
 await page.locator(scope==='email'?'.emails-item':'[data-expense-ledger]').first().waitFor();
 await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('hoyos.db.v1'));state.db.users.find(u=>u.id==='usr_admin').status='inactive';localStorage.setItem('hoyos.db.v1',JSON.stringify(state));});
 await page.reload();const before=await page.evaluate(()=>localStorage.getItem('hoyos.db.v1'));
 if(scope==='email'){
  await page.locator('.emails-item').first().click();await page.getByText(lang==='en'?'The scoped saved version could not be read. Reload to retry.':'No se pudo leer la versión guardada propia. Recarga para reintentar.',{exact:true}).waitFor();
  const save=page.getByRole('button',{name:new RegExp('^'+(lang==='en'?'Save v':'Guardar v'))});assert.equal(await save.count(),0,'inactive editor exposes no save control');
 }else{
  await page.getByText(lang==='en'?'Owned records could not be read. Previous rows are hidden and changes are blocked. Retry the read.':'No se pudieron leer los registros propios. No se muestran datos anteriores y se bloquean cambios. Reintenta la lectura.',{exact:true}).waitFor();
  assert.equal(await page.locator('[data-expense-form]').count(),0,'inactive ledger hides mutation form');
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('hoyos.db.v1')),before,'inactive read must not mutate fixture');
 await page.screenshot({path:`docs/screenshots/${scope==='email'?'M-04':'M-09c'}/${lang}-active-account-blocked.jpg`,quality:72,fullPage:true,animations:'disabled'});
 await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('hoyos.db.v1'));state.db.users.find(u=>u.id==='usr_admin').status='active';localStorage.setItem('hoyos.db.v1',JSON.stringify(state));});await page.reload();
 if(scope==='email'){await page.locator('.emails-item').first().click();await page.getByRole('button',{name:new RegExp('^'+(lang==='en'?'Save v':'Guardar v'))}).waitFor();}
 else await page.locator('[data-expense-form]').waitFor();
 checks.push(`${scope}/${lang}: actual inactive account read blocks edit without writes; restored active account reload recovers existing editor`);await ctx.close();
}assert.deepEqual(errors,[]);await writeFile('docs/frontend-completion/evidence/operational-active-account-ui.json',JSON.stringify({base,checks,errors,browserClosed:true,limits:'Local command guard only; no authentication/session/security configuration changed.'},null,2)+'\n');console.log('PASS actual active-account UI '+checks.length+' matrices');}finally{await browser.close();}
