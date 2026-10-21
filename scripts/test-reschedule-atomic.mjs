// RS-09 fictional mock-only transaction; no backend or customer data.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const scratch = await mkdtemp(join(tmpdir(), 'hoy-reschedule-'));
const values = new Map(); let storageFailure = false;
globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k,v) => { if(storageFailure) throw Error('quota'); values.set(k,v); } };
try {
 const out=join(scratch,'adapter.mjs');
 await build({stdin:{contents:"export { MockProvider } from './src/data/MockProvider'; export { rescheduleBooking } from './src/modules/customer/rescheduleCommand';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:out,logLevel:'silent'});
 const {MockProvider,rescheduleBooking}=await import(pathToFileURL(out));
 const data=new MockProvider(), userId='qa_reschedule', now=Date.now(), stamp=new Date(now).toISOString();
 const day=n=>new Date(now+n*86400000).toISOString();
 const template=data.peek('class_sessions').find(s=>s.status==='scheduled');
 const original=await data.insert('class_sessions',{...template,id:'qa_rs_from',starts_at:day(2),ends_at:day(2.04),status:'scheduled',booked_count:0,capacity:4,template_id:null});
 const target=await data.insert('class_sessions',{...original,id:'qa_rs_to',starts_at:day(4),ends_at:day(4.04),booked_count:0});
 const purchase=await data.insert('class_ledger',{id:'qa_rs_lot',user_id:userId,delta:1,reason:'purchase',expires_at:day(5).slice(0,10),created_at:new Date(now-86400000).toISOString()});
 const debit=await data.insert('class_ledger',{id:'qa_rs_debit',user_id:userId,delta:-1,reason:'booking',purchase_ledger_id:purchase.id,created_at:stamp});
 const booking=await data.insert('bookings',{id:'qa_rs_booking',user_id:userId,session_id:original.id,status:'booked',paid_with:'package',ledger_id:debit.id});
 const waiting=await data.insert('waitlist',{id:'qa_rs_wait',user_id:'qa_waiter',session_id:original.id,status:'waiting',position:1});
 const input={userId,bookingId:booking.id,fromSessionId:original.id,toSessionId:target.id,now};
 const snapshot=()=>JSON.stringify(['bookings','class_sessions','class_ledger','waitlist'].map(t=>data.peek(t)));
 let events=0;data.subscribe('*',()=>events++);
 for(const failAfterWrites of [1,2,3]) {
  const before=snapshot(), count=events;
  await assert.rejects(data.atomic(tx=>rescheduleBooking(tx,input),{failAfterWrites}),/mock_injected/);
  assert.equal(snapshot(),before);assert.equal(events,count,'failure emits no partial state');
 }
 const before=snapshot(); storageFailure=true;
 await assert.rejects(data.atomic(tx=>rescheduleBooking(tx,input)),/quota/);storageFailure=false;assert.equal(snapshot(),before);
 const reject=async(message)=>{const before=snapshot();await assert.rejects(data.atomic(tx=>rescheduleBooking(tx,input)),message);assert.equal(snapshot(),before);};
 await data.update('class_sessions',target.id,{starts_at:day(6)});await reject(/package_expired/);
 for (const paid_with of ['trial','single']) {
  await data.update('bookings',booking.id,{paid_with});await reject(/package_expired/);
 }
 await data.update('bookings',booking.id,{ledger_id:null});await reject(/reschedule_entitlement_unresolved/);
 await data.update('bookings',booking.id,{ledger_id:debit.id,paid_with:'package'});
 await data.update('class_sessions',target.id,{starts_at:day(4)});
 await data.update('class_ledger',purchase.id,{frozen_from:day(3).slice(0,10),frozen_until:day(5).slice(0,10)});await reject(/package_frozen/);
 await data.update('class_ledger',purchase.id,{frozen_from:null,frozen_until:null});
 await data.update('class_sessions',target.id,{tenant_id:'qa_other_tenant'});await reject(/session_unavailable/);
 await data.update('class_sessions',target.id,{tenant_id:original.tenant_id,status:'cancelled'});await reject(/session_unavailable/);
 await data.update('class_sessions',target.id,{status:'scheduled',starts_at:new Date(now-1000).toISOString()});await reject(/session_unavailable/);
 await data.update('class_sessions',target.id,{starts_at:'invalid'});await reject(/session_unavailable/);
 await data.update('class_sessions',target.id,{starts_at:day(4),capacity:0});await reject(/session_full/);
 await data.update('class_sessions',target.id,{capacity:4});
 const conflictSession=await data.insert('class_sessions',{...target,id:'qa_rs_conflict',starts_at:target.starts_at,ends_at:day(4.1)});
 const conflict=await data.insert('bookings',{user_id:userId,session_id:conflictSession.id,status:'checked_in',paid_with:'comp'});await reject(/same_day_conflict/);
 await data.update('bookings',conflict.id,{status:'cancelled'});
 await assert.rejects(data.atomic(tx=>rescheduleBooking(tx,{...input,now:Date.parse(original.starts_at)-12*3600000+1})),/reschedule_cutoff/);
 await assert.rejects(data.atomic(tx=>rescheduleBooking(tx,{...input,userId:'qa_other'})),/booking_unavailable/);
 const ledgerBefore=JSON.stringify(data.peek('class_ledger'));
 const move=()=>data.atomic(tx=>rescheduleBooking(tx,input),{idempotencyKey:'qa-rs'});
 const [one,two]=await Promise.all([move(),move()]);assert.equal(one.id,two.id);assert.equal(one.ledger_id,debit.id);
 assert.equal(JSON.stringify(data.peek('class_ledger')),ledgerBefore,'retains historical purchased terms and exact original debit');
 assert.equal(data.peek('bookings').find(b=>b.id===booking.id).status,'cancelled');
 assert.equal(data.peek('bookings').filter(b=>b.session_id===target.id&&b.status==='booked').length,1);
 assert.equal(data.peek('class_sessions').find(s=>s.id===original.id).booked_count,0);
 assert.equal(data.peek('class_sessions').find(s=>s.id===target.id).booked_count,1);
 assert.equal(data.peek('waitlist').find(w=>w.id===waiting.id).status,'offered');
 console.log('PASS RS-09: future-day original entitlement, each staged write/storage failure preserves original/capacity/waitlist; expiry/freeze/past/full/cancelled/conflict/scope/cutoff rejected; concurrent retry creates exactly one replacement with same debit and conserved capacity.');
} finally {await rm(scratch,{recursive:true,force:true});}
