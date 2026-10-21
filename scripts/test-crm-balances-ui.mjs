// AD-07 / HALL-2: isolated fictional ledger/voucher fixture; no backend or external writes.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
const base = process.env.QA_BASE ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
const errors = [], checks = [];
const output = 'docs/screenshots/M-06';
await mkdir(output, { recursive: true });
try {
 for (const role of ['admin', 'front']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(role => { if(sessionStorage.getItem('crm-init')) return; sessionStorage.setItem('crm-init','1'); localStorage.setItem('hoyos.session', JSON.stringify({ userId: role === 'front' ? 'usr_desk' : 'usr_admin', devMode: false, viewAs: null })); localStorage.setItem('hoyos.lang', 'en'); }, role);
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, route => route.abort());
  const page = await ctx.newPage(); await page.clock.install({time:new Date('2026-10-21T17:00:00Z')}); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/#/admin/crm`);
  await page.waitForFunction(() => localStorage.getItem('hoyos.db.v1'));
  await page.evaluate(() => {
   const stored = JSON.parse(localStorage.getItem('hoyos.db.v1')), db = stored.db;
   const stamp = new Date().toISOString(), day = n => { const d = new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
   const row = (id, extra) => ({id,tenant_id:db.users[0].tenant_id,created_at:stamp,updated_at:stamp,...extra});
   const user = 'usr_cust';
   db.users.find(p => p.id === user).email = 'qa.member@example.test';
   db.users.find(p => p.id === user).phone = '+573225556004';
   db.profiles.find(p => p.user_id === user).full_name = 'QA Package Holder';
   db.memberships = db.memberships.filter(m => m.user_id !== user);
   db.class_ledger = db.class_ledger.filter(r => r.user_id !== user);
   db.class_ledger.push({...row('qa_expired',{user_id:user,delta:12,reason:'purchase',expires_at:'2026-04-01'}),created_at:'2026-01-01T12:00:00Z'}, {...row('qa_expired_use',{user_id:user,delta:-12,reason:'booking',expires_at:null}),created_at:'2026-02-01T12:00:00Z'});
   db.class_ledger.push(row('qa_purchase',{user_id:user,plan_id:'plan_pack12',delta:12,reason:'purchase',expires_at:day(30)}),row('qa_debit',{user_id:user,delta:-3,reason:'booking',expires_at:null}));
   // Use the catalog's actual 12-class package identifier.
   db.class_ledger.find(r=>r.id==='qa_purchase').plan_id=db.plans.find(p=>p.classes===12)?.id;
   const terms={title:'QA claimed voucher',benefitKind:'classes',benefitTotal:2,participantCap:1,capScope:'per_booking',creditUnit:'per_person',expiresAt:day(15),cancellationPolicy:'restore',recipientName:'QA Package Holder',recipientContact:'fixture@example.test',message:'Fictional fixture',source:'admin_invitation',balance:2,status:'claimed',issuedBy:'usr_admin'};
   db.vouchers = [row('qa_voucher',{...terms,code:'QA-CLAIM',claimedBy:user}),row('qa_unclaimed',{...terms,title:'Unclaimed namesake',code:'QA-UNCLAIM',claimedBy:null,status:'issued'})];
   localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));
  });
  await page.reload();
  for (const lang of ['en','es']) {
   console.log(role,lang);
   await page.evaluate(l=>localStorage.setItem('hoyos.lang',l),lang); await page.reload();
   await page.setViewportSize({width:1280,height:900});
   const search=page.getByPlaceholder(lang==='en'?'Search name, WhatsApp or email…':'Buscar nombre, WhatsApp o email…');
   await search.fill('QA Package');
   let row=page.locator('tbody tr').filter({hasText:'QA Package Holder'});
   await row.waitFor(); assert.equal(await row.locator('td').nth(2).innerText(),'9'); assert.equal(await row.locator('td').nth(4).innerText(),'1');
   assert(!/No plan|Sin plan/.test(await row.innerText()));
   for(const width of [390,1280]) {
    await page.setViewportSize({width,height:900});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page body fits viewport; table scrolls internally');
    if(width===390) { assert(await page.locator('.crm-person-link').filter({hasText:'QA Package Holder'}).innerText().then(t=>t.includes('9'))); }
    if(role==='admin') await page.screenshot({path:`${output}/${lang}-${width}-balances.jpg`,quality:72,fullPage:true});
   }
   await page.setViewportSize({width:1280,height:900});
   await search.fill('qa.member@example.test'); await row.waitFor();
   await search.fill('+57 322 555 6004'); await row.waitFor();
   await search.fill('QA Package'); await row.click(); await page.getByText('QA claimed voucher',{exact:true}).waitFor(); assert.equal(await page.getByText('Unclaimed namesake',{exact:true}).count(),0);
   if(role==='admin') {
    for(const width of [390,1280]) { await page.setViewportSize({width,height:900}); await page.screenshot({path:`${output}/${lang}-${width}-package-detail.jpg`,quality:72,fullPage:false}); }
   }
   await page.goto(`${base}/#/admin/crm`); await search.fill('nobody-matches-this-fixture'); await page.getByText(lang==='en'?'No people in this segment':'No hay personas en este segmento',{exact:true}).waitFor({timeout:2000}).catch(async()=>assert.equal(await page.locator('tbody tr').count(),0));
   await search.fill('fixture@example.test'); // Does not match vouchers or unrelated contacts.
   assert.equal(await page.locator('tbody tr').count(),0);
   await page.setViewportSize({width:1280,height:900});
   await page.goto(`${base}/#/admin/crm/not-a-real-person`); await page.locator('.emptystate-error').waitFor();
   await page.goto(`${base}/#/admin/crm`);
  }
  // Frozen classes remain visible as owned; expired purchases never appear live.
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1'));const r=s.db.class_ledger.find(r=>r.id==='qa_purchase');r.frozen_from='2000-01-01';r.frozen_until='2099-01-01';localStorage.setItem('hoyos.db.v1',JSON.stringify(s));});
  await page.reload(); await page.getByPlaceholder('Buscar nombre, WhatsApp o email…').fill('QA Package'); await page.getByText('Congelado',{exact:true}).waitFor();
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1'));s.db.class_ledger.find(r=>r.id==='qa_purchase').expires_at='2000-01-01';localStorage.setItem('hoyos.db.v1',JSON.stringify(s));});await page.reload();await page.getByPlaceholder('Buscar nombre, WhatsApp o email…').fill('QA Package');await page.getByText('Sin plan',{exact:true}).waitFor();
  checks.push(`${role}: EN/ES 390/1280 ledger balance/expiry, plan, claim identity, detail, empty search, missing record, frozen and expired package`);
  await ctx.close();
 }
 const ctx=await browser.newContext();await ctx.addInitScript(()=>localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_cust',devMode:false,viewAs:null})));const p=await ctx.newPage();await p.goto(`${base}/#/admin/crm`);await p.waitForURL('**/#/no-access?**');checks.push('customer route denied; current permission map unchanged');await ctx.close();
 assert.deepEqual(errors,[]);await writeFile(`${output}/balance-results.json`,JSON.stringify({feature:'AD-07',base,checks,errors,limits:['MockProvider only; provider rejection/loading behavior not verified','Backend tenant/role enforcement and cross-device balances remain pending']},null,2));console.log(checks.join('\n'));
} finally { await browser.close(); }
