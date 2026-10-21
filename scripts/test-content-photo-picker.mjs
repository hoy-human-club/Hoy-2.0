import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:5187';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[],writes=[];
page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(['POST','PUT','PATCH','DELETE'].includes(r.method()))writes.push(r.url());});
try {
 await page.goto(base);await page.evaluate(()=>{localStorage.setItem('hoyos.lang','en');localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_admin',viewAs:null,devMode:false}));});await page.reload();
 const original=await page.evaluate(()=>{const t=JSON.parse(localStorage.getItem('hoyos.db.v1')).db.teachers[0];return {id:t.id,url:t.photo_url,active:t.active};});
 const saved=()=>page.evaluate(id=>{const t=JSON.parse(localStorage.getItem('hoyos.db.v1')).db.teachers.find(t=>t.id===id);return {url:t.photo_url,active:t.active};},original.id);
 const open=async()=>{await page.goto(`${base}/#/admin/content?entity=teachers&row=${original.id}`);await page.reload();await page.getByRole('dialog').waitFor();};
 await open();const dialog=page.getByRole('dialog'),field=dialog.locator('.shared-image-field');
 await field.getByRole('button',{name:'Choose from library or upload',exact:true}).click();await field.getByLabel('Search photos').fill('heater blue');await field.locator('.shared-image-option').click();await field.getByRole('button',{name:'Use this photo',exact:true}).click();
 assert((await field.locator('.shared-image-preview').getAttribute('src')).includes('heater-blue'));assert.deepEqual(await saved(),{url:original.url,active:original.active},'selection is a form draft');
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await open();assert.equal(await field.locator('.shared-image-preview').count(),original.url?1:0,'closing discards draft');
 await field.getByRole('button',{name:'Choose from library or upload',exact:true}).click();
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=64;c.height=64;c.getContext('2d').fillRect(0,0,64,64);return c.toDataURL().split(',')[1];});
 await field.getByLabel('Upload private copy').setInputFiles({name:'synthetic-content.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.waitForFunction(()=>document.querySelector('[role=dialog] .shared-image-chooser img.shared-image-preview')?.src.startsWith('data:image/webp'));
 await field.getByRole('button',{name:'Use this photo',exact:true}).click();assert.equal((await saved()).url,original.url);
 await dialog.getByRole('button',{name:'Save',exact:true}).click();await page.waitForFunction(id=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.teachers.find(t=>t.id===id).photo_url?.startsWith('data:image/webp'),original.id);
 assert.equal((await saved()).active,original.active,'save preserves publication state');await page.reload();await dialog.waitFor();assert((await field.locator('.shared-image-preview').getAttribute('src')).startsWith('data:image/webp'));
 for(const lang of ['es','en'])for(const width of [390,1280]){await page.evaluate(lang=>localStorage.setItem('hoyos.lang',lang),lang);await page.reload();await dialog.waitFor();await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page overflow');}
 assert.deepEqual(writes,[],'photo import and save make no network writes');assert.deepEqual(errors,[]);
 await mkdir('qa/picker',{recursive:true});await writeFile('qa/picker/content-results.json',JSON.stringify({passed:true,checks:['teacher picker draft/select/cancel','synthetic optimized private upload','save/reload','publication flag preserved','ES/EN 390/1280 no overflow','no network writes','no page errors']},null,2));console.log('Content photo integration passed');
} finally {await browser.close();}
