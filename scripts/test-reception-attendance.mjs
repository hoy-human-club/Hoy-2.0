// Fictional mock command regressions; no backend requests or production policy changes.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const scratch=await mkdtemp(join(tmpdir(),'hoy-reception-'));const values=new Map();let quota=false;
globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(quota)throw Error('FICTIONAL quota');values.set(k,v);}};
try{
 const file=join(scratch,'attendance.mjs');await build({stdin:{contents:"export {MockProvider} from './src/data/MockProvider'; export {setReceptionAttendance,receptionUndoEligible} from './src/data/receptionAttendance';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:file,logLevel:'silent'});
 const {MockProvider,setReceptionAttendance:run,receptionUndoEligible}=await import(pathToFileURL(file));const data=new MockProvider(),now=Date.now(),stamp=new Date(now).toISOString(),base=data.peek('class_sessions')[0];
 await data.insert('class_sessions',{...base,id:'qa_attendance_class',template_id:null,modality_id:'mod_alineacion',starts_at:new Date(now+86400000).toISOString(),ends_at:new Date(now+89400000).toISOString(),status:'scheduled',booked_count:0});
 const booking=await data.insert('bookings',{user_id:'usr_cust',session_id:'qa_attendance_class',status:'booked',paid_with:'package',mat_number:1,checked_in_at:null,ledger_id:null});
 const input=(status,requestId='fictional-request')=>{const b=data.peek('bookings').find(b=>b.id===booking.id);return {actorId:'usr_desk',role:'front_desk',bookingId:b.id,sessionId:b.session_id,userId:b.user_id,requestId,status,before:{status:b.status,checked_in_at:b.checked_in_at,updated_at:b.updated_at}};};
 const snapshot=()=>JSON.stringify(data.peek('bookings'))+JSON.stringify(data.peek('class_sessions'))+JSON.stringify(data.peek('audit_log'));let events=0;data.subscribe('*',()=>events++);
 const checkin=input('checked_in');
 for(const failAfterWrites of [1,2]){const before=snapshot(),count=events;await assert.rejects(run(data,checkin,{failAfterWrites}),/mock_injected/);assert.equal(snapshot(),before);assert.equal(events,count);}
 const before=snapshot(),count=events;quota=true;await assert.rejects(run(data,checkin),/quota/);quota=false;assert.equal(snapshot(),before);assert.equal(events,count);
 const financial=JSON.stringify({payments:data.peek('payments'),ledger:data.peek('class_ledger'),vouchers:data.peek('voucher_bookings')});
 const [a,b]=await Promise.all([run(data,checkin),run(data,checkin)]);assert.deepEqual(a,b);assert.equal(data.peek('audit_log').filter(a=>a.id==='reception_attendance_fictional-request').length,1);assert.equal(data.peek('bookings').find(b=>b.id===booking.id).mat_number,1);
 await assert.rejects(run(data,{...checkin,requestId:'stale-request'}),/attendance_conflict/);
 await assert.rejects(run(data,{...input('booked'),role:'teacher'}),/attendance_forbidden/);
 await assert.rejects(run(data,{...input('booked'),actorId:'missing'}),/attendance_forbidden/);
 await assert.rejects(run(data,{...input('booked'),userId:'another-person'}),/attendance_conflict/);
 const contextBefore=snapshot();let guards=0;await assert.rejects(run(data,input('booked','context-change'),{isCurrent:()=>++guards<7}),/attendance_context/);assert.equal(snapshot(),contextBefore);
 const undo=input('booked','undo-one');await run(data,undo);assert.equal(data.peek('bookings').find(b=>b.id===booking.id).status,'booked');assert.equal(data.peek('class_sessions').find(s=>s.id==='qa_attendance_class').booked_count,1);
 await run(data,input('no_show','no-show'));assert.equal(data.peek('bookings').find(b=>b.id===booking.id).checked_in_at,null);await run(data,input('checked_in','arrived-again'));
 await data.update('class_sessions','qa_attendance_class',{starts_at:new Date(now-1000).toISOString()});const started=data.peek('class_sessions').find(s=>s.id==='qa_attendance_class');assert.equal(receptionUndoEligible(started,now),false);const noUndo=snapshot();await assert.rejects(run(data,input('booked','started-undo'),{now:()=>now}),/attendance_undo_policy_pending/);assert.equal(snapshot(),noUndo);
 assert.equal(JSON.stringify({payments:data.peek('payments'),ledger:data.peek('class_ledger'),vouchers:data.peek('voucher_bookings')}),financial);
 console.log('PASS reception attendance: both staged writes/storage failure roll back without events; same-intent concurrent retry one audit; stale/foreign/role/context denied; eligible undo and no-show/check-in preserve class/mat/financial terms; after-start policy stays blocked.');
}finally{await rm(scratch,{recursive:true,force:true});}
