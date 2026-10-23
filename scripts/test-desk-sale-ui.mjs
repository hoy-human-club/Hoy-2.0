import {settledCapture} from './qa-rendered-capture.mjs';
// RC-10: isolated fictional counter sales. No backend, payments, messages or private captures.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
const base=process.env.QA_BASE??'http://127.0.0.1:5173', output='docs/screenshots/S-04';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const errors=[],checks=[];
async function fixture(kind='open',lang='en',actor='usr_desk') {
 const ctx=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 await ctx.addInitScript(({lang,actor})=>{if(sessionStorage.getItem('sale-init'))return;sessionStorage.setItem('sale-init','1');localStorage.setItem('hoyos.session',JSON.stringify({userId:actor,devMode:false,viewAs:null}));localStorage.setItem('hoyos.lang',lang);},{lang,actor});
 await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
 const page=await ctx.newPage();await page.clock.install({time:new Date('2026-10-21T17:00:00Z')});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/#/staff/register`);await page.waitForFunction(()=>localStorage.getItem('hoyos.db.v1'));
 await page.evaluate(kind=>{
  const stored=JSON.parse(localStorage.getItem('hoyos.db.v1')),db=stored.db,stamp=new Date().toISOString();
  const row=(id,x)=>({id,tenant_id:db.users[0].tenant_id,created_at:stamp,updated_at:stamp,...x});
  const template=db.class_sessions.find(s=>s.status==='scheduled');
  db.class_sessions.push({...template,...row('qa_sale_session',{title:'QA Sale Session',template_id:null,starts_at:'2026-10-21T19:00:00Z',ends_at:'2026-10-21T19:50:00Z',status:'scheduled',capacity:1,booked_count:kind==='full'||kind==='duplicate'?1:0})});
  if(kind==='full'||kind==='duplicate')db.bookings.push(row('qa_occupied',{session_id:'qa_sale_session',user_id:kind==='duplicate'?'usr_cust':'qa_occupant',status:'booked',paid_with:'package',ledger_id:null,checked_in_at:null,cancelled_at:null,rated:false,mat_number:null}));
  if(kind==='returning-expired'||kind==='returning-frozen') {
   db.users.push({...db.users.find(u=>u.id==='usr_cust'),id:'qa_returning',email:'returning@example.test'});
   db.profiles.push({...db.profiles.find(p=>p.user_id==='usr_cust'),id:'qa_returning_profile',user_id:'qa_returning',full_name:'QA Returning Customer'});
   db.user_roles.push(row('qa_returning_role',{user_id:'qa_returning',role:'customer'}));
   db.class_ledger.push(row('qa_old_purchase',{user_id:'qa_returning',plan_id:'plan_pack12',payment_id:null,delta:12,reason:'purchase',expires_at:'2000-01-01',frozen_from:null,frozen_until:null}),row('qa_old_debits',{user_id:'qa_returning',plan_id:'plan_pack12',payment_id:null,delta:-12,reason:'booking',expires_at:null}));
   if(kind==='returning-frozen')db.class_ledger.push(row('qa_old_frozen',{user_id:'qa_returning',plan_id:'plan_pack12',payment_id:null,delta:12,reason:'purchase',expires_at:'2099-01-01',frozen_from:'2000-01-01',frozen_until:'2099-01-01'}));
  }
  localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));
 },kind);
 await page.reload();
 return {ctx,page};
}
const snapshot=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
async function fill(page,lang='en',existing=false,query='mariana') {
 if(existing){await page.getByRole('button',{name:'Existing member',exact:true}).click();await page.getByPlaceholder('Search by name, WhatsApp or email…').fill(query);await page.locator('.register-candidate').first().click();}
 else {await page.getByLabel(lang==='en'?'First name':'Nombre',{exact:false}).fill('QA Fictional Sale');await page.getByRole('textbox',{name:'WhatsApp',exact:true}).fill('+573000000099');await page.getByText(lang==='en'?'Accepts terms and data policy (verbal)':'Acepta términos y política de datos (verbal)',{exact:true}).click();}
 await page.getByLabel(lang==='en'?'Check in to class':'Check-in a la clase',{exact:true}).selectOption('qa_sale_session');
}
try {
 for(const lang of ['en','es']) {
  console.log(`Sale UI ${lang}: start`); const {ctx,page}=await fixture('open',lang);await fill(page,lang);
  for(const width of [390,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await settledCapture(page,{path:`${output}/${lang}-${width}-atomic-sale.jpg`,quality:72,fullPage:true});}
  await page.getByRole('button',{name:lang==='en'?'Toggle theme':'Cambiar tema',exact:true}).click();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  for(const width of [390,1280]){await page.setViewportSize({width,height:900});await settledCapture(page,{path:`${output}/${lang}-${width}-dark-atomic-sale.jpg`,quality:72,fullPage:true});}
  const before=await snapshot(page);await page.getByRole('button',{name:lang==='en'?'Complete sale':'Completar venta',exact:true}).click();await page.getByRole('heading',{name:lang==='en'?'Sale complete':'Venta completa',exact:true}).waitFor();
  await page.getByText(lang==='en'?'Local demonstration with fictional data. Does not process real payments.':'Demostración local con datos ficticios. No procesa pagos reales.',{exact:false}).waitFor();
  const db=await snapshot(page),profile=db.profiles.find(p=>p.full_name==='QA Fictional Sale'),uid=profile.user_id;
  assert.equal(db.users.length,before.users.length+1);assert.equal(db.user_roles.filter(r=>r.user_id===uid).length,1);assert.equal(db.consents.filter(r=>r.user_id===uid).length,1);
  const payments=db.payments.filter(p=>p.user_id===uid),ledger=db.class_ledger.filter(r=>r.user_id===uid),bookings=db.bookings.filter(b=>b.user_id===uid);
  assert.equal(payments.length,1);assert.equal(payments[0].status,'approved');assert.equal(db.invoices.filter(i=>i.payment_id===payments[0].id).length,0,'launch sale must not issue an invoice');assert.equal(payments[0].frontend_receipt.kind,'fictional-payment-receipt');assert.equal(payments[0].frontend_receipt.delivery,'preview-only');assert.deepEqual([...payments[0].frontend_receipt.previewChannels].sort(),['email','whatsapp']);assert.equal(ledger.filter(r=>r.delta>0).length,1);assert.equal(ledger.filter(r=>r.delta===-1).length,1);assert.equal(bookings.length,1);assert.equal(bookings[0].ledger_id,ledger.find(r=>r.delta===-1).id);assert.equal(bookings[0].status,'checked_in');assert.equal(bookings[0].paid_with,'trial');assert.equal(ledger.find(r=>r.delta===-1).payment_id,payments[0].id);assert.equal(db.class_sessions.find(s=>s.id==='qa_sale_session').booked_count,1);
  assert.equal(db.message_log.filter(r=>r.user_id===uid).length,0,'receipt preview never queues or sends messages');
  for(const theme of ['dark','light']){if(theme==='light')await page.getByRole('button',{name:lang==='en'?'Toggle theme':'Cambiar tema',exact:true}).click();for(const width of [390,1280]){await page.setViewportSize({width,height:900});await settledCapture(page,{path:`${output}/${lang}-${width}-${theme}-atomic-receipt.jpg`,quality:72,fullPage:true});}}
  checks.push(`${lang}: fictional new-person consent, approved payment/receipt snapshot, one purchase/debit/check-in, receipt preview only; no invoice/outbox, EN/ES 390/1280 light/dark form/receipt`);await ctx.close();
 }
 const admin=await fixture('open','en','usr_admin');await fill(admin.page);const adminBefore=await snapshot(admin.page);await admin.page.getByRole('button',{name:'Complete sale',exact:true}).click();await admin.page.getByRole('heading',{name:'Sale complete',exact:true}).waitFor();const adminDb=await snapshot(admin.page);const adminAudit=adminDb.audit_log.filter(a=>!adminBefore.audit_log.some(old=>old.id===a.id)&&a.action!=='mock.transaction');assert(adminAudit.length>0);assert(adminAudit.every(a=>a.actor_id==='usr_admin'&&a.diff?.role==='admin'&&a.diff?.source==='front_desk'));checks.push('administrator sale retains actual actor/effective role and front-desk source in every staged audit row');await admin.ctx.close();
 for(const kind of ['returning-expired','returning-frozen']) {
  console.log(`Sale UI ${kind}: start`); const {ctx,page}=await fixture(kind);await fill(page,'en',true,'QA Returning Customer');
  await page.getByText('Individual class',{exact:true}).click();
  const before=await snapshot(page),history=before.class_ledger.filter(r=>r.user_id==='qa_returning');
  await page.getByRole('button',{name:'Complete sale',exact:true}).click();await page.getByRole('heading',{name:'Sale complete',exact:true}).waitFor();
  const db=await snapshot(page),payment=db.payments.find(p=>!before.payments.some(old=>old.id===p.id)),booking=db.bookings.find(b=>b.user_id==='qa_returning'&&b.session_id==='qa_sale_session');
  assert.equal(db.users.length,before.users.length);assert.equal(db.payments.length,before.payments.length+1);assert.equal(booking.paid_with,'single');
  const debit=db.class_ledger.find(r=>r.id===booking.ledger_id);assert.equal(debit.payment_id,payment.id);assert.equal(debit.delta,-1);
  assert.equal(db.class_ledger.filter(r=>r.payment_id===payment.id&&r.delta>0).length,1);assert.deepEqual(db.class_ledger.filter(r=>history.some(h=>h.id===r.id)),history);
  checks.push(`${kind}: approved new single sale checks in once, spends exact new payment, preserves historical purchased terms`);await ctx.close();
 }
 for(const kind of ['full','duplicate','pending','storage']) {
  console.log(`Sale UI ${kind}: start`); const {ctx,page}=await fixture(kind==='full'||kind==='duplicate'?kind:'open');await fill(page,'en',kind==='duplicate');if(kind==='duplicate')await page.getByText('Individual class',{exact:true}).click();
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
