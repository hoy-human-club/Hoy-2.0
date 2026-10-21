// RC-10: isolated fictional counter sales. No backend, payments, messages or private captures.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
const base=process.env.QA_BASE??'http://127.0.0.1:5173', output='docs/screenshots/S-04';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const errors=[],checks=[];
async function fixture(kind='open',lang='en') {
 const ctx=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 await ctx.addInitScript(lang=>{if(sessionStorage.getItem('sale-init'))return;sessionStorage.setItem('sale-init','1');localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_desk',devMode:false,viewAs:null}));localStorage.setItem('hoyos.lang',lang);},lang);
 await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
 const page=await ctx.newPage();await page.clock.install({time:new Date('2026-10-21T17:00:00Z')});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/#/staff/register`);await page.waitForFunction(()=>localStorage.getItem('hoyos.db.v1'));
 await page.evaluate(kind=>{
  const stored=JSON.parse(localStorage.getItem('hoyos.db.v1')),db=stored.db,stamp=new Date().toISOString();
  const row=(id,x)=>({id,tenant_id:db.users[0].tenant_id,created_at:stamp,updated_at:stamp,...x});
  const template=db.class_sessions.find(s=>s.status==='scheduled');
  db.class_sessions.push({...template,...row('qa_sale_session',{title:'QA Sale Session',template_id:null,starts_at:'2026-10-21T19:00:00Z',ends_at:'2026-10-21T19:50:00Z',status:'scheduled',capacity:1,booked_count:kind==='full'||kind==='duplicate'?1:0})});
  if(kind==='full'||kind==='duplicate')db.bookings.push(row('qa_occupied',{session_id:'qa_sale_session',user_id:kind==='duplicate'?'usr_cust':'qa_occupant',status:'booked',paid_with:'package',ledger_id:null,checked_in_at:null,cancelled_at:null,rated:false,mat_number:null}));
  localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));
 },kind);
 await page.reload();
 return {ctx,page};
}
const snapshot=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
async function fill(page,lang='en',existing=false) {
 if(existing){await page.getByRole('button',{name:'Existing member',exact:true}).click();await page.getByPlaceholder('Search by name, WhatsApp or email…').fill('mariana');await page.locator('.register-candidate').first().click();}
 else {await page.getByLabel(lang==='en'?'First name':'Nombre',{exact:false}).fill('QA Fictional Sale');await page.getByRole('textbox',{name:'WhatsApp',exact:true}).fill('+573000000099');await page.getByText(lang==='en'?'Accepts terms and data policy (verbal)':'Acepta términos y política de datos (verbal)',{exact:true}).click();}
 await page.getByLabel(lang==='en'?'Check in to class':'Check-in a la clase',{exact:true}).selectOption('qa_sale_session');
}
try {
 for(const lang of ['en','es']) {
  console.log(`Sale UI ${lang}: start`); const {ctx,page}=await fixture('open',lang);await fill(page,lang);
  for(const width of [390,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`${output}/${lang}-${width}-atomic-sale.jpg`,quality:72,fullPage:true});}
  await page.getByRole('button',{name:lang==='en'?'Toggle theme':'Cambiar tema',exact:true}).click();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  for(const width of [390,1280]){await page.setViewportSize({width,height:900});await page.screenshot({path:`${output}/${lang}-${width}-dark-atomic-sale.jpg`,quality:72,fullPage:true});}
  const before=await snapshot(page);await page.getByRole('button',{name:lang==='en'?'Complete sale':'Completar venta',exact:true}).click();await page.getByRole('heading',{name:lang==='en'?'Sale complete':'Venta completa',exact:true}).waitFor();
  const db=await snapshot(page),profile=db.profiles.find(p=>p.full_name==='QA Fictional Sale'),uid=profile.user_id;
  assert.equal(db.users.length,before.users.length+1);assert.equal(db.user_roles.filter(r=>r.user_id===uid).length,1);assert.equal(db.consents.filter(r=>r.user_id===uid).length,1);
  const payments=db.payments.filter(p=>p.user_id===uid),ledger=db.class_ledger.filter(r=>r.user_id===uid),bookings=db.bookings.filter(b=>b.user_id===uid);
  assert.equal(payments.length,1);assert.equal(payments[0].status,'approved');assert.equal(db.invoices.filter(i=>i.payment_id===payments[0].id).length,1);assert.equal(ledger.filter(r=>r.delta>0).length,1);assert.equal(ledger.filter(r=>r.delta===-1).length,1);assert.equal(bookings.length,1);assert.equal(bookings[0].ledger_id,ledger.find(r=>r.delta===-1).id);assert.equal(bookings[0].status,'checked_in');assert.equal(db.class_sessions.find(s=>s.id==='qa_sale_session').booked_count,1);
  assert(db.message_log.filter(r=>r.user_id===uid).every(r=>r.status==='queued'&&r.sent_at===null),'receipt stays mock queued');
  for(const theme of ['dark','light']){if(theme==='light')await page.getByRole('button',{name:lang==='en'?'Toggle theme':'Cambiar tema',exact:true}).click();for(const width of [390,1280]){await page.setViewportSize({width,height:900});await page.screenshot({path:`${output}/${lang}-${width}-${theme}-atomic-receipt.jpg`,quality:72,fullPage:true});}}
  checks.push(`${lang}: fictional new-person consent, approved payment/invoice, one purchase/debit/check-in, receipt queued, EN/ES 390/1280 light/dark form/receipt`);await ctx.close();
 }
 for(const kind of ['full','duplicate','pending','storage']) {
  console.log(`Sale UI ${kind}: start`); const {ctx,page}=await fixture(kind==='full'||kind==='duplicate'?kind:'open');await fill(page,'en',kind==='duplicate');
  if(kind==='pending')await page.getByRole('radio',{name:/Wompi link/}).click();
  const before=await snapshot(page);
  if(kind==='storage')await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='hoyos.db.v1')throw new DOMException('QA quota failure','QuotaExceededError');return original.call(this,k,v);};});
  await page.getByRole('button',{name:kind==='pending'?'Create link, leave pending':'Complete sale',exact:true}).click();
  await page.locator('.emptystate-error').waitFor();
  assert.deepEqual(await snapshot(page),before,`${kind}: entire saved database unchanged after rejected sale`);
  checks.push(`${kind}: rejected counter sale leaves users/consents/payments/invoices/ledger/bookings/counters unchanged`);await ctx.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${output}/atomic-sale-results.json`,JSON.stringify({feature:'RC-10',base,checks,errors,limits:['Fictional browser transaction only; backend settlement, authorization and durable idempotency remain pending.']},null,2));console.log(checks.join('\n'));
}finally{await browser.close();}
