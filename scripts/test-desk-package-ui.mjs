// RC-04/RC-05: isolated fictional frontend fixtures; no backend or payment requests.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
const base = process.env.QA_BASE ?? 'http://127.0.0.1:5173';
const output = 'docs/screenshots/S-02';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
const errors = [], checks = [];
try {
 const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
 await ctx.addInitScript(() => { if (sessionStorage.getItem('desk-init')) return; sessionStorage.setItem('desk-init','1'); localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_desk',devMode:false,viewAs:null})); localStorage.setItem('hoyos.lang','en'); });
 await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, route=>route.abort());
 const page = await ctx.newPage(); await page.clock.install({time:new Date('2026-10-21T17:00:00Z')}); page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/#/staff/checkin`); await page.waitForFunction(()=>localStorage.getItem('hoyos.db.v1'));
 await page.evaluate(()=>{
  const stored=JSON.parse(localStorage.getItem('hoyos.db.v1')),db=stored.db,stamp=new Date().toISOString();
  const row=(id,extra)=>({id,tenant_id:db.users[0].tenant_id,created_at:stamp,updated_at:stamp,...extra});
  const template=db.class_sessions.find(s=>s.status==='scheduled');
  for(const [i,name] of ['Balance','Pending'].entries()) {
   const id=`qa_desk_${i}`; db.users.push({...db.users.find(u=>u.id==='usr_cust'),id,email:`desk${i}@example.test`,phone:`+57300000000${i}`});
   db.profiles.push({...db.profiles.find(p=>p.user_id==='usr_cust'),id:`qa_profile_${i}`,user_id:id,full_name:`QA ${name}`,initials:'QA'});
   db.user_roles.push(row(`qa_role_${i}`,{user_id:id,role:'customer'}));
   db.payments.push(row(`qa_pay_${i}`,{user_id:id,plan_id:'plan_pack12',amount:10000,currency:'COP',status:i?'pending':'approved',provider:'manual',method:'cash'}));
   // Legacy expired purchase and unlinked usage must not consume today's new purchase.
   db.class_ledger.push({...row(`qa_old_${i}`,{user_id:id,plan_id:'plan_pack12',payment_id:null,delta:12,reason:'purchase',expires_at:'2026-04-01'}),created_at:'2026-01-01T12:00:00Z'}, {...row(`qa_old_use_${i}`,{user_id:id,plan_id:'plan_pack12',payment_id:null,delta:-12,reason:'booking',expires_at:null}),created_at:'2026-02-01T12:00:00Z'});
   db.class_ledger.push(row(`qa_purchase_${i}`,{user_id:id,plan_id:'plan_pack12',payment_id:`qa_pay_${i}`,delta:3,reason:'purchase',expires_at:'2026-12-01',frozen_from:null,frozen_until:null}));
  }
  db.class_sessions.push({...template,...row('qa_desk_class',{title:'QA Future Session',starts_at:'2026-10-22T18:00:00Z',ends_at:'2026-10-22T18:50:00Z',capacity:2,booked_count:0,status:'scheduled',template_id:null})});
  db.class_sessions.push({...template,...row('qa_walkin_class',{title:'QA Walk-in Session',starts_at:'2026-10-23T18:00:00Z',ends_at:'2026-10-23T18:50:00Z',capacity:2,booked_count:0,status:'scheduled',template_id:null})});
  localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));
 });
 await page.reload();
 // 0154: the scheduled-class picker is a Combobox — type part of the title, then pick the option.
 const pickClass=async title=>{const box=page.getByRole('combobox',{name:'Book for a customer · scheduled class'});await box.fill(title);await page.getByRole('option',{name:new RegExp(title)}).click();};
 await pickClass('QA Future Session');
 let search=page.getByPlaceholder('Name, WhatsApp or email…'); await search.fill('QA Balance');
 // Use button scope because the reusable roster class is intentionally private to the component.
 let book=page.getByRole('button',{name:'Book · 1 class',exact:true}); await book.waitFor(); assert(await book.isEnabled());
 await page.getByText('3 classes available · expires',{exact:false}).waitFor();
 for(const lang of ['en','es']) {
  await page.evaluate(l=>localStorage.setItem('hoyos.lang',l),lang); await page.reload();
  search=page.getByPlaceholder(lang==='en'?'Name, WhatsApp or email…':'Nombre, WhatsApp o email…'); await search.fill('QA Balance');
  for(const theme of ['light','dark']) {
   await page.evaluate(theme=>localStorage.setItem('hoyos.theme',JSON.stringify({theme,skin:'styled'})),theme); await page.reload(); await search.fill('QA Balance'); assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme);
  for(const width of [390,1280]) {
   await page.setViewportSize({width,height:900});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'desk fits mobile and desktop viewport');
   await page.screenshot({path:`${output}/${lang}-${width}${theme==='dark'?'-dark':''}-package-booking.jpg`,quality:72,fullPage:true});
  }
  }
 }
 await page.evaluate(()=>localStorage.setItem('hoyos.lang','en')); await page.reload(); await page.setViewportSize({width:1280,height:900});
 search=page.getByPlaceholder('Name, WhatsApp or email…'); await search.fill('QA Balance');
 await page.getByRole('button',{name:'Book · 1 class',exact:true}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.bookings.some(b=>b.user_id==='qa_desk_0'&&b.session_id==='qa_desk_class'));
 let state=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
 assert.equal(state.bookings.filter(b=>b.user_id==='qa_desk_0'&&b.session_id==='qa_desk_class').length,1);
 assert.equal(state.class_ledger.filter(r=>r.user_id==='qa_desk_0'&&r.delta===-1).length,1);
 assert.equal(state.class_ledger.find(r=>r.id===state.bookings.find(b=>b.user_id==='qa_desk_0'&&b.session_id==='qa_desk_class').ledger_id).purchase_ledger_id,'qa_purchase_0','new debit keeps exact grant identity');
 assert.equal(state.class_ledger.find(r=>r.id==='qa_old_0').delta,12,'historical purchase unchanged');
 assert.equal(state.class_sessions.find(s=>s.id==='qa_desk_class').booked_count,1);
 const audit=state.audit_log.find(a=>a.entity_id===state.bookings.find(b=>b.user_id==='qa_desk_0'&&b.session_id==='qa_desk_class').id);assert.equal(audit.diff.role,'front_desk');assert.equal(audit.diff.source,'front_desk');
 await search.fill('QA Pending'); await page.getByText('No confirmed classes available · take payment first',{exact:false}).waitFor(); assert(await page.getByRole('button',{name:'Book · 1 class',exact:true}).isDisabled());
 assert(await page.locator('.checkin-side').getByRole('button',{name:'Check in',exact:true}).isDisabled());
 await pickClass('QA Walk-in Session'); await search.fill('QA Balance');
 await page.locator('.checkin-side').getByRole('button',{name:'Check in',exact:true}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.bookings.some(b=>b.user_id==='qa_desk_0'&&b.session_id==='qa_walkin_class'));
 state=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
 assert.equal(state.class_ledger.filter(r=>r.user_id==='qa_desk_0'&&r.delta===-1).length,2);
 assert.equal(state.bookings.find(b=>b.user_id==='qa_desk_0'&&b.session_id==='qa_walkin_class').status,'checked_in');
 await search.fill('QA Balance'); await page.getByRole('button',{name:'Undo',exact:true}).click(); await page.getByRole('button',{name:'Check in',exact:true}).click();
 state=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db); assert.equal(state.class_ledger.filter(r=>r.user_id==='qa_desk_0'&&r.delta===-1).length,2,'undo/check-in does not debit again');
 checks.push('legacy expired package/unlinked usage does not reduce the new lot; new debit retains source grant; historical terms unchanged; future booking and walk-in debit exactly once; booked attendance undo/recheck does not debit again; pending classes unavailable; EN/ES 390/1280 screenshots and overflow check');
 assert.deepEqual(errors,[]); await writeFile(`${output}/package-booking-results.json`,JSON.stringify({features:['RC-04','RC-05'],base,checks,errors,limits:['Fictional browser adapter only; real backend transaction/authorization remains pending.']},null,2));
 console.log(checks.join('\n')); await ctx.close();
} finally { await browser.close(); }
