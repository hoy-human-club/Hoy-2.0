// Fictional local-storage command and lifecycle boundary regressions; no providers/browser.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const folder=await mkdtemp(join(tmpdir(),'marketing-fences-')),checks=[];
try{
 const out=join(folder,'drafts.mjs');await build({entryPoints:['src/modules/marketing/drafts.ts'],bundle:true,platform:'node',format:'esm',outfile:out,logLevel:'silent'});
 const {blankDraft,runDraftCommand,readDrafts,draftKey}=await import(pathToFileURL(out));
 const context=()=>({tenantId:'fictional_tenant',actorId:'fictional_actor',role:'marketing',adapter:'mock'});
 const campaign=()=>({...blankDraft('campaign','fictional_campaign'),title:{es:'Campaña FICTICIA',en:'FICTIONAL campaign'},body:{es:'Texto ficticio',en:'Fictional copy'},assetIds:['blue']});
 const command=(requestId='fictional_create')=>({type:'save',expect:'create',requestId,expectedRevision:0,row:campaign()});
 function fixture(){const values=new Map();let writes=0;const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{values.set(key,value);writes++;}};return {values,storage,writes:()=>writes};}
 async function paused(run,mutate){const original=crypto.subtle.digest.bind(crypto.subtle);let release;const gate=new Promise(resolve=>release=resolve);crypto.subtle.digest=async(...args)=>{await gate;return original(...args);};try{const result=run();mutate();release();return await result;}finally{crypto.subtle.digest=original;}}
 {
  const f=fixture(),c=context(),input=command(),original=structuredClone(input),originalContext=structuredClone(c);
  await paused(()=>runDraftCommand(f.storage,c,input),()=>{input.row.title.en='MUTATED FICTIONAL';input.row.body.es='Mutado';input.row.assetIds.push('cream');input.requestId='mutated_request';input.expectedRevision=99;input.type='discard';c.actorId='foreign';c.role='admin';c.tenantId='foreign';c.adapter='disconnected';});
  const actual=readDrafts(f.storage,originalContext);assert.deepEqual(actual.rows[0],original.row);assert.equal(actual.requests[original.requestId].fingerprint.length,64);assert.equal(f.values.size,1);assert(f.values.has(draftKey(originalContext)));assert.deepEqual(await runDraftCommand(f.storage,originalContext,original),actual);assert.equal(f.writes(),1);
  await assert.rejects(()=>runDraftCommand(f.storage,originalContext,{...original,row:{...original.row,title:{es:'Cambió',en:'Changed'}}}),/request_conflict/);
  checks.push('Paused digest owns nested row, control and tenant/actor/role/adapter snapshots; original replay once, changed intent conflicts');
 }
 for(const patch of [{requestId:null},{requestId:''},{expectedRevision:-1},{expectedRevision:1.5},{type:'other'},{expect:'other'},{expect:undefined}]){const f=fixture();await assert.rejects(()=>runDraftCommand(f.storage,context(),{...command(),...patch}),/validation/);assert.equal(f.writes(),0);}
 checks.push('Runtime command controls reject malformed request/revision/type/create-edit intent before write');
 {
  const f=fixture(),c=context(),input=command();let cancelled=true;await assert.rejects(()=>runDraftCommand(f.storage,c,input,()=>cancelled),/cancelled/);cancelled=false;
  await assert.rejects(()=>paused(()=>runDraftCommand(f.storage,c,input,()=>cancelled),()=>cancelled=true),/cancelled/);assert.equal(f.writes(),0);
  cancelled=false;const originalGet=f.storage.getItem;f.storage.getItem=key=>{cancelled=true;return originalGet(key);};await assert.rejects(()=>runDraftCommand(f.storage,c,input,()=>cancelled),/cancelled/);assert.equal(f.writes(),0);
  checks.push('Cancel before digest, while digest held and after fresh read prevents local commit');
 }
 {
  const f=fixture(),c=context(),input=command(),baseline=f.storage.getItem(draftKey(c));const originalSet=f.storage.setItem;
  f.storage.setItem=()=>{throw Error('fictional_quota');};await assert.rejects(()=>runDraftCommand(f.storage,c,input),/fictional_quota/);assert.equal(f.storage.getItem(draftKey(c)),baseline);f.storage.setItem=originalSet;await runDraftCommand(f.storage,c,input);assert.equal(f.writes(),1);
  const g=fixture();g.storage.getItem=()=>{throw Error('fictional_read');};await assert.rejects(()=>runDraftCommand(g.storage,c,input),/fictional_read/);assert.equal(g.writes(),0);
  checks.push('Read and persistence quota failures preserve prior document; unchanged retry commits once');
 }
 {
  for(const fault of ['lost_ack','readback']){const f=fixture(),c=context(),input=command(),set=f.storage.setItem,get=f.storage.getItem;let committed=false;
   f.storage.setItem=(k,v)=>{set(k,v);committed=true;if(fault==='lost_ack')throw Error('fictional_lost_ack');};f.storage.getItem=k=>{if(fault==='readback'&&committed)throw Error('fictional_readback');return get(k);};
   await assert.rejects(()=>runDraftCommand(f.storage,c,input),/fictional_/);assert.equal(f.writes(),1);f.storage.getItem=get;f.storage.setItem=set;await runDraftCommand(f.storage,c,input);assert.equal(f.writes(),1);
  }
  checks.push('Saved-then-thrown acknowledgment and postwrite read error replay confirmed effect without duplicate write');
 }
 {
  const f=fixture(),c=context(),input=command();await Promise.all([runDraftCommand(f.storage,c,input),runDraftCommand(f.storage,c,input)]);assert.equal(f.writes(),1);
  const g=fixture();const results=await Promise.allSettled([runDraftCommand(g.storage,c,command('first')),runDraftCommand(g.storage,c,{...command('second'),row:{...campaign(),id:'fictional_other'}})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(g.writes(),1);
  checks.push('Concurrent same intent writes once; competing observed-revision intents cannot overwrite');
 }
 {
  const f=fixture(),c=context(),create=command();await runDraftCommand(f.storage,c,create);const key=draftKey(c),stored=JSON.parse(f.values.get(key)),edit={...command('edit'),expect:'edit',expectedRevision:1};
  await assert.rejects(()=>runDraftCommand(f.storage,c,{...command('collision'),expectedRevision:1}),/effect_conflict/);
  f.values.set(key,JSON.stringify({...stored,rows:[]}));await assert.rejects(()=>runDraftCommand(f.storage,c,edit),/missing/);await assert.rejects(()=>runDraftCommand(f.storage,c,create),/effect_conflict/);
  f.values.set(key,JSON.stringify({...stored,rows:[{...blankDraft('content',create.row.id),title:create.row.title}]}));await assert.rejects(()=>runDraftCommand(f.storage,c,edit),/effect_conflict/);
  f.values.set(key,JSON.stringify({...stored,rows:[{...create.row,title:{es:'Otro título',en:'Another title'}}]}));await assert.rejects(()=>runDraftCommand(f.storage,c,create),/effect_conflict/);assert.equal(f.writes(),1);
  f.values.set(key,JSON.stringify(stored));const discard={type:'discard',kind:'campaign',id:create.row.id,expectedRevision:1,requestId:'discard'};await assert.rejects(()=>runDraftCommand(f.storage,c,{...discard,kind:'content'}),/effect_conflict/);await runDraftCommand(f.storage,c,discard);await runDraftCommand(f.storage,c,discard);assert.equal(f.writes(),2);const removed=JSON.parse(f.values.get(key));f.values.set(key,JSON.stringify({...removed,rows:[create.row]}));await assert.rejects(()=>runDraftCommand(f.storage,c,discard),/effect_conflict/);assert.equal(f.writes(),2);
  checks.push('Create collision, missing/kind-changed original edit, missing/changed saved replay and recreated discarded ID reject without resurrection or deletion');
 }
 {
  const f=fixture(),c=context(),input=command(),set=f.storage.setItem;f.storage.setItem=(k,v)=>{set(k,JSON.stringify({...JSON.parse(v),rows:[]}));};await assert.rejects(()=>runDraftCommand(f.storage,c,input),/ack_unconfirmed/);assert.equal(f.writes(),1);await assert.rejects(()=>runDraftCommand(f.storage,c,input),/effect_conflict/);assert.equal(f.writes(),1);
  checks.push('Fresh persisted readback rejects missing committed effect; replay never repairs or fabricates success');
 }
 {
  const f=fixture(),c=context(),input=command();await runDraftCommand(f.storage,c,input);const key=draftKey(c),stored=JSON.parse(f.values.get(key));
  f.values.set(key,JSON.stringify({...stored,revision:2,rows:[...stored.rows,{...blankDraft('campaign','other_draft'),title:{es:'Otro FICTICIO',en:'Other FICTIONAL'}}]}));const replay=await runDraftCommand(f.storage,c,input);assert.equal(replay.rows.length,2);assert.equal(f.writes(),1);
  const serialized=JSON.stringify(stored.requests);assert(!serialized.includes('FICTIONAL')&&!serialized.includes('ficticio'));assert.deepEqual(Object.keys(Object.values(stored.requests)[0]),['fingerprint']);
  for(const malformed of ['{broken',JSON.stringify({...stored,actorId:'foreign'}),JSON.stringify({...stored,rows:[...stored.rows,...stored.rows]})]){f.values.set(key,malformed);await assert.rejects(()=>runDraftCommand(f.storage,c,input));assert.equal(f.writes(),1);}
  checks.push('Unrelated newer drafts survive replay; legacy v1 documents/opaque receipts stay readable; malformed/foreign/duplicate rows reject');
 }
 {
  const f=fixture(),c=context(),input=command(),set=f.storage.setItem,get=f.storage.getItem;let cancelled=false;
  f.storage.setItem=(k,v)=>{set(k,v);cancelled=true;};const completed=await runDraftCommand(f.storage,c,input,()=>cancelled);assert.equal(completed.rows.length,1);assert.equal(cancelled,true);assert.equal(f.writes(),1,'postcommit cancellation retains a factual completed snapshot; caller separately gates UI acknowledgement');
  cancelled=false;f.storage.getItem=k=>{const value=get(k);cancelled=true;return value;};await assert.rejects(()=>runDraftCommand(f.storage,c,input,()=>cancelled),/cancelled/);assert.equal(f.writes(),1,'fresh-read replay cancellation is checked before returning');
  checks.push('Postcommit cancellation preserves verified factual result; UI acknowledgement separately fenced; replay getItem cancellation rejects without write');
 }
 for(const role of ['super_admin','admin','coordinator','marketing']){const f=fixture();await runDraftCommand(f.storage,{...context(),role},command());assert.equal(f.writes(),1);}
 for(const role of ['front_desk','finance','teacher','maintenance','developer','customer','public']){const f=fixture();await assert.rejects(()=>runDraftCommand(f.storage,{...context(),role},command()),/denied/);assert.equal(f.writes(),0);}
 for(const adapter of ['supabase','disconnected']){const f=fixture();await assert.rejects(()=>runDraftCommand(f.storage,{...context(),adapter},command()),/disconnected/);}
 checks.push('Existing four roles only; seven denied and disconnected adapters make no writes');
 await mkdir('docs/screenshots/M-18',{recursive:true});await writeFile('docs/screenshots/M-18/marketing-fences-domain-results.json',JSON.stringify({requirement:'OT-01',phase:'After Nov 30',checks,result:'PASS',limits:['One browser-local document only; no backend/cross-device/cross-tab/durable-storage guarantee.','Opaque v1 receipts preserve no discarded copy; erasing browser storage erases its evidence.']},null,2));console.log('PASS '+checks.length+' marketing fence domain groups');
}finally{await rm(folder,{recursive:true,force:true});}
