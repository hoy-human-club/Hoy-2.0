/** RS-10 fictional own-booking command. No money refund, delivery or server authorization. */
import type {DataProvider} from '../../data/types';
import type {BaseRow,BookingRow,ClassLedgerRow,ClassSessionRow,PaymentRow,UserRow} from '../../data/schema';
import type {Role} from '../../auth/roles';
import {tenant} from '../../tenant/tenant';
import {DEFAULT_POLICIES} from '../../tenant/policies';
import {approvedPackageRows,packageLots} from '../../data/packages';
import {dateKey,MS} from '../../i18n/format';

export interface CancellationActor {actorId:string;role:Role}
export interface CancellationControl {signal?:AbortSignal;currentActor?:()=>CancellationActor;now?:()=>number;failAfterWrites?:number}
export interface CancellationReview {bookingId:string;sessionId:string;late:boolean;returnsClass:boolean;verifiable:boolean;deadline:string;endsAt:string;expiresAt:string|null;frozen:boolean;waitlistBookable:boolean;expected:string}
export interface CancellationCommand extends CancellationActor {bookingId:string;sessionId:string;requestId:string;expected:string;late:boolean;returnsClass:boolean;waitlistBookable:boolean}
export interface CancellationOutcome {bookingId:string;sessionId:string;late:boolean;returned:boolean;expiresAt:string|null;waitlist:'offer_recorded'|'none'|'not_bookable'}
interface Waiter extends BaseRow {user_id:string;session_id:string;position:number;status:'waiting'|'offered'|'claimed'|'expired'|'left';offered_at:string|null;claim_until:string|null}
interface PolicyRow extends BaseRow {settings?:{policies?:{cancellationHours?:number;waitlistClaimMin?:number}}|null}
interface Terms {hours:number;claimMinutes:number}
interface Scope {booking:BookingRow;session:ClassSessionRow;terms:Terms;late:boolean;bookable:boolean;debit:ClassLedgerRow|null;grant:ClassLedgerRow|null;verifiable:boolean;expected:string}
interface StoredResult {outcome:CancellationOutcome;bookingDigest:string;debitId:string|null;grantId:string|null;returnId:string|null;debitDigest:string|null;grantDigest:string|null;returnDigest:string|null;offerId:string|null;offerIdentityDigest:string|null}
interface Receipt extends BaseRow {actor_id:string;action:string;entity:string;entity_id:string;diff:{version:1;source:'fictional-own-cancellation';role:Role;fingerprint:string;result:StoredResult}}
function fail(code:string):never{throw Error('customer_cancel_'+code);}
const controls=(c:CancellationControl):CancellationControl=>({signal:c.signal,currentActor:c.currentActor,now:c.now??Date.now,failAfterWrites:c.failAfterWrites});
const timestamp=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const day=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&timestamp(v+'T12:00:00Z')&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
const hex=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export async function cancellationDigest(value:unknown){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))].map(v=>v.toString(16).padStart(2,'0')).join('');}
export async function customerReturnId(bookingId:string){return 'customer_return_v1_'+await cancellationDigest({tenant:tenant.id,bookingId});}
function fence(data:DataProvider,who:CancellationActor,c:CancellationControl){
 if(data.name!=='mock'||!data.atomic)fail('disconnected');
 if(typeof who.actorId!=='string'||!who.actorId||!['customer','teacher','super_admin'].includes(who.role))fail('denied');
 const live=c.currentActor?.()??who;if(live.actorId!==who.actorId||live.role!==who.role)fail('context');if(c.signal?.aborted)fail('cancelled');
}
async function scoped<T extends BaseRow>(data:DataProvider,table:string,where:Record<string,unknown>,who:CancellationActor,c:CancellationControl):Promise<T[]>{
 fence(data,who,c);const rows=await data.list<T>(table,{where:{tenant_id:tenant.id,...where}});fence(data,who,c);
 if(rows.some(r=>r.tenant_id!==tenant.id||typeof r.id!=='string'||!r.id||Object.entries(where).some(([k,v])=>r[k]!==v))||new Set(rows.map(r=>r.id)).size!==rows.length)fail('scope');return rows;
}
async function one<T extends BaseRow>(data:DataProvider,table:string,where:Record<string,unknown>,who:CancellationActor,c:CancellationControl){const rows=await scoped<T>(data,table,where,who,c);if(rows.length!==1)fail('scope');return rows[0];}
async function actor(data:DataProvider,who:CancellationActor,c:CancellationControl){const user=await one<UserRow>(data,'users',{id:who.actorId},who,c);if(user.status!=='active')fail('context');fence(data,who,c);}
function bookingShape(b:BookingRow){if(typeof b.user_id!=='string'||typeof b.session_id!=='string'||!['booked','checked_in','cancelled','late_cancel','no_show'].includes(b.status)||!['package','single','trial','guest','comp','membership'].includes(b.paid_with)||b.ledger_id!==null&&typeof b.ledger_id!=='string')fail('scope');}
function sessionShape(s:ClassSessionRow){if(!timestamp(s.starts_at)||!timestamp(s.ends_at)||Date.parse(s.ends_at)<=Date.parse(s.starts_at)||!['scheduled','completed','cancelled'].includes(s.status)||!Number.isSafeInteger(s.capacity)||s.capacity<1||!Number.isSafeInteger(s.booked_count)||s.booked_count<0)fail('scope');}
function ledgerShape(row:ClassLedgerRow,userId:string){if(row.user_id!==userId||!Number.isSafeInteger(row.delta)||!timestamp(row.created_at)||typeof row.reason!=='string'||row.expires_at!==null&&!day(row.expires_at)||row.purchase_ledger_id!=null&&typeof row.purchase_ledger_id!=='string'||row.plan_id!=null&&typeof row.plan_id!=='string'||row.payment_id!=null&&typeof row.payment_id!=='string'||row.frozen_from!=null&&!day(row.frozen_from)||row.frozen_until!=null&&!day(row.frozen_until))fail('unverifiable');}
async function policyTerms(data:DataProvider,who:CancellationActor,c:CancellationControl):Promise<Terms>{
 const row=await one<PolicyRow>(data,'tenants',{id:tenant.id},who,c),saved=row.settings?.policies;
 const hours=saved?.cancellationHours===undefined?DEFAULT_POLICIES.cancellationHours:saved.cancellationHours,claimMinutes=saved?.waitlistClaimMin===undefined?DEFAULT_POLICIES.waitlistClaimMin:saved.waitlistClaimMin;
 // Existing M08 numeric field contracts: cancellation min0, claim min5; no new upper limit/integer rule.
 if(typeof hours!=='number'||!Number.isFinite(hours)||hours<0||typeof claimMinutes!=='number'||!Number.isFinite(claimMinutes)||claimMinutes<5)fail('scope');return {hours,claimMinutes};
}
function timing(booking:BookingRow,session:ClassSessionRow,terms:Terms,c:CancellationControl){
 const now=c.now!();if(!Number.isFinite(now)||booking.status!=='booked'||session.status==='cancelled'||now>Date.parse(session.ends_at))fail('unavailable');
 const deadline=Date.parse(session.starts_at)-terms.hours*MS.hour;if(!Number.isFinite(deadline))fail('scope');return {now,deadline,late:now>deadline,bookable:session.status==='scheduled'&&Date.parse(session.starts_at)>now};
}
const sorted=<T extends BaseRow>(rows:T[])=>[...rows].sort((a,b)=>a.id.localeCompare(b.id));
const lineageProof=(ledger:ClassLedgerRow[],payments:PaymentRow[],bookings:BookingRow[])=>({ledger:sorted(ledger),payments:sorted(payments).map(p=>({id:p.id,tenant_id:p.tenant_id,user_id:p.user_id,plan_id:p.plan_id,status:p.status,updated_at:p.updated_at})),bookings:sorted(bookings)});
async function readScope(data:DataProvider,who:CancellationActor,bookingId:string,sessionId:string,c:CancellationControl):Promise<Scope>{
 await actor(data,who,c);const booking=await one<BookingRow>(data,'bookings',{id:bookingId,user_id:who.actorId},who,c);bookingShape(booking);if(booking.session_id!==sessionId)fail('scope');
 const session=await one<ClassSessionRow>(data,'class_sessions',{id:sessionId},who,c);sessionShape(session);const terms=await policyTerms(data,who,c),time=timing(booking,session,terms,c);
 let debit:ClassLedgerRow|null=null,grant:ClassLedgerRow|null=null,verifiable=true,proof:unknown=null;
 if(!time.late&&booking.paid_with==='package'){
  const rows=await scoped<ClassLedgerRow>(data,'class_ledger',{user_id:who.actorId},who,c),payments=await scoped<PaymentRow>(data,'payments',{user_id:who.actorId},who,c),ownBookings=await scoped<BookingRow>(data,'bookings',{user_id:who.actorId},who,c);ownBookings.forEach(bookingShape);
  try{
   rows.forEach(r=>ledgerShape(r,who.actorId));debit=rows.find(r=>r.id===booking.ledger_id)??null;if(!debit||debit.delta!==-1||debit.reason!=='booking'||!debit.purchase_ledger_id)fail('unverifiable');
   grant=rows.find(r=>r.id===debit!.purchase_ledger_id)??null;if(!grant||grant.delta<1||grant.purchase_ledger_id)fail('unverifiable');
   if(debit.plan_id!=null&&debit.plan_id!==grant.plan_id||debit.payment_id!=null&&debit.payment_id!==grant.payment_id)fail('unverifiable');
   if(grant.payment_id&&!payments.some(p=>p.id===grant!.payment_id&&p.status==='approved'&&(p.plan_id??null)===(grant!.plan_id??null)))fail('unverifiable');
   const lots=packageLots(approvedPackageRows(rows,payments)).filter(l=>l.purchase.id===grant!.id&&l.debits.some(d=>d.ledgerId===debit!.id&&d.quantity===1));
   if(lots.length!==1||lots[0].left>=grant.delta||ownBookings.some(b=>b.id!==booking.id&&b.status!=='cancelled'&&b.status!=='late_cancel'&&b.ledger_id===debit!.id))fail('unverifiable');
   const returnedId=await customerReturnId(booking.id);if(rows.some(r=>r.id===returnedId))fail('unverifiable');
  }catch(error){if((error as Error).message!=='customer_cancel_unverifiable')throw error;verifiable=false;debit=null;grant=null;}
  proof=lineageProof(rows,payments,ownBookings);
 }
 const expected=await cancellationDigest({booking,session,terms,late:time.late,bookable:time.bookable,proof});
 // A held digest must not return an old own-row verification after ownership/terms changed.
 const freshBooking=await one<BookingRow>(data,'bookings',{id:bookingId,user_id:who.actorId},who,c),freshSession=await one<ClassSessionRow>(data,'class_sessions',{id:sessionId},who,c),freshTerms=await policyTerms(data,who,c);
 if(JSON.stringify(freshBooking)!==JSON.stringify(booking)||JSON.stringify(freshSession)!==JSON.stringify(session)||JSON.stringify(freshTerms)!==JSON.stringify(terms))fail('stale');
 if(proof!==null){const ledger=await scoped<ClassLedgerRow>(data,'class_ledger',{user_id:who.actorId},who,c),payments=await scoped<PaymentRow>(data,'payments',{user_id:who.actorId},who,c),bookings=await scoped<BookingRow>(data,'bookings',{user_id:who.actorId},who,c);if(JSON.stringify(lineageProof(ledger,payments,bookings))!==JSON.stringify(proof))fail('stale');}
 await actor(data,who,c);const end=timing(booking,session,terms,c);if(end.late!==time.late||end.bookable!==time.bookable)fail('stale');
 return {booking,session,terms,late:time.late,bookable:time.bookable,debit,grant,verifiable,expected};
}
export async function readCustomerCancellation(data:DataProvider,identity:CancellationActor,bookingId:string,sessionId:string,supplied:CancellationControl={}):Promise<CancellationReview>{
 const who={...identity},bid=String(bookingId),sid=String(sessionId),c=controls(supplied);fence(data,who,c);const state=await readScope(data,who,bid,sid,c),time=timing(state.booking,state.session,state.terms,c),today=dateKey(new Date(time.now));
 return {bookingId:bid,sessionId:sid,late:state.late,returnsClass:!state.late&&state.booking.paid_with==='package',verifiable:state.verifiable,deadline:new Date(time.deadline).toISOString(),endsAt:state.session.ends_at,expiresAt:state.grant?.expires_at??null,frozen:!!state.grant?.frozen_from&&!!state.grant.frozen_until&&state.grant.frozen_from<=today&&today<=state.grant.frozen_until,waitlistBookable:state.bookable,expected:state.expected};
}
async function offer(data:DataProvider,state:Scope,who:CancellationActor,c:CancellationControl):Promise<{state:CancellationOutcome['waitlist'];id:string|null;identityDigest:string|null}>{
 if(!state.bookable)return {state:'not_bookable',id:null,identityDigest:null};
 const session=await one<ClassSessionRow>(data,'class_sessions',{id:state.session.id},who,c);sessionShape(session);if(session.status!=='scheduled'||Date.parse(session.starts_at)<=c.now!()||session.booked_count>=session.capacity)fail('stale');
 const waiting=await scoped<Waiter>(data,'waitlist',{session_id:session.id,status:'waiting'},who,c);
 if(waiting.some(w=>!Number.isSafeInteger(w.position)||w.position<1||typeof w.user_id!=='string'||!w.user_id)||new Set(waiting.map(w=>w.position)).size!==waiting.length)fail('unverifiable');
 const candidate=[...waiting].sort((a,b)=>a.position-b.position)[0];if(!candidate)return {state:'none',id:null,identityDigest:null};
 const now=c.now!();if(Date.parse(session.starts_at)<=now)fail('stale');await data.update('waitlist',candidate.id,{status:'offered',offered_at:new Date(now).toISOString(),claim_until:new Date(now+state.terms.claimMinutes*MS.min).toISOString()});fence(data,who,c);
 return {state:'offer_recorded',id:candidate.id,identityDigest:await cancellationDigest({id:candidate.id,tenant_id:candidate.tenant_id,session_id:candidate.session_id,user_id:candidate.user_id})};
}
async function acknowledge(data:DataProvider,who:CancellationActor,command:CancellationCommand,result:StoredResult,c:CancellationControl):Promise<CancellationOutcome>{
 const checkedLedger:ClassLedgerRow[]=[];let checkedPayment:PaymentRow|undefined,checkedOffer:Waiter|undefined;
 await actor(data,who,c);const o=result?.outcome;if(!o||o.bookingId!==command.bookingId||o.sessionId!==command.sessionId||o.late!==command.late||o.returned!==command.returnsClass||!['offer_recorded','none','not_bookable'].includes(o.waitlist)||!hex(result.bookingDigest)||o.expiresAt!==null&&!day(o.expiresAt))fail('receipt');
 const booking=await one<BookingRow>(data,'bookings',{id:o.bookingId,user_id:who.actorId},who,c);bookingShape(booking);if(booking.session_id!==o.sessionId||booking.status!==(o.late?'late_cancel':'cancelled')||await cancellationDigest(booking)!==result.bookingDigest)fail('stale');
 const session=await one<ClassSessionRow>(data,'class_sessions',{id:o.sessionId},who,c);sessionShape(session);
 if(o.returned){
  if(!result.debitId||!result.grantId||!result.returnId||!hex(result.debitDigest)||!hex(result.grantDigest)||!hex(result.returnDigest)||booking.ledger_id!==result.debitId)fail('receipt');
  const rows=await scoped<ClassLedgerRow>(data,'class_ledger',{user_id:who.actorId},who,c),debit=rows.find(r=>r.id===result.debitId),grant=rows.find(r=>r.id===result.grantId),returned=rows.find(r=>r.id===result.returnId);rows.forEach(r=>ledgerShape(r,who.actorId));
  if(!debit||!grant||!returned||debit.delta!==-1||debit.reason!=='booking'||debit.purchase_ledger_id!==grant.id||grant.delta<1||returned.delta!==1||returned.reason!=='cancel_return'||returned.purchase_ledger_id!==grant.id||(returned.plan_id??null)!==(grant.plan_id??null)||(returned.payment_id??null)!==(grant.payment_id??null)||returned.expires_at!==grant.expires_at||o.expiresAt!==grant.expires_at||await customerReturnId(booking.id)!==returned.id||await cancellationDigest(debit)!==result.debitDigest||await cancellationDigest(grant)!==result.grantDigest||await cancellationDigest(returned)!==result.returnDigest)fail('stale');
  checkedLedger.push(debit,grant,returned);const payments=await scoped<PaymentRow>(data,'payments',{user_id:who.actorId},who,c);checkedPayment=grant.payment_id?payments.find(p=>p.id===grant.payment_id&&p.status==='approved'&&(p.plan_id??null)===(grant.plan_id??null)):undefined;if(grant.payment_id&&!checkedPayment)fail('unverifiable');
 }else if([result.debitId,result.grantId,result.returnId,result.debitDigest,result.grantDigest,result.returnDigest].some(x=>x!==null)||o.expiresAt!==null)fail('receipt');
 if(o.waitlist==='offer_recorded'){
  if(!result.offerId||!hex(result.offerIdentityDigest))fail('receipt');const row=await one<Waiter>(data,'waitlist',{id:result.offerId,session_id:o.sessionId},who,c);if(!['waiting','offered','claimed','expired','left'].includes(row.status)||await cancellationDigest({id:row.id,tenant_id:row.tenant_id,session_id:row.session_id,user_id:row.user_id})!==result.offerIdentityDigest)fail('stale');checkedOffer=row;
 }else if(result.offerId!==null||result.offerIdentityDigest!==null)fail('receipt');
 // Revalidate owned required rows after the digest/read chain, before offering success.
 const finalBooking=await one<BookingRow>(data,'bookings',{id:o.bookingId,user_id:who.actorId},who,c);if(JSON.stringify(finalBooking)!==JSON.stringify(booking))fail('stale');sessionShape(await one<ClassSessionRow>(data,'class_sessions',{id:o.sessionId},who,c));
 for(const row of checkedLedger){const current=await one<ClassLedgerRow>(data,'class_ledger',{id:row.id,user_id:who.actorId},who,c);if(JSON.stringify(current)!==JSON.stringify(row))fail('stale');}
 if(checkedPayment){const current=await one<PaymentRow>(data,'payments',{id:checkedPayment.id,user_id:who.actorId},who,c);if(current.status!=='approved'||(current.plan_id??null)!==(checkedPayment.plan_id??null))fail('stale');}
 if(checkedOffer){const current=await one<Waiter>(data,'waitlist',{id:checkedOffer.id,session_id:o.sessionId},who,c);if(current.user_id!==checkedOffer.user_id||!['waiting','offered','claimed','expired','left'].includes(current.status))fail('stale');}
 await actor(data,who,c);return {bookingId:o.bookingId,sessionId:o.sessionId,late:o.late,returned:o.returned,expiresAt:o.expiresAt,waitlist:o.waitlist};
}
/** New writes recheck the reviewed outcome. Historical own receipts never recalculate a return. */
export async function cancelOwnBooking(data:DataProvider,command:CancellationCommand,supplied:CancellationControl={}):Promise<CancellationOutcome>{
 const input=structuredClone(command),c=controls(supplied);fence(data,input,c);
 if([input.bookingId,input.sessionId,input.requestId].some(x=>typeof x!=='string'||!x)||!hex(input.expected)||typeof input.late!=='boolean'||typeof input.returnsClass!=='boolean'||typeof input.waitlistBookable!=='boolean'||input.late&&input.returnsClass)fail('validation');
 await actor(data,input,c);const fingerprint=await cancellationDigest(input),key=await cancellationDigest({tenant:tenant.id,actor:input.actorId,role:input.role,nonce:input.requestId}),receiptId='customer_cancel_v1_'+key;fence(data,input,c);
 const result=await data.atomic!(async tx=>{
  await actor(tx,input,c);const prior=await tx.get<Receipt>('audit_log',receiptId);fence(tx,input,c);
  if(prior){if(prior.id!==receiptId||prior.tenant_id!==tenant.id||prior.actor_id!==input.actorId||prior.action!=='booking.customer_cancel'||prior.entity!=='bookings'||prior.entity_id!==input.bookingId||prior.diff?.version!==1||prior.diff.source!=='fictional-own-cancellation'||prior.diff.role!==input.role||prior.diff.fingerprint!==fingerprint)fail('receipt');await acknowledge(tx,input,input,prior.diff.result,c);return prior.diff.result;}
  const state=await readScope(tx,input,input.bookingId,input.sessionId,c);if(state.expected!==input.expected||state.late!==input.late||(!state.late&&state.booking.paid_with==='package')!==input.returnsClass||state.bookable!==input.waitlistBookable)fail('stale');if(!state.verifiable)fail('unverifiable');
  const returnId=input.returnsClass?await customerReturnId(input.bookingId):null;if(returnId&&await tx.get('class_ledger',returnId))fail('unverifiable');await actor(tx,input,c);
  const guard=()=>{fence(tx,input,c);const time=timing(state.booking,state.session,state.terms,c);if(time.late!==input.late||time.bookable!==input.waitlistBookable)fail('stale');return time;};const at=guard().now;
  const booking=await tx.update<BookingRow>('bookings',state.booking.id,{status:input.late?'late_cancel':'cancelled',cancelled_at:new Date(at).toISOString()});guard();
  let returned:ClassLedgerRow|null=null;if(returnId){if(!state.debit||!state.grant)fail('unverifiable');returned=await tx.insert<ClassLedgerRow>('class_ledger',{id:returnId,tenant_id:tenant.id,user_id:input.actorId,plan_id:state.grant.plan_id??null,payment_id:state.grant.payment_id??null,purchase_ledger_id:state.grant.id,delta:1,reason:'cancel_return',expires_at:state.grant.expires_at,frozen_from:null,frozen_until:null});guard();}
  const session=await one<ClassSessionRow>(tx,'class_sessions',{id:state.session.id},input,c);if(session.booked_count!==state.session.booked_count-1)fail('unverifiable');guard();
  const offered=await offer(tx,state,input,c);guard();const outcome:CancellationOutcome={bookingId:booking.id,sessionId:session.id,late:input.late,returned:!!returned,expiresAt:state.grant?.expires_at??null,waitlist:offered.state};
  const result:StoredResult={outcome,bookingDigest:await cancellationDigest(booking),debitId:state.debit?.id??null,grantId:state.grant?.id??null,returnId,debitDigest:state.debit?await cancellationDigest(state.debit):null,grantDigest:state.grant?await cancellationDigest(state.grant):null,returnDigest:returned?await cancellationDigest(returned):null,offerId:offered.id,offerIdentityDigest:offered.identityDigest};guard();
  await tx.insert('audit_log',{id:receiptId,tenant_id:tenant.id,actor_id:input.actorId,action:'booking.customer_cancel',entity:'bookings',entity_id:booking.id,ip:null,diff:{version:1,source:'fictional-own-cancellation',role:input.role,fingerprint,result}});await acknowledge(tx,input,input,result,c);guard();return result;
 },{failAfterWrites:c.failAfterWrites});
 return acknowledge(data,input,input,result,c);
}
