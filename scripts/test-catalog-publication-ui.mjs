// Fictional local website-price preview. No network publication or shared link.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const base=process.env.QA_BASE??'http://127.0.0.1:5173',output='docs/screenshots/M-17';await mkdir(output,{recursive:true});await mkdir('docs/screenshots/P-01',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const errors=[],checks=[];
try{
 const ctx=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
 await ctx.addInitScript(()=>{if(sessionStorage.getItem('publication-fixture'))return;sessionStorage.setItem('publication-fixture','1');localStorage.setItem('hoyos.lang','en');localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_admin',viewAs:null,devMode:false}));});
 const page=await ctx.newPage();await page.clock.install({time:new Date('2026-10-21T17:00:00Z')});page.on('pageerror',e=>errors.push(e.message));
 console.log('publication: open admin');await page.goto(`${base}/#/admin/products`);await page.getByRole('heading',{name:'Product master',exact:true}).waitFor();
 await page.evaluate(()=>{
  const stored=JSON.parse(localStorage.getItem('hoyos.db.v1')),db=stored.db,template=db.plans[0];
  const definition={code:'QA_LOCAL',name:{es:'Paquete ficticio local QA',en:'QA fictional local package'},type:'paquetes',classes:12,validityDays:90,active:true,prices:[{id:'p1',amount:100000,startsOn:'2026-10-01',endsOn:'2026-10-31'},{id:'p2',amount:120000,startsOn:'2026-11-01',endsOn:null}]};
  db.plans.push({...template,id:'qa_local_publication',slug:'qa-local-fictional',active:false,price:0,frontend_catalog:{definition,history:[{revision:1,actorId:'usr_admin',at:'2026-10-21T12:00:00Z',definition:structuredClone(definition)}]}});
  localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));
 });await page.reload();console.log('publication: fixture ready');
 const review=()=>page.getByRole('button',{name:'Review local publication',exact:true});
 console.log('publication: cancel');await review().click();await page.getByRole('button',{name:'Cancel review',exact:true}).click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.plans.find(p=>p.id==='qa_local_publication').frontend_publication),undefined);
 await review().click();
 await page.evaluate(()=>{window.qaRestoreStorage=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='hoyos.db.v1')throw Error('QA quota');return window.qaRestoreStorage.call(this,k,v);};});
 await page.getByRole('button',{name:'Confirm publication to local preview',exact:true}).click();await page.getByRole('alert').filter({hasText:'Local publication failed'}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.plans.find(p=>p.id==='qa_local_publication').frontend_publication),undefined);
 await page.evaluate(()=>{Storage.prototype.setItem=window.qaRestoreStorage;});await page.getByRole('button',{name:'Confirm publication to local preview',exact:true}).click();await page.getByText('Revision published only to the local preview.',{exact:true}).waitFor();
 console.log('publication: published retry');await page.goto(`${base}/#/site/plans`);await page.getByTestId('local-published-catalog').waitFor();assert.match(await page.getByTestId('site-published-price-qa_local_publication').innerText(),/100[.,]000/);assert(await page.getByRole('button',{name:'Purchases disconnected in this preview',exact:true}).isDisabled());await page.goto(`${base}/#/admin/products`);await page.getByRole('link',{name:'Open local website preview',exact:true}).click();await page.getByTestId('published-price-qa_local_publication').waitFor();assert.match(await page.getByTestId('published-price-qa_local_publication').innerText(),/100[.,]000/);
 await page.getByRole('button',{name:'Keep local quote',exact:true}).click();await page.getByRole('button',{name:'Keep local quote',exact:true}).click();assert.equal(await page.getByTestId('published-quote-snapshot').count(),1);
 assert(await page.getByRole('button',{name:'Purchases disconnected in this preview',exact:true}).isDisabled());
 await page.locator('[name="preview_date"]').fill('2026-11-01');assert.match(await page.getByTestId('published-price-qa_local_publication').innerText(),/120[.,]000/);assert.match(await page.getByTestId('published-quote-snapshot').innerText(),/100[.,]000/);await page.screenshot({path:`${output}/en-1280-local-quote-snapshot.jpg`,quality:72,animations:'disabled',fullPage:true});
 await page.locator('[name="preview_date"]').fill('2026-09-30');await page.getByText('No price exists for this date. Quoting is blocked.',{exact:true}).waitFor();
 console.log('publication: quote dates passed');for(const lang of ['en','es']){
  await page.evaluate(l=>localStorage.setItem('hoyos.lang',l),lang);await page.reload();await page.locator('[name="preview_date"]').fill('2026-10-21');
  await page.getByRole('button',{name:lang==='en'?'Keep local quote':'Conservar cotización local',exact:true}).click();
  for(const theme of ['light','dark']){
   await page.evaluate(theme=>localStorage.setItem('hoyos.theme',JSON.stringify({theme,skin:'styled'})),theme);await page.reload();await page.getByRole('heading',{name:lang==='en'?'Local catalog preview':'Vista previa del catálogo local',exact:true}).waitFor();await page.getByTestId('published-price-qa_local_publication').waitFor();
   for(const width of [390,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({animations:'disabled',path:`${output}/${lang}-${width}-${theme}-catalog-preview.jpg`,quality:72,fullPage:true});if(theme==='light')await page.screenshot({animations:'disabled',path:`${output}/${lang}-${width}.jpg`,quality:72,fullPage:true});}
   await page.goto(`${base}/#/site/plans`);await page.getByTestId('local-published-catalog').waitFor();assert(await page.locator('[data-testid="local-published-catalog"] .card-highlight h2').evaluate(h=>getComputedStyle(h).color===getComputedStyle(h.parentElement).color),'local publication heading uses readable highlight ink');for(const width of [390,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({animations:'disabled',path:`docs/screenshots/P-01/${lang}-${width}-${theme}-local-catalog.jpg`,quality:72,fullPage:true});}await page.goto(`${base}/#/admin/products/preview`);
  }
 }
 console.log('publication: captures passed');await page.evaluate(()=>localStorage.setItem('hoyos.lang','en'));await page.reload();await page.goto(`${base}/#/admin/products`);
 await page.getByRole('button',{name:'Edit draft',exact:true}).click();await page.locator('[name="amount_0"]').fill('150000');await page.getByRole('button',{name:'Save local draft',exact:true}).click();await page.getByText('Local draft saved. Not published.',{exact:true}).waitFor();
 await page.goto(`${base}/#/site/plans`);assert.match(await page.getByTestId('site-published-price-qa_local_publication').innerText(),/100[.,]000/,'unpublished edit never appears on website');await page.goto(`${base}/#/admin/products/preview`);assert.match(await page.getByTestId('published-price-qa_local_publication').innerText(),/100[.,]000/,'unpublished edit never appears');
 await page.goto(`${base}/#/admin/products`);await review().click();await page.getByRole('button',{name:'Confirm publication to local preview',exact:true}).click();await page.getByText('Revision published only to the local preview.',{exact:true}).waitFor();
 await page.goto(`${base}/#/admin/products/preview`);assert.match(await page.getByTestId('published-price-qa_local_publication').innerText(),/150[.,]000/);
 await page.goto(`${base}/#/admin/products`);await page.getByRole('button',{name:'Review local withdrawal',exact:true}).click();await page.getByRole('button',{name:'Confirm withdrawal from local preview',exact:true}).click();await page.getByText('Revision withdrawn from the local preview.',{exact:true}).waitFor();
 await page.goto(`${base}/#/site/plans`);await page.locator('.plans-packages').waitFor();assert.equal(await page.getByTestId('local-published-catalog').count(),0);await page.goto(`${base}/#/admin/products/preview`);await page.getByText('No revisions are published in this browser.',{exact:true}).waitFor();
 const clean=await browser.newContext();const independent=await clean.newPage();await independent.goto(`${base}/#/site/plans`);await independent.locator('.plans-packages').waitFor();assert.equal(await independent.getByTestId('local-published-catalog').count(),0,'publication never crosses browsers');await clean.close();
 const fixture=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.plans.find(p=>p.id==='qa_local_publication'));assert.equal(fixture.price,0);assert.equal(fixture.active,false);assert.equal(fixture.frontend_publication.history.length,3);
 checks.push('admin review cancel; storage failure leaves publication absent; retry succeeds; repeat quote idempotency; future dated price and retained local snapshot; no-price gap; unpublished edit isolation on admin and website; separate browser retains baseline; withdrawal restores baseline website;  explicit republish; withdraw; unchanged legacy price/availability; EN/ES 390/1280 light/dark fit');
 for(const userId of ['usr_desk','usr_cust']){const denied=await browser.newContext();await denied.addInitScript(userId=>localStorage.setItem('hoyos.session',JSON.stringify({userId,viewAs:null,devMode:false})),userId);const p=await denied.newPage();await p.goto(`${base}/#/admin/products/preview`);await p.waitForURL('**/#/no-access?**');await p.locator('.noaccess-title').waitFor();await p.screenshot({path:`${output}/${userId}-preview-denied.jpg`,quality:72,animations:'disabled'});await denied.close();}
 checks.push('front desk/customer preview deep links denied');assert.deepEqual(errors,[]);await writeFile(`${output}/publication-results.json`,JSON.stringify({featureIds:['PR-01','PR-02','SW-02'],base,checks,errors,limits:['Local website consumer only; no external publication and checkout disconnected.','No externally shared quote; session-only drafts.','Server authorization/publication/immutable order contract remains unverified.']},null,2));console.log(checks.join('\n'));await ctx.close();
}finally{await browser.close();}
