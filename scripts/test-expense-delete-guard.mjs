// Fictional memory only. No financial effects, bodies or credentials printed.
import assert from 'node:assert/strict';
import {build} from 'esbuild';import {mkdir,writeFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';
const bundle=await build({stdin:{contents:"export {MockProvider} from './src/data/MockProvider';export {removeExpenseRow} from './src/modules/admin/tables/expenseDelete';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
await mkdir('qa',{recursive:true});const bundlePath=resolve('qa/batch42-current-domain-bundle.mjs');await writeFile(bundlePath,bundle.outputFiles[0].text);const {MockProvider,removeExpenseRow}=await import(pathToFileURL(bundlePath));
const cache=new Map();let quota=false,writes=0;
globalThis.localStorage={getItem:k=>cache.get(k)??null,setItem:(k,v)=>{writes++;if(quota)throw Error('FICTIONAL quota');cache.set(k,v);}};
const intent=(requestId='qa_delete_original')=>({requestId,actorId:'usr_super',role:'super_admin'});
const fresh=()=>{cache.clear();quota=false;return new MockProvider();};
const draft={id:'qa_guard_unpaid',tenant_id:'ten_hoy',kind:'variable',category:'supplies',concept:'FICTIONAL delete fixture',amount:100,incurred_on:'2026-10-22',paid_on:null,method:'transfer',vendor:null,note:null,template_id:null,created_by:'usr_super'};
const snapshot=d=>JSON.stringify({db:d.db,stored:[...cache]});
let checks=0;
for(const marker of ['2026-10-22','FICTIONAL legacy truthy',true,1]){
 const d=fresh();await d.insert('expenses',{...draft,paid_on:marker});let events=0;d.subscribe('expenses',()=>events++);const before=snapshot(d),count=writes;
 await assert.rejects(d.remove('expenses',draft.id),/expense_paid_delete_protected/);
 for(const value of [null,'',false,0,undefined])await assert.rejects(d.update('expenses',draft.id,{paid_on:value}),/expense_paid_history_protected/);
 assert.equal(snapshot(d),before);assert.equal(events,0);assert.equal(writes,count);checks++;
}
let d=fresh();await d.insert('expenses',draft);let events=0;d.subscribe('expenses',()=>events++);let before=snapshot(d);quota=true;await assert.rejects(d.remove('expenses',draft.id),/quota/);quota=false;assert.equal(snapshot(d),before);assert.equal(events,0);
await d.remove('expenses',draft.id);assert.equal(await d.get('expenses',draft.id),null);assert.equal(events,1);before=snapshot(d);const count=writes;await d.remove('expenses',draft.id);assert.equal(snapshot(d),before);assert.equal(events,1);assert.equal(writes,count);checks++;
// Duplicate IDs cannot hide a paid matching row behind an unpaid first row.
d=fresh();await d.insert('expenses',draft);await d.insert('expenses',{...draft,paid_on:'2026-10-22'});before=snapshot(d);await assert.rejects(d.remove('expenses',draft.id),/paid_delete/);await assert.rejects(d.update('expenses',draft.id,{paid_on:null}),/paid_history/);assert.equal(snapshot(d),before);checks++;
for(const reverse of [false,true]){
 d=fresh();await d.insert('expenses',draft);await d.insert('expenses',{...draft,id:'qa_guard_paid',paid_on:'2026-10-22'});before=snapshot(d);let emitted=0;d.subscribe('expenses',()=>emitted++);
 await assert.rejects(d.atomic(async tx=>{for(const id of reverse?['qa_guard_paid',draft.id]:[draft.id,'qa_guard_paid'])await tx.remove('expenses',id);}),/paid_delete/);
 assert.equal(snapshot(d),before);assert.equal(emitted,0);checks++;
}
for(const failAfterWrites of [1,2]){
 d=fresh();await d.insert('expenses',draft);await d.insert('expenses',{...draft,id:'qa_guard_second'});before=snapshot(d);
 await assert.rejects(d.atomic(async tx=>{await tx.remove('expenses',draft.id);await tx.remove('expenses','qa_guard_second');},{failAfterWrites}),/mock_injected/);assert.equal(snapshot(d),before);checks++;
}
d=fresh();await d.insert('expenses',draft);before=snapshot(d);quota=true;await assert.rejects(d.atomic(tx=>tx.remove('expenses',draft.id)),/quota/);quota=false;assert.equal(snapshot(d),before);checks++;
// A fresh paid transition wins over an old unpaid selection; staged clear/delete also rejects.
d=fresh();await d.insert('expenses',draft);const selected=await d.get('expenses',draft.id);await d.update('expenses',draft.id,{paid_on:'2026-10-22'});assert.equal(selected.paid_on,null);before=snapshot(d);await assert.rejects(d.remove('expenses',selected.id),/paid_delete/);await assert.rejects(d.atomic(async tx=>{await tx.update('expenses',draft.id,{paid_on:null});await tx.remove('expenses',draft.id);}),/paid_history/);assert.equal(snapshot(d),before);checks++;
// Other fields and non-empty paid date changes retain existing behavior.
await d.update('expenses',draft.id,{note:'FICTIONAL correction note',paid_on:'2026-10-23'});assert.equal((await d.get('expenses',draft.id)).paid_on,'2026-10-23');assert.equal((await d.get('expenses',draft.id)).note,'FICTIONAL correction note');checks++;
// Concurrent identical direct deletes persist/emit only once.
d=fresh();await d.insert('expenses',draft);events=0;d.subscribe('expenses',()=>events++);const priorWrites=writes;await Promise.all([d.remove('expenses',draft.id),d.remove('expenses',draft.id)]);assert.equal(events,1);assert.equal(writes,priorWrites+1);checks++;
// Non-expense deletion path is unchanged.
await d.insert('expense_templates',{id:'qa_guard_template',concept:'FICTIONAL nonexpense'});await d.remove('expense_templates','qa_guard_template');assert.equal(await d.get('expense_templates','qa_guard_template'),null);checks++;
// Generic confirmation keeps its original immutable before-image across failures/retries.
for(const change of ['amount','recreate','paid','foreign','duplicate']){
 d=fresh();await d.insert('expenses',draft);const selected=await d.get('expenses',draft.id);
 if(change==='amount')await d.update('expenses',draft.id,{amount:200});
 if(change==='recreate'){await d.remove('expenses',draft.id);await d.insert('expenses',{...draft,note:'FICTIONAL recreated row'});}
 if(change==='paid')await d.update('expenses',draft.id,{paid_on:'2026-10-22'});
 if(change==='foreign')await d.update('expenses',draft.id,{tenant_id:'foreign_fixture'});
 if(change==='duplicate')await d.insert('expenses',draft);
 before=snapshot(d);await assert.rejects(removeExpenseRow(d,selected,intent(),()=>true),/stale|paid_delete|scope/);assert.equal(snapshot(d),before);checks++;
}
d=fresh();await d.insert('expenses',draft);const replaySelected=await d.get('expenses',draft.id);await removeExpenseRow(d,replaySelected,intent(),()=>true);before=snapshot(d);let reset=0;d.subscribe('expenses',()=>reset++);const savedWrites=writes;await removeExpenseRow(d,replaySelected,intent(),()=>true);assert.equal(snapshot(d),before);assert.equal(writes,savedWrites);assert.equal(reset,0);checks++;
await assert.rejects(removeExpenseRow({...d,name:'real'},replaySelected,intent(),()=>true),/scope/);
d=fresh();await d.insert('expenses',draft);before=snapshot(d);await assert.rejects(removeExpenseRow(d,await d.get('expenses',draft.id),intent(),()=>false),/cancelled/);assert.equal(snapshot(d),before);checks++;
// Cancellation after a staged removal aborts the detached transaction, without partial writes/events.
d=fresh();await d.insert('expenses',draft);before=snapshot(d);let live=true;const originalAtomic=d.atomic.bind(d);d.atomic=(fn,options)=>originalAtomic(async tx=>{const list=tx.list.bind(tx);let reads=0;tx.list=async(t,q)=>{const rows=await list(t,q);if(t==='users'&&++reads===2)live=false;return rows;};return fn(tx);},options);await assert.rejects(removeExpenseRow(d,await d.get('expenses',draft.id),intent(),()=>live),/cancelled/);assert.equal(snapshot(d),before);checks++;
// Read failure before a staged write stays contained and retryable.
d=fresh();await d.insert('expenses',draft);before=snapshot(d);const original=d.atomic.bind(d);d.atomic=(fn,options)=>original(tx=>{tx.list=async()=>{throw Error('FICTIONAL stage read');};return fn(tx);},options);await assert.rejects(removeExpenseRow(d,await d.get('expenses',draft.id),intent(),()=>true),/stage read/);assert.equal(snapshot(d),before);d.atomic=original;await removeExpenseRow(d,await d.get('expenses',draft.id),intent(),()=>true);assert.equal(await d.get('expenses',draft.id),null);checks++;
// Exact-byte recreation after a committed lost acknowledgement must never be deleted by the old nonce.
d=fresh();await d.insert('expenses',draft);const exactBefore=await d.get('expenses',draft.id),nativeAtomic=d.atomic.bind(d);d.atomic=async(...args)=>{await nativeAtomic(...args);throw Error('FICTIONAL committed lost acknowledgement');};await assert.rejects(removeExpenseRow(d,exactBefore,intent(),()=>true),/lost acknowledgement/);assert.equal(await d.get('expenses',draft.id),null);d.atomic=nativeAtomic;await d.insert('expenses',exactBefore);assert.deepEqual(await d.get('expenses',draft.id),exactBefore);before=snapshot(d);let replayEvents=0;d.subscribe('expenses',()=>replayEvents++);d.subscribe('audit_log',()=>replayEvents++);const beforeReplayWrites=writes;await assert.rejects(removeExpenseRow(d,exactBefore,intent(),()=>true),/unconfirmed/);assert.equal(snapshot(d),before);assert.equal(writes,beforeReplayWrites);assert.equal(replayEvents,0);await assert.rejects(removeExpenseRow(d,{...exactBefore,note:'FICTIONAL different intent'},intent(),()=>true),/request_conflict/);assert.equal(snapshot(d),before);await removeExpenseRow(d,exactBefore,intent('qa_fresh_confirmation'),()=>true);assert.equal(await d.get('expenses',draft.id),null);checks++;
// Replay still checks fresh owned actor existence/tenant; no receipt rewrites or implicit resurrection.
for(const kind of ['missing','foreign','inactive']){d=fresh();await d.insert('expenses',draft);const selected=await d.get('expenses',draft.id);await removeExpenseRow(d,selected,intent(),()=>true);if(kind==='missing')await d.remove('users','usr_super');else await d.update('users','usr_super',kind==='foreign'?{tenant_id:'foreign_fixture'}:{status:'inactive'});before=snapshot(d);await assert.rejects(removeExpenseRow(d,selected,intent(),()=>true),/scope/);assert.equal(snapshot(d),before);checks++;}
// Fresh actor identity/status: initial and staged precommit/end-of-command failures cannot delete.
for(const phase of ['initial-wrong-id','initial-inactive','stage-inactive','end-wrong-id','end-inactive']){
 d=fresh();await d.insert('expenses',draft);const selected=await d.get('expenses',draft.id);before=snapshot(d);let hits=0;
 const corrupt=rows=>rows.map(r=>({...r,...(phase.includes('wrong-id')?{id:'unrequested_fictional_actor'}:{status:'inactive'})}));
 if(phase.startsWith('initial')){const list=d.list.bind(d);d.list=async(t,q)=>{const rows=await list(t,q);if(t==='users'){hits++;return corrupt(rows);}return rows;};}
 else {const atomic=d.atomic.bind(d);d.atomic=(fn,options)=>atomic(async tx=>{const list=tx.list.bind(tx);let reads=0;tx.list=async(t,q)=>{const rows=await list(t,q);if(t==='users'&&(++reads>=2||phase==='stage-inactive')){hits++;return corrupt(rows);}return rows;};return fn(tx);},options);}
 await assert.rejects(removeExpenseRow(d,selected,intent(),()=>true),/scope/);assert(hits>0,'targeted actor fault consumed');assert.equal(snapshot(d),before);checks++;
}
// Postcommit actor read/held-read status loss withholds acknowledgement; committed deletion is not undone.
for(const kind of ['inactive','wrong-id','held-inactive']){
 d=fresh();await d.insert('expenses',draft);const selected=await d.get('expenses',draft.id),list=d.list.bind(d);let reads=0;d.list=async(t,q)=>{const rows=await list(t,q);if(t==='users'&&++reads===2){if(kind==='held-inactive'){await d.update('users','usr_super',{status:'inactive'});return rows;}return rows.map(r=>({...r,...(kind==='wrong-id'?{id:'unrequested_fictional_actor'}:{status:'inactive'})}));}return rows;};await assert.rejects(removeExpenseRow(d,selected,intent(),()=>true),/scope/);assert.equal(await d.get('expenses',draft.id),null);assert.equal(d.peek('audit_log').filter(r=>r.id.startsWith('mock_transaction_expense_delete_v1_')).length,1);checks++;
}
// Existing update strict persistence is preserved, not reimplemented: field quota restores all bytes/timestamps/events.
for(const staged of [false,true]){d=fresh();await d.insert('expenses',draft);before=snapshot(d);let events=0;d.subscribe('expenses',()=>events++);quota=true;await assert.rejects(staged?d.atomic(tx=>tx.update('expenses',draft.id,{note:'FICTIONAL failed edit'})):d.update('expenses',draft.id,{note:'FICTIONAL failed edit'}),/quota/);quota=false;assert.equal(snapshot(d),before);assert.equal(events,0);checks++;}
// Two simultaneous confirmations with the same nonce compose to one persisted effect/technical fence.
d=fresh();await d.insert('expenses',{...draft,concept:'FICTIONAL_PRIVATE_CANARY_42',note:'FICTIONAL_PRIVATE_CANARY_42'});const concurrentBefore=await d.get('expenses',draft.id);let concurrentEvents=0;d.subscribe('expenses',()=>concurrentEvents++);const concurrentWrites=writes;await Promise.all([removeExpenseRow(d,concurrentBefore,intent('qa_concurrent_nonce'),()=>true),removeExpenseRow(d,concurrentBefore,intent('qa_concurrent_nonce'),()=>true)]);assert.equal(await d.get('expenses',draft.id),null);assert.equal(concurrentEvents,1);assert.equal(writes,concurrentWrites+1);const metadata=d.peek('audit_log').filter(r=>r.id.startsWith('mock_transaction_expense_delete_v1_'));assert.equal(metadata.length,1);assert(!JSON.stringify(metadata).includes('FICTIONAL_PRIVATE_CANARY_42'),'technical receipt contains no private before-image/terms');checks++;
console.log(`PASS expense-only delete guard: ${checks} groups; no financial/provider security acceptance.`);
