// OT-03 disconnected local draft; fictional text and effective demo role previews only.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
const base=process.env.QA_BASE??'http://127.0.0.1:5191',output='docs/screenshots/HUB-01';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const roles=['super_admin','admin','coordinator','front_desk','finance','teacher','maintenance','marketing','developer','customer','public'];
const labels={en:['Super admin','Admin','Coordinator','Front desk','Finance','Teacher','Maintenance','Marketing','Developer','Customer','Public'],es:['Super admin','Administración','Coordinación','Recepción','Finanzas','Profesor/a','Mantenimiento','Marketing','Desarrollo','Cliente','Público']};
const errors=[],checks=[],dispatch=[];
try {
 for(const lang of ['en','es']) {
  const ctx=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
  await ctx.addInitScript(lang=>{if(sessionStorage.getItem('report-init'))return;sessionStorage.setItem('report-init','1');localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_super',viewAs:'customer',devMode:false}));localStorage.setItem('hoyos.lang',lang);},lang);
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))dispatch.push(`${r.method()} ${r.url()}`);});
  const report=()=>page.getByRole('button',{name:lang==='en'?'Report a problem':'Reportar un problema',exact:true});
  const preview=()=>page.getByRole('button',{name:lang==='en'?'Preview local draft':'Revisar borrador local',exact:true});
  const summary=()=>page.getByLabel(lang==='en'?/Problem summary/:/Resumen del problema/);
  const detail=()=>page.getByLabel(lang==='en'?/Steps and expected result/:/Pasos y resultado esperado/);
  const dialog=()=>page.getByRole('dialog');
  await page.goto(`${base}/#/hub?live=0&qa_private_query=excluded`);await report().click();
  await preview().click();await dialog().getByText(lang==='en'?'Enter between 3 and 120 characters.':'Escribe entre 3 y 120 caracteres.',{exact:true}).waitFor();
  assert.equal(await summary().evaluate(el=>el===document.activeElement),true,'first invalid field focused');
  await summary().fill('QA Fictional button issue');await detail().fill('Fictional steps: press the demo button and expect sample feedback.');
  await page.getByRole('button',{name:lang==='en'?'Cancel without saving':'Cancelar sin guardar',exact:true}).click();
  assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('hoyos.problem-draft.')).length),0,'cancel did not save');
  await report().click();assert.equal(await summary().inputValue(),'','cancelled text not silently saved');
  await summary().fill('QA Fictional button issue');await detail().fill('Fictional steps: press the demo button and expect sample feedback.');await preview().click();
  await dialog().getByText('#/hub',{exact:true}).waitFor();assert.equal(await dialog().getByText(/qa_private_query/).count(),0,'query excluded from context');
  await page.evaluate(()=>{window.qaSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('hoyos.problem-draft.'))throw new DOMException('QA quota fixture','QuotaExceededError');return window.qaSetItem.call(this,k,v);};});
  await page.getByRole('button',{name:lang==='en'?'Save on this browser':'Guardar en este navegador',exact:true}).click();
  await dialog().getByText(lang==='en'?'The draft was not saved. Your text is still here; retry the local save.':'No se guardó el borrador. El texto sigue aquí; reintenta el guardado local.',{exact:true}).waitFor();
  for(const width of [390,1280]) {await page.setViewportSize({width,height:1000});await page.screenshot({path:`${output}/${lang}-${width}-report-retry.jpg`,quality:72,fullPage:false});}
  await page.evaluate(()=>{Storage.prototype.setItem=window.qaSetItem;});
  await page.getByRole('button',{name:lang==='en'?'Retry local save':'Reintentar guardado local',exact:true}).click();
  const savedButton=()=>page.getByRole('button',{name:lang==='en'?'Saved locally':'Guardado localmente',exact:true});assert(await savedButton().isDisabled());
  const original=await page.evaluate(()=>Object.entries(localStorage).find(([k])=>k.startsWith('hoyos.problem-draft.'))[1]);
  await page.getByRole('button',{name:lang==='en'?'Close':'Cerrar',exact:true}).last().click();await page.reload();await report().click();
  assert.equal(await summary().inputValue(),'QA Fictional button issue');await preview().click();await page.getByRole('button',{name:lang==='en'?'Save on this browser':'Guardar en este navegador',exact:true}).click();
  assert.equal(await page.evaluate(()=>Object.entries(localStorage).find(([k])=>k.startsWith('hoyos.problem-draft.'))[1]),original,'same draft replay retains id/timestamp and one record');
  await page.keyboard.press('Escape');
  await page.evaluate(()=>localStorage.setItem('hoyos.theme',JSON.stringify({theme:'dark',skin:'styled'})));await page.reload();await report().click();await preview().click();
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
  for(const width of [390,1280]) {await page.setViewportSize({width,height:1000});await page.screenshot({path:`${output}/${lang}-${width}-dark-report-customer.jpg`,quality:72,fullPage:false});}
  await page.keyboard.press('Escape');await page.evaluate(()=>localStorage.setItem('hoyos.theme',JSON.stringify({theme:'light',skin:'styled'})));
  for(const [i,role] of roles.entries()) {
   await page.evaluate(role=>localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_super',viewAs:role==='super_admin'?null:role,devMode:false})),role);await page.reload();await report().click();
   await dialog().getByText(labels[lang][i],{exact:true}).waitFor();await dialog().getByText('Sofía Arango · usr_super',{exact:true}).waitFor();
   if(role!=='customer')assert.equal(await summary().inputValue(),'','different effective role receives a separate draft');
   await summary().fill('QA Fictional button issue');await detail().fill('Fictional steps: press the demo button and expect sample feedback.');await preview().click();
   for(const width of [390,1280]) {
    await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'responsive report');
    await page.screenshot({path:`${output}/${lang}-${width}-report-${role}.jpg`,quality:65,fullPage:false});
   }
   await page.keyboard.press('Escape');
  }
  for(const [userId,name] of [['usr_cust','Juliana Ospina'],['usr_public','Visitante']]) {
   await page.evaluate(userId=>localStorage.setItem('hoyos.session',JSON.stringify({userId,viewAs:null,devMode:false})),userId);await page.reload();await report().click();
   await dialog().getByText(`${name} · ${userId}`,{exact:true}).waitFor();assert.equal(await summary().inputValue(),'','different demo actor receives a separate draft');await page.keyboard.press('Escape');
  }
  checks.push(`${lang}:11 effective demo roles;390/1280 context+preview captures; validation/focus,cancel without save,storage failure,retry,reload,idempotent save,role isolation,query excluded,no dispatch`);await ctx.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(dispatch,[]);
 await writeFile(`${output}/report-results.json`,JSON.stringify({feature:'OT-03',phase:'Nov 30 delivery',criterionMet:false,base,roles,checks,errors,dispatch,limits:['Local draft only; original sends criterion remains unmet.','Effective roles are client demo previews, not server authorization.','No external intake, delivery or cross-device persistence.']},null,2));console.log(checks.join('\n'));
} finally {await browser.close();}
