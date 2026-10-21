import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-gpu']});
const page=await browser.newPage({viewport:{width:1280,height:1000}});const base=process.env.QA_BASE||'http://127.0.0.1:5187';
try{
 await page.goto(base);await page.evaluate(()=>{localStorage.setItem('hoyos.lang','en');localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_super',devMode:true,viewAs:null}));});await page.goto(`${base}/#/dev/components`);await page.reload();
 const field=page.locator('#cmp-SharedImageField .shared-image-field').first();await field.waitFor();await field.getByRole('button',{name:'Choose from library or upload'}).click();
 await field.getByLabel('Search photos').fill('heater blue');assert.equal(await field.locator('.shared-image-option').count(),1);await field.locator('.shared-image-option').click();await field.getByRole('button',{name:'Use this photo'}).click();assert((await field.locator('.shared-image-preview').getAttribute('src')).includes('heater-blue'));
 await field.getByRole('button',{name:'Remove photo'}).click();assert.equal(await field.locator('.shared-image-preview').count(),0);await field.getByRole('button',{name:'Undo change'}).click();assert.equal(await field.locator('.shared-image-preview').count(),1);
 await field.getByRole('button',{name:'Choose from library or upload'}).click();
 await mkdir('docs/screenshots/media-picker',{recursive:true});
 // Capture catalog-only state before synthetic private import; never publish imported copies.
 for(const lang of ['es','en'])for(const width of [390,1280]){await page.evaluate(lang=>localStorage.setItem('hoyos.lang',lang),lang);await page.reload();await field.waitFor();await page.setViewportSize({width,height:2000});await field.getByRole('button').first().click();await field.locator('input[type=search]').fill('heater blue');await field.scrollIntoViewIfNeeded();await field.screenshot({path:`docs/screenshots/media-picker/${lang}-${width}.jpg`,type:'jpeg',quality:72});}
 await field.getByLabel('Upload private copy').setInputFiles({name:'fake.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});await field.getByRole('alert').waitFor();assert((await field.getByRole('alert').textContent()).includes('Invalid image'));
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=64;c.height=64;const x=c.getContext('2d');x.fillStyle='#3344aa';x.fillRect(0,0,64,64);return c.toDataURL().split(',')[1];});
 await field.getByLabel('Upload private copy').setInputFiles({name:'fictional-test.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await field.getByRole('button',{name:'Use this photo'}).waitFor();await page.waitForFunction(()=>document.querySelector('#cmp-SharedImageField .shared-image-chooser img.shared-image-preview')?.src.startsWith('data:image/webp'));
 await field.getByRole('button',{name:'Use this photo'}).click();assert((await field.locator('.shared-image-preview').getAttribute('src')).startsWith('data:image/webp'));
 const stored=await page.evaluate(async()=>{const {listLocalPhotos}=await import('/src/data/localMediaStore.ts');return {mine:(await listLocalPhotos('ten_hoy')).length,other:(await listLocalPhotos('other')).length};});assert.equal(stored.mine,1);assert.equal(stored.other,0);
 await field.getByRole('button',{name:'Choose from library or upload'}).click();await field.getByLabel('Search photos').fill('fictional-test');assert.equal(await field.locator('.shared-image-option').count(),1);
 await field.getByLabel('Search photos').fill('');
 await page.reload();await page.locator('#cmp-SharedImageField').waitFor();await field.getByRole('button',{name:'Choose from library or upload'}).click();await field.getByLabel('Search photos').fill('fictional-test');assert.equal(await field.locator('.shared-image-option').count(),1);
 console.log('Picker passed: catalog selection, preview, remove/undo, invalid upload, durable private upload, tenant isolation and reload');
}finally{await browser.close();}
