/** Settled real screenshots for clock-controlled mock fixtures. No CSS clipping or image edits. */
export async function settledCapture(page,options){
 await page.evaluate(async()=>{
  window.scrollTo(0,0);await document.fonts.ready;
  for(const animation of document.getAnimations()){
   if(animation.effect?.getComputedTiming().iterations!==Infinity){try{animation.finish();}catch{/* Non-finishable animations are disabled by screenshot capture. */}}
  }
  window.scrollTo(0,0);window.__qaCaptureFrames=false;requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__qaCaptureFrames=true;}));
 });
 await page.clock.runFor(100);
 await page.waitForFunction(()=>window.__qaCaptureFrames);
 return page.screenshot({...options,fullPage:await page.getByRole('dialog').count()===0&&(page.viewportSize()?.width??1280)>=900&&options.fullPage!==false,animations:'disabled'});
}
