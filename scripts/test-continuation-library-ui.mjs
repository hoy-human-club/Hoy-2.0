import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE??'http://127.0.0.1:5210',out='docs/screenshots/D-02';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const errors=[],checks=[];let routes;
try{
 for(const lang of ['en','es']){
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce',locale:lang==='es'?'es-CO':'en-US'});
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
  await context.addInitScript(lang=>{localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_super',viewAs:null,devMode:false}));localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.theme',JSON.stringify({theme:'light',skin:'styled'}));},lang);
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(30000);
  await page.goto(`${base}/#/dev/components`);
  await page.locator('#cmp-QuoteNotice').waitFor();
  const marketing=page.locator('#cmp-MarketingDraftBoard');
  await marketing.getByRole('button',{name:lang==='en'?'New campaign draft':'Nuevo borrador de campaña',exact:true}).waitFor();
  const quote=page.locator('#cmp-QuoteNotice');assert.equal(await quote.locator('.lib-usage').count(),5);
  assert.match(await quote.innerText(),/2026-10-22/);assert.match(await quote.innerText(),/C-04/);assert.match(await marketing.innerText(),/M-18/);
  for(const width of [390,1280]){
   await page.setViewportSize({width,height:900});await page.evaluate(()=>document.fonts.ready);
   for(const [name,element] of [['quotes',quote],['marketing',marketing]]){
    await element.scrollIntoViewIfNeeded();assert(await element.evaluate(e=>e.scrollWidth<=e.clientWidth+1),`${name} ${lang}${width} component overflow`);
    await element.evaluate(e=>window.scrollTo(0,window.scrollY+e.getBoundingClientRect().top-80));
    await page.screenshot({path:`${out}/${lang}-${width}-continuation-${name}.jpg`,quality:72,fullPage:false,animations:'disabled'});
   }
  }
  const before=await page.evaluate(()=>({db:localStorage.getItem('hoyos.db.v1'),drafts:Object.keys(localStorage).filter(k=>k.startsWith('hoyos.marketing-drafts.')).map(k=>[k,localStorage.getItem(k)])}));
  await marketing.getByRole('button',{name:lang==='en'?'New campaign draft':'Nuevo borrador de campaña',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();await dialog.getByRole('button',{name:lang==='en'?'Cancel without saving':'Cancelar sin guardar',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>({db:localStorage.getItem('hoyos.db.v1'),drafts:Object.keys(localStorage).filter(k=>k.startsWith('hoyos.marketing-drafts.')).map(k=>[k,localStorage.getItem(k)])})),before,'library preview/cancel does not write');
  routes=await page.evaluate(()=>window.__hoyos.routes);
  await page.goto(`${base}/#/hub`);const map=await page.evaluate(()=>window.__hoyos.hubMap.load());
  const entry=map.experiences.find(e=>e.id==='marketing');assert.equal(entry.route,'/admin/marketing');assert.equal(entry.code,'M-18');assert.deepEqual(entry.pageCodes,['M-18']);assert(!entry.comingSoon);assert.match(entry.label[lang],lang==='en'?/local drafts/:/borradores locales/);
  const entered=await page.evaluate(()=>window.__hoyos.run('hub.enterAs',{surface:'marketing'}));assert(entered.ok,JSON.stringify(entered));
  await page.waitForURL(/admin\/marketing/);await page.getByTestId('marketing-workbench').waitFor();
  checks.push(`${lang}: five quote library examples and interactive marketing preview/cancel at390/1280; existing super-admin only; future local-draft hub entry uses existing marketing role; no publication/provider claims`);
  await context.close();
 }
 assert.deepEqual(errors,[]);
 const prior=JSON.parse(await readFile('docs/frontend-completion/routes.json','utf8')),sources=new Map(prior.routes.map(r=>[r.path,r.source]));
 const manifest={...prior,capturedAt:new Date().toISOString().slice(0,10),source:'Rendered immutable integrated runtime registry; route presence/built badges are not acceptance. Exact release source is recorded in completion README.',routes:routes.map(r=>({path:r.path,code:r.code,surface:r.surface,roles:r.roles,source:sources.get(r.path)??(r.path==='/admin/marketing'?'src/modules/marketing/index.ts':'unverified'),sourceDeclaredStatus:r.status,verification:'unverified',declaredStates:r.spec.states??[],tables:r.spec.data??[]}))};
 await writeFile('docs/frontend-completion/routes.json',JSON.stringify(manifest,null,2)+'\n');
 await writeFile(`${out}/continuation-library-results.json`,JSON.stringify({base,checks,registeredRoutes:routes.length,pageErrors:errors,limits:'Fixture library and local hub only; no real provider render, production authorization or owner acceptance.'},null,2)+'\n');
 console.log(`PASS continuation library/hub ${checks.length} language matrices, ${routes.length} runtime routes; zero page errors`);
}finally{await browser.close();}
