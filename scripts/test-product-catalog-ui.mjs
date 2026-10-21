// PR-01/PR-02 isolated browser fixtures: local draft catalog, no operational purchase.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir,writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE??'http://127.0.0.1:5173';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const errors=[],checks=[];const output='docs/screenshots/M-16';await mkdir(output,{recursive:true});
try {
 const ctx=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
 await ctx.addInitScript(()=>{if(sessionStorage.getItem('product-fixture'))return;sessionStorage.setItem('product-fixture','1');localStorage.setItem('hoyos.lang','en');localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_admin',viewAs:null,devMode:false}));});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-10-21T17:00:00Z')});
 await page.goto(`${base}/#/admin/products`);await page.getByRole('heading',{name:'Product master',exact:true}).waitFor();
 const initial=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1'));return s.db.plans.map(p=>({id:p.id,price:p.price,active:p.active,name_es:p.name_es}));});
 await page.getByRole('button',{name:'New test product',exact:true}).click();await page.getByRole('button',{name:'Save local draft',exact:true}).click();await page.getByRole('alert').filter({hasText:'Code:'}).waitFor();
 for(const [name,value] of [['code','QA_PACK'],['name_es','Paquete ficticio QA'],['name_en','QA fictional package'],['classes','12'],['validity','90'],['amount_0','100000'],['starts_0','2026-10-01'],['ends_0','2026-10-31']])await page.locator(`[name="${name}"]`).fill(value);
 await page.locator('.products-fields .toggle').click();assert(await page.getByRole('switch').isChecked());await page.getByRole('button',{name:'Add price window',exact:true}).click();
 for(const [name,value] of [['amount_1','120000'],['starts_1','2026-10-31']])await page.locator(`[name="${name}"]`).fill(value);
 await page.getByRole('button',{name:'Save local draft',exact:true}).click();await page.getByRole('alert').filter({hasText:'cannot overlap'}).waitFor();
 await page.locator('[name="starts_1"]').fill('2026-11-01');await page.getByRole('button',{name:'Save local draft',exact:true}).click();await page.getByText('Local draft saved. Not published.',{exact:true}).waitFor();
 const unchanged=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1'));return s.db.plans.filter(p=>!p.slug.startsWith('draft-')).map(p=>({id:p.id,price:p.price,active:p.active,name_es:p.name_es}));});assert.deepEqual(unchanged,initial,'legacy public plan fields never change');
 const findCard=()=>page.locator('.card').filter({has:page.getByRole('heading',{name:'QA fictional package',exact:true})}).first();
 // Card uses title text, not an assumed heading level.
 let edit=page.getByRole('button',{name:'Edit draft',exact:true});await edit.click();await page.locator('[name="quote_date"]').fill('2026-10-21');assert.match(await page.getByTestId('quote-amount').innerText(),/100[.,]000/);
 await page.getByRole('button',{name:'Keep fictional example',exact:true}).click();await page.locator('[name="amount_0"]').fill('150000');await page.getByRole('button',{name:'Save local draft',exact:true}).click();await page.getByText('Local draft saved. Not published.',{exact:true}).waitFor();assert.match(await page.getByTestId('quote-snapshot').innerText(),/100[.,]000/);
 await page.getByRole('button',{name:'Edit draft',exact:true}).click();assert.match(await page.getByTestId('quote-amount').innerText(),/150[.,]000/);await page.locator('[name="quote_date"]').fill('2026-11-01');assert.match(await page.getByTestId('quote-amount').innerText(),/120[.,]000/);await page.locator('[name="quote_date"]').fill('2026-09-30');await page.getByText('No price exists for this date. Quoting is blocked.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Discard changes',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Edit draft',exact:true}).click();assert.equal(await page.locator('[name="amount_0"]').inputValue(),'150000');
 for(const lang of ['en','es']) {
  await page.evaluate(l=>localStorage.setItem('hoyos.lang',l),lang);await page.reload();await page.getByRole('button',{name:lang==='en'?'Edit draft':'Editar borrador',exact:true}).click();
  for(const width of [390,1280]){
   await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.evaluate(()=>{document.querySelectorAll('*').forEach(el=>{if(el.scrollTop)el.scrollTop=0;});window.scrollTo(0,0);});
   await page.screenshot({path:`${output}/${lang}-${width}.jpg`,quality:72});
   await page.locator('[name="code"]').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${lang}-${width}-editor.jpg`,quality:72});
   await page.locator('[name="amount_0"]').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${lang}-${width}-prices.jpg`,quality:72});
   await page.locator('[name="quote_date"]').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${lang}-${width}-quote.jpg`,quality:72});
  }
 }
 checks.push('admin create/edit/local reload, metadata validation, overlap rejection, date quote, gap block, immutable fictional example, retained revision history, EN/ES 390/1280, legacy public pricing unchanged');
 // Failure injection affects only the mock DB storage write; the form must remain open.
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='hoyos.db.v1')throw new Error('QA quota');return original.call(this,k,v);};});
 await page.locator('[name="name_en"]').fill('Must not persist');await page.getByRole('button',{name:'Guardar borrador local',exact:true}).click();await page.getByRole('alert').filter({hasText:'No se pudo guardar'}).waitFor();assert.equal(await page.locator('[name="name_en"]').inputValue(),'Must not persist');
 checks.push('failed local persistence keeps editor and reports error');
 for(const id of ['usr_desk','usr_cust']){const denied=await browser.newContext();await denied.addInitScript(id=>localStorage.setItem('hoyos.session',JSON.stringify({userId:id,viewAs:null,devMode:false})),id);const p=await denied.newPage();await p.goto(`${base}/#/admin/products`);await p.waitForURL('**/#/no-access?**');await denied.close();}checks.push('front desk and customer route denied');
 await ctx.close();assert.deepEqual(errors,[]);await writeFile(`${output}/results.json`,JSON.stringify({featureIds:['PR-01','PR-02'],base,checks,errors,limits:['Operational checkout uses legacy pricing; prototype quotes are disconnected.','Read loading/error injection requires dev module imports; provider contract pending.','Server atomic revision/audit and authenticated tenant/role enforcement unverified.']},null,2));console.log(checks.join('\n'));
}finally{await browser.close();}
