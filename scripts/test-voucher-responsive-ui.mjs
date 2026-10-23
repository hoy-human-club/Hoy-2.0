import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.HOY_TEST_URL||'http://127.0.0.1:5174';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const results=[],errors=[];
try{
 for(const lang of ['es','en'])for(const route of ['/app/vouchers','/app/voucher-gifts']){
  const context=await browser.newContext({viewport:{width:1280,height:1000}});
  await context.addInitScript(lang=>{
   localStorage.setItem('hoyos.lang',lang);
   localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_cust',devMode:false,viewAs:null}));
   // Hold only the shell's media-query callbacks to exercise the stale desktop DOM deterministically.
   const native=window.matchMedia.bind(window);window.qaShellListeners=[];window.qaHoldShell=false;
   window.matchMedia=query=>{
    const media=native(query);if(query!=='(min-width: 900px)')return media;
    const add=media.addEventListener.bind(media),remove=media.removeEventListener.bind(media),wrapped=new Map();
    media.addEventListener=(type,listener,options)=>{
     if(type!=='change')return add(type,listener,options);
     const call=event=>{if(!window.qaHoldShell){typeof listener==='function'?listener.call(media,event):listener.handleEvent(event);}};
     wrapped.set(listener,call);window.qaShellListeners.push(()=>call(new Event('change')));return add(type,call,options);
    };
    media.removeEventListener=(type,listener,options)=>remove(type,wrapped.get(listener)||listener,options);
    return media;
   };
   window.qaReleaseShell=()=>{window.qaHoldShell=false;window.qaShellListeners.forEach(call=>call());};
  },lang);
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/#'+route);await page.locator('.appshell.is-wide .topbar-nav').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  for(const width of [390,899,390]){
   await page.evaluate(()=>window.qaHoldShell=true);
   await page.setViewportSize({width,height:1000});
   const stale=await page.evaluate(()=>({wide:!!document.querySelector('.appshell.is-wide'),nav:getComputedStyle(document.querySelector('.topbar-nav')).display,viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert(stale.wide,'React desktop DOM is deliberately still mounted');
   assert(stale.scroll<=stale.viewport+1,JSON.stringify({lang,route,width,stale}));
   assert.equal(stale.nav,'none','CSS must hide stale desktop nav before React catches up');
   await page.evaluate(()=>window.qaReleaseShell());await page.locator('.appshell.is-narrow .appshell-dock').waitFor();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'settled phone no overflow');
   await page.evaluate(()=>window.qaHoldShell=true);await page.setViewportSize({width:1280,height:1000});
   assert.equal(await page.locator('.appshell-dock').evaluate(el=>getComputedStyle(el).display),'none','CSS hides stale phone dock');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'stale phone layout no overflow on desktop');
   await page.evaluate(()=>window.qaReleaseShell());await page.locator('.appshell.is-wide .topbar-nav').waitFor();
   results.push({lang,route,width,stale,phoneSettled:true,reverseTransition:true});
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS voucher responsive transitions: 12 held desktop→phone and reverse transitions, immediate and settled overflow assertions retained');
}finally{
 await mkdir('docs/frontend-completion/evidence',{recursive:true});
 await writeFile('docs/frontend-completion/evidence/voucher-responsive-ui.json',JSON.stringify({base,results,pageErrors:errors},null,2)+'\n');await browser.close();
}
