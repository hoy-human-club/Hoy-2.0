import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const scratch = await mkdtemp(join(tmpdir(), 'hoy-vouchers-'));
try {
 const {executeVoucherCommand: run}=await import('../src/data/vouchers.ts');
 const base={tenant_id:'tenant',created_at:'2026-01-01',updated_at:'2026-01-01'};
 let db={vouchers:[],voucher_bookings:[],voucher_events:[],users:[{...base,id:'admin'},{...base,id:'member'}],bookings:[],class_sessions:[{...base,id:'s1',starts_at:'2027-01-01',status:'scheduled',capacity:4,booked_count:0},{...base,id:'s2',starts_at:'2027-01-02',status:'scheduled',capacity:1,booked_count:0}]};
 let n=0, requests=0;
 const ctx={tenantId:'tenant',now:'2026-10-14T12:00:00Z',id:()=>`id-${++n}`,usesMats:()=>true,matCapacity:4};
 const exec=(cmd)=>{const out=run(db,{requestId:`req-${++requests}`,actorId:'admin',role:'admin',...cmd},ctx);db=out.db;return out.result};
 const rejects=(cmd,code)=>{const before=JSON.stringify(db);assert.throws(()=>exec(cmd),new RegExp(code));assert.equal(JSON.stringify(db),before,'failure atomic');};
 const issue={type:'issue',title:'Test invitation',benefitKind:'classes',benefitTotal:4,participantCap:3,capScope:'per_booking',creditUnit:'per_person',expiresAt:null,cancellationPolicy:'restore'};
 rejects({...issue,actorId:'nonexistent'},'voucher_identity_required');
 db.users.push({...base,id:'foreign-admin',tenant_id:'other'});
 rejects({...issue,actorId:'foreign-admin'},'voucher_identity_required');
 rejects({...issue,role:'customer'},'voucher_forbidden');
 rejects({...issue,capScope:undefined},'voucher_terms_required');
 rejects({...issue,expiresAt:'2020-01-01'},'voucher_expiration_invalid');
 const v=exec({...issue,requestId:'issue-one'}).voucher;
 const foreign={...v,id:'foreign',tenant_id:'other'};db.vouchers.push(foreign);
 rejects({type:'claim',voucherId:'foreign',userId:'member',actorId:'member',role:'customer'},'voucher_not_found');
 db.vouchers.pop();
 const first=exec({...issue,requestId:'issue-one'}); assert.equal(first.voucher.id,v.id);assert.equal(db.vouchers.length,1);assert.equal(db.voucher_events.length,1);
 rejects({...issue,title:'changed',requestId:'issue-one'},'voucher_request_conflict');
 rejects({type:'claim',voucherId:v.id,userId:'member',actorId:'other',role:'customer'},'voucher_identity_required');
 exec({type:'claim',voucherId:v.id,userId:'member',actorId:'member',role:'customer'});
 const book={type:'book',voucherId:v.id,sessionId:'s1',participants:[{name:'Member',userId:'member'},{name:'Guest'}],contactConsent:true};
 rejects({...book,contactConsent:false},'voucher_guest_details_required');
 rejects({...book,participants:[{name:''}]},'voucher_guest_details_required');
 rejects({...book,sessionId:'s2'},'session_full');
 const b=exec({...book,requestId:'book-once'}).booking; assert.equal(db.vouchers[0].balance,2);assert.equal(db.class_sessions[0].booked_count,2);assert.deepEqual(b.mats,[1,2]);
 exec({...book,requestId:'book-once'});assert.equal(db.voucher_bookings.length,1);
 rejects(book,'booking_exists');
 rejects({type:'revoke',voucherId:v.id},'voucher_active_bookings');
 rejects({...book,participants:[{name:'A'},{name:'B'},{name:'C'},{name:'D'}]},'voucher_participant_cap');
 rejects({...book,participants:[{name:'A'},{name:'B'},{name:'C'}]},'session_full');
 exec({type:'cancel',bookingId:b.id,requestId:'cancel-once'});assert.equal(db.vouchers[0].balance,4);assert.equal(db.class_sessions[0].booked_count,0);
 exec({type:'cancel',bookingId:b.id,requestId:'cancel-once'});assert.equal(db.vouchers[0].balance,4);
 rejects({type:'cancel',bookingId:b.id},'voucher_booking_final');
 db.class_sessions[0].booked_count=999; // cached count is deliberately stale; actual rows determine capacity
 const attended=exec(book).booking;exec({type:'attendance',bookingId:attended.id});assert.equal(db.vouchers[0].balance,2);rejects({type:'cancel',bookingId:attended.id},'voucher_booking_final');
 const money=exec({...issue,benefitKind:'cop',benefitTotal:100,participantCap:4,cancellationPolicy:'forfeit'}).voucher;
 exec({type:'claim',voucherId:money.id,userId:'member',actorId:'member',role:'customer'});
 const cop={...book,voucherId:money.id,participants:[{name:'New guest'}],costPerPerson:101};
 rejects(cop,'voucher_insufficient_balance');rejects({...cop,costPerPerson:1.5},'voucher_price_required');
 const cb=exec({...cop,costPerPerson:60}).booking;exec({type:'cancel',bookingId:cb.id});assert.equal(db.vouchers.find(v=>v.id===money.id).balance,40);
 const preview=exec({type:'preview_delivery',voucherId:money.id,channel:'email'});assert.equal(preview.event.payload.deliveryStatus,'preview_only');
 exec({type:'revoke',voucherId:money.id});
 rejects({...cop,costPerPerson:1},'voucher_unavailable');
 const group=exec({...issue,benefitTotal:1,creditUnit:'per_booking',capScope:'lifetime',participantCap:2}).voucher;
 exec({type:'claim',voucherId:group.id,userId:'member',actorId:'member',role:'customer'});
 exec({...book,voucherId:group.id,participants:[{name:'X'},{name:'Y'}]});assert.equal(db.vouchers.find(v=>v.id===group.id).balance,0);
 rejects({...book,voucherId:group.id,sessionId:'s2',participants:[{name:'Z'}]},'voucher_participant_cap');
 // Sequential same-capacity commands use latest state; this is NOT a cross-tab concurrency test.
 assert.equal(db.class_sessions[0].booked_count,4);
 const originalName=book.participants[0].name;book.participants[0].name='Tampered';assert.notEqual(db.voucher_bookings[0].participants[0].name,'Tampered');book.participants[0].name=originalName;
 const recordedConsent=db.voucher_events.find(e=>e.kind==='book').payload;assert.equal(recordedConsent.contactConsent,true);assert.equal(recordedConsent.marketingConsent,false);assert.equal(recordedConsent.consentRecordedAt,ctx.now);
 // Names do not identify people. Each scenario starts with ample independent capacity.
 const identityScenario=()=>{
  let state={vouchers:[],voucher_bookings:[],voucher_events:[],users:[{...base,id:'admin'},{...base,id:'member'},{...base,id:'other-member'}],bookings:[],class_sessions:[{...base,id:'identity-session',starts_at:'2027-01-01',status:'scheduled',capacity:20,booked_count:0}]};
  const act=cmd=>{const out=run(state,{requestId:`identity-${++requests}`,actorId:'admin',role:'admin',...cmd},{...ctx,usesMats:()=>false});state=out.db;return out.result;};
  const makeVoucher=()=>{const voucher=act({...issue,benefitTotal:20,participantCap:10}).voucher;act({type:'claim',voucherId:voucher.id,userId:'member',actorId:'member',role:'customer'});return voucher.id;};
  const firstVoucher=makeVoucher(), secondVoucher=makeVoucher();
  const reserve=(participants,voucherId=firstVoucher)=>act({type:'book',voucherId,sessionId:'identity-session',participants,contactConsent:true});
  const reject=(participants,code,voucherId)=>{const before=JSON.stringify(state);assert.throws(()=>reserve(participants,voucherId),new RegExp(code));assert.equal(JSON.stringify(state),before,'identity failure atomic');};
  return {reserve,reject,secondVoucher};
 };
 {
  const t=identityScenario();
  t.reserve([{name:'Alex Rivera'},{name:'Alex Rivera'}]);
  t.reserve([{name:'Alex Rivera'}],t.secondVoucher);
 }
 {
  const t=identityScenario();
  t.reserve([{name:'Alex Rivera',email:'alex.one@example.test'},{name:'Alex Rivera',email:'alex.two@example.test'}]);
  t.reserve([{name:'Alex Rivera',email:'alex.three@example.test'}],t.secondVoucher);
  t.reject([{name:'Changed display name',email:'ALEX.ONE@example.test'}],'booking_exists',t.secondVoucher);
 }
 {
  const t=identityScenario();
  t.reject([{name:'A',email:'duplicate@example.test'},{name:'B',email:'DUPLICATE@example.test'}],'voucher_duplicate_guest');
  t.reject([{name:'A',userId:'member'},{name:'B',userId:'member'}],'voucher_duplicate_guest');
  t.reject([{name:'A',userId:'member',email:'owner@example.test'},{name:'B',email:'OWNER@example.test'}],'voucher_duplicate_guest');
  t.reserve([{name:'Member',userId:'member',email:'owner@example.test'}]);
  t.reject([{name:'Renamed',userId:'member'}],'booking_exists',t.secondVoucher);
  t.reject([{name:'Another label',email:'OWNER@example.test'}],'booking_exists',t.secondVoucher);
 }
 {
  const t=identityScenario();
  t.reserve([{name:'Guest',email:'owner@example.test'}]);
  t.reject([{name:'Member',userId:'member',email:'OWNER@example.test'}],'booking_exists',t.secondVoucher);
  t.reserve([{name:'member'}],t.secondVoucher); // A name matching an ID is still only a label.
 }
 console.log('Voucher identity regressions: same-name groups and separate bookings allowed; repeated user IDs and normalized emails rejected atomically');
 console.log('Voucher contract: role guards, explicit terms, atomic failure, idempotency, claim ownership, guest validation, capacity, mats, balance, COP integers, cancellation, attendance, lifetime cap and preview-only audit passed');
} finally {await rm(scratch,{recursive:true,force:true});}
