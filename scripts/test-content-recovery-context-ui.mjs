import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE??'http://127.0.0.1:5218',out=`${process.env.QA_OUTPUT??'/tmp/hoy-content-context'}/context`,checks=[],errors=[];
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});let debug;
try {for(const lang of ['en','es'])for(const change of ['role','actor-admin','actor-coordinator'])for(const outcome of (process.env.QA_INJECT==='1'?['quota','lost']:['quota'])){
 const en=lang==='en',context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
 await context.addInitScript(lang=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_super',devMode:false,viewAs:null}));},lang);
 const page=await context.newPage();debug=page;page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/?qa-context=${change}-${outcome}#/admin/content?entity=teachers`);await page.locator('tbody tr').first().click();
 const drawer=page.getByRole('dialog'),save=drawer.getByRole('button',{name:en?'Save':'Guardar',exact:true}),retry=drawer.getByRole('button',{name:en?'Retry':'Reintentar',exact:true});
 const db=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
 const name=drawer.locator('input').first(),pay=drawer.locator('input[type=number]').first();
 const oldName=await name.inputValue(),before=await db(),teacher=before.teachers.find(r=>r.display_name===oldName),rate=Number(await pay.inputValue())+111;
 await name.fill('FICTIONAL RETAINED ACTOR DRAFT');await pay.fill(String(rate));
 if(outcome==='quota')await page.evaluate(()=>{window.qaOriginalStorage=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='hoyos.db.v1')throw Error('fictional_quota');return window.qaOriginalStorage.call(this,k,v);};});
 else await page.evaluate(async()=>{const {MockProvider}=await import('/src/data/MockProvider.ts');const original=MockProvider.prototype.atomic;let lose=true;MockProvider.prototype.atomic=async function(...args){const result=await original.apply(this,args);if(lose){lose=false;throw Error('fictional_lost_ack');}return result;};});
 await save.click();await retry.waitFor();const retained=await db();
 if(outcome==='quota')assert.deepEqual(retained,before,'initial quota failure has no mutation');
 else {assert.equal(retained.teachers.find(r=>r.id===teacher.id).rate_per_class,rate);assert.equal(retained.audit_log.filter(r=>r.action==='content.update'&&r.entity_id===teacher.id).length,before.audit_log.filter(r=>r.action==='content.update'&&r.entity_id===teacher.id).length+1);}
 async function switchContext(restore=false){await page.evaluate(({change,restore})=>{const s=document.querySelector(change==='role'?'.roleswitcher select:nth-of-type(2)':'#rs-user');s.value=restore?(change==='role'?'':'usr_super'):(change==='role'?'coordinator':change==='actor-admin'?'usr_admin':'usr_coord');s.dispatchEvent(new Event('change',{bubbles:true}));},{change,restore});await page.waitForFunction(({change,restore})=>{const s=JSON.parse(localStorage.getItem('hoyos.session'));return change==='role'?s.viewAs===(restore?null:'coordinator'):s.userId===(restore?'usr_super':change==='actor-admin'?'usr_admin':'usr_coord');},{change,restore});}
 await switchContext();if(outcome==='quota')await page.evaluate(()=>Storage.prototype.setItem=window.qaOriginalStorage);
 await retry.click();await page.waitForFunction(()=>!document.querySelector('[role=alert] button:disabled'));
 assert.equal((await db()).teachers.find(r=>r.id===teacher.id).rate_per_class,retained.teachers.find(r=>r.id===teacher.id).rate_per_class,`${change}/${outcome}: retained payroll edit must not commit under a changed context`);
 assert.deepEqual(await db(),retained,`${change}/${outcome}: retry under a different current context must not write with retained privileges or identity`);
 assert.equal(await name.inputValue(),'FICTIONAL RETAINED ACTOR DRAFT','draft preserved across context change');
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});await drawer.getByRole('alert').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${lang}-${width}-${change}-${outcome}-blocked.jpg`,quality:65,animations:'disabled'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await switchContext(true);assert.equal(await pay.inputValue(),String(rate));await retry.click();await retry.waitFor({state:'hidden'});
 const after=await db();assert.equal(after.teachers.find(r=>r.id===teacher.id).rate_per_class,rate);assert.equal(after.teachers.find(r=>r.id===teacher.id).display_name,'FICTIONAL RETAINED ACTOR DRAFT');const audits=after.audit_log.filter(r=>r.action==='content.update'&&r.entity_id===teacher.id);assert.equal(audits.length,before.audit_log.filter(r=>r.action==='content.update'&&r.entity_id===teacher.id).length+1);assert.equal(audits.at(-1).actor_id,'usr_super');assert.equal(audits.at(-1).diff.role,'super_admin');
 checks.push(`${lang}/${change}/${outcome}: failure/uncertain-ack handled; changed-context retry blocked with identical DB; draft retained; original-context retry commits once with correct actor/role;390/1280`);await context.close();
 }
 if(process.env.QA_INJECT==='1')for(const lang of ['en','es']){
  const ctx=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
  await ctx.addInitScript(lang=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_super',devMode:false,viewAs:null}));},lang);
  const page=await ctx.newPage();debug=page;page.on('pageerror',e=>errors.push(e.message));await page.goto(`${base}/?qa-context=unmount#/admin/content?entity=teachers`);await page.locator('tbody tr').first().click();
  const drawer=page.getByRole('dialog'),before=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);await drawer.locator('input[type=number]').fill('90222');
  await page.evaluate(async()=>{const {MockProvider}=await import('/src/data/MockProvider.ts');const original=MockProvider.prototype.atomic;MockProvider.prototype.atomic=async function(...args){window.qaContextEntered=true;await new Promise(resolve=>window.qaContextRelease=resolve);try{return await original.apply(this,args);}finally{window.qaContextDone=true;}};});
  await drawer.getByRole('button',{name:lang==='en'?'Save':'Guardar',exact:true}).click();await page.waitForFunction(()=>window.qaContextEntered);
  await page.locator('#rs-user').evaluate(select=>{select.value='usr_desk';select.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForURL(/no-access/);await page.evaluate(()=>window.qaContextRelease());await page.waitForFunction(()=>window.qaContextDone);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db),before,'route-unmounted actor switch aborts queued content save');checks.push(`${lang}/unmount: switch to denied front-desk route while queued; no data or audit mutation`);await ctx.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({base,checks,errors,limits:['Fictional local SessionProvider and MockProvider only; no real authentication or server guarantees.']},null,2));console.log(checks.join('\n'));
} catch(error){if(debug&&!debug.isClosed()){await debug.screenshot({path:`${out}/failure.jpg`});await writeFile(`${out}/failure.txt`,await debug.locator('body').innerText());}throw error;}finally{await browser.close();}
