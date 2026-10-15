// Exercise real files without SPA fallback, at a root host and a GitHub project subpath.
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const dist=resolve('dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.mp4':'video/mp4','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  try{
    const parsed=new URL(req.url,'http://127.0.0.1');
    let path=decodeURIComponent(parsed.pathname);
    if(path==='/hoy'){res.writeHead(301,{Location:'/hoy/'+parsed.search});res.end();return;}
    if(path.startsWith('/hoy/'))path=path.slice(4);
    let file=resolve(dist,'.'+path);
    if(file!==dist&&!file.startsWith(dist+sep)){res.writeHead(403);res.end();return;}
    const s=await stat(file);
    if(s.isDirectory()){
      if(!parsed.pathname.endsWith('/')){res.writeHead(301,{Location:parsed.pathname+'/'+parsed.search});res.end();return;}
      file=resolve(file,'index.html');
    }
    res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'});res.end(await readFile(file));
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>server.listen(5191,'127.0.0.1',r));
let browser;const checks=[];const errors=[];
try{
  browser=await chromium.launch({executablePath:process.env.BROWSER_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  for(const prefix of ['','/hoy']){
    const base=`http://127.0.0.1:5191${prefix}/`;
    await page.goto(base);await page.waitForSelector('.coming-soon');assert.equal(await page.locator('.hub-card').count(),0);
    for(const entry of ['hub','hub/','hub/index.html']){
      await page.goto(base+entry);await page.waitForSelector('.hub-card');assert.equal(page.url(),base+'#/hub');
      await page.reload();await page.waitForSelector('.hub-card');
      assert.ok(await page.locator('.hub-card').count()>0);
    }
    const map=await page.request.get(base+'hub-map.json');assert.equal(map.status(),200);assert.equal((await map.json()).product.hubRoute,'/hub');
    const site=page.locator('.hub-card').filter({has:page.locator('code').filter({hasText:/^\/site$/})});
    await site.getByRole('button').first().click();await page.waitForSelector('.site');
    await page.locator('.site-foot a[href$="#/hub"]').click();await page.waitForSelector('.hub-card');
    assert.equal(page.url(),base+'#/hub');
    await page.goto(base+'#/site/teachers?version=archive&video=off&motion=off');await page.waitForSelector('.site-teacher');assert.equal(await page.locator('.site-teacher').count(),8);
    await page.goto(base+'#/site/teachers');await page.waitForSelector('.site-teacher');assert.equal(await page.locator('.site-teacher').count(),11);
    checks.push(`${prefix||'/'}: root landing, clean hub variants, refresh, map, site/back-to-hub, archive/Latest`);
  }
  assert.deepEqual(errors,[]);console.log('PASS static root and /hoy deployment entries',checks);
}catch(e){errors.push(e.stack??String(e));console.error(e);process.exitCode=1;}
finally{await mkdir('qa',{recursive:true});await writeFile('qa/public-entry.json',JSON.stringify({checks,errors},null,2));await browser?.close();await new Promise(r=>server.close(r));}
