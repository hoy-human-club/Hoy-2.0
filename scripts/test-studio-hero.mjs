import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:4173';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'}), errors=[], checks=[];
page.on('pageerror',e=>errors.push(e.message));
await mkdir('docs/screenshots/W-01',{recursive:true});
try {
 await page.goto(`${base}/#/coming-soon`);await page.locator('.coming-soon-scene').waitFor();
 const source=await page.locator('.coming-soon-scene').getAttribute('src');
 for(const version of ['latest','photos'])for(const lang of ['es','en'])for(const width of [390,1280])for(const dark of [false,true]){
  await page.setViewportSize({width,height:width<600?900:1000});
  await page.evaluate(({lang,dark})=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.theme',JSON.stringify({theme:dark?'dark':'light',skin:'styled'}));},{lang,dark});
  await page.goto(`${base}/#/site?version=${version}`);await page.reload();await page.locator(`.site[data-site-version=${version}]`).waitFor();
  const hero=page.locator('.studio-hero'), image=hero.locator('img.studio-hero-image');
  await image.evaluate(async i=>{await i.decode();});await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  assert.equal(await image.getAttribute('src'),source,'same source as Coming Soon');assert.equal(await hero.locator('video').count(),0,'no old hero concept video');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${version}/${lang}/${width}: overflow`);
  assert(await image.evaluate(i=>{const r=i.getBoundingClientRect(),p=i.parentElement.getBoundingClientRect();return i.naturalWidth>=960&&Math.abs(r.width-p.width)<2&&Math.abs(r.height-p.height)<2;}),'decoded high-resolution full-cover photo');
  assert.equal(await hero.locator('h1').evaluate(i=>getComputedStyle(i).color),'rgb(241, 231, 210)','cream heading in both themes');
  for(const selector of ['.sanctuary-button','.sanctuary-text-link'])assert(await hero.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect(),p=el.closest('section').getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom&&r.width>0;}),'CTA remains inside hero');
  await page.screenshot({path:`docs/screenshots/W-01/studio-${version}-${lang}-${width}${dark?'-dark':''}.jpg`,type:'jpeg',quality:72});
  checks.push(`${version}/${lang}/${width}/${dark?'dark':'light'}`);
 }
 for(const width of [344,768,3840]){
  await page.setViewportSize({width,height:1000});await page.goto(`${base}/#/site`);await page.locator('.studio-hero-image').waitFor();
  await page.locator('.studio-hero-image').evaluate(i=>i.decode());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:`docs/screenshots/W-01/studio-latest-en-${width}.jpg`,type:'jpeg',quality:72});
 }
 await page.setViewportSize({width:1280,height:1000});await page.goto(`${base}/#/site`);await page.locator('.site[data-site-version=latest]').waitFor();
 await page.locator('.studio-hero .sanctuary-button').click();await page.locator('.session-calendar').waitFor();await page.goBack();await page.locator('.studio-hero-image').waitFor();
 await page.locator('.site-actions select').selectOption('photos');await page.locator('.site[data-site-version=photos]').waitFor();assert.equal(await page.locator('.studio-hero-image').getAttribute('src'),source);
 await page.locator('.site-actions select').selectOption('archive');await page.locator('.site[data-site-version=archive]').waitFor();assert.equal(await page.locator('.studio-hero-image').count(),0);
 await page.locator('.site-actions select').selectOption('classic');await page.locator('.site[data-site-version=classic]').waitFor();assert.equal(await page.locator('.studio-hero-image').count(),0);
 await page.goto(`${base}/#/site`);await page.locator('.site[data-site-version=latest]').waitFor();assert.equal(await page.locator('.studio-hero-image').getAttribute('src'),source);
 assert.deepEqual(errors,[]);console.log('Shared studio hero passed: parity, full cover, cream contrast, bilingual/light/dark/responsive, CTA/Back, default and historical editions');
}finally{await writeFile('docs/screenshots/W-01/studio-hero-qa.json',JSON.stringify({checks,errors},null,2));await browser.close();}
