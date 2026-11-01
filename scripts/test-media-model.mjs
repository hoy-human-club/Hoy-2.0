import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const temp=await mkdtemp(join(tmpdir(),'hoy-media-'));
try {
 await build({entryPoints:['src/data/mediaLibrary.ts'],bundle:true,platform:'node',format:'esm',outfile:join(temp,'model.mjs')});
 const {buildMediaLibrary,assetStates}=await import(pathToFileURL(join(temp,'model.mjs')));
 const base={id:'test',tenant_id:'hoy',created_at:'2026-10-15',updated_at:'2026-10-15'};
 const slot={...base,slot_key:'site.classes.pulso',kind:'photo',ratio:'3 / 4',label:{es:'Pulso',en:'Pulso'},alt:{es:'Barra',en:'Barre'},brief:{es:'',en:''},tone:null,url:'https://example.test/shared.jpg',credit:null,status:'ready',sort:0};
 const teacher={...base,id:'tea_leandro',display_name:'Leandro',active:false,photo_url:slot.url};
 const assets=buildMediaLibrary([slot],[teacher],[{...base,slug:'pulso',active:true}]);const a=assets.find(a=>a.url===slot.url);
 assert.deepEqual(assetStates(a).sort(),['inactive','live']);assert.equal(a.usages.length,9);assert.equal(a.orientation,'portrait');
 assert.deepEqual(assetStates(buildMediaLibrary([{...slot,status:'pending'}],[],[]).find(a=>a.url===slot.url)),['draft']);
 assert(!buildMediaLibrary([{...slot,url:'javascript:alert(1)'}],[],[]).some(a=>a.url.startsWith('javascript:')));
 assert(assets.find(a=>a.id.includes('teacher-leandro')).usages.every(u=>u.state==='inactive'));
 const manifest=JSON.parse(await readFile('src/data/mediaCatalog.generated.json','utf8'));
 assert(manifest.length>0);assert.equal(new Set(manifest.map(a=>a.id)).size,manifest.length);
 const permittedStudioUsage=(id,u)=>u.state==='draft'||(id.includes('facility-red-studio')&&u.state==='live'&&['/','/site'].includes(u.path))||(id==='images/studio-2026/pricing-duo.webp'&&u.state==='live'&&((u.label==='Standard 12-class package'&&['/site','/site/plans'].includes(u.path))||(u.label==='PackageCard sample'&&u.path==='/dev/components')));
 assert(!permittedStudioUsage('images/studio-2026/teacher-carolina.webp',{state:'live',path:'/site',label:'Standard 12-class package'}));
 assert(!permittedStudioUsage('images/studio-2026/pricing-duo.webp',{state:'live',path:'/site/plans',label:'Santa María'}));
 assert(!permittedStudioUsage('images/studio-2026/pricing-duo.webp',{state:'live',path:'/site/teachers',label:'Standard 12-class package'}));
 for(const a of manifest){for(const v of a.variants)assert((await readFile(`public/${v}`)).length>0);if(a.thumbnail)assert((await readFile(`public/${a.thumbnail}`)).length>0);if(a.source==='studio')assert(a.usages.every(u=>permittedStudioUsage(a.id,u)));for(const u of a.usages){assert(!u.path.includes(':slug'));if(u.state==='archived')assert(u.path.includes('version=archive'));}}
 const studioLanding=manifest.find(a=>a.id==='images/studio-2026/facility-red-studio.webp');
 assert(studioLanding.usages.some(u=>u.state==='live'&&u.path==='/'),'Actual studio photo is the live landing placement');
 assert(studioLanding.usages.some(u=>u.state==='live'&&u.path==='/site'),'Actual studio photo is the regular website hero');
 assert(!manifest.find(a=>a.id==='images/sanctuary/hero-sanctuary.webp').usages.some(u=>u.path==='/'),'Concept hero no longer owns the public landing');
 console.log(`Media model passed: ${manifest.length} indexed assets, mixed states, deduplication, class routes, draft state, inactive teacher fallback, unsafe URLs and file integrity`);
} finally {await rm(temp,{recursive:true,force:true});}
