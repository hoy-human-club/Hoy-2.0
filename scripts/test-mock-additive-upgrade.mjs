// Existing fictional same-day browser caches must survive additive frontend tables.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'hoy-additive-')),values=new Map();
globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
try{
 const out=join(dir,'test.mjs');await build({stdin:{contents:"export {MockProvider} from './src/data/MockProvider';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:out,logLevel:'silent'});
 const {MockProvider}=await import(pathToFileURL(out));const first=new MockProvider();
 const purchase=await first.insert('class_ledger',{id:'qa_preserved_purchase',user_id:'qa_legacy',delta:7,reason:'purchase',expires_at:'2099-01-01'});
 const article=await first.insert('content_articles',{id:'qa_preserved_article',title_es:'FICTICIO',title_en:'FICTIONAL',body_es:'Solo demo',body_en:'Demo only'});
 const stored=JSON.parse(values.get('hoyos.db.v1'));delete stored.db.transfer_receipts;delete stored.db.class_pay_rules;
 const preserved=structuredClone(stored.db.class_ledger);values.set('hoyos.db.v1',JSON.stringify(stored));
 const upgraded=new MockProvider();assert.deepEqual(upgraded.peek('class_ledger'),preserved,'load preserves every purchased term and debit');assert.deepEqual(upgraded.peek('content_articles').find(r=>r.id===article.id),article);assert.deepEqual(upgraded.peek('transfer_receipts'),[]);assert.deepEqual(upgraded.peek('class_pay_rules'),[]);
 const incoming=JSON.parse(values.get('hoyos.db.v1'));delete incoming.db.transfer_receipts;delete incoming.db.class_pay_rules;incoming.db.class_ledger.find(r=>r.id===purchase.id).delta=6;
 let events=0;upgraded.subscribe('class_ledger',()=>events++);upgraded.onStorage({key:'hoyos.db.v1',newValue:JSON.stringify(incoming)});
 assert.equal(upgraded.peek('class_ledger').find(r=>r.id===purchase.id).delta,6,'old-tab storage snapshot still accepted with additive empty tables');assert(events>0);assert.deepEqual(upgraded.peek('transfer_receipts'),[]);
 const corrupt=structuredClone(incoming);corrupt.db.transfer_receipts='invalid';corrupt.db.class_ledger.find(r=>r.id===purchase.id).delta=99;upgraded.onStorage({key:'hoyos.db.v1',newValue:JSON.stringify(corrupt)});assert.equal(upgraded.peek('class_ledger').find(r=>r.id===purchase.id).delta,6,'malformed existing table is rejected rather than overwritten');
 console.log('PASS additive mock upgrade preserves purchases/content on load and old-tab storage events; missing new tables initialize empty; corrupt incoming table rejected.');
}finally{await rm(dir,{recursive:true,force:true});}
