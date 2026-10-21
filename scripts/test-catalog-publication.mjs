// Local mock publication; no public site, payment, external share or backend calls.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'hoy-publication-'));const storage=new Map();let fail=false;
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('QA quota');storage.set(k,v);}};
try{
 const file=join(dir,'test.mjs');await build({stdin:{contents:"export {MockProvider} from './src/data/MockProvider';export * from './src/data/catalogPublication';export {reviseProduct} from './src/data/productCatalog';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:file});
 const {MockProvider,changeLocalPublication,quotePublishedProduct,reviseProduct,publicationPatch}=await import(pathToFileURL(file));
 const data=new MockProvider(),tenant=data.peek('plans')[0].tenant_id;
 const definition={code:'QA_PUBLISH',name:{es:'Paquete ficticio',en:'Fictional package'},type:'paquetes',classes:12,validityDays:90,active:true,prices:[{id:'p1',amount:100000,startsOn:'2026-10-01',endsOn:'2026-10-31'},{id:'p2',amount:120000,startsOn:'2026-11-01',endsOn:null}]};
 const draft=reviseProduct(null,definition,'usr_admin','2026-10-21T12:00:00Z');
 const plan=await data.insert('plans',{slug:'qa-fictional',active:false,price:0,name_es:'Historical name',frontend_catalog:draft});
 const input={planId:plan.id,action:'publish',expectedRevision:1,actorId:'usr_admin',expectedTenant:tenant};
 assert.throws(()=>quotePublishedProduct(plan,'2026-10-21'),/unpublished/);
 const before=JSON.stringify(await data.get('plans',plan.id));let events=0;data.subscribe('plans',()=>events++);
 fail=true;await assert.rejects(changeLocalPublication(data,input),/QA quota/);fail=false;
 assert.equal(JSON.stringify(await data.get('plans',plan.id)),before,'failed persistence leaves row unchanged');assert.equal(events,0);
 const [a,b]=await Promise.all([changeLocalPublication(data,input),changeLocalPublication(data,input)]);
 assert.deepEqual(a.frontend_publication,b.frontend_publication);assert.equal(b.frontend_publication.history.length,1,'retry does not duplicate publication');
 const quote=quotePublishedProduct(a,'2026-10-31');assert.equal(quote.amount,100000);assert.equal(quotePublishedProduct(a,'2026-11-01').amount,120000);
 assert.equal(a.price,0);assert.equal(a.active,false);assert.equal(a.name_es,'Historical name');
 const edited=structuredClone(definition);edited.prices[0].amount=150000;
 await data.update('plans',plan.id,{frontend_catalog:reviseProduct(draft,edited,'usr_admin','2026-10-22T12:00:00Z')});
 const unsavedPublication=await data.get('plans',plan.id);assert.equal(quotePublishedProduct(unsavedPublication,'2026-10-21').amount,100000,'unpublished edits cannot change preview');
 await assert.rejects(changeLocalPublication(data,input),/conflict/);
 const updated=await changeLocalPublication(data,{...input,expectedRevision:2});assert.equal(quotePublishedProduct(updated,'2026-10-21').amount,150000);assert.equal(quote.amount,100000,'retained quote never rereads revision');
 const withdrawn=await changeLocalPublication(data,{...input,action:'withdraw',expectedRevision:2});assert.throws(()=>quotePublishedProduct(withdrawn,'2026-10-21'),/unpublished/);
 const withdrawnAgain=await changeLocalPublication(data,{...input,action:'withdraw',expectedRevision:2});assert.deepEqual(withdrawn.frontend_publication,withdrawnAgain.frontend_publication);
 assert.throws(()=>publicationPatch({...updated,frontend_catalog:{...draft,definition:{...definition,active:false}}},'publish',1,'usr_admin',new Date().toISOString()),/inactive/);
 assert.throws(()=>quotePublishedProduct(updated,'2026-09-30'),/unpriced/);
 await assert.rejects(changeLocalPublication(data,{...input,expectedTenant:'qa-other'}),/scope/);
 await assert.rejects(changeLocalPublication({...data,name:'real'},input),/disconnected/);
 console.log('PASS catalog publication: canceled/no command unchanged; quota rollback, retry/concurrent idempotency, explicit snapshots, future dated quote, stale conflict, withdrawn quote rejection, unchanged legacy prices and old quote, tenant/disconnected guard');
}finally{await rm(dir,{recursive:true,force:true});}
