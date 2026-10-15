import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const base=process.env.QA_BASE||'http://127.0.0.1:5187';
const checks=[], errors=[];
await mkdir('docs/screenshots/M-02d',{recursive:true});
try {
 for (const [role,userId] of [['admin','usr_admin'],['coordinator','usr_coord'],['marketing','usr_mkt']]) {
  const context=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'}), page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/#/coming-soon`);await page.locator('.coming-soon').waitFor();
  const slots=await page.evaluate(({userId})=>{
   const stored=JSON.parse(localStorage.getItem('hoyos.db.v1'));
   const keys=['teacher.portrait','event.cover','studio.tour','site.classes.ligereza'];let count=0;
   for(const slot of stored.db.media_assets)if(keys.includes(slot.slot_key)){slot.url='images/studio-2026/facility-studio-960.webp';slot.status='ready';count++;}
   localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));
   localStorage.setItem('hoyos.session',JSON.stringify({userId,viewAs:null,devMode:false}));
   localStorage.setItem('hoyos.lang','en');return count;
  },{userId});assert.equal(slots,4,'all placement fixture types present');
  // Reload a public route first, so the provider starts under the actual staff identity.
  await page.reload();await page.locator('.coming-soon').waitFor();
  await page.goto(`${base}/#/admin/content/media`);await page.locator('.media-library').waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.session')).userId),userId);
  const card=()=>page.locator('.media-library-grid>.card').filter({has:page.locator('img[src*="/facility-studio-"]')});
  await card().locator('summary').click();
  const placements=await card().locator('.media-library-use[data-placement-path^="/app/"]').evaluateAll(nodes=>nodes.map(n=>({path:n.dataset.placementPath,preview:n.dataset.placementPreview,href:n.querySelector('a')?.getAttribute('href')})));
  for(const [prefix,code] of [['/app/teachers/','C-18'],['/app/events/','C-23'],['/app/rules','C-13'],['/app/schedule','C-02']]){const matching=placements.filter(p=>p.path.startsWith(prefix));assert(matching.length>0,`${role}: ${prefix}`);assert(matching.every(p=>p.href?.endsWith(`#/docs/pages/${code}`)),`${role}: correct ${code} documentation`);}
  assert(placements.every(p=>p.preview==='documented'&&p.href?.includes('#/docs/pages/')),`${role}: role-safe documented destinations`);
  assert.equal(await page.locator('.media-library-use a[href*="#/app/"]').count(),0,'no customer-only runtime link offered to content staff');
  const destinations=[...new Set(placements.map(p=>p.href))];
  for(const href of destinations){
   await card().locator(`a[href="${href}"]`).first().click();await page.locator('.docs-main h1').waitFor();
   assert(!page.url().includes('/no-access'));assert(page.url().includes('/docs/pages/'));
   await page.goBack();await page.locator('.media-library').waitFor();await card().locator('summary').click();
  }
  if(role==='admin')for(const lang of ['es','en'])for(const width of [390,1280]){
   await page.getByRole('button',{name:lang.toUpperCase(),exact:true}).first().click();await page.setViewportSize({width,height:1000});
   assert(await card().getByText(lang==='es'?'Ver ficha documentada de la pantalla':'View documented screen preview',{exact:true}).count()>0,'visible localized preview label');
   await card().locator('[data-placement-preview="documented"]').first().scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
   await page.screenshot({path:`docs/screenshots/M-02d/preview-${role}-${lang}-${width}.jpg`,type:'jpeg',quality:72});
  }
  await page.setViewportSize({width:1280,height:1000});await page.getByRole('button',{name:'EN',exact:true}).first().click();
  await card().locator('.media-library-use a[href*="#/site/about"]').first().click();await page.locator('.site').waitFor();assert(!page.url().includes('/no-access'));
  checks.push(`${role}: real ${userId}, teacher/event/rules/schedule previews, Back and public placement`);await context.close();
 }
 const page=await browser.newPage({viewport:{width:1280,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/#/admin/content/media`);await page.locator('.media-library').waitFor();
 await page.getByRole('button',{name:'ES',exact:true}).first().click();
 const search=page.getByLabel('Buscar nombre, etiqueta o uso');
 await search.fill('Inicio');assert(await page.locator('.media-library-grid>.card').count()>0,'visible Spanish Home label is searchable');
 await search.fill('Próximamente');const accented=await page.locator('.media-library-grid>.card').count();assert(accented>0);
 await search.fill('proximamente');assert.equal(await page.locator('.media-library-grid>.card').count(),accented,'accent-free Spanish query');
 await page.locator('.media-library summary').first().click();assert(await page.getByRole('link',{name:'Próximamente',exact:true}).count()>0);
 checks.push('Spanish Inicio and Próximamente/proximamente match the displayed placement names');assert.deepEqual(errors,[]);
 console.log('Media content-role UI regression passed',checks);
} finally {await writeFile('docs/screenshots/M-02d/media-access-qa.json',JSON.stringify({checks,errors},null,2));await browser.close();}
