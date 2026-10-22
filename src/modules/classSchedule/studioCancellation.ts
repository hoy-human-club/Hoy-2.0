/** AD02 fictional browser transaction. No email/outbox/payment or production authorization. */
import type {DataProvider} from '../../data/types';
import type {BaseRow,BookingRow,ClassLedgerRow,ClassSessionRow,NotificationPrefRow,PaymentRow,ProfileRow,TeacherRow,UserRow} from '../../data/schema';
import type {VoucherBookingRow} from '../../data/vouchers';
import type {Role} from '../../auth/roles';
import {tenant} from '../../tenant/tenant';
import {approvedPackageRows,packageLots,packageState} from '../../data/packages';
import {dateKey,formatDateTime} from '../../i18n/format';
import {parseEmailBody,type EmailRow} from '../admin/emailTest';

export interface StudioActor {actorId:string;role:Role}
export interface StudioControl {signal?:AbortSignal;currentActor?:()=>StudioActor;now?:()=>number;failAfterWrites?:number}
export interface StudioIntent extends StudioActor {sessionId:string;requestId:string;expected:string;bookingIds:string[];reason:string|null}
export interface StudioAttendee {booking:BookingRow;debit:ClassLedgerRow;grant:ClassLedgerRow;user:UserRow;profile:ProfileRow|null;prefs:NotificationPrefRow[]}
export interface StudioEmailPreview {userId:string;locale:'es'|'en';subject:string;body:string;cta?:{label:string;href:string};warnings:string[]}
export interface StudioImpact {session:ClassSessionRow;attendees:StudioAttendee[];activeCount:number;voucherSeats:number;waitlistCount:number;issues:string[];expected:string;emails:StudioEmailPreview[];template:{id:string;version:number;digest:string}|null}
interface ResultItem {bookingId:string;userId:string;debitId:string;grantId:string;returnId:string;bookingDigest:string;debitDigest:string;grantDigest:string;returnDigest:string}
export interface StudioResult {sessionId:string;sessionDigest:string;items:ResultItem[];email:{status:'preview_only';count:number;warningCount:number;templateId:string|null;templateDigest:string|null}}
interface Receipt extends BaseRow {actor_id:string;action:string;entity:string;entity_id:string;diff:{version:1;source:'fictional-studio-cancellation';role:Role;fingerprint:string;result:StudioResult}}
const snapshotControl=(c:StudioControl):StudioControl=>({signal:c.signal,currentActor:c.currentActor,now:c.now??Date.now,failAfterWrites:c.failAfterWrites});
function fail(code:string):never{throw Error('studio_cancel_'+code);}
const stamp=(x:unknown):x is string=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const validDay=(x:unknown):x is string=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&stamp(x+'T12:00:00Z')&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
const active=(r:BookingRow)=>r.status!=='cancelled'&&r.status!=='late_cancel';
export const studioDigest=async(value:unknown)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))].map(v=>v.toString(16).padStart(2,'0')).join('');
export const studioReturnId=async(sessionId:string,bookingId:string)=>'studio_return_v1_'+await studioDigest({tenant:tenant.id,sessionId,bookingId});
function check(data:DataProvider,who:StudioActor,control:StudioControl,admin=true){
 if(data.name!=='mock'||!data.atomic)fail('disconnected');
 if(admin&&!['admin','super_admin'].includes(who.role))fail('denied');
 const current=control.currentActor?.()??who;if(current.actorId!==who.actorId||current.role!==who.role)fail('context');
 if(control.signal?.aborted)fail('cancelled');
}
function future(session:ClassSessionRow,control:StudioControl){const now=control.now!();if(!Number.isFinite(now)||session.status!=='scheduled'||!stamp(session.starts_at)||Date.parse(session.starts_at)<=now)fail('history');}
async function scoped<T extends BaseRow>(data:DataProvider,table:string,where:Record<string,unknown>,who:StudioActor,control:StudioControl,admin=true):Promise<T[]>{
 check(data,who,control,admin);const rows=await data.list<T>(table,{where:{tenant_id:tenant.id,...where}});check(data,who,control,admin);
 if(rows.some(r=>r.tenant_id!==tenant.id||typeof r.id!=='string'||!r.id||Object.entries(where).some(([k,v])=>r[k]!==v))||new Set(rows.map(r=>r.id)).size!==rows.length)fail('scope');return rows;
}
async function owned<T extends BaseRow>(data:DataProvider,table:string,id:string,who:StudioActor,control:StudioControl,admin=true):Promise<T>{const rows=await scoped<T>(data,table,{id},who,control,admin);if(rows.length!==1)fail('scope');return rows[0];}
async function actor(data:DataProvider,who:StudioActor,control:StudioControl,admin=true){check(data,who,control,admin);const account=await owned<UserRow>(data,'users',who.actorId,who,control,admin);if(account.status!=='active')fail('context');check(data,who,control,admin);}
function sessionShape(s:ClassSessionRow){if(!stamp(s.starts_at)||!stamp(s.ends_at)||Date.parse(s.ends_at)<=Date.parse(s.starts_at)||!['scheduled','cancelled','completed'].includes(s.status)||!Number.isSafeInteger(s.capacity)||s.capacity<1||!Number.isSafeInteger(s.booked_count)||s.booked_count<0||typeof s.title!=='string'||s.cancel_reason!==null&&typeof s.cancel_reason!=='string')fail('scope');}
function bookingShape(b:BookingRow){if(typeof b.user_id!=='string'||typeof b.session_id!=='string'||!['booked','checked_in','cancelled','late_cancel','no_show'].includes(b.status)||b.ledger_id!==null&&typeof b.ledger_id!=='string'||typeof b.paid_with!=='string')fail('scope');}
function ledgerShape(r:ClassLedgerRow,userId:string){if(r.user_id!==userId||!Number.isSafeInteger(r.delta)||!stamp(r.created_at)||typeof r.reason!=='string'||r.expires_at!==null&&!validDay(r.expires_at)||r.purchase_ledger_id!=null&&typeof r.purchase_ledger_id!=='string'||r.payment_id!=null&&typeof r.payment_id!=='string'||r.plan_id!=null&&typeof r.plan_id!=='string'||r.frozen_from!=null&&!validDay(r.frozen_from)||r.frozen_until!=null&&!validDay(r.frozen_until))fail('lineage');}
function lineage(rows:ClassLedgerRow[],payments:PaymentRow[],booking:BookingRow):{debit:ClassLedgerRow;grant:ClassLedgerRow}{
 if(!['package','membership','trial','single'].includes(booking.paid_with))fail('lineage');
 rows.forEach(r=>ledgerShape(r,booking.user_id));const debit=rows.find(r=>r.id===booking.ledger_id);
 if(!debit||debit.delta!==-1||debit.reason!=='booking')fail('lineage');
 const lots=packageLots(approvedPackageRows(rows,payments)).filter(l=>l.debits.some(d=>d.ledgerId===debit.id));
 if(lots.length!==1||lots[0].debits.find(d=>d.ledgerId===debit.id)!.quantity!==1||lots[0].purchase.delta<1||lots[0].left>=lots[0].purchase.delta)fail('lineage');
 const grant=lots[0].purchase;if(debit.plan_id!=null&&debit.plan_id!==grant.plan_id||debit.payment_id!=null&&debit.payment_id!==grant.payment_id)fail('lineage');if(debit.purchase_ledger_id&&debit.purchase_ledger_id!==grant.id)fail('lineage');
 if(grant.payment_id){const payment=payments.find(p=>p.id===grant.payment_id);if(!payment||payment.user_id!==booking.user_id||payment.status!=='approved'||(grant.plan_id??null)!==payment.plan_id)fail('lineage');}
 return {debit,grant};
}
const sorted=<T extends BaseRow>(rows:T[])=>[...rows].sort((a,b)=>a.id.localeCompare(b.id));
const render=(text:string,vars:Record<string,string>)=>text.replace(/\{\{\s*([\w.]+)\s*\}\}/g,(token,key:string)=>vars[key]??token);
async function impact(data:DataProvider,who:StudioActor,sessionId:string,control:StudioControl):Promise<StudioImpact>{
 await actor(data,who,control);const session=await owned<ClassSessionRow>(data,'class_sessions',sessionId,who,control);sessionShape(session);future(session,control);
 const bookings=await scoped<BookingRow>(data,'bookings',{session_id:sessionId},who,control);bookings.forEach(bookingShape);
 const roster=bookings.filter(active),vouchers=await scoped<VoucherBookingRow>(data,'voucher_bookings',{sessionId},who,control),waitlist=await scoped(data,'waitlist',{session_id:sessionId},who,control);
 const voucherSeats=vouchers.filter(v=>v.status!=='cancelled').reduce((n,v)=>{if(!Array.isArray(v.participants))fail('scope');return n+v.participants.length;},0),issues:string[]=[];
 if(vouchers.some(v=>v.status!=='cancelled'))issues.push('voucher');if(roster.some(b=>!['booked','checked_in'].includes(b.status)))issues.push('attendance');
 if(new Set(roster.map(b=>b.user_id)).size!==roster.length||new Set(roster.map(b=>b.ledger_id)).size!==roster.length)issues.push('duplicate');
 if(session.booked_count!==roster.length+voucherSeats)issues.push('occupancy');
 const templates=await scoped<EmailRow>(data,'email_templates',{key:'class_cancelled'},who,control),template=templates.length===1?templates[0]:null;
 const teachers=await scoped<TeacherRow>(data,'teachers',{id:session.teacher_id},who,control),teacher=teachers.length===1?teachers[0]:null;
 const attendees:StudioAttendee[]=[],emails:StudioEmailPreview[]=[],guards:unknown[]=[];
 for(const booking of sorted(roster)){
  const user=await owned<UserRow>(data,'users',booking.user_id,who,control),profiles=await scoped<ProfileRow>(data,'profiles',{user_id:user.id},who,control);if(profiles.length>1)fail('scope');const profile=profiles[0]??null;
  const rows=await scoped<ClassLedgerRow>(data,'class_ledger',{user_id:user.id},who,control),payments=await scoped<PaymentRow>(data,'payments',{user_id:user.id},who,control),allBookings=await scoped<BookingRow>(data,'bookings',{user_id:user.id},who,control),prefs=await scoped<NotificationPrefRow>(data,'notification_prefs',{user_id:user.id},who,control);
  if(prefs.some(p=>typeof p.enabled!=='boolean')||new Set(prefs.map(p=>p.channel+'|'+p.category)).size!==prefs.length)fail('scope');allBookings.forEach(bookingShape);
  guards.push({booking,user:{id:user.id,email:user.email,locale:user.locale},profile:profile?{id:profile.id,full_name:profile.full_name}:null,ledger:sorted(rows),payments:sorted(payments),bookings:sorted(allBookings),prefs:sorted(prefs)});
  let resolved:{debit:ClassLedgerRow;grant:ClassLedgerRow}|null=null;try{resolved=lineage(rows,payments,booking);if(allBookings.some(b=>b.id!==booking.id&&active(b)&&b.ledger_id===booking.ledger_id))fail('lineage');const returnId=await studioReturnId(sessionId,booking.id);if(rows.some(r=>r.id===returnId))fail('lineage');}catch(error){if((error as Error).message==='studio_cancel_lineage')issues.push('lineage');else throw error;}
  if(resolved)attendees.push({booking,...resolved,user,profile,prefs});
  const locale=user.locale==='en'?'en':'es',warnings:string[]=[];if(typeof user.email!=='string'||!/^\S+@[^\s@]+\.[^\s@]+$/.test(user.email))warnings.push('contact');if(prefs.some(p=>p.channel==='email'&&p.category==='bookings'&&!p.enabled))warnings.push('preference');
  let subject='',body='',cta:StudioEmailPreview['cta'];if(!template||!template.active||!Number.isInteger(template.version)||template.version<1)warnings.push('template');
  if(template){try{const parsed=parseEmailBody(template),vars:Record<string,string>={class_name:session.title,class_datetime:formatDateTime(session.starts_at,locale),classes_returned:'1',date:dateKey(new Date(session.starts_at))};if(profile&&typeof profile.full_name==='string')vars.first_name=profile.full_name;if(teacher&&typeof teacher.display_name==='string')vars.teacher_name=teacher.display_name;
    subject=render(locale==='en'?template.subject.en||template.subject.es:template.subject.es,vars);body=render(locale==='en'?parsed.en||parsed.es:parsed.es,vars);if(parsed.cta)cta={label:render(locale==='en'?parsed.cta.label.en||parsed.cta.label.es:parsed.cta.label.es,vars),href:render(parsed.cta.href,vars)};if(/\{\{/.test(subject+body+(cta?.href??'')))warnings.push('variables');
   }catch{warnings.push('template');}}
  emails.push({userId:user.id,locale,subject,body,cta,warnings});
 }
 if(attendees.length!==roster.length&&!issues.includes('lineage'))issues.push('lineage');
 const expected=await studioDigest({session,bookings:sorted(bookings),vouchers:sorted(vouchers),waitlist:sorted(waitlist),guards,templates:sorted(templates),teachers:sorted(teachers)}),templateMeta=template?{id:template.id,version:template.version,digest:await studioDigest(template)}:null;await actor(data,who,control);future(session,control);
 return {session,attendees,activeCount:roster.length,voucherSeats,waitlistCount:waitlist.length,issues:[...new Set(issues)],expected,emails,template:templateMeta};
}
export async function readStudioOccurrence(data:DataProvider,identity:StudioActor,sessionId:string,supplied:StudioControl={}){const who={...identity},id=String(sessionId),control=snapshotControl(supplied);await actor(data,who,control);const session=await owned<ClassSessionRow>(data,'class_sessions',id,who,control);sessionShape(session);await actor(data,who,control);return session;}
export async function readStudioImpact(data:DataProvider,identity:StudioActor,sessionId:string,supplied:StudioControl={}):Promise<StudioImpact>{const who={...identity},id=String(sessionId),control=snapshotControl(supplied);return impact(data,who,id,control);}

async function acknowledge(data:DataProvider,result:StudioResult,who:StudioActor,sessionId:string,bookingIds:string[],control:StudioControl):Promise<StudioResult>{
 await actor(data,who,control);if(!result||result.sessionId!==sessionId||typeof result.sessionDigest!=='string'||!/^[a-f0-9]{64}$/.test(result.sessionDigest)||!Array.isArray(result.items)||result.email?.status!=='preview_only'||result.email.templateId!==null&&typeof result.email.templateId!=='string'||result.email.templateDigest!==null&&(typeof result.email.templateDigest!=='string'||!/^[a-f0-9]{64}$/.test(result.email.templateDigest))||!Number.isSafeInteger(result.email.count)||result.email.count!==result.items.length||!Number.isSafeInteger(result.email.warningCount)||result.email.warningCount<0||result.email.warningCount>result.items.length||new Set(result.items.map(r=>r.bookingId)).size!==result.items.length||new Set(result.items.map(r=>r.returnId)).size!==result.items.length||new Set(result.items.map(r=>r.userId)).size!==result.items.length||new Set(result.items.map(r=>r.debitId)).size!==result.items.length)fail('receipt');
 if(JSON.stringify(result.items.map(r=>r.bookingId).sort())!==JSON.stringify([...bookingIds].sort()))fail('receipt');
 const session=await owned<ClassSessionRow>(data,'class_sessions',sessionId,who,control);sessionShape(session);if(session.status!=='cancelled'||await studioDigest(session)!==result.sessionDigest)fail('stale');
 const bookings=await scoped<BookingRow>(data,'bookings',{session_id:sessionId},who,control);if(bookings.some(active))fail('stale');
 const vouchers=await scoped<VoucherBookingRow>(data,'voucher_bookings',{sessionId},who,control);if(vouchers.some(v=>v.status!=='cancelled'))fail('stale');
 for(const item of result.items){
  if([item.bookingId,item.userId,item.debitId,item.grantId,item.returnId].some(id=>typeof id!=='string'||!id)||[item.bookingDigest,item.debitDigest,item.grantDigest,item.returnDigest].some(d=>typeof d!=='string'||!/^[a-f0-9]{64}$/.test(d)))fail('receipt');
  const booking=await owned<BookingRow>(data,'bookings',item.bookingId,who,control);bookingShape(booking);if(booking.session_id!==sessionId||booking.user_id!==item.userId||booking.status!=='cancelled'||booking.ledger_id!==item.debitId||await studioDigest(booking)!==item.bookingDigest)fail('stale');
  await owned<UserRow>(data,'users',item.userId,who,control);
  const rows=await scoped<ClassLedgerRow>(data,'class_ledger',{user_id:item.userId},who,control),debit=rows.find(r=>r.id===item.debitId),grant=rows.find(r=>r.id===item.grantId),returned=rows.find(r=>r.id===item.returnId);rows.forEach(r=>ledgerShape(r,item.userId));
  if(!debit||!grant||!returned||debit.delta!==-1||debit.reason!=='booking'||grant.delta<1||returned.delta!==1||returned.reason!=='refund'||returned.purchase_ledger_id!==grant.id||await studioReturnId(sessionId,booking.id)!==returned.id||await studioDigest(debit)!==item.debitDigest||await studioDigest(grant)!==item.grantDigest||await studioDigest(returned)!==item.returnDigest)fail('stale');
  const payments=await scoped<PaymentRow>(data,'payments',{user_id:item.userId},who,control);if(grant.payment_id&&!payments.some(p=>p.id===grant.payment_id&&p.status==='approved'&&p.plan_id===(grant.plan_id??null)))fail('lineage');
 }
 await actor(data,who,control);return result;
}
/** New writes require a future occurrence; existing owned/digest-valid receipts can replay after start. */
export async function cancelStudioClass(data:DataProvider,command:StudioIntent,supplied:StudioControl={}):Promise<StudioResult>{
 const c=structuredClone(command),control=snapshotControl(supplied);check(data,c,control);
 if([c.sessionId,c.requestId,c.expected].some(x=>typeof x!=='string'||!x)||!Array.isArray(c.bookingIds)||c.bookingIds.some(id=>typeof id!=='string'||!id)||new Set(c.bookingIds).size!==c.bookingIds.length||c.reason!==null&&typeof c.reason!=='string')fail('validation');
 await actor(data,c,control);const fingerprint=await studioDigest(c),nonce=await studioDigest({tenant:tenant.id,actor:c.actorId,role:c.role,requestId:c.requestId}),receiptId='studio_cancel_v1_'+nonce;check(data,c,control);
 const result=await data.atomic!(async tx=>{
  await actor(tx,c,control);const prior=await tx.get<Receipt>('audit_log',receiptId);check(tx,c,control);
  if(prior){if(prior.id!==receiptId||prior.tenant_id!==tenant.id||prior.actor_id!==c.actorId||prior.action!=='session.cancel'||prior.entity!=='class_sessions'||prior.entity_id!==c.sessionId||prior.diff?.version!==1||prior.diff.source!=='fictional-studio-cancellation'||prior.diff.role!==c.role||prior.diff.fingerprint!==fingerprint)fail('receipt');return acknowledge(tx,prior.diff.result,c,c.sessionId,c.bookingIds,control);}
  const reviewed=await impact(tx,c,c.sessionId,control);if(reviewed.expected!==c.expected||JSON.stringify(reviewed.attendees.map(a=>a.booking.id).sort())!==JSON.stringify([...c.bookingIds].sort()))fail('stale');if(reviewed.issues.length)fail('cannot_verify');future(reviewed.session,control);
  const returnIds=await Promise.all(reviewed.attendees.map(a=>studioReturnId(c.sessionId,a.booking.id)));for(const id of returnIds){const existing=await tx.get('class_ledger',id);check(tx,c,control);if(existing)fail('cannot_verify');}
  future(reviewed.session,control);const at=new Date(control.now!()).toISOString();await tx.update('class_sessions',c.sessionId,{status:'cancelled',cancel_reason:c.reason?.trim()||null});
  const items:ResultItem[]=[];
  for(let n=0;n<reviewed.attendees.length;n++){
   const a=reviewed.attendees[n];check(tx,c,control);future(reviewed.session,control);
   const booking=await tx.update<BookingRow>('bookings',a.booking.id,{status:'cancelled',cancelled_at:at});check(tx,c,control);future(reviewed.session,control);
   const returned=await tx.insert<ClassLedgerRow>('class_ledger',{id:returnIds[n],tenant_id:tenant.id,user_id:a.booking.user_id,purchase_ledger_id:a.grant.id,plan_id:a.grant.plan_id??null,payment_id:a.grant.payment_id??null,delta:1,reason:'refund',expires_at:a.grant.expires_at,frozen_from:null,frozen_until:null});
   items.push({bookingId:booking.id,userId:booking.user_id,debitId:a.debit.id,grantId:a.grant.id,returnId:returned.id,bookingDigest:await studioDigest(booking),debitDigest:await studioDigest(a.debit),grantDigest:await studioDigest(a.grant),returnDigest:await studioDigest(returned)});
  }
  const session=await owned<ClassSessionRow>(tx,'class_sessions',c.sessionId,c,control);if(session.booked_count!==0)fail('cannot_verify');
  const result:StudioResult={sessionId:c.sessionId,sessionDigest:await studioDigest(session),items,email:{status:'preview_only',count:reviewed.activeCount,warningCount:reviewed.emails.filter(e=>e.warnings.length).length,templateId:reviewed.template?.id??null,templateDigest:reviewed.template?.digest??null}};
  check(tx,c,control);future(reviewed.session,control);await tx.insert('audit_log',{id:receiptId,tenant_id:tenant.id,actor_id:c.actorId,action:'session.cancel',entity:'class_sessions',entity_id:c.sessionId,ip:null,diff:{version:1,source:'fictional-studio-cancellation',role:c.role,fingerprint,result}});await actor(tx,c,control);future(reviewed.session,control);const verified=await acknowledge(tx,result,c,c.sessionId,c.bookingIds,control);future(reviewed.session,control);return verified;
 },{failAfterWrites:control.failAfterWrites});
 return acknowledge(data,result,c,c.sessionId,c.bookingIds,control);
}

export type OwnStudioReturn={status:'unverified'}|{status:'verified';units:1;balance:number;expiresAt:string|null;frozen:boolean};
/** Uses only existing own rows. Customer readback never reads staff audit receipts or other attendees. */
export async function readOwnStudioReturn(data:DataProvider,identity:StudioActor,bookingId:string,supplied:StudioControl={}):Promise<OwnStudioReturn>{
 const who={...identity},id=String(bookingId),control=snapshotControl(supplied);if(!['customer','teacher','super_admin'].includes(who.role))fail('denied');await actor(data,who,control,false);
 const bookings=await scoped<BookingRow>(data,'bookings',{id,user_id:who.actorId},who,control,false);if(bookings.length!==1)fail('scope');const booking=bookings[0];bookingShape(booking);
 const session=await owned<ClassSessionRow>(data,'class_sessions',booking.session_id,who,control,false);sessionShape(session);
 const rows=await scoped<ClassLedgerRow>(data,'class_ledger',{user_id:who.actorId},who,control,false);rows.forEach(r=>ledgerShape(r,who.actorId));const payments=await scoped<PaymentRow>(data,'payments',{user_id:who.actorId},who,control,false),returnId=await studioReturnId(session.id,booking.id),returned=rows.find(r=>r.id===returnId),debit=rows.find(r=>r.id===booking.ledger_id),grant=rows.find(r=>r.id===returned?.purchase_ledger_id);
 await actor(data,who,control,false);if(session.status!=='cancelled'||booking.status!=='cancelled'||!returned||!debit||!grant||returned.delta!==1||returned.reason!=='refund'||debit.delta!==-1||debit.reason!=='booking'||grant.delta<1||returned.purchase_ledger_id!==grant.id||returned.expires_at!==grant.expires_at||returned.frozen_from!=null||returned.frozen_until!=null||(debit.plan_id!=null&&debit.plan_id!==grant.plan_id)||(debit.payment_id!=null&&debit.payment_id!==grant.payment_id)||(returned.plan_id??null)!==(grant.plan_id??null)||(returned.payment_id??null)!==(grant.payment_id??null)||debit.purchase_ledger_id&&debit.purchase_ledger_id!==grant.id)return {status:'unverified'};
 const lots=packageLots(approvedPackageRows(rows,payments));if(!lots.some(l=>l.purchase.id===grant.id&&l.debits.some(d=>d.ledgerId===debit.id&&d.quantity===1)))return {status:'unverified'};
 const now=control.now!();if(!Number.isFinite(now))fail('validation');const current=packageState(approvedPackageRows(rows,payments),dateKey(new Date(now)));await actor(data,who,control,false);return {status:'verified',units:1,balance:current.balance,expiresAt:grant.expires_at,frozen:!!grant.frozen_from&&!!grant.frozen_until&&grant.frozen_from<=dateKey(new Date(now))&&dateKey(new Date(now))<=grant.frozen_until};
}
