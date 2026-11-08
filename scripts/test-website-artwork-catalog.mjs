import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const path='src/data/mediaCatalog.generated.json',before=await readFile(path,'utf8');execFileSync(process.execPath,['scripts/gen-media-catalog.mjs'],{stdio:'pipe'});assert.equal(await readFile(path,'utf8'),before,'generated catalog must be synchronized');
const asset=JSON.parse(before).find(a=>a.id==='images/studio-2026/pricing-duo.webp');assert(asset);assert.deepEqual(asset.variants,['images/studio-2026/pricing-duo-480.webp','images/studio-2026/pricing-duo-960.webp']);for(const path of ['/site','/site/plans','/site?version=photos','/site/plans?version=photos']){const u=asset.usages.filter(u=>u.label==='Standard 12-class package'&&u.path===path);assert.equal(u.length,1);assert.equal(u[0].state,path.includes('?')?'draft':'live');}for(const u of asset.usages.filter(u=>u.label==='Standard 12-class package')) {
 if(u.path==='/site'||u.path==='/site?version=photos')assert(u.evidence.includes('full-opacity Home'),'Home evidence must match full-photo treatment');
 else if(u.path.startsWith('/site/plans'))assert(u.evidence.includes('at20%'),'Plans treatment must remain20%');
}
const trial=JSON.parse(before).find(a=>a.id==='images/studio-2026/warrior-blue.webp');assert(trial,'approved Home trial image must be indexed, not silently missing');assert.deepEqual(trial.variants,['images/studio-2026/warrior-blue-480.webp','images/studio-2026/warrior-blue-960.webp']);assert.deepEqual(trial.usages.map(u=>({label:u.label,path:u.path,state:u.state})),[{label:'Home trial class',path:'/site',state:'live'},{label:'Home trial class',path:'/site?version=photos',state:'draft'}]);
assert(!asset.usages.some(u=>/Santa Mar[ií]a/i.test(u.label)));assert(asset.usages.some(u=>u.path==='/dev/components'&&u.label==='PackageCard sample'));console.log('PASS exact standard-package media mappings,variants,edition states,D-02 and catalog drift');
