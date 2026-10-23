import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir,writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE??'http://127.0.0.1:5217',out='docs/screenshots/schedule-booking-support',checks=[],errors=[];let debugPage;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
try {
 for (const lang of ['es','en']) for(const width of [390,1280]) {
  const en=lang==='en',ctx=await browser.newContext({viewport:{width,height:900},timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
  await ctx.addInitScript(lang=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_cust',devMode:false,viewAs:null}));},lang);
  const p=await ctx.newPage();debugPage=p;p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));
  await p.clock.install({time:new Date('2026-10-23T15:00:00Z')});
  const mount=async(route,mode='')=>{await p.goto(`${base}/#/coming-soon`);await p.evaluate(async({route,mode})=>{const h=await import('/scripts/schedule-support-harness.tsx');await h.mountScheduleSupportHarness(route,mode);},{route,mode});};
  const shot=async label=>{await p.screenshot({path:`${out}/${lang}-${width}-${label}.jpg`,fullPage:true});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label} overflow`);};
  const readError=en?'We could not load this information. Please retry.':'No pudimos cargar esta información. Reintenta.';
  const retry=en?'Retry':'Reintentar';
  await mount('/app/schedule');await p.getByText('FICTIONAL qa-open',{exact:true}).waitFor();
  assert(await p.getByRole('button').filter({hasText:'FICTIONAL qa-started'}).isDisabled());
  assert(await p.getByRole('button').filter({hasText:'FICTIONAL qa-inactive'}).isDisabled());
  assert(!(await p.getByRole('button').filter({hasText:'FICTIONAL qa-full'}).isDisabled()));
  await p.getByText('FICTIONAL qa-midnight',{exact:true}).waitFor();await shot('day');
  await p.locator('.calendar-views button').nth(1).click();await shot('week');
  await p.locator('.calendar-views button').nth(0).click();
  await p.locator('.cust-filters-scroll button').nth(1).click();await p.getByText('FICTIONAL qa-open',{exact:true}).waitFor();
  await p.locator('.cust-filters-scroll button').nth(2).click();await p.locator('.calendar-empty').waitFor();await shot('filtered-empty');
  await p.locator('.cust-filters-scroll button').nth(0).click();await p.getByText('FICTIONAL qa-open',{exact:true}).waitFor();
  await p.getByRole('button').filter({hasText:'FICTIONAL qa-full'}).click();await p.getByText('FICTIONAL DESTINATION',{exact:true}).waitFor();
  await mount('/app/schedule/week');await p.locator('.calendar-views button').nth(1).waitFor();assert.equal(await p.locator('.calendar-views button').nth(1).getAttribute('aria-pressed'),'true');await p.evaluate(()=>window.qaSupportTheme('dark'));await shot('week-dark');await p.evaluate(()=>window.qaSupportTheme('light'));
  checks.push(`${lang}/${width}: day/week, method filter/clear, spots/full waitlist navigation, started/inactive disabled, Bogota midnight visible in Tokyo browser, empty results`);
  await mount('/app/schedule','error:class_sessions');await p.getByText(readError,{exact:true}).waitFor();await shot('schedule-error');await p.evaluate(()=>window.qaSupportMode='');await p.getByRole('button',{name:retry,exact:true}).click();await p.getByText('FICTIONAL qa-open',{exact:true}).waitFor();
  await mount('/app/booking/qa-booking');await p.getByText(en?'Payment confirmed':'Pago confirmado',{exact:true}).waitFor();assert.match(await p.locator('.appshell-main').innerText(),en?/1:30 PM/:/1:30/);assert.match(await p.locator('.appshell-main').innerText(),/Carolina Cifuentes/);assert.match(await p.locator('.appshell-main').innerText(),/Sala principal/);assert.match(await p.locator('a[href*="google.com/maps"]').getAttribute('href'),/^https:\/\/www.google.com\/maps\//);await shot('booking-confirmed');await p.evaluate(()=>window.qaSupportTheme('dark'));await shot('booking-confirmed-dark');await p.evaluate(()=>window.qaSupportTheme('light'));
  for(const [status,text] of [['pending',en?'Pending confirmation':'Pendiente de confirmación'],['released',en?'Payment released':'Pago liberado']]){await p.evaluate(status=>window.qaSupportProvider.update('payments','qa-payment',{status}),status);await p.getByText(text,{exact:true}).waitFor();await shot(`booking-${status}`);}
  await p.evaluate(()=>window.qaSupportProvider.update('bookings','qa-booking',{ledger_id:null}));await p.getByText(en?'Payment status unavailable':'Estado del pago no disponible',{exact:true}).waitFor();await shot('booking-unknown');
  await p.evaluate(()=>window.qaSupportNavigate('/app/booking/missing'));await p.getByText(en?'Booking not found':'Reserva no encontrada',{exact:true}).first().waitFor();await shot('booking-missing');
  await mount('/app/booking/qa-booking','error:payments');await p.getByText(readError,{exact:true}).waitFor();await shot('booking-payment-error');await p.evaluate(()=>window.qaSupportMode='');await p.getByRole('button',{name:retry,exact:true}).click();await p.getByText(en?'Payment confirmed':'Pago confirmado',{exact:true}).waitFor();
  await mount('/app/booking/qa-booking','error:bookings');await p.getByText(readError,{exact:true}).waitFor();await shot('booking-read-error');
  checks.push(`${lang}/${width}: booking date/time/room/teacher, configured map target, exact linked confirmed/pending/released status, unlinked unknown, missing booking`);
  for(const [route,table,emptyText] of [['/app/rules','content_articles',en?'No rules published yet':'Aún no hay reglas publicadas'],['/app/faq','faq_entries',en?'No questions yet':'Aún no hay preguntas'],['/app/teachers','teachers',en?'No teachers published yet':'Aún no hay profesores publicados']]){
   await mount(route);await p.locator(table==='content_articles'?'.listrow':table==='faq_entries'?'.accordion':'.teachercard').first().waitFor();await shot(table+'-content');
   await mount(route,`empty:${table}`);if(table==='faq_entries')await p.getByText(en?'No published questions':'Sin preguntas publicadas',{exact:true}).waitFor();else await p.getByText(emptyText,{exact:true}).waitFor();await shot(table+'-empty');
   await mount(route,`error:${table}`);await p.getByText(readError,{exact:true}).waitFor();await shot(table+'-error');await p.evaluate(()=>window.qaSupportMode='');await p.getByRole('button',{name:retry,exact:true}).click();await p.getByText(readError,{exact:true}).waitFor({state:'hidden'});
  }
  await mount('/app/teachers/qa-inactive-teacher');await p.getByText(en?'Teacher not found':'Profesor no encontrado',{exact:true}).first().waitFor();assert.equal(await p.getByText('FICTIONAL HIDDEN TEACHER',{exact:true}).count(),0);await shot('inactive-teacher');
  checks.push(`${lang}/${width}: rules/FAQ/teachers content, empty, failed read/retry; inactive teacher deep link hidden; responsive overflow checks`);
  await ctx.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({checks,errors,fixtureTime:'2026-10-23T15:00Z',browserTimezone:'Asia/Tokyo',scope:'Actual page components, fictional MockProvider fixtures; no backend or payments executed.'},null,2));console.log(checks.join('\n'));
} catch(error){await debugPage.screenshot({path:'/tmp/hoy-support-failure.jpg',fullPage:true});console.error(await debugPage.locator('body').innerText());throw error;} finally {await browser.close();}
