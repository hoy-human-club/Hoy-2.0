import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir,writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:5195',key='hub.app-subscriptions.v1:ten_hoy';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const cases=[];
try{
 for(const timezoneId of ['UTC','Asia/Tokyo']){
  const context=await browser.newContext({timezoneId,viewport:{width:1280,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-23T04:59:00Z')});await page.clock.pauseAt(new Date('2026-10-23T04:59:59Z'));
  await context.addInitScript(()=>{localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_super',devMode:false,viewAs:null}));localStorage.setItem('hoyos.lang','en');});
  await page.goto(`${base}/#/admin/finance/subscriptions`);const panel=page.locator('.app-directory');await panel.getByRole('heading',{name:'Apps & subscriptions',exact:true}).waitFor();
  await panel.getByRole('button',{name:'Add app',exact:true}).click();
  for(const [name,value] of [['provider','FICTIONAL calendar'],['product','QA studio verification'],['purpose','FICTIONAL timezone validation fixture'],['officialUrl','https://example.com'],['evidence','FICTIONAL test assertion'],['lastVerified','2026-10-23']])await panel.locator(`[name=${name}]`).fill(value);
  const save=panel.getByRole('button',{name:'Save record',exact:true});await save.click();await panel.getByRole('alert').filter({hasText:'valid past or current date'}).waitFor();assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),null,'before midnight rejects without write');
  await mkdir('docs/screenshots/M-09d',{recursive:true});await page.screenshot({path:`docs/screenshots/M-09d/timezone-verification-${timezoneId.replaceAll('/','-')}-rejected-en-1280.jpg`,fullPage:true,quality:65,animations:'disabled'});
  // Same open form, same callback: command-time clock crossing must immediately allow today.
  await page.clock.setSystemTime(new Date('2026-10-23T05:00:00Z'));await save.click();await panel.getByRole('heading',{name:'QA studio verification',exact:true}).waitFor();
  const raw=await page.evaluate(key=>localStorage.getItem(key),key);assert.equal(JSON.parse(raw).dependencies[0].lastVerified,'2026-10-23');
  await page.clock.setSystemTime(new Date('2026-10-23T04:59:59Z'));await page.reload();await panel.getByRole('alert').filter({hasText:'Cannot read saved records'}).waitFor();assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),raw,'read failure preserves original records');
  await page.clock.setSystemTime(new Date('2026-10-23T05:00:00Z'));await page.reload();await panel.getByRole('heading',{name:'QA studio verification',exact:true}).waitFor();
  const backup=JSON.parse(raw);backup.dependencies[0].product='QA imported calendar';backup.dependencies[0].lastVerified='2026-10-24';
  const file={name:'fictional-calendar.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))};
  await page.clock.setSystemTime(new Date('2026-10-24T04:59:59Z'));await panel.locator('input[type=file]').setInputFiles(file);await panel.getByRole('alert').filter({hasText:'valid past or current date'}).waitFor();assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),raw,'import failure preserves records');
  await page.clock.setSystemTime(new Date('2026-10-24T05:00:00Z'));page.once('dialog',dialog=>dialog.accept());await panel.locator('input[type=file]').setInputFiles(file);await panel.getByRole('heading',{name:'QA imported calendar',exact:true}).waitFor();
  assert.equal(JSON.parse(await page.evaluate(key=>localStorage.getItem(key),key)).dependencies[0].lastVerified,'2026-10-24');assert.deepEqual(errors,[]);
  await page.screenshot({path:`docs/screenshots/M-09d/timezone-verification-${timezoneId.replaceAll('/','-')}-accepted-en-1280.jpg`,fullPage:true,quality:65,animations:'disabled'});
  cases.push({timezoneId,passed:true,checks:['future verification rejected before05Z without write','same form accepted at05Z without reload','read preserves invalid-for-current-day saved data','read recovers at05Z','import rejects before05Z without write','explicit restore accepted at05Z','no page errors']});await context.close();console.log(`PASS HOY subscription calendar UI: ${timezoneId}`);
 }
 await mkdir('docs/frontend-completion/evidence',{recursive:true});await writeFile('docs/frontend-completion/evidence/batch-17-subscription-calendar-results.json',JSON.stringify({passed:true,browser:'Chromium',fixture:'fictional isolated directory data',cases,captures:4},null,2)+'\n');
}finally{await browser.close();}
