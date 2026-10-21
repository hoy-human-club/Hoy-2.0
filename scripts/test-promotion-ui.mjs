import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:5173';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1280,height:1000},permissions:['clipboard-read','clipboard-write']});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const db=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
const as=async(role,path)=>{await page.evaluate(role=>{localStorage.setItem('hoyos.session',JSON.stringify({userId:role,devMode:false,viewAs:null}));localStorage.setItem('hoyos.lang','en');},role);await page.goto(`${base}/#/hub`);await page.reload();await page.goto(`${base}/#${path}`);};
const capture=async(code)=>{await mkdir(`docs/screenshots/${code}`,{recursive:true});for(const lang of ['es','en'])for(const width of [390,1280]){await page.evaluate(lang=>localStorage.setItem('hoyos.lang',lang),lang);await page.setViewportSize({width,height:1000});await page.reload();await page.waitForTimeout(200);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({quality:72,path:`docs/screenshots/${code}/${lang}-${width}.jpg`,fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${code} ${lang} ${width}: overflow`);assert(!((await page.locator('body').innerText()).includes('⟨')),`${code}: untranslated string`);assert(await page.locator('img.wordmark').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return n.complete&&n.naturalWidth>0&&Math.abs(r.width/r.height-n.naturalWidth/n.naturalHeight)<0.02;})),`${code}: wordmark aspect ratio`);if(code==='C-29')assert(await page.locator('.promotion-offer-page > .page-head').evaluate(n=>n.getBoundingClientRect().left)>0,'recipient page has outer gutters');}await page.evaluate(()=>localStorage.setItem('hoyos.theme',JSON.stringify({theme:'dark',skin:'styled'})));await page.reload();await page.screenshot({quality:72,path:`docs/screenshots/${code}/en-1280-dark.jpg`,fullPage:true});await page.evaluate(()=>localStorage.setItem('hoyos.theme',JSON.stringify({theme:'light',skin:'styled'})));await page.reload();};
try{
 await page.goto(`${base}/#/hub`);await as('usr_teach','/teach/promote');
 await page.getByLabel('Approved offer',{exact:true}).selectOption('promo_demo_first');
 await page.getByLabel('Fictional recipient (optional)',{exact:true}).fill('Private recipient label');
 await page.getByLabel('Private follow-up note (optional)',{exact:true}).fill('PRIVATE-CONTEXT-NOT-PUBLIC');
 await page.getByLabel('Custom code (optional)',{exact:true}).fill('QA-INVITE');
 await page.getByRole('button',{name:'Create test link',exact:true}).click();
 await page.getByText('QA-INVITE',{exact:true}).waitFor();
 let state=await db();assert.equal(state.promotion_shares.length,1);
 const share=state.promotion_shares[0];const url=`${base}/#/promotions/${share.code}`;
 await page.getByRole('button',{name:'Copy invitation and link',exact:true}).click();
 await page.getByText('Invitation copied. No message has been sent.',{exact:true}).waitFor();
 assert((await page.evaluate(()=>navigator.clipboard.readText())).includes(url));
 const beforeCancel=(await db()).promotion_events.length;
 await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('cancel','AbortError');}}));
 await page.getByRole('button',{name:'Share…',exact:true}).click();await page.getByText('Sharing cancelled. No delivery was recorded.',{exact:true}).waitFor();
 assert.equal((await db()).promotion_events.length,beforeCancel,'cancelled sharing does not record a handoff');
 await capture('S-07');
 await page.goto(url);await page.getByRole('heading',{name:'Your invitation starts here'}).waitFor();
 assert(!(await page.locator('body').innerText()).includes('PRIVATE-CONTEXT-NOT-PUBLIC'));assert(!(await page.locator('body').innerText()).includes('Private recipient label'));
 await capture('C-29');
 await page.getByRole('button',{name:'Continue as fictional customer',exact:true}).click();
 await page.getByRole('button',{name:'Claim offer with my test account',exact:true}).click();
 await page.getByLabel('Choose a class',{exact:true}).waitFor();
 state=await db();assert.equal(state.promotion_claims.length,1);const voucher=state.vouchers.find(v=>v.id===state.promotion_claims[0].voucherId);assert(voucher);
 await page.goto(url);await page.getByText('You already have a voucher for this campaign. Your first claim’s attribution is retained.',{exact:true}).waitFor();assert.equal((await db()).promotion_claims.length,1);
 await as('usr_desk','/staff/vouchers');
 await page.getByLabel('Code or full link',{exact:true}).fill('https://wrong.example/#/promotions/QA-INVITE');await page.getByRole('button',{name:'Find code',exact:true}).click();await page.getByText('This code was not found here. Check the link and browser where it was created; this test is local.',{exact:true}).waitFor();
 await page.getByLabel('Code or full link',{exact:true}).fill(url);await page.getByRole('button',{name:'Find code',exact:true}).click();
 await page.getByLabel('Select the verified holder',{exact:true}).selectOption(voucher.id);
 await page.getByLabel('I verified the test holder, benefit and participants',{exact:true}).check();
 await page.getByLabel('Fictional name · participant 1',{exact:false}).fill('Walk-up demo guest');
 await page.getByLabel('I confirm these are fictional details and I have permission to record these guests in this test. They are not subscribed to marketing.',{exact:true}).check();
 state=await db();const options=await page.getByLabel('Choose a class',{exact:true}).locator('option').evaluateAll(ns=>ns.map(n=>n.value).filter(Boolean));
 for(const id of options){const session=state.class_sessions.find(s=>s.id===id),regular=state.bookings.filter(b=>b.session_id===id&&!['cancelled','late_cancel'].includes(b.status)),promotional=state.voucher_bookings.filter(b=>b.sessionId===id&&b.status!=='cancelled');assert(regular.length+promotional.reduce((n,b)=>n+b.participants.length,0)+1<=session.capacity,'desk hides full classes');assert(!regular.some(b=>b.user_id===voucher.claimedBy)&&!promotional.some(b=>b.participants.some(p=>p.userId===voucher.claimedBy)),'desk hides classes already booked by the holder');}
 const chosen=options.find(id=>!state.bookings.some(b=>b.session_id===id&&b.user_id==='usr_cust'&&!['cancelled','late_cancel'].includes(b.status))&&state.class_sessions.find(s=>s.id===id).booked_count<state.class_sessions.find(s=>s.id===id).capacity);assert(chosen);
 await page.getByLabel('Choose a class',{exact:true}).selectOption(chosen);
 await page.getByRole('button',{name:'Book and deduct test benefit',exact:true}).click();await page.getByRole('button',{name:'Confirm verified booking',exact:true}).waitFor();
 assert.equal((await db()).vouchers.find(v=>v.id===voucher.id).balance,0);
 assert(!(await page.getByLabel('Choose a class',{exact:true}).locator('option').evaluateAll(ns=>ns.map(n=>n.value))).includes(chosen),'new voucher booking leaves the walk-up picker');
 assert(await page.getByRole('button',{name:'Record arrival / attendance',exact:true}).isDisabled(),'attendance requires separate booking confirmation');
 // Admin must route an unconfirmed promotion booking through reception rather than mark attendance directly.
 await as('usr_admin','/admin/vouchers');await page.getByRole('link',{name:'Verify at reception before recording attendance',exact:true}).click();await page.getByRole('heading',{name:'Vouchers at reception',exact:true}).waitFor();
 // Reopen an existing booking by its short voucher code; lookup alone never deducts again.
 await as('usr_desk','/staff/vouchers');await page.getByLabel('Code or full link',{exact:true}).fill(voucher.code);await page.getByRole('button',{name:'Find code',exact:true}).click();await page.getByRole('button',{name:'Confirm verified booking',exact:true}).waitFor();
 assert(await page.getByRole('button',{name:'Confirm verified booking',exact:true}).isDisabled(),'existing booking requires holder verification');
 await page.getByLabel('I verified the test holder, benefit and participants',{exact:true}).check();
 await page.getByRole('button',{name:'Confirm verified booking',exact:true}).click();await page.getByText('Booking verified at reception',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Record arrival / attendance',exact:true}).click();await page.getByText('Attended',{exact:true}).waitFor();
 state=await db();assert.equal(state.vouchers.find(v=>v.id===voucher.id).balance,0);assert.equal(state.voucher_bookings.filter(b=>b.voucherId===voucher.id).length,1);
 // Staff lookup state is intentionally not stored. Reopen after each language/viewport reload.
 await mkdir('docs/screenshots/S-08',{recursive:true});
 for(const lang of ['es','en'])for(const width of [390,1280]){await page.evaluate(lang=>localStorage.setItem('hoyos.lang',lang),lang);await page.setViewportSize({width,height:1000});await page.reload();await page.getByLabel(lang==='en'?'Code or full link':'Código o enlace completo',{exact:true}).fill(voucher.code);await page.getByRole('button',{name:lang==='en'?'Find code':'Buscar código',exact:true}).click();await page.getByText(lang==='en'?'Attended':'Asistió',{exact:true}).waitFor();assert.equal(await page.locator('.promotion-summary').evaluate(n=>getComputedStyle(n).display),'grid','reception summary loads its own styling');assert(await page.locator('.checkbox-field input').evaluateAll(ns=>ns.every(n=>{const r=n.getBoundingClientRect();return r.width>=12&&r.height>=12&&n.closest('label').getBoundingClientRect().height>=43;})),'reception checkbox and full label remain usable');await page.screenshot({quality:72,path:`docs/screenshots/S-08/${lang}-${width}.jpg`,fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'desk overflow');}
 await page.evaluate(()=>localStorage.setItem('hoyos.theme',JSON.stringify({theme:'dark',skin:'styled'})));await page.reload();await page.getByLabel('Code or full link',{exact:true}).fill(voucher.code);await page.getByRole('button',{name:'Find code',exact:true}).click();await page.screenshot({quality:72,path:'docs/screenshots/S-08/en-1280-dark.jpg',fullPage:true});await page.evaluate(()=>localStorage.setItem('hoyos.theme',JSON.stringify({theme:'light',skin:'styled'})));
 await as('usr_admin','/admin/promotions');await capture('M-15');
 // An old invitation to an unpublished/draft campaign must fail closed without crashing React.
 for(const status of ['unpublished','draft']){await page.evaluate(({campaignId,status})=>{const stored=JSON.parse(localStorage.getItem('hoyos.db.v1')),campaign=stored.db.promotion_campaigns.find(c=>c.id===campaignId);campaign.published=status!=='unpublished';campaign.status=status==='draft'?'draft':'approved';localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));},{campaignId:share.campaignId,status});await page.goto(url);await page.reload();await page.getByText('This code is not available in this browser. Links in this test do not work on another device. Return to the Hub to practice.',{exact:true}).waitFor();}
 await as('usr_teach','/staff/vouchers');assert((await page.locator('body').innerText()).length>0);assert.equal(await page.getByRole('button',{name:'Find code',exact:true}).count(),0,'teacher cannot use front-desk route');
 assert.deepEqual(errors,[]);await mkdir('qa',{recursive:true});await writeFile('qa/promotions.json',JSON.stringify({result:'pass',checks:['unique teacher link','private context not public','clipboard text','cancelled native share no event','repeat claim no duplicate','foreign URL rejection','front desk full-link lookup','eligible walk-up class picker','verified walk-up booking','admin verification handoff','existing booking short-code lookup','confirmation and check-in no double debit','unpublished and draft offer fallback','role guard','ES/EN 390/1280','dark screenshots','no overflow','no console errors']},null,2));console.log('Promotion UI lifecycle and screenshot checks passed');
}catch(e){await mkdir('qa',{recursive:true});await page.screenshot({quality:72,path:'qa/promotion-failure.jpg',fullPage:true});console.error(await page.locator('body').innerText());throw e;}finally{await browser.close();}
