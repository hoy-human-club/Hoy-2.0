import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:5181';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({timezoneId:'America/Bogota',viewport:{width:1280,height:1000}});
const page=await context.newPage(), errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto(`${base}/#/site/schedule`);
  await page.locator('.session-calendar').waitFor();
  const db=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
  assert.equal(db.class_templates.filter(t=>t.active).length,30);
  assert.equal(db.teachers.find(t=>t.id==='tea_andrea').display_name,'Andrea');
  const sunday=db.class_sessions.find(s=>new Date(s.starts_at).getDay()===0&&s.status==='scheduled'&&Date.parse(s.starts_at)>Date.now()&&db.class_templates.find(t=>t.id===s.template_id)?.active!==false);
  assert(sunday,'Sunday sessions exist');
  await page.locator('input[type=date]').fill(sunday.starts_at.slice(0,10));
  await page.getByRole('button',{name:'Día',exact:true}).click();
  await page.getByText('Fuego · Pilates Full Body',{exact:true}).first().waitFor();
  assert(!(await page.locator('body').innerText()).includes('Dom cerrado'));
  assert(!(await page.locator('body').innerText()).includes('4 clases al día'));
  const schema=await page.locator('#hoyos-localbusiness').textContent();
  assert(!JSON.parse(schema).openingHoursSpecification,'unconfirmed hours excluded from search metadata');
  await page.locator('.classrow:not(:disabled)').filter({hasText:'Fuego · Pilates Full Body'}).first().click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await assert.equal(await page.getByRole('dialog').count(),0);
  await page.reload();await page.locator('.session-calendar').waitFor();
  const again=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
  assert.equal(new Set(again.class_sessions.map(s=>s.id)).size,again.class_sessions.length,'reload does not duplicate session IDs');
  assert.equal(new Set(again.class_sessions.map(s=>`${s.template_id}|${s.starts_at}`)).size,again.class_sessions.length,'reload does not duplicate occurrences');
  for(const [code,path] of [['W-04','/site/schedule'],['W-05','/site/teachers'],['W-06','/site/contact'],['C-03','/app/schedule']]){
    await mkdir(`docs/screenshots/${code}`,{recursive:true});
    if(code==='C-03')await page.evaluate(()=>localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_cust',devMode:false,viewAs:null})));
    for(const lang of ['es','en'])for(const width of [390,1280]){
      await page.evaluate(lang=>localStorage.setItem('hoyos.lang',lang),lang);
      await page.setViewportSize({width,height:1000});await page.reload();await page.goto(`${base}/#${path}`);
      await page.locator(code==='W-04'||code==='C-03'?'.session-calendar':code==='W-05'?'.site': '[data-testid=contact-today]').first().waitFor();
      await page.waitForTimeout(400);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${code} ${lang} ${width} fits`);
      await page.screenshot({path:`docs/screenshots/${code}/schedule-${lang}-${width}.jpg`,fullPage:true});
    }
    await page.evaluate(()=>localStorage.setItem('hoyos.theme',JSON.stringify({theme:'dark',skin:'styled'})));await page.reload();await page.waitForTimeout(250);
    await page.screenshot({path:`docs/screenshots/${code}/schedule-en-1280-dark.jpg`,fullPage:true});
    await page.evaluate(()=>localStorage.setItem('hoyos.theme',JSON.stringify({theme:'light',skin:'styled'})));
  }
  assert.deepEqual(errors,[]);
  await mkdir('qa',{recursive:true});
  await writeFile('qa/timetable.json',JSON.stringify({passed:true,templates:30,captures:20,checks:['Sunday visible','no false closed-hours claim','unconfirmed hours excluded from JSON-LD','drawer dismissal','reload idempotency','ES/EN mobile/desktop and dark','no overflow or page errors']}));
  console.log('Timetable UI and 20 real bilingual/responsive captures passed');
} catch(error){await mkdir('qa',{recursive:true});await page.screenshot({path:'qa/timetable-failure.jpg',fullPage:true});console.error((await page.locator('body').innerText()).slice(-8000));throw error;} finally {await browser.close();}
