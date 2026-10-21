import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const project=process.argv[2],expected=process.argv[3];
const route=project==='hoy'?'/admin/finance/subscriptions':'/admin/subscriptions';const prefix=project==='hoy'?'hoyos':'petrock';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1280,height:900}});const errors=[];const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await context.addInitScript(prefix=>{localStorage.setItem(prefix+'.session',JSON.stringify({userId:'usr_super',devMode:false,viewAs:null}));localStorage.setItem(prefix+'.lang','en');},prefix);
try {
 const url=`${process.env.QA_BASE || `https://imagine-os.github.io/${project}/`}#${route}`;const response=await page.goto(url,{waitUntil:'networkidle',timeout:60000});assert.equal(response.status(),200);
 await page.locator('.app-directory').getByRole('heading',{name:'Apps & subscriptions',exact:true}).waitFor({timeout:15000});
 const pkg=JSON.parse(await readFile('package.json','utf8'));
 const releaseUrl=new URL('release.json',url.split('#')[0]);releaseUrl.searchParams.set('source',expected);
 let release;
 for(let attempt=0;attempt<12;attempt++){
  const res=await context.request.get(releaseUrl.href);if(res.ok()){const candidate=await res.json();if(candidate.sourceCommit===expected){release=candidate;break;}}
  await new Promise(resolve=>setTimeout(resolve,3000));
 }
 assert.equal(release?.sourceCommit,expected,'live assets identify the deployed source SHA');assert.equal(release.version,pkg.version);
 const mapResponse=await context.request.get(new URL('hub-map.json',url.split('#')[0]).href);assert(mapResponse.ok());const map=await mapResponse.json();assert.equal(map.product.version,release.version);
 for(const code of ['M-14','M-14a']){const entry=map.pages.find(p=>p.code===code);assert(entry,code+' released');assert.deepEqual(entry.shots,{thumbs:{},full:{}},'protected capture URLs excluded');}

 assert((await page.locator('.app-directory').textContent()).includes('No active subscriptions recorded.'));
 assert((await page.locator('.app-directory').textContent()).includes('DISCONNECTED'));
 assert.equal(await page.locator('.service-card').count(),5);
 assert.equal(await page.locator('.service-card a svg[data-icon="arrow-up"]').count(),5);
 assert(!(await page.locator('.app-directory').textContent()).includes('↗'));
 assert(await page.locator('.service-logo').evaluateAll(imgs=>imgs.every(img=>img.complete && img.naturalWidth>0)));
 assert((await page.locator('.service-catalog').textContent()).includes('USD 8.40'));
 assert.deepEqual(errors,[]);await mkdir(`qa/subscription-release/${project}`,{recursive:true});
 await page.screenshot({path:`qa/subscription-release/${project}/live-1280.png`,fullPage:true});
 await page.setViewportSize({width:390,height:844});assert(await page.locator('.app-directory').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await page.screenshot({path:`qa/subscription-release/${project}/live-390.png`,fullPage:true});
 await page.goto(`${url.split('#')[0]}#/admin/class-schedule`);await page.getByRole('heading',{name:'Class Schedule',exact:true}).waitFor();await page.locator('.session-calendar').waitFor();
 await page.goto(`${url.split('#')[0]}#/site/schedule`);await page.locator('.session-calendar').waitFor();assert.deepEqual(errors,[]);
 await writeFile(`qa/subscription-release/${project}/verified.json`,JSON.stringify({url,expectedCommit:expected,release,checkedAt:new Date().toISOString(),httpStatus:response.status(),checks:['exact live source SHA/version','scheduling routes in release map','live admin/public schedule renders','protected captures excluded','deployed directory renders','starts empty','disconnected adapters visible','390/1280 captures','no page errors'],errors},null,2));console.log('Verified '+url);
} finally {await browser.close();}
