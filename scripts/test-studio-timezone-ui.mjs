import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:5194';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const zones=['America/Bogota','UTC','Asia/Tokyo','America/Los_Angeles'];
const reports=[];let captures=0,lastPage;
try {
 await Promise.all(zones.map(async timezoneId=>{
  const context=await browser.newContext({timezoneId,viewport:{width:1280,height:1000}}),page=await context.newPage(),errors=[];
  lastPage=page;page.setDefaultTimeout(60000);page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',timezoneId,e.message);});
  await page.clock.install({time:new Date('2026-10-23T04:30:00Z')});
  await page.goto(`${base}/#/site/schedule`);await page.locator('.session-calendar').waitFor();
  await page.evaluate(()=>{
   const stored=JSON.parse(localStorage.getItem('hoyos.db.v1')),db=stored.db;
   const common={...db.class_sessions[0],template_id:null,status:'scheduled',booked_count:0,capacity:8};
   const row=(id,title,starts_at,ends_at)=>({...common,id,title,starts_at,ends_at});
   db.class_sessions=[row('qa_morning','QA Morning :10','2026-10-22T11:10:00Z','2026-10-22T12:00:00Z'),row('qa_late','QA Late Bogota','2026-10-23T04:40:00Z','2026-10-23T04:55:00Z'),row('qa_after','QA After Midnight','2026-10-23T05:10:00Z','2026-10-23T06:00:00Z')];
   db.class_templates.forEach(t=>t.generation_mode='manual');db.bookings=[];db.voucher_bookings=[];
   db.hours_overrides=[{...db.hours_overrides[0],id:'qa_holiday',start_date:'2026-11-02',end_date:'2026-11-02',closed:true,label:{es:'QA Todos los Santos',en:'QA All Saints'},kind:'holiday',source:'colombia'}];
   db.vouchers.push({...db.vouchers[0],id:'qa_tz_voucher',tenant_id:'ten_hoy',created_at:'2026-10-23T04:30:00Z',updated_at:'2026-10-23T04:30:00Z',claimedBy:'usr_cust',status:'claimed',title:'QA Timezone Voucher',recipientName:'FICTIONAL timezone',benefitKind:'classes',benefitTotal:1,balance:1,participantCap:1,capScope:'per_booking',creditUnit:'per_person',cancellationPolicy:'restore',expiresAt:'2026-11-03T04:59:59Z'});
   db.voucher_events.push({id:'qa_tz_event',tenant_id:'ten_hoy',created_at:'2026-10-23T04:30:00Z',updated_at:'2026-10-23T04:30:00Z',voucherId:'qa_tz_voucher',bookingId:null,kind:'issue',actorId:'usr_super',requestId:'qa_timezone',fingerprint:'qa_timezone',payload:{}});
   localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));
  });
  for(const [code,route,user] of [['W-04','/site/schedule','usr_public'],['C-02','/app/schedule','usr_cust']]){
   for(const lang of ['es','en'])for(const width of [390,1280]){
    await page.evaluate(({lang,user})=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.session',JSON.stringify({userId:user,devMode:false,viewAs:null}));sessionStorage.clear();},{lang,user});
    await page.setViewportSize({width,height:1000});await page.reload();await page.goto(`${base}/#${route}`);await page.locator('.session-calendar').waitFor();
    const input=page.locator('.calendar-date-label input');await input.fill('2026-10-22');await page.getByRole('button',{name:lang==='en'?'Day':'Día',exact:true}).click();
    assert.equal(await input.inputValue(),'2026-10-22');
    const morning=page.locator('.classrow').filter({hasText:'QA Morning :10'}),late=page.locator('.classrow').filter({hasText:'QA Late Bogota'});
    await morning.waitFor();await late.waitFor();assert.equal(await page.locator('.classrow').filter({hasText:'QA After Midnight'}).count(),0);
    assert.match(await morning.innerText(),/6:10/);assert.match(await late.innerText(),/11:40|23:40/);
    await page.getByRole('button',{name:lang==='en'?'Today':'Hoy',exact:true}).click();assert.equal(await input.inputValue(),'2026-10-22','today follows studio day');
    await page.clock.setSystemTime(new Date('2026-10-23T05:01:00Z'));await page.getByRole('button',{name:lang==='en'?'Today':'Hoy',exact:true}).click();assert.equal(await input.inputValue(),'2026-10-23');
    await page.locator('.classrow').filter({hasText:'QA After Midnight'}).waitFor();assert.equal(await page.locator('.classrow').filter({hasText:'QA Late Bogota'}).count(),0);
    await page.clock.setSystemTime(new Date('2026-10-23T04:30:00Z'));await input.fill('2026-10-22');
    await page.getByRole('button',{name:lang==='en'?'Week':'Semana',exact:true}).click();assert.match(await page.locator('.calendar-period h2').innerText(),/19/);assert.match(await page.locator('.calendar-period h2').innerText(),/25/);
    await page.getByRole('button',{name:lang==='en'?'Month':'Mes',exact:true}).click();await input.fill('2026-01-31');await page.locator('.calendar-arrows button').last().click();assert.equal(await input.inputValue(),'2026-02-01');
    await input.fill('2026-10-22');await page.getByRole('button',{name:lang==='en'?'Day':'Día',exact:true}).click();
    if(route==='/app/schedule'){
     await page.getByRole('button',{name:lang==='en'?'Filter':'Filtrar',exact:true}).click();
     await page.getByRole('button',{name:lang==='en'?'Morning':'Mañana',exact:true}).click();await page.getByRole('button',{name:lang==='en'?'Apply':'Aplicar',exact:true}).click();
     await morning.waitFor();assert.equal(await page.locator('.classrow').filter({hasText:'QA Late Bogota'}).count(),0,'morning filter uses Bogotá hour');
    }
    await page.evaluate(()=>document.fonts.ready);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${timezoneId}/${code}/${lang}/${width}: overflow`);
    await mkdir(`docs/screenshots/${code}`,{recursive:true});await page.screenshot({path:`docs/screenshots/${code}/timezone-${timezoneId.replaceAll('/','-')}-${lang}-${width}.jpg`,fullPage:true,quality:65,animations:'disabled'});captures++;
    if(lang==='en'&&width===1280){
     await page.evaluate(()=>localStorage.setItem('hoyos.theme',JSON.stringify({theme:'dark',skin:'styled'})));await page.reload();await page.locator('.session-calendar').waitFor();await page.locator('.calendar-date-label input').fill('2026-10-22');await page.getByRole('button',{name:'Day',exact:true}).click();
     await page.screenshot({path:`docs/screenshots/${code}/timezone-${timezoneId.replaceAll('/','-')}-en-1280-dark.jpg`,fullPage:true,quality:65,animations:'disabled'});captures++;
     await page.evaluate(()=>localStorage.setItem('hoyos.theme',JSON.stringify({theme:'light',skin:'styled'})));
    }
    reports.push({timezoneId,code,lang,width,passed:true});console.log(`PASS ${timezoneId} ${code} ${lang} ${width}`);
   }
  }
  // Shared data-table calendars/timelines render the same stored instants in studio hours.
  await page.evaluate(()=>{localStorage.setItem('hoyos.lang','en');localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_super',devMode:false,viewAs:null}));});
  await page.setViewportSize({width:1280,height:1000});await page.reload();
  await page.goto(`${base}/#/admin/tables/class_sessions?date=2026-10-22&view=calendar&mode=week`);await page.locator('.cal-week[role=grid]').waitFor();
  const timed=page.locator('.cal-chip.is-timed').filter({hasText:'QA Morning :10'});await timed.waitFor();assert.match(await timed.innerText(),/6:10/);assert.equal(await timed.evaluate(el=>Number(el.style.getPropertyValue('--s'))>=0),true);
  await page.goto(`${base}/#/admin/tables/class_sessions?v=tvw_sessions_timeline&date=2026-10-22&view=timeline&zoom=day`);await page.locator('.tl').waitFor();
  await page.getByRole('button',{name:/QA Morning :10/}).last().waitFor();
  await mkdir('docs/screenshots/M-03',{recursive:true});await page.screenshot({path:`docs/screenshots/M-03/timezone-${timezoneId.replaceAll('/','-')}-en-1280.jpg`,fullPage:true,quality:65,animations:'disabled'});captures++;
  await page.goto(`${base}/#/admin/settings/hours`);await page.getByText('QA All Saints',{exact:true}).first().waitFor();assert.match(await page.locator('body').innerText(),/Nov 2|2 Nov|Nov\. 2/);
  await mkdir('docs/screenshots/M-08g',{recursive:true});await page.screenshot({path:`docs/screenshots/M-08g/timezone-${timezoneId.replaceAll('/','-')}-en-1280.jpg`,fullPage:true,quality:65,animations:'disabled'});captures++;
  await page.evaluate(()=>localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_cust',devMode:false,viewAs:null})));await page.goto(`${base}/?timezone-qa=customer#/app/plans`);await page.locator('.cust-plan-price').first().waitFor();
  for(const price of await page.locator('.cust-plan-price').allTextContents())assert(!/[.,]\d{2}$/.test(price.trim()),'COP whole pesos');
  await page.goto(`${base}/#/app/vouchers/qa_tz_voucher`);await page.getByText('FICTIONAL timezone',{exact:true}).waitFor();assert.match(await page.locator('.voucher-events').innerText(),/Oct 22, 2026.*11:30 PM/);assert.match(await page.locator('select option').last().innerText(),/Oct 23, 2026.*12:10 AM/);
  await mkdir('docs/screenshots/C-28',{recursive:true});await page.screenshot({path:`docs/screenshots/C-28/timezone-${timezoneId.replaceAll('/','-')}-en-1280.jpg`,fullPage:true,quality:65,animations:'disabled'});captures++;
  assert.deepEqual(errors,[],timezoneId);await context.close();console.log(`PASS rendered studio timezone ${timezoneId}`);
 }));
 assert.equal(reports.length,32);assert.equal(captures,52);reports.sort((a,b)=>a.timezoneId.localeCompare(b.timezoneId)||a.code.localeCompare(b.code)||a.lang.localeCompare(b.lang)||a.width-b.width);
 await mkdir('qa',{recursive:true});await writeFile('qa/studio-timezone.json',JSON.stringify({passed:true,captures,reports,checks:['stored instants unchanged','studio midnight today boundary','date-only input no shift','week/month navigation','morning filter','shared calendar/timeline','Colombian holiday date','COP without decimals','no overflow or page errors']},null,2));await mkdir('docs/frontend-completion/evidence',{recursive:true});await writeFile('docs/frontend-completion/evidence/batch-17-timezone-results.json',JSON.stringify({passed:true,browser:'Chromium',fixture:'fictional isolated browser data',captures,reports,checks:['studio midnight boundary','date-only labels','navigation and filters','shared calendar/timeline','holidays','COP whole pesos','voucher timestamp display','no overflow or page errors']},null,2));console.log(`PASS ${reports.length} schedule cases; ${captures} screenshots`);
}catch(error){await mkdir('qa',{recursive:true});if(lastPage){console.error('FAILED URL',lastPage.url());console.error((await lastPage.locator('body').innerText()).slice(0,5000));await lastPage.screenshot({path:'qa/studio-timezone-failure.jpg',fullPage:true,animations:'disabled'}).catch(()=>{});}throw error;}finally{await browser.close();}
