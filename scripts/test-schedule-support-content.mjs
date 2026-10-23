import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE??'http://127.0.0.1:5217',checks=[],errors=[];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
try {
 for(const lang of ['es','en'])for(const width of [390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
  await ctx.addInitScript(lang=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_cust',devMode:false,viewAs:null}));},lang);
  const p=await ctx.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));await p.clock.install({time:new Date('2026-10-23T15:00Z')});
  const mount=async route=>{await p.goto(`${base}/#/coming-soon`);await p.evaluate(async route=>{const h=await import('/scripts/schedule-support-harness.tsx');await h.mountScheduleSupportHarness(route);},route);};
  await mount('/app/rules');await p.locator('.listrow').first().click();await p.getByRole('dialog').waitFor();assert((await p.getByRole('dialog').innerText()).length>60);await p.screenshot({path:`docs/screenshots/schedule-booking-support/${lang}-${width}-rule-article.jpg`,fullPage:true});
  await p.evaluate(async()=>{const rows=await window.qaSupportProvider.list('content_articles',{where:{published:true},orderBy:{column:'sort'}});await window.qaSupportProvider.update('content_articles',rows[0].id,{published:false});});await p.getByRole('dialog').waitFor({state:'hidden'});
  await mount('/app/faq');await p.getByRole('button',{name:lang==='en'?'Do you offer refunds?':'¿Hacen reembolsos?',exact:true}).click();await p.getByText(lang==='en'?'No. The 12-class package is non-refundable.':'No. El paquete de 12 clases no es reembolsable.',{exact:true}).waitFor();await p.screenshot({path:`docs/screenshots/schedule-booking-support/${lang}-${width}-faq-no-refunds.jpg`,fullPage:true});
  await mount('/app/teachers');await p.locator('.teachercard').first().click();await p.getByRole('heading',{name:'Carolina Cifuentes',exact:true}).last().waitFor();await p.getByText('FICTIONAL qa-open',{exact:true}).waitFor();assert.match(await p.locator('.appshell-main').innerText(),/50 min/);assert(!(await p.locator('.appshell-main').innerText()).includes('FICTIONAL qa-inactive'));await p.screenshot({path:`docs/screenshots/schedule-booking-support/${lang}-${width}-teacher-profile.jpg`,fullPage:true});
  await mount('/app/booking/qa-booking');await p.locator('a[href*="google.com/maps"]').waitFor();await p.evaluate(async()=>{const tenants=await window.qaSupportProvider.list('tenants');const row=tenants[0];await window.qaSupportProvider.update('tenants',row.id,{settings:{...row.settings,profile:{...row.settings?.profile,address:'FICTIONAL NEW ADDRESS',city:'FICTIONAL CITY',mapLink:''}}});});await p.waitForFunction(()=>document.querySelector('a[href*="google.com/maps"]')?.getAttribute('href')?.includes('FICTIONAL%20NEW%20ADDRESS'));
  assert((await p.locator('a[href*="google.com/maps"]').boundingBox()).height>=44);
  checks.push(`${lang}/${width}: rule article opens, unpublishing hides stale drawer; no-refunds FAQ preserved; active teacher profile + actual 50-minute sessions; changed configured address updates directions with 44px target`);await ctx.close();
 }
 assert.deepEqual(errors,[]);await writeFile('docs/screenshots/schedule-booking-support/content-results.json',JSON.stringify({checks,errors},null,2));console.log(checks.join('\n'));
}finally{await browser.close();}
