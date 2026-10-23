// Fictional command context regressions; no real authentication or external writes.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const directory=await mkdtemp(join(tmpdir(),'hoy-content-context-')),storage=new Map();let quota=false,checks=0;
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(quota)throw Error('fictional_quota');storage.set(k,v);}};
try {
 const file=join(directory,'commands.mjs');await build({stdin:{contents:"export {MockProvider} from './src/data/MockProvider';export {writeContent} from './src/modules/admin/contentRecovery';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:file});
 const {MockProvider,writeContent}=await import(pathToFileURL(file));
 const original={id:'usr_super',role:'super_admin'},changes=[{id:'usr_super',role:'coordinator'},{id:'usr_admin',role:'admin'},{id:'usr_coord',role:'coordinator'}];
 let live={...original};const fresh=()=>{storage.clear();quota=false;live={...original};return new MockProvider();};
 const snapshot=async d=>JSON.stringify(Object.fromEntries(await Promise.all(['teachers','faq_entries','audit_log'].map(async t=>[t,await d.list(t)]))));
 const payroll=d=>({kind:'update',table:'teachers',before:d.peek('teachers')[0],patch:{rate_per_class:90111}});
 const reorder=d=>{const entries=d.peek('faq_entries').filter(e=>e.group_key===d.peek('faq_entries')[0].group_key);return {kind:'reorder',table:'faq_entries',entries,id:entries[0].id,dir:1};};
 const run=(d,intent,key='context',expected=original)=>writeContent(d,expected,intent,key,{currentActor:()=>({...live})});
 for(const changed of changes){
  let d=fresh(),intent=payroll(d),before=await snapshot(d),events=0;d.subscribe('*',()=>events++);
  quota=true;await assert.rejects(run(d,intent),/quota/);quota=false;assert.equal(await snapshot(d),before);assert.equal(events,0);
  live={...changed};await assert.rejects(run(d,intent),/context_changed/);assert.equal(await snapshot(d),before);assert.equal(events,0);
  live={...original};await Promise.all([run(d,intent),run(d,intent)]);const committed=await snapshot(d);await run(d,intent);assert.equal(await snapshot(d),committed);const audit=d.peek('audit_log').filter(a=>a.id==='content_action_context');assert.equal(audit.length,1);assert.equal(audit[0].actor_id,original.id);assert.equal(audit[0].diff.role,original.role);checks++;
  // Already queued invocation cannot use the actor captured before a role/user switch.
  d=fresh();intent=payroll(d);before=await snapshot(d);const atomic=d.atomic.bind(d);let release,entered;const enteredPromise=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
  d.atomic=async(...args)=>{entered();await gate;return atomic(...args);};const queued=run(d,intent,'queued');await enteredPromise;live={...changed};release();await assert.rejects(queued,/context_changed/);assert.equal(await snapshot(d),before);checks++;
  // A switch immediately after a staged row write aborts that detached stage and audit.
  d=fresh();intent=payroll(d);before=await snapshot(d);events=0;d.subscribe('*',()=>events++);const stagedAtomic=d.atomic.bind(d);
  d.atomic=(action,options)=>stagedAtomic(stage=>action(new Proxy({}, {get(_target,key){const method=stage[key];if(key==='update')return async(...args)=>{const result=await method.apply(stage,args);live={...changed};return result;};return typeof method==='function'?method.bind(stage):method;}})),options);
  await assert.rejects(run(d,intent,'during'),/context_changed/);assert.equal(await snapshot(d),before);assert.equal(events,0);checks++;
  // Lost acknowledgement retains the original receipt. Changed contexts cannot replay it.
  for(const makeIntent of [payroll,reorder]){
   d=fresh();intent=makeIntent(d);const real=d.atomic.bind(d);let lose=true;d.atomic=async(...args)=>{const result=await real(...args);if(lose){lose=false;throw Error('fictional_lost_ack');}return result;};
   await assert.rejects(run(d,intent,'lost'),/lost_ack/);const committed=await snapshot(d);assert.equal(d.peek('audit_log').filter(a=>a.id==='content_action_lost').length,1);
   live={...changed};await assert.rejects(run(d,intent,'lost'),/context_changed/);assert.equal(await snapshot(d),committed);
   live={...original};await Promise.all([run(d,intent,'lost'),run(d,intent,'lost')]);assert.equal(await snapshot(d),committed);checks++;
  }
  // Context changes after a valid commit do not cause a second write or false successful ack.
  d=fresh();intent=payroll(d);const committedAtomic=d.atomic.bind(d);let changeAfterCommit=true;d.atomic=async(...args)=>{const result=await committedAtomic(...args);if(changeAfterCommit){changeAfterCommit=false;live={...changed};}return result;};
  await assert.rejects(run(d,intent,'postcommit'),/context_changed/);const persisted=await snapshot(d);await assert.rejects(run(d,intent,'postcommit'),/context_changed/);assert.equal(await snapshot(d),persisted);live={...original};await run(d,intent,'postcommit');assert.equal(await snapshot(d),persisted);checks++;
 }
 // Current coordinator cannot authorize a fresh payroll update (including a zero rate).
 for(const rate of [0,90111]){const d=fresh(),intent=payroll(d);intent.patch.rate_per_class=rate;live={id:'usr_coord',role:'coordinator'};const before=await snapshot(d);await assert.rejects(run(d,intent,'forbidden',live),/denied/);assert.equal(await snapshot(d),before);checks++;}
 // A replay still checks the original actor's current active tenant row.
 const d=fresh(),intent=payroll(d);await run(d,intent,'inactive');await d.update('users',original.id,{status:'inactive'});const before=await snapshot(d);await assert.rejects(run(d,intent,'inactive'),/denied/);assert.equal(await snapshot(d),before);checks++;
 const cancelled=fresh(),cancelIntent=payroll(cancelled),cancelBefore=await snapshot(cancelled);await assert.rejects(writeContent(cancelled,original,cancelIntent,'unmounted',{currentActor:()=>{throw Error('content_context_changed');}}),/context_changed/);assert.equal(await snapshot(cancelled),cancelBefore);checks++;
 console.log(`PASS ${checks} content context groups: role/actor changes before retry, while queued, after staged write and after commit; payroll and FAQ lost-ack replay; original-context retry exactly once; denied current permissions.`);
} finally {await rm(directory,{recursive:true,force:true});}
