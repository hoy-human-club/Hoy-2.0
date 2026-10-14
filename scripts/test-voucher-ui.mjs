import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
await mkdir('docs/screenshots/M-13',{recursive:true});await mkdir('docs/screenshots/C-28',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:1000}}); const errors=[];
page.on('pageerror',e=>errors.push(e.message));
process.on('uncaughtException',async error=>{console.error(error);console.error(await page.locator('body').innerText());await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'docs/screenshots/M-13/qa-failure.jpg',fullPage:true});await browser.close();process.exit(1);});
await page.goto('http://127.0.0.1:5173/#/admin/vouchers');
await page.getByLabel('Nombre ficticio del destinatario').fill('Persona de prueba');
await page.getByLabel('Revisé esta configuración de prueba').check();
await page.getByRole('button',{name:'Guardar invitación de prueba · gratis',exact:true}).click();
await page.getByRole('link',{name:'Abrir experiencia del destinatario',exact:true}).waitFor();
await page.getByRole('button',{name:'Vista previa del mensaje · Email',exact:true}).click();
await page.getByText('Vista previa guardada. Nada enviado. Entrega real pendiente de integración.').waitFor();
await page.getByRole('link',{name:'Abrir experiencia del destinatario',exact:true}).first().click();
await page.getByRole('button',{name:'Probar como cliente ficticio',exact:true}).click();
await page.getByRole('button',{name:'Activar con mi cuenta de prueba',exact:true}).click();
await page.getByLabel('Elige una clase').waitFor();
const options=await page.getByLabel('Elige una clase').locator('option').evaluateAll(nodes=>nodes.map(n=>n.value).filter(Boolean));
assert(options.length>0);
await page.getByLabel('Nombre ficticio · participante 1').fill('Cliente ficticio');
await page.getByRole('button',{name:'Agregar acompañante',exact:true}).click();
await page.getByLabel('Nombre ficticio · participante 2').fill('Invitado ficticio');
await page.getByRole('checkbox').check();
let booked=false;
for(const sessionId of options){await page.getByLabel('Elige una clase').selectOption(sessionId);await page.getByRole('button',{name:'Confirmar reserva de prueba',exact:true}).click(); await page.waitForTimeout(60);if(await page.getByRole('button',{name:'Cancelar reserva de prueba',exact:true}).count()){booked=true;break;}}
assert(booked,'one group booking succeeds');
assert.equal(await page.getByRole('button',{name:'Cancelar reserva de prueba',exact:true}).count(),1);
await page.reload(); await page.getByText('Cliente ficticio · Invitado ficticio',{exact:true}).waitFor();
const claimUrl=page.url();
for(const lang of ['es','en'])for(const width of [390,1280]){await page.evaluate(lang=>localStorage.setItem('hoyos.lang',lang),lang);await page.reload();await page.setViewportSize({width,height:1000});await page.waitForTimeout(200);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`docs/screenshots/C-28/${lang}-${width}.jpg`,fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');}
await page.evaluate(()=>localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_super',devMode:false,viewAs:null})));await page.goto('http://127.0.0.1:5173/#/admin/vouchers');await page.reload();
await page.getByRole('button',{name:'Record test attendance',exact:true}).click();await page.getByText('Booking · Attended',{exact:true}).waitFor();
for(const lang of ['es','en'])for(const width of [390,1280]){await page.evaluate(lang=>localStorage.setItem('hoyos.lang',lang),lang);await page.reload();await page.setViewportSize({width,height:1000});await page.waitForTimeout(200);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`docs/screenshots/M-13/${lang}-${width}.jpg`,fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'admin no overflow');}
for(const [code,url] of [['M-13','http://127.0.0.1:5173/#/admin/vouchers'],['C-28',claimUrl]]){await page.goto(url);await page.evaluate(()=>localStorage.setItem('hoyos.theme',JSON.stringify({theme:'dark',skin:'styled'})));await page.reload();assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`docs/screenshots/${code}/en-1280-dark.jpg`,fullPage:true});}
assert.deepEqual(errors,[]); console.log('Voucher UI lifecycle, persistence, ES/EN 390/1280, overflow and console checks passed');await browser.close();
