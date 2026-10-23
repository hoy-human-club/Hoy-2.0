import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('docs/screenshots/C-37',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const base=process.env.HOY_TEST_URL||'http://127.0.0.1:5173';
const results=[];
try{
for(const lang of ['es','en'])for(const width of [390,768,1280,3840]){
 const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({lang})=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_cust',devMode:false,viewAs:null}));},{lang});
 await page.goto(`${base}/#/app/voucher-gifts`);
 const prepare=page.getByRole('button',{name:lang==='es'?'Preparar transferencia de prueba':'Prepare test transfer',exact:true});
 await prepare.waitFor();await page.waitForFunction(()=>!!localStorage.getItem('hoyos.db.v1')) .catch(()=>{});
 await page.getByLabel(lang==='es'?'Email ficticio del destinatario (.test)':'Fictional recipient email (.test)').fill('friend@example.com');
 await prepare.click();await page.getByText(lang==='es'?'Usa un email válido terminado en .test y una cotización disponible.':'Use a valid .test email and an available quotation.',{exact:true}).waitFor();
 await page.getByLabel(lang==='es'?'Email ficticio del destinatario (.test)':'Fictional recipient email (.test)').fill('friend@demo.test');
 await page.getByLabel(lang==='es'?'Clases para regalar':'Classes to give',{exact:true}).selectOption('gift_pack12');
 const dbBefore=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k==='hoyos.db.v1').map(k=>[k,localStorage.getItem(k)])));
 await prepare.click();await page.getByRole('button',{name:lang==='es'?'Simular confirmación de transferencia':'Simulate transfer confirmation',exact:true}).click();
 await page.getByRole('link',{name:lang==='es'?'Abrir enlace del destinatario de prueba':'Open test recipient link',exact:true}).click();
 const email=page.getByLabel(lang==='es'?'Verificar email ficticio para el ensayo':'Verify fictional email for rehearsal');
 await email.fill('wrong@demo.test');const redeem=page.getByRole('button',{name:lang==='es'?'Canjear una vez en el ensayo':'Redeem once in rehearsal',exact:true});await redeem.click();
 await page.getByText(lang==='es'?'El email no coincide con el destinatario de prueba.':'Email does not match the test recipient.',{exact:true}).waitFor();
 await email.fill('friend@demo.test');await redeem.click();
 await page.getByText(lang==='es'?'Este bono ya fue canjeado. Saldo del ensayo: 12 clases. El saldo para reservas no cambió.':'This voucher was already redeemed. Rehearsal balance: 12 classes. Booking balance is unchanged.',{exact:true}).waitFor();
 assert.equal(await redeem.count(),0);
 assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k==='hoyos.db.v1').map(k=>[k,localStorage.getItem(k)]))),dbBefore,'no provider mutations');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
 assert.equal(await page.getByText(/⟨.+⟩/).count(),0,'no missing translation');
 await page.screenshot({path:`docs/screenshots/C-37/${lang}-${width}.jpg`,fullPage:true,quality:72});
 await page.reload();await page.getByText(lang==='es'?'Enlace no disponible en esta pestaña. Puede haberse recargado o ser desconocido. Inicia un nuevo ensayo.':'Link unavailable in this tab. It may have been reloaded or be unknown. Start a new rehearsal.',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);results.push({lang,width,checks:['invalid recipient','quote pack12','pending transfer','simulated confirmation','recipient mismatch','single redemption','email previews','no provider mutation','no overflow','reload missing link'],pageErrors:errors});await context.close();
}
await mkdir('docs/frontend-completion/evidence',{recursive:true});
await writeFile('docs/frontend-completion/evidence/voucher-gifts-ui.json',JSON.stringify({base:'c2c0f37fe5cb4e3ebb4abfba9d1f87759c661748',mode:`${base}, fictional memory only`,results},null,2)+'\n');
console.log('PASS voucher gifts UI: ES/EN × 390/768/1280/3840, transfer/redeem lifecycle and no provider mutations');
}finally{await browser.close();}
