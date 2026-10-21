// Dev-only provider failure injection. Production bundle QA uses test-product-catalog-ui.mjs.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir,writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE??'http://127.0.0.1:5173';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const output='docs/screenshots/M-16';await mkdir(output,{recursive:true});
try {
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
 await ctx.addInitScript(()=>{localStorage.setItem('hoyos.lang','en');localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_admin',viewAs:null,devMode:false}));});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/#/coming-soon`);
 await page.evaluate(async()=>{
  const {MockProvider}=await import('/src/data/MockProvider.ts');
  const original=MockProvider.prototype.list;
  window.__productReadMode='loading';window.__productReadResolvers=[];
  MockProvider.prototype.list=function(table,query){
   if(table!=='plans' || !new Error().stack.includes('/src/modules/products/ProductsPage.tsx'))return original.call(this,table,query);
   if(window.__productReadMode==='loading')return new Promise(resolve=>{window.__productReadResolvers.push(()=>resolve([]));});
   if(window.__productReadMode==='error')return Promise.reject(new Error('Fictional provider read rejection'));
   if(window.__productReadMode==='empty')return Promise.resolve([]);
   return original.call(this,table,query);
  };
  location.hash='/admin/products';
 });
 await page.locator('.products-page .emptystate-loading').waitFor();await page.screenshot({path:`${output}/en-390-loading.jpg`,quality:72,fullPage:true});
 await page.evaluate(()=>{window.__productReadMode='empty';window.__productReadResolvers.forEach(resolve=>resolve());});await page.getByText('No products',{exact:true}).waitFor();await page.screenshot({path:`${output}/en-390-empty.jpg`,quality:72,fullPage:true});
 await page.evaluate(()=>{window.__productReadMode='error';location.hash='/coming-soon';});await page.locator('.products-page').waitFor({state:'detached'});await page.evaluate(()=>location.hash='/admin/products');
 await page.getByText('Products could not be loaded.',{exact:true}).waitFor();await page.screenshot({path:`${output}/en-390-read-error.jpg`,quality:72,fullPage:true});
 await page.evaluate(()=>window.__productReadMode='normal');await page.getByRole('button',{name:'Retry',exact:true}).click();await page.getByRole('button',{name:'Prepare draft',exact:true}).first().waitFor();
 assert.deepEqual(errors,[]);await writeFile(`${output}/state-results.json`,JSON.stringify({checks:['async loading visible','empty resolved read','read rejection contained','retry restores catalog'],errors},null,2));
 console.log('PASS catalog asynchronous loading/empty/error/retry states');await ctx.close();
}finally{await browser.close();}
