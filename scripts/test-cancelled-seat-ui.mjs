// Actual customer route: a historical mat number is not a current seat confirmation after cancellation.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import {studioFixture} from './studio-cancel-fixture.mjs';
const base=process.env.QA_BASE??'http://127.0.0.1:5282',out='qa/studio-cancel-seat',checks=[],errors=[],dispatch=[];
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
try {
 for(const lang of ['en','es'])for(const kind of ['active','studio-cancelled','customer-cancelled']) {
  const ctx=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'});
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
  await ctx.addInitScript(lang=>{if(sessionStorage.getItem('seat-init'))return;sessionStorage.setItem('seat-init','1');localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_cust',devMode:false,viewAs:null}));},lang);
  const page=await ctx.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))dispatch.push(r.url());});
  await page.clock.install({time:new Date('2026-12-02T17:00:00Z')});
  await page.goto(base+'/#/coming-soon');await page.waitForFunction(()=>localStorage.getItem('hoyos.db.v1'));await page.evaluate(studioFixture);
  await page.evaluate(kind=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1')),booking=s.db.bookings.find(b=>b.id==='qa_studio_booking'),session=s.db.class_sessions.find(s=>s.id==='qa_studio_class');if(kind!=='active'){booking.status='cancelled';booking.cancelled_at=new Date().toISOString();session.booked_count=0;}if(kind==='studio-cancelled'){session.status='cancelled';session.cancel_reason='QA FICTIONAL cancelled seat check';}localStorage.setItem('hoyos.db.v1',JSON.stringify(s));localStorage.setItem('hoyos.session',JSON.stringify({userId:'qa_studio_user',devMode:false,viewAs:null}));},kind);
  const before=await page.evaluate(()=>localStorage.getItem('hoyos.db.v1'));
  // Full document navigation hydrates the actual target identity through the native provider/guard.
  await page.goto(base+'/?seat-case='+kind+'#/app/booking/qa_studio_booking');await page.locator('.classcard').getByText('QA FICTIONAL cancellation',{exact:true}).waitFor();
  const caption=page.getByText(lang==='en'?'Your place: mat 1':'Tu lugar: mat 1',{exact:true});
  if(kind==='active')await caption.waitFor();else assert.equal(await caption.count(),0,'cancelled record must not promise a current mat');
  assert.equal(await page.evaluate(()=>localStorage.getItem('hoyos.db.v1')),before,'read-only view must preserve booking and financial history');
  for(const theme of ['light','dark'])for(const width of [390,1280]){await page.setViewportSize({width,height:1000});await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await page.evaluate(()=>document.fonts.ready);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`${out}/${lang}-${width}-${theme}-${kind}.jpg`,quality:70,animations:'disabled'});}
  checks.push(`${lang}/${kind}: native own route; confirmed seat ${kind==='active'?'retained':'absent'}, complete provider bytes unchanged;390/1280lightdark`);await ctx.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(dispatch,[]);await writeFile(`${out}/results.json`,JSON.stringify({base,checks,errors,dispatch,limits:['Fictional read-only presentation regression; no cancellation policy or ledger change; protected captures stay CI artifacts.']},null,2));console.log(checks.join('\n'));
}finally{await browser.close();}
