import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'hoy-product-catalog-'));
try {
 const file=join(dir,'catalog.mjs');await build({entryPoints:['src/data/productCatalog.ts'],bundle:true,platform:'node',format:'esm',outfile:file});
 const {validateProduct,reviseProduct,quoteProduct,validProductDate}=await import(pathToFileURL(file));
 const definition={code:'QA_PACK',name:{es:'Paquete ficticio',en:'Fictional package'},type:'paquetes',classes:12,validityDays:90,active:true,prices:[{id:'p1',amount:100000,startsOn:'2026-10-01',endsOn:'2026-10-31'},{id:'p2',amount:120000,startsOn:'2026-11-01',endsOn:null}]};
 assert.equal(validateProduct(definition),null);
 const original=JSON.stringify(definition), first=reviseProduct(null,definition,'usr_admin','2026-10-21T17:00:00Z');
 const plan={id:'qa_plan',frontend_catalog:first};
 assert.equal(quoteProduct(plan,'2026-10-31').amount,100000);assert.equal(quoteProduct(plan,'2026-11-01').amount,120000);assert.throws(()=>quoteProduct(plan,'2026-09-30'),/unpriced/);
 const purchase=quoteProduct(plan,'2026-10-21');
 const next=structuredClone(definition);next.prices[0].amount=150000;const second=reviseProduct(first,next,'usr_admin','2026-10-22T17:00:00Z');
 assert.equal(purchase.amount,100000,'old purchase snapshot never rereads mutable catalog');assert.equal(second.history[0].definition.prices[0].amount,100000);assert.equal(second.history[1].definition.prices[0].amount,150000);assert.equal(JSON.stringify(definition),original);
 next.name.en='changed later';assert.equal(second.definition.name.en,'Fictional package');assert.equal(second.history[1].definition.name.en,'Fictional package');
 assert.equal(validateProduct(definition,[definition]),'duplicate');
 for(const [change,error] of [[{code:'bad space'},'code'],[{name:{es:'',en:'ok'}},'name'],[{classes:0},'quantity'],[{validityDays:0.5},'quantity'],[{prices:[]},'price'],[{prices:[{id:'p',amount:NaN,startsOn:'2026-01-01',endsOn:null}]},'price'],[{prices:[{id:'p',amount:3,startsOn:'2026-02-30',endsOn:null}]},'dates'],[{prices:[{id:'p',amount:3,startsOn:'2026-10-02',endsOn:'2026-10-01'}]},'dates'],[{prices:[{id:'p',amount:3,startsOn:'2026-10-01',endsOn:null},{id:'p2',amount:4,startsOn:'2026-11-01',endsOn:null}]},'overlap']]) assert.equal(validateProduct({...definition,...change}),error);
 assert(!validProductDate('2026-02-29'));assert(validProductDate('2028-02-29'));
 assert.throws(()=>quoteProduct({...plan,frontend_catalog:{...first,definition:{...definition,active:false}}},'2026-10-21'),/inactive/);
 const gap=structuredClone(first);gap.definition.prices[0].endsOn='2026-10-20';assert.throws(()=>quoteProduct({...plan,frontend_catalog:gap},'2026-10-25'),/unpriced/);
 console.log('PASS PR-01/PR-02 domain: metadata validation, inclusive dates, gaps, overlaps, inactive, immutable quotes and retained history');
} finally {await rm(dir,{recursive:true,force:true});}
