// RS-09: isolated fictional future-day booking and purchased validity fixtures.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
const base=process.env.QA_BASE ?? 'http://127.0.0.1:5187';
const output=process.env.QA_OUTPUT??'docs/screenshots/C-08b';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',args:['--no-sandbox']});
const errors=[],checks=[];
try {
 for(const lang of ['en','es']) {
  const ctx=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
  await ctx.addInitScript(lang=>{localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_cust',devMode:false,viewAs:null}));localStorage.setItem('hoyos.lang',lang);},lang);
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-11-01T05:00:00Z')});
  await page.goto(`${base}/#/app`);await page.waitForFunction(()=>localStorage.getItem('hoyos.db.v1'));
  await page.evaluate(()=>{
   const stored=JSON.parse(localStorage.getItem('hoyos.db.v1')),db=stored.db,template=db.class_sessions.find(s=>s.status==='scheduled'),tenant_id=template.tenant_id;
   const stamp='2026-10-25T17:00:00Z',row=(id,extra)=>({id,tenant_id,created_at:stamp,updated_at:stamp,...extra});
   const original={...template,...row('qa_rs_original',{title:'QA Original Class',starts_at:'2026-11-01T18:00:00Z',ends_at:'2026-11-01T18:50:00Z',status:'scheduled',capacity:6,booked_count:1,template_id:null})};
   db.class_sessions=[original,{...original,id:'qa_rs_target',title:'QA Future Replacement',starts_at:'2026-11-03T18:00:00Z',ends_at:'2026-11-03T18:50:00Z',booked_count:0},{...original,id:'qa_rs_expired',title:'QA Beyond Purchased Validity',starts_at:'2026-11-05T18:00:00Z',ends_at:'2026-11-05T18:50:00Z',booked_count:0}];
   db.bookings=[row('qa_rs_booking',{user_id:'usr_cust',session_id:original.id,status:'booked',paid_with:'package',ledger_id:'qa_rs_debit',rated:false})];
   db.class_ledger=[row('qa_rs_purchase',{user_id:'usr_cust',plan_id:'plan_pack12',delta:1,reason:'purchase',expires_at:'2026-11-04'}),row('qa_rs_debit',{created_at:'2026-10-26T17:00:00Z',user_id:'usr_cust',delta:-1,reason:'booking',purchase_ledger_id:'qa_rs_purchase'})];
   db.class_templates=[];db.waitlist=[];localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));
  });
  const url=`${base}/#/app/booking/qa_rs_booking/change`;await page.goto(url);await page.reload();
  const move=()=>page.getByRole('button',{name:lang==='en'?/Reschedule to another class/:/Reprogramar a otra clase/});
  await move().click();
  const date=page.getByLabel(lang==='en'?'Replacement class date':'Día de la nueva clase');
  assert.equal(await date.getAttribute('max'),'2026-11-04');
  await date.fill('2026-11-05');await page.getByText(lang==='en'?'No eligible replacements on this day':'No hay alternativas válidas para este día',{exact:true}).waitFor();
  assert.equal(await page.getByText('QA Beyond Purchased Validity',{exact:true}).count(),0);
  await date.fill('2026-11-03');await page.getByText('QA Future Replacement',{exact:true}).waitFor();
  for(const theme of ['light','dark']) {
   await page.evaluate(theme=>localStorage.setItem('hoyos.theme',JSON.stringify({theme,skin:'styled'})),theme);await page.reload();await move().click();await date.fill('2026-11-03');
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme);
   for(const width of [390,1280]) {
    await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:`${output}/${lang}-${width}-${theme}-future-day.jpg`,quality:72,fullPage:true});
   }
  }
  // Leaving the move picker is a cancellation of the edit, never of the booking.
  await page.getByRole('button',{name:lang==='en'?'Back':'Volver',exact:true}).click();
  await page.getByRole('button',{name:lang==='en'?'Keep my booking':'Mantener mi reserva',exact:true}).click();
  let db=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
  assert.equal(db.bookings.filter(b=>b.id==='qa_rs_booking'||b.session_id==='qa_rs_target').length,1);assert.equal(db.bookings.find(b=>b.id==='qa_rs_booking').status,'booked');
  await page.goto(url);await move().click();await date.fill('2026-11-03');
  const before=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('hoyos.db.v1')).db.class_ledger));
  // Inject local mock-persistence failure, observe original retained, then retry successfully.
  await page.evaluate(()=>{window.qaSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='hoyos.db.v1')throw new DOMException('QA fictional quota failure','QuotaExceededError');return window.qaSetItem.call(this,key,value);};});
  await page.getByText('QA Future Replacement',{exact:true}).click();
  await page.getByText(lang==='en'?'The change was not saved. Your original booking is still active; try again.':'No se guardó el cambio. Tu reserva original sigue activa; vuelve a intentarlo.',{exact:true}).waitFor();
  db=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);assert.equal(db.bookings.filter(b=>b.id==='qa_rs_booking'||b.session_id==='qa_rs_target').length,1);assert.equal(db.bookings.find(b=>b.id==='qa_rs_booking').status,'booked');
  for(const width of [390,1280]) { await page.setViewportSize({width,height:1000}); await page.screenshot({path:`${output}/${lang}-${width}-dark-reschedule-retry.jpg`,quality:72,fullPage:true}); }
  await page.evaluate(()=>{Storage.prototype.setItem=window.qaSetItem;});
  await page.getByText('QA Future Replacement',{exact:true}).click();await page.waitForURL(u=>!u.hash.endsWith('/change'));
  db=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
  assert.equal(JSON.stringify(db.class_ledger),before);assert.equal(db.bookings.find(b=>b.id==='qa_rs_booking').status,'cancelled');
  assert.equal(db.bookings.filter(b=>b.session_id==='qa_rs_target'&&b.status==='booked').length,1);
  assert.equal(db.bookings.find(b=>b.session_id==='qa_rs_target').ledger_id,'qa_rs_debit');
  const audit=db.audit_log.filter(r=>r.action==='booking.reschedule'&&r.entity_id==='qa_rs_booking');assert.equal(audit.length,1);assert.equal(audit[0].actor_id,'usr_cust');assert.equal(audit[0].diff.role,'customer');assert(Number.isFinite(Date.parse(audit[0].created_at)));
  assert.equal(db.class_sessions.find(s=>s.id==='qa_rs_target').booked_count,1);assert.equal(db.class_sessions.find(s=>s.id==='qa_rs_original').booked_count,0);
  checks.push(`${lang}: future-day date and original expiry, out-of-validity hidden, cancel-edit unchanged, storage failure retains original, retry moves once with same debit, desktop/mobile light/dark`);await ctx.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${output}/future-day-results.json`,JSON.stringify({feature:'RS-09',role:'customer',base,checks,errors,limits:['Fictional browser-local transaction, no server authorization or cross-device atomicity.','Ambiguous historical debit allocation requires Anu reconciliation; cancellation policy unchanged.']},null,2));console.log(checks.join('\n'));
} finally {await browser.close();}
