import {settledCapture} from './qa-rendered-capture.mjs';
// PR-06 fictional deterministic frontend-only fixture. Blocks all external requests.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE??'http://127.0.0.1:5173';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const errors=[],checks=[],output=process.env.QA_OUTPUT??'docs/screenshots/C-04';await mkdir(output,{recursive:true});
try {
 for(const lang of ['en','es']) {
  const ctx=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
  await ctx.addInitScript(lang=>{if(sessionStorage.getItem('pending-init'))return;sessionStorage.setItem('pending-init','1');localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_cust',devMode:false,viewAs:null}));},lang);
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-10-21T17:00:00Z')});
  await page.goto(`${base}/#/app/classes`);await page.waitForFunction(()=>localStorage.getItem('hoyos.db.v1'));
  await page.evaluate(()=>{
   const stored=JSON.parse(localStorage.getItem('hoyos.db.v1')),db=stored.db,stamp=new Date().toISOString(),user='usr_cust';
   db.memberships=db.memberships.filter(r=>r.user_id!==user);db.class_ledger=db.class_ledger.filter(r=>r.user_id!==user);db.bookings=db.bookings.filter(r=>r.user_id!==user);db.payments=db.payments.filter(r=>r.user_id!==user);
   const source=db.class_sessions.find(s=>s.status==='scheduled');const modality=db.modalities.find(m=>!/yoga|vinyasa|flow|yin|ligereza|hibrido|alineacion/.test(m.slug));
   db.class_sessions.push({...source,id:'qa_pending_class',title:'QA Pending Class',modality_id:modality.id,starts_at:'2026-10-24T17:10:00Z',ends_at:'2026-10-24T18:00:00Z',booked_count:0,capacity:6,created_at:stamp,updated_at:stamp});
   localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));
  });
  await page.goto(`${base}/#/app/checkout/qa_pending_class?pass=pack12`);await page.reload();
  await page.getByText(lang==='en'?'Local demonstration with fictional data. Does not process real payments.':'Demostración local con datos ficticios. No procesa pagos reales.',{exact:true}).waitFor();
  await page.getByRole('button',{name:lang==='en'?'At the front desk':'En recepción',exact:true}).click();
  await page.getByRole('button',{name:lang==='en'?/Request demo desk payment/:/Solicitar pago demo/}).click();
  await page.getByText(lang==='en'?'Pending payment at the desk':'Pendiente de pago en recepción',{exact:true}).first().waitFor();
  const result=await page.evaluate(()=>{const db=JSON.parse(localStorage.getItem('hoyos.db.v1')).db;return {payments:db.payments.filter(p=>p.user_id==='usr_cust'),ledger:db.class_ledger.filter(r=>r.user_id==='usr_cust'),bookings:db.bookings.filter(r=>r.user_id==='usr_cust'),count:db.class_sessions.find(s=>s.id==='qa_pending_class').booked_count};});
  assert.equal(result.payments.length,1);assert.equal(result.payments[0].status,'pending');assert.equal(result.ledger.length,0);assert.equal(result.bookings.length,0);assert.equal(result.count,0);
  for(const width of [390,1280]) {await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await settledCapture(page,{path:`${output}/${lang}-${width}-pending-package.jpg`,quality:72,fullPage:false});}
  checks.push(`${lang}: pending package request creates one payment, no purchase/debit/booking/capacity; EN/ES mobile and desktop pending notice`);
  // Confirmed demo payment activates the package and uses one class atomically.
  // An independent, earlier-expiring grant must survive an explicit fresh package purchase unchanged.
  await page.evaluate(()=>{const stored=JSON.parse(localStorage.getItem('hoyos.db.v1')),db=stored.db,stamp=new Date().toISOString();db.class_ledger.push({id:'qa_older_grant',tenant_id:db.users[0].tenant_id,user_id:'usr_cust',plan_id:'plan_pack12',payment_id:null,delta:3,reason:'purchase',expires_at:'2026-10-30',frozen_from:null,frozen_until:null,created_at:stamp,updated_at:stamp});localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));});
  await page.getByRole('button',{name:lang==='en'?'Back to schedule':'Volver al horario',exact:true}).click();
  await page.goto(`${base}/#/app/checkout/qa_pending_class?pass=pack12`);await page.reload();
  await page.getByRole('button',{name:lang==='en'?/Pay .* with Wompi/:/Pagar .* con Wompi/}).click();
  await page.getByRole('button',{name:lang==='en'?'View my booking':'Ver mi reserva',exact:true}).waitFor();
  const approved=await page.evaluate(()=>{const db=JSON.parse(localStorage.getItem('hoyos.db.v1')).db;return {payments:db.payments.filter(p=>p.user_id==='usr_cust'),ledger:db.class_ledger.filter(r=>r.user_id==='usr_cust'),bookings:db.bookings.filter(r=>r.user_id==='usr_cust'),count:db.class_sessions.find(s=>s.id==='qa_pending_class').booked_count};});
  assert.equal(approved.payments.filter(p=>p.status==='approved').length,1);assert.equal(approved.ledger.filter(r=>r.reason==='purchase').length,2);assert.equal(approved.ledger.reduce((n,r)=>n+r.delta,0),14);
  const newPurchase=approved.ledger.find(r=>r.reason==='purchase'&&r.payment_id===approved.payments.find(p=>p.status==='approved').id);
  assert.equal(approved.ledger.find(r=>r.delta===-1).purchase_ledger_id,newPurchase.id,'explicit new package consumes its own purchased grant');
  assert.equal(approved.ledger.find(r=>r.id==='qa_older_grant').delta,3,'older grant unchanged');assert.equal(approved.bookings.length,1);assert.equal(approved.count,1);
  const audit=await page.evaluate(id=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.audit_log.filter(r=>r.action==='booking.create'&&r.entity_id===id),approved.bookings[0].id);assert.equal(audit.length,1);assert.equal(audit[0].actor_id,'usr_cust');assert.equal(audit[0].diff.role,'customer');assert(Number.isFinite(Date.parse(audit[0].created_at)));
  const outcome=await page.evaluate(id=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.audit_log.filter(r=>r.action==='payment.mock.approved'&&r.entity_id===id),approved.payments.find(p=>p.status==='approved').id);assert.equal(outcome.length,1);assert.equal(outcome[0].actor_id,'usr_cust');assert.equal(outcome[0].diff.simulated,true);
  checks.push(`${lang}: confirmed demo payment activates 12 classes with stored expiry, one booking/debit linked to exact fresh purchase, old 3-class grant retained (total14); pending request remains separate`);
  // A storage failure on package-only checkout must leave no payment, invoice or grant behind.
  await page.goto(`${base}/#/app/plans?plan=pack12`);
  await page.getByRole('button',{name:lang==='en'?/Pay .* with Wompi/:/Pagar .* con Wompi/}).waitFor();
  const beforeFailure=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='hoyos.db.v1')throw new Error('QA storage failure');return original.call(this,k,v);};});
  await page.getByRole('button',{name:lang==='en'?/Pay .* with Wompi/:/Pagar .* con Wompi/}).click();
  await page.getByText(lang==='en'?'The demo purchase could not be saved. No classes were activated. You can retry.':'No se pudo guardar la compra demo. No se activaron clases. Puedes reintentar.',{exact:true}).waitFor();
  const afterFailure=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
  for(const table of ['payments','invoices','class_ledger','bookings','audit_log'])assert.deepEqual(afterFailure[table],beforeFailure[table],`${table} unchanged after package purchase save failure`);
  const failureOutput=process.env.QA_OUTPUT?`${output}/failure`:'docs/screenshots/C-06';await mkdir(failureOutput,{recursive:true});
  for(const width of [390,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await settledCapture(page,{path:`${failureOutput}/${lang}-${width}-purchase-failure.jpg`,quality:72,fullPage:false});}
  checks.push(`${lang}: package-only persistence failure reports retry, rolls back payment/invoice/grant, EN/ES desktop/mobile error notice`);
  await ctx.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${output}/pending-results.json`,JSON.stringify({feature:'PR-06',base,checks,errors,limits:['Frontend MockProvider only; no real charge, server approval or capacity hold.','Pending checkout creates request only; backend settlement and replay integration remains Anu work.']},null,2));console.log(checks.join('\n'));
} finally {await browser.close();}
