import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE??'http://127.0.0.1:5333',out='qa/signup-consent/recovery',checks=[],errors=[];
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
try {
 for(const lang of ['en','es'])for(const width of [390,1280]) {
  const en=lang==='en',ctx=await browser.newContext({viewport:{width,height:1000}});
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
  await ctx.addInitScript(lang=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_super',viewAs:null,devMode:false}));},lang);
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/#/admin/tables/legal_documents?id=leg_terms_20');
  const dialog=p.getByRole('dialog');await dialog.locator('.tbl-editor input').first().waitFor();
  assert.equal(await dialog.locator('.tbl-editor input:enabled,.tbl-editor select:enabled,.tbl-editor textarea:enabled').count(),0);
  assert.equal(await dialog.getByRole('button',{name:en?'Delete':'Eliminar',exact:true}).count(),0);
  await p.screenshot({path:`${out}/${lang}-${width}-published.jpg`,fullPage:true});
  await dialog.getByRole('button',{name:en?'Close':'Cerrar',exact:true}).click();
  await p.getByRole('button',{name:en?'New row':'Nueva fila',exact:true}).click();await dialog.waitFor();
  const id=new URLSearchParams(p.url().split('?')[1]).get('id');assert(id);
  assert.equal(await p.evaluate(id=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.legal_documents.find(r=>r.id===id).status,id),'draft');
  const field=dialog.locator('.tbl-editor input:enabled').first();await field.fill('fictional-recovery-draft');await field.press('Tab');
  await p.waitForFunction(id=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.legal_documents.some(r=>r.id===id&&r.slug==='fictional-recovery-draft'),id);
  await p.screenshot({path:`${out}/${lang}-${width}-draft.jpg`,fullPage:true});
  await dialog.getByRole('button',{name:en?'Delete':'Eliminar',exact:true}).click();await dialog.getByRole('button',{name:en?'Delete':'Eliminar',exact:true}).click();
  await p.waitForFunction(id=>!JSON.parse(localStorage.getItem('hoyos.db.v1')).db.legal_documents.some(r=>r.id===id),id);
  checks.push(`${lang}/${width}: published fields disabled, delete absent; new row starts draft, editable and deletable`);await ctx.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS recovery UI:',checks.join('; '));
} finally {await writeFile(out+'/results.json',JSON.stringify({checks,errors},null,2));await browser.close();}
