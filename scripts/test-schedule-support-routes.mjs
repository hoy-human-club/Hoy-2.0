import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir,writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE??'http://127.0.0.1:5218',checks=[],errors=[];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
try {
 for(const lang of ['es','en'])for(const width of [390,1280]) {
  const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
  await ctx.addInitScript(lang=>{localStorage.setItem('hoyos.lang',lang);if(!localStorage.getItem('hoyos.session'))localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_cust',devMode:false,viewAs:null}));},lang);
  const p=await ctx.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));
  for(const route of ['/app/schedule','/app/schedule/week','/app/rules','/app/faq','/app/faq/2','/app/teachers','/app/booking/missing-fixture']){
   await p.goto(`${base}/#${route}`);await p.locator('.appshell-main h1').waitFor();await p.waitForFunction(()=>document.querySelector('.appshell-main')?.innerText.length>60);
   const text=await p.locator('.appshell-main').innerText();assert(!text.includes('⟨'),`${lang} ${route} missing translation`);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${lang} ${route} overflow`);
  }
  await p.evaluate(()=>localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_fin',devMode:false,viewAs:null})));
  await p.goto(`${base}/?qa=role-check#/app/schedule`);await p.waitForURL(/no-access/);
  checks.push(`${lang}/${width}: production bundle boot + customer route smoke (day/week, rules, both FAQ pages, teachers, missing booking), no missing translation keys or horizontal overflow; finance role denied schedule`);
  await ctx.close();
 }
 assert.deepEqual(errors,[]);await mkdir('docs/screenshots/schedule-booking-support',{recursive:true});await writeFile('docs/screenshots/schedule-booking-support/routes-results.json',JSON.stringify({checks,errors,scope:'Local production bundle, fictional seeded session; no backend or auth integration.'},null,2));console.log(checks.join('\n'));
} finally {await browser.close();}
