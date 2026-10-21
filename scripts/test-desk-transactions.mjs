// Fictional isolated mock adapter; no real payments, credentials or network calls.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const scratch = await mkdtemp(join(tmpdir(), 'hoy-desk-'));
const values = new Map(); let storageFailure = false;
globalThis.localStorage = { getItem: k=>values.get(k) ?? null, setItem: (k,v)=>{if(storageFailure)throw Error('quota');values.set(k,v);} };
try {
 const out = join(scratch,'adapter.mjs');
 await build({stdin:{contents:"export { MockProvider } from './src/data/MockProvider'; export { bookWithPackage } from './src/data/deskBooking';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:out,logLevel:'silent'});
 const {MockProvider,bookWithPackage}=await import(pathToFileURL(out));
 const data = new MockProvider(), userId='qa_fictional';
 const base = data.peek('users')[0], now=new Date(), stamp=now.toISOString();
 const sessionId='qa_session';
 const s=await data.insert('class_sessions',{id:sessionId,tenant_id:base.tenant_id,title:'QA class',starts_at:new Date(+now+86400000).toISOString(),ends_at:new Date(+now+89400000).toISOString(),status:'scheduled',capacity:1,booked_count:0,modality_id:'qa',room_id:'qa'});
 const pay=await data.insert('payments',{user_id:userId,status:'approved'});
 const buy=await data.insert('class_ledger',{user_id:userId,payment_id:pay.id,delta:12,reason:'purchase',expires_at:'2099-01-01'});
 const snapshot=()=>JSON.stringify(data.peek('bookings'))+JSON.stringify(data.peek('class_ledger'))+JSON.stringify(data.peek('payments'))+JSON.stringify(data.peek('class_sessions'));
 let events=0; data.subscribe('*',()=>events++);
 for(const failAfterWrites of [1,2,3]) {
  const before=snapshot(), prior=events;
  await assert.rejects(data.atomic(async tx=>{await tx.insert('payments',{user_id:userId,status:'approved'});return bookWithPackage(tx,{userId,sessionId, status:'checked_in', now:stamp});},{failAfterWrites}),/mock_injected/);
  assert.equal(snapshot(),before); assert.equal(events,prior,'rejected stage emits no events');
 }
 const before=snapshot(); storageFailure=true;
 await assert.rejects(data.atomic(tx=>bookWithPackage(tx,{userId,sessionId,status:'checked_in',now:stamp})),/quota/);
 storageFailure=false; assert.equal(snapshot(),before);
 const book=()=>data.atomic(tx=>bookWithPackage(tx,{userId,sessionId,status:'checked_in',now:stamp}),{idempotencyKey:'qa-checkin'});
 const [one,two]=await Promise.all([book(),book()]);
 assert.equal(one.id,two.id);assert.equal(one.ledger_id,two.ledger_id);
 assert.equal(data.peek('class_ledger').filter(r=>r.user_id===userId&&r.delta===-1).length,1);
 assert.equal(data.peek('class_sessions').find(r=>r.id===sessionId).booked_count,1);
 const after=snapshot();await assert.rejects(data.atomic(tx=>bookWithPackage(tx,{userId,sessionId,status:'booked',now:stamp})),/booking_exists/);assert.equal(snapshot(),after);
 await assert.rejects(data.atomic(tx=>bookWithPackage(tx,{userId:'qa_other',sessionId,status:'booked',now:stamp})),/session_full/);assert.equal(snapshot(),after);
 await data.update('class_sessions',sessionId,{capacity:2});
 for(const status of ['pending','declined','voided','refunded']) {
  await data.update('payments',pay.id,{status});
  await data.update('bookings',one.id,{status:'cancelled'});
  await assert.rejects(data.atomic(tx=>bookWithPackage(tx,{userId,sessionId,status:'booked',now:stamp})),/insufficient_classes/);
 }
 await data.update('payments',pay.id,{status:'approved'});
 await data.update('class_ledger',buy.id,{frozen_from:'2000-01-01',frozen_until:'2099-01-01'});
 await assert.rejects(data.atomic(tx=>bookWithPackage(tx,{userId,sessionId,status:'booked',now:stamp})),/package_frozen/);
 await data.update('class_ledger',buy.id,{frozen_from:null,frozen_until:null,expires_at:'2000-01-01'});
 await assert.rejects(data.atomic(tx=>bookWithPackage(tx,{userId,sessionId,status:'booked',now:stamp})),/insufficient_classes/);
 console.log('PASS desk transaction: every write failure + storage rollback, no intermediate events, concurrent retry idempotency, exactly one debit/capacity, duplicate/full/pending/declined/voided/refunded/frozen/expired rejection');
} finally { await rm(scratch,{recursive:true,force:true}); }
