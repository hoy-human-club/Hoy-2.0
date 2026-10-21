import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:4174';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({timezoneId:'America/Bogota',viewport:{width:1280,height:1000}});
const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`${base}/#/`);
 await page.evaluate(()=>{localStorage.setItem('hoyos.lang','en');localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_admin',devMode:false,viewAs:null}));});
 await page.goto(`${base}/#/admin/class-schedule`);await page.reload();
 await page.getByRole('heading',{name:'Class Schedule',exact:true}).waitFor();
 await page.locator('.session-calendar').waitFor();
 for(const name of ['List','Table','Calendar']){await page.getByRole('button',{name,exact:true}).click();}
 await page.getByRole('button',{name:'List',exact:true}).click();
 await page.getByRole('button',{name:'Open session',exact:true}).first().click();
 await page.getByRole('dialog').waitFor();
 assert(await page.getByText('This session only',{exact:true}).isVisible());
 await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
 await page.getByRole('link',{name:'Weekly templates',exact:true}).click();
 await page.getByRole('heading',{name:'Content',exact:true}).waitFor();
 await page.getByRole('button',{name:'List',exact:true}).click();
 await page.getByRole('button',{name:'Table',exact:true}).click();
 await page.goto(`${base}/#/admin/content?entity=modalities`);
 await page.getByRole('button',{name:'Select search results',exact:true}).click();
 await page.getByLabel('Field',{exact:true}).selectOption('heated');
 await page.getByLabel('New value',{exact:true}).selectOption('true');
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.modalities.map(r=>[r.id,r.heated]));
 await page.getByRole('button',{name:'Preview changes',exact:true}).click();
 await page.getByRole('button',{name:'Apply reviewed changes',exact:true}).click();
 await page.getByText('Batch saved in the demo.',{exact:true}).waitFor();
 assert((await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.modalities)).every(r=>r.heated===true));
 await page.getByRole('button',{name:'Undo last batch',exact:true}).click();
 await page.getByText('Batch undone.',{exact:true}).waitFor();
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.modalities.map(r=>[r.id,r.heated])),before);
 // Preview cancellation is nonmutating.
 await page.getByRole('button',{name:'Select search results',exact:true}).click();
 await page.getByRole('button',{name:'Preview changes',exact:true}).click();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.modalities.map(r=>[r.id,r.heated])),before);
 // Deep links open the requested related record.
 const teacher=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.teachers[0].id);
 await page.goto(`${base}/#/admin/content?entity=teachers&row=${teacher}`);await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
 // New templates default to 50 minutes and explicit reviewed generation.
 await page.goto(`${base}/#/admin/content?entity=class_templates`);
 const title=await page.locator('h1').innerText();assert(title.includes('Content'));
 await page.getByRole('button',{name:'Create',exact:true}).first().click();await page.getByRole('dialog').waitFor();
 assert.equal(await page.getByRole('dialog').getByLabel('Duration (min)',{exact:true}).inputValue(),'50');
 console.log('UI: create defaults');
 const dialog=page.getByRole('dialog');
 assert.equal(await dialog.getByLabel('Flat amount (COP)',{exact:true}).inputValue(),'100000');
 const fixture=await page.evaluate(()=>{const db=JSON.parse(localStorage.getItem('hoyos.db.v1')).db;const t=db.class_templates.find(t=>t.active);const d=new Date();d.setDate(d.getDate()+1);return {teacher:t.teacher_id,modality:t.modality_id,room:t.room_id,weekday:String(d.getDay()),date:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};});
 await dialog.getByLabel(/^Title/).fill('QA reviewed recurrence');
 for(const [label,value] of [['Teacher',fixture.teacher],['Modality',fixture.modality],['Room',fixture.room],['Weekday',fixture.weekday]])await dialog.getByLabel(label,{exact:true}).selectOption(value);
 await dialog.getByLabel('From (optional)',{exact:true}).fill(fixture.date);await dialog.getByLabel('Until (optional)',{exact:true}).fill(fixture.date);
 await dialog.getByLabel('Start time',{exact:true}).fill('23:00');await dialog.getByLabel('Capacity',{exact:true}).fill('8');
 await dialog.getByLabel('Default theme',{exact:true}).fill('Tema de prueba');await dialog.getByLabel('Default theme EN',{exact:true}).fill('Default QA theme');
 await dialog.getByRole('button',{name:'Save',exact:true}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.class_templates.some(t=>t.title==='QA reviewed recurrence'));
 console.log('UI: saved template');
 // Publishing remains a separate explicit action in this isolated browser fixture.
 await dialog.locator('label.toggle').filter({hasText:'Published'}).click();assert(await dialog.getByRole('switch',{name:'Published',exact:true}).isChecked());
 await dialog.getByRole('button',{name:'Preview upcoming dates',exact:true}).click();await dialog.getByRole('button',{name:'Create reviewed sessions',exact:true}).click();
 await page.waitForFunction(()=>{const db=JSON.parse(localStorage.getItem('hoyos.db.v1')).db;const t=db.class_templates.find(t=>t.title==='QA reviewed recurrence');return db.class_sessions.some(s=>s.template_id===t.id);});
 console.log('UI: generated sessions');
 const generated=await page.evaluate(()=>{const db=JSON.parse(localStorage.getItem('hoyos.db.v1')).db;const t=db.class_templates.find(t=>t.title==='QA reviewed recurrence');return db.class_sessions.filter(s=>s.template_id===t.id);});
 assert.equal(generated.length,1);assert.equal(Date.parse(generated[0].ends_at)-Date.parse(generated[0].starts_at),50*60000);
 console.log('UI: configuring attendance');
 await dialog.getByLabel('Pay type',{exact:true}).selectOption('attendance');
 await dialog.getByLabel('Base (COP)',{exact:true}).fill('10000');await dialog.getByLabel('Per participant (COP)',{exact:true}).fill('5000');
 assert(await dialog.getByRole('button',{name:'Save new revision',exact:true}).isDisabled(),'attendance basis must be explicit');
 await dialog.getByLabel('Which people count',{exact:true}).selectOption('checked_in');await dialog.getByRole('button',{name:'Save new revision',exact:true}).click();await dialog.getByText('Revision saved; earlier revisions preserved.',{exact:true}).waitFor();
 console.log('UI: edit dated session');
 await page.keyboard.press('Escape');
 await page.goto(`${base}/#/admin/class-schedule`);await page.getByRole('button',{name:'List',exact:true}).click();await page.getByRole('textbox',{name:'Search classes',exact:true}).fill('QA reviewed recurrence');await page.getByRole('button',{name:'Open session',exact:true}).click();
 await page.getByRole('dialog').getByLabel('Theme for this class EN',{exact:true}).fill('One-date QA theme');await page.getByRole('dialog').getByRole('button',{name:'Save',exact:true}).click();await page.getByText('Session saved in the demo.',{exact:true}).waitFor();await page.keyboard.press('Escape');
 await page.evaluate(()=>localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_cust',devMode:false,viewAs:null})));await page.goto('about:blank');
 console.log('UI: customer theme');
 await page.goto(`${base}/#/app/class/${generated[0].id}`);await page.getByText('One-date QA theme',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.class_templates.find(t=>t.title==='QA reviewed recurrence').theme.en),'Default QA theme','dated edit leaves template intact');

 // Marketing cannot see compensation fields or enter the admin schedule.
 await page.evaluate(()=>{const db=JSON.parse(localStorage.getItem('hoyos.db.v1')).db;const assignment=db.user_roles.find(x=>x.role==='marketing');if(!assignment)throw new Error('marketing fixture missing');localStorage.setItem('hoyos.session',JSON.stringify({userId:assignment.user_id,devMode:false,viewAs:null}));});
 await page.goto('about:blank');await page.goto(`${base}/#/admin/content?entity=teachers&row=${teacher}`);await page.getByRole('dialog').waitFor();
 assert.equal(await page.getByText('Rate per class (COP)',{exact:true}).count(),0);await page.keyboard.press('Escape');
 await page.goto(`${base}/#/admin/class-schedule`);assert.equal(await page.getByRole('heading',{name:'Class Schedule',exact:true}).count(),0);
 await page.evaluate(()=>localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_admin',devMode:false,viewAs:null})));await page.reload();
 for(const route of ['/admin/class-schedule','/admin/content'])for(const lang of ['es','en'])for(const width of [390,1280]){
  await page.evaluate(lang=>localStorage.setItem('hoyos.lang',lang),lang);await page.setViewportSize({width,height:1000});await page.goto(`${base}/#${route}`);await page.reload();await page.locator('h1').waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} ${lang} ${width}: no overflow`);
  const dir=route.includes('class-schedule')?'M-14':'M-02';await mkdir(`/tmp/hoy-release-private/${dir}`,{recursive:true});await page.screenshot({path:`/tmp/hoy-release-private/${dir}/verified-${lang}-${width}.jpg`,fullPage:true,quality:72});
 }
 assert.deepEqual(errors,[]);await mkdir('qa',{recursive:true});await writeFile('qa/class-management.json',JSON.stringify({passed:true,checks:['calendar/list/table','related-record deep links','Escape','batch preview/apply/undo/cancel','new-template duration/pay defaults','explicit publication and bounded recurrence generation','explicit attendance rule revision','per-date theme reaches customer without editing template','marketing restrictions','ES/EN mobile/desktop no overflow','no page errors']},null,2));
}catch(error){await mkdir('qa',{recursive:true});await page.screenshot({path:'qa/class-management-failure.jpg',fullPage:true});await writeFile('qa/class-management-failure.txt',String(error));throw error;}finally{await browser.close();}
