// OT-02: fictional future maintenance; no actual operations, alerts, procurement or backend.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const scratch=await mkdtemp(join(tmpdir(),'hoy-maintenance-')),values=new Map();let storageFailure=false;
globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{if(storageFailure)throw Error('qa_quota');values.set(key,value);}};
try {
 const out=join(scratch,'test.mjs');await build({stdin:{contents:"export {MockProvider} from './src/data/MockProvider';export {runMaintenance,validateMaintenance,emptyMaintenancePayload} from './src/modules/maintenance/maintenance';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:out,logLevel:'silent'});
 const {MockProvider,runMaintenance,validateMaintenance,emptyMaintenancePayload}=await import(pathToFileURL(out));let data=new MockProvider();
 const marker=await data.insert('class_ledger',{id:'qa_preserved_purchase',user_id:'usr_cust',delta:2,reason:'purchase',expires_at:'2099-01-01'});
 const stored=JSON.parse(values.get('hoyos.db.v1'));delete stored.db.maintenance_records;values.set('hoyos.db.v1',JSON.stringify(stored));data=new MockProvider();
 assert.deepEqual(data.peek('class_ledger').find(row=>row.id===marker.id),marker,'additive table upgrade preserves purchased terms');assert.deepEqual(data.peek('maintenance_records'),[]);
 const fromStorage=JSON.parse(values.get('hoyos.db.v1'));delete fromStorage.db.maintenance_records;data.onStorage({key:'hoyos.db.v1',newValue:JSON.stringify(fromStorage)});assert.deepEqual(data.peek('class_ledger').find(row=>row.id===marker.id),marker);assert.deepEqual(data.peek('maintenance_records'),[]);
 const input={type:'examples',actorId:'usr_maint',role:'maintenance',requestId:'qa_examples',day:'2026-10-21'};
 const snapshot=()=>JSON.stringify([data.peek('maintenance_records'),data.peek('audit_log')]);const operationalBefore=JSON.stringify(['class_ledger','bookings','space_bookings','payments','class_sessions','expenses'].map(table=>data.peek(table)));
 const failingProvider=n=>({name:'mock',get:data.get.bind(data),list:data.list.bind(data),atomic:fn=>data.atomic(fn,{failAfterWrites:n})});let events=0;data.subscribe('*',()=>events++);
 for(const n of [1,2,3,4,5]) {const before=snapshot(),count=events;await assert.rejects(runMaintenance(failingProvider(n),input),/mock_injected/);assert.equal(snapshot(),before);assert.equal(events,count);}
 storageFailure=true;await assert.rejects(runMaintenance(data,input),/quota/);storageFailure=false;assert.equal(data.peek('maintenance_records').length,0);
 const [one,two]=await Promise.all([runMaintenance(data,input),runMaintenance(data,input)]);assert.deepEqual(one,two);assert.equal(data.peek('maintenance_records').length,4);assert.equal(data.peek('audit_log').filter(row=>row.action==='maintenance.demo').length,1);
 await assert.rejects(runMaintenance(data,{...input,day:'2026-10-22'}),/request_conflict/);
 await runMaintenance(data,{...input,actorId:'usr_admin',role:'admin'});assert.equal(data.peek('audit_log').filter(row=>row.action==='maintenance.demo').length,2,'request receipts are actor-scoped');
 for(const role of ['coordinator','front_desk','finance','teacher','marketing','developer','customer','public'])await assert.rejects(runMaintenance(data,{...input,role}),/denied/);
 await assert.rejects(runMaintenance(data,{...input,actorId:'qa_unknown'}),/scope/);
 await assert.rejects(runMaintenance({...data,name:'supabase',get:data.get.bind(data),atomic:data.atomic.bind(data)},input),/disconnected/);
 const audit=data.peek('audit_log').find(row=>row.action==='maintenance.demo');assert.equal(audit.diff.role,'maintenance');assert.equal(audit.diff.source,'fictional-maintenance');
 await assert.rejects(runMaintenance({name:'mock',get:data.get.bind(data)},input),/atomic_required/);
 const supply=one.find(row=>row.kind==='supply'),payload={quantity:0,minimum:3,note:'QA fictional supply adjustment'};
 const save={type:'save',actorId:'usr_maint',role:'maintenance',requestId:'qa_save',id:supply.id,expectedRevision:0,payload};
 for(const n of [1,2]) {const before=snapshot();await assert.rejects(runMaintenance(failingProvider(n),save),/mock_injected/);assert.equal(snapshot(),before);}
 storageFailure=true;await assert.rejects(runMaintenance(data,save),/quota/);storageFailure=false;assert.equal(data.peek('maintenance_records').find(row=>row.id===supply.id).revision,0);
 const saved=await runMaintenance(data,save);assert.equal(saved[0].revision,1);assert.deepEqual(await runMaintenance(data,save),saved);
 await assert.rejects(runMaintenance(data,{...save,requestId:'qa_stale'}),/revision_conflict/);
 for(const [kind,bad] of [['supply',{...payload,quantity:-1}],['supply',{...payload,quantity:1.5}],['supply',{...payload,minimum:-2}],['supply',{...payload,note:''}],['incident',{observed_on:'invalid',description:'Fictional detail',state:'draft'}],['incident',{observed_on:'2026-10-21',description:'short',state:'draft'}],['equipment',{inspected_on:'2026-02-30',condition:'demo_ok',note:'QA note'}],['checklist',{day:'2026-10-21',phase:'closing',checked:['invented']}],['checklist',{day:'2026-10-21',phase:'closing',checked:['floor','floor']}]])assert.throws(()=>validateMaintenance(kind,bad),/validation/);
 for(const kind of ['checklist','incident','supply','equipment']) {
  const payload=emptyMaintenancePayload(kind,'2026-10-21');if(kind==='incident')payload.description='QA Fictional nonmedical incident intake.';if(kind==='supply'||kind==='equipment')payload.note='QA Fictional record creation.';
  if(kind==='supply')assert.equal(payload.minimum,null,'real thresholds not invented');
  const create={type:'create',actorId:'usr_maint',role:'maintenance',requestId:`qa_create_${kind}`,id:`qa_new_${kind}`,kind,roomId:null,label:{es:`QA Ficticio ${kind}`,en:`QA Fictional ${kind}`},payload};
  for(const n of [1,2]) {const before=snapshot();await assert.rejects(runMaintenance(failingProvider(n),create),/mock_injected/);assert.equal(snapshot(),before);}
  storageFailure=true;await assert.rejects(runMaintenance(data,create),/quota/);storageFailure=false;assert.equal(data.peek('maintenance_records').some(row=>row.id===create.id),false);
  await assert.rejects(runMaintenance(data,{...create,label:{es:'x',en:'x'}}),/validation/);
  await assert.rejects(runMaintenance(data,{...create,roomId:'qa_missing_room'}),/scope/);
  const [made,replayed]=await Promise.all([runMaintenance(data,create),runMaintenance(data,create)]);assert.deepEqual(made,replayed);assert.equal(made[0].revision,0);assert.equal(made[0].created_by,'usr_maint');assert.equal(data.peek('maintenance_records').filter(row=>row.id===create.id).length,1);
  await assert.rejects(runMaintenance(data,{...create,requestId:`qa_duplicate_${kind}`}),/record_exists/);
 }
 const receiptBefore=snapshot();await assert.rejects(runMaintenance({...data,list:async()=>{throw Error('qa_read_failure');},atomic:data.atomic.bind(data)},input),/qa_read_failure/);assert.equal(snapshot(),receiptBefore);
 assert.equal(JSON.stringify(['class_ledger','bookings','space_bookings','payments','class_sessions','expenses'].map(table=>data.peek(table))),operationalBefore,'maintenance never mutates purchases/bookings/payments/room operations/Finance');
 console.log('PASS OT-02 additive cache preservation, four fixture types, every write/storage rollback with no intermediate events, exact retry/idempotency, changed-request/revision conflict, existing-role denial, missing actor/atomic/read failure, invalid dates/checks/quantities/notes; no operational-table changes.');
} finally {await rm(scratch,{recursive:true,force:true});}
