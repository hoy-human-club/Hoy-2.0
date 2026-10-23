import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const base=process.env.HOY_TEST_URL||'http://127.0.0.1:5173';
const results=[];
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/#/admin/vouchers`);
 await page.getByLabel('Nombre ficticio del destinatario').fill('Persona ficticia');
 await page.getByLabel('Revisé esta configuración de prueba').check();
 await page.getByRole('button',{name:'Guardar invitación de prueba · gratis',exact:true}).click();
 await page.getByRole('link',{name:'Abrir experiencia del destinatario',exact:true}).first().waitFor();
 const snapshot=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')));
 const voucher=snapshot.db.vouchers.at(-1),id=voucher.id;
 for(const lang of ['es','en'])for(const width of [390,1280,768,3840])for(const state of ['expired','invalidExpiry','unclaimedExpired','exhausted','revoked','other']){
  const fixture=structuredClone(snapshot),v=fixture.db.vouchers.find(x=>x.id===id);
  v.expiresAt=state==='invalidExpiry'?'invalid':state.includes('Expired')||state==='expired'?'2000-01-01T00:00:00Z':null;
  v.balance=state==='exhausted'?0:2;v.status=state==='revoked'?'revoked':'claimed';v.claimedBy=state==='unclaimedExpired'?null:state==='other'?'usr_admin':'usr_cust';if(state==='unclaimedExpired')v.status='issued';
  await page.evaluate(({fixture,lang})=>{localStorage.setItem('hoyos.db.v1',JSON.stringify(fixture));localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_cust',devMode:false,viewAs:null}));},{fixture,lang});
  await page.setViewportSize({width,height:1000});await page.goto(`${base}/#/app/vouchers/${id}`);await page.reload();
  const message={es:{expired:'Este bono ha vencido. No se puede activar ni reservar con él.',exhausted:'Este bono no tiene saldo disponible. No se puede volver a usar mientras su saldo sea cero.',revoked:'Este bono fue revocado. No se puede activar ni reservar con él.',other:'Ya está activado por otra cuenta'},en:{expired:'This voucher has expired. It cannot be activated or used for bookings.',exhausted:'This voucher has no available balance. It cannot be used again while its balance is zero.',revoked:'This voucher was revoked. It cannot be activated or used for bookings.',other:'Already activated by another account'}};
  await page.getByText(message[lang][['invalidExpiry','unclaimedExpired'].includes(state)?'expired':state],{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:lang==='es'?'Activar con mi cuenta de prueba':'Activate with my test account',exact:true}).count(),0);
  assert.equal(await page.locator('select').count(),0,'no booking form');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no overflow');
  if(state==='expired'&&[390,1280].includes(width))await page.screenshot({path:`docs/screenshots/C-28/${lang}-${width}-expired.jpg`,fullPage:true,quality:72});
  results.push({lang,width,state,activationHidden:true,bookingHidden:true,noOverflow:true});
 }
 assert.deepEqual(errors,[]);
 await writeFile('docs/frontend-completion/evidence/voucher-availability-ui.json',JSON.stringify({base:'c2c0f37fe5cb4e3ebb4abfba9d1f87759c661748',mode:`${base}, injected fictional fixture`,results,pageErrors:errors},null,2)+'\n');
 console.log('PASS invitation availability: 48 ES/EN × phone/tablet/desktop/4K × expired/invalid-expiry/unclaimed-expired/exhausted/revoked/other-owner checks');
}finally{await browser.close();}
