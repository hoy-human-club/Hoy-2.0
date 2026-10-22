import type { DataProvider } from '../../data/types';
import type { BaseRow, EventRow, EventRsvpRow, MembershipRow, TeacherRow, UserRow } from '../../data/schema';
import type { Role } from '../../auth/roles';
import { tenant } from '../../tenant/tenant';

export interface EventPreview { id: string; startsAt: string; price: number; memberPrice: number }
export interface EventEntry { event: EventRow; taken: number; mine: EventRsvpRow | null }
export interface EventSnapshot { events: EventEntry[]; member: boolean; teachers: TeacherRow[] }
export interface EventCommand {
 key: string; userId: string; role: Role; action: 'join' | 'cancel'; event: EventPreview;
 rsvpId?: string; isCurrent?: () => boolean;
}
export interface EventReceipt { eventId: string; rsvpId: string; action: 'join' | 'cancel'; currentStatus: EventRsvpRow['status']; replayed: boolean }
const scoped = <T extends BaseRow>(rows: T[]) => rows.filter(r => r.tenant_id === tenant.id);
export const eventPreview = (e: EventRow): EventPreview => ({ id:e.id, startsAt:e.starts_at, price:e.price_cop, memberPrice:e.member_price_cop });
export const eventDue = (e: EventRow, member: boolean) => member ? e.member_price_cop : e.price_cop;
function current(input: EventCommand) { if(input.isCurrent && !input.isCurrent())throw Error('event_cancelled'); }
function adapter(data: DataProvider) { if(data.name!=='mock'||!data.atomic)throw Error('event_disconnected'); }
async function account(data: DataProvider,userId:string) {
 const rows=scoped(await data.list<UserRow>('users',{where:{tenant_id:tenant.id,id:userId}})).filter(r=>r.id===userId);
 if(rows.length!==1||rows[0].status!=='active')throw Error('event_account');
}
async function memberships(data:DataProvider,userId:string) {
 return scoped(await data.list<MembershipRow>('memberships',{where:{tenant_id:tenant.id,user_id:userId}})).filter(r=>r.user_id===userId);
}
function capacity(rows:EventRsvpRow[]) {
 let count=0;
 for(const r of rows.filter(r=>r.status==='going'||r.status==='attended')){
  if(!Number.isSafeInteger(r.guests)||r.guests<0)throw Error('event_unresolved');count+=1+r.guests;
 }
 return count;
}
/** Contained C23 read model: query scope and defensive result filters both apply. */
export async function readEvents(data:DataProvider,userId:string):Promise<EventSnapshot>{
 adapter(data);await account(data,userId);
 const events=scoped(await data.list<EventRow>('events',{where:{tenant_id:tenant.id,status:'published'},orderBy:{column:'starts_at'}})).filter(e=>e.status==='published');
 const ids=events.map(e=>e.id);
 const [raw,memberRows,teacherRows]=await Promise.all([
  ids.length?data.list<EventRsvpRow>('event_rsvps',{where:{tenant_id:tenant.id,event_id:ids}}):Promise.resolve([]),
  memberships(data,userId),
  ids.length?data.list<TeacherRow>('teachers',{where:{tenant_id:tenant.id,id:events.map(e=>e.host_teacher_id).filter(Boolean)}}):Promise.resolve([]),
 ]);
 const rows=scoped(raw).filter(r=>ids.includes(r.event_id));
 return {member:memberRows.some(m=>m.status==='active'),teachers:scoped(teacherRows).filter(t=>events.some(e=>e.host_teacher_id===t.id)),events:events.map(event=>{
  if(!Number.isFinite(Date.parse(event.starts_at))||!Number.isFinite(Date.parse(event.ends_at))||Date.parse(event.ends_at)<=Date.parse(event.starts_at))throw Error('event_unresolved');
  const own=rows.filter(r=>r.event_id===event.id&&r.user_id===userId&&r.status!=='cancelled');
  if(own.length>1)throw Error('event_unresolved');
  return {event,taken:capacity(rows.filter(r=>r.event_id===event.id)),mine:own[0]??null};
 })};
}
async function digest(value:unknown){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');}
/** Fictional browser-local only. Paid events still use the existing separate payment seam. */
export async function eventRsvp(data:DataProvider,command:EventCommand):Promise<EventReceipt>{
 // Snapshot every command primitive before hashing/yielding. Keep the original
 // lifecycle callback live; replacing caller fields must never redirect this intent.
 const event=command.event;
 const input:EventCommand={key:command.key,userId:command.userId,role:command.role,action:command.action,
  event:{id:event?.id,startsAt:event?.startsAt,price:event?.price,memberPrice:event?.memberPrice},
  rsvpId:command.rsvpId,isCurrent:command.isCurrent};
 adapter(data);current(input);
 if(input.action!=='join'&&input.action!=='cancel')throw Error('event_action');
 if(!['customer','teacher','super_admin'].includes(input.role))throw Error('event_role');
 if(typeof input.key!=='string'||!input.key||input.key.length>200||typeof input.userId!=='string'||!input.userId||typeof input.event.id!=='string'||!input.event.id)throw Error('event_scope');
 const receiptId='mock_event_'+await digest([tenant.id,input.userId,input.key]);
 const intent=await digest([input.action,input.event.id,input.event.startsAt,input.event.price,input.event.memberPrice,input.rsvpId??null]);current(input);
 const result=await data.atomic!(async tx=>{
  current(input);await account(tx,input.userId);current(input);
  const events=scoped(await tx.list<EventRow>('events',{where:{tenant_id:tenant.id,id:input.event.id}})).filter(e=>e.id===input.event.id);
  if(events.length!==1)throw Error('event_unavailable');
  const ev=events[0];
  const rows=scoped(await tx.list<EventRsvpRow>('event_rsvps',{where:{tenant_id:tenant.id,event_id:ev.id}})).filter(r=>r.event_id===ev.id);
  const prior=scoped(await tx.list<BaseRow&{diff:Record<string,unknown>;action:string;actor_id:string}>('audit_log',{where:{tenant_id:tenant.id,id:receiptId}})).find(r=>r.id===receiptId);
  current(input);
  if(prior){
   if(prior.actor_id!==input.userId||prior.action!=='event.rsvp.mock'||prior.diff.intent!==intent)throw Error('event_intent_conflict');
   const target=rows.find(r=>r.id===prior.diff.rsvp_id&&r.user_id===input.userId);
   if(!target)throw Error('event_receipt_target');
   return {eventId:ev.id,rsvpId:target.id,action:input.action,currentStatus:target.status,replayed:true};
  }
  if(ev.status!=='published')throw Error('event_unavailable');
  let result:EventRsvpRow;
  if(input.action==='join'){
   if(ev.starts_at!==input.event.startsAt||ev.price_cop!==input.event.price||ev.member_price_cop!==input.event.memberPrice)throw Error('event_changed');
   const member=(await memberships(tx,input.userId)).some(m=>m.status==='active');current(input);
   if(!Number.isSafeInteger(ev.price_cop)||ev.price_cop<0||!Number.isSafeInteger(ev.member_price_cop)||ev.member_price_cop<0)throw Error('event_unresolved');
   if(eventDue(ev,member)!==0)throw Error('event_payment_required');
   if(!Number.isFinite(Date.parse(ev.starts_at))||Date.parse(ev.starts_at)<=Date.now())throw Error('event_started');
   if(rows.some(r=>r.user_id===input.userId&&r.status!=='cancelled'))throw Error('event_duplicate');
   if(!Number.isSafeInteger(ev.capacity)||ev.capacity<1)throw Error('event_unresolved');
   if(capacity(rows)>=ev.capacity)throw Error('event_full');
   current(input);result=await tx.insert<EventRsvpRow>('event_rsvps',{event_id:ev.id,user_id:input.userId,status:'going',payment_id:null,guests:0});
  }else{
   const own=rows.filter(r=>r.user_id===input.userId&&r.status!=='cancelled');
   const target=rows.find(r=>r.id===input.rsvpId&&r.user_id===input.userId);
   if(!target||own.length!==1||target.status!=='going')throw Error('event_cancel_unresolved');
   if(target.payment_id!==null)throw Error('event_paid_cancel');
   current(input);result=await tx.update<EventRsvpRow>('event_rsvps',target.id,{status:'cancelled'});
  }
  current(input);
  await tx.insert('audit_log',{id:receiptId,actor_id:input.userId,action:'event.rsvp.mock',entity:'event_rsvps',entity_id:result.id,ip:null,diff:{role:input.role,source:'fictional-event-rsvp',intent,event_id:ev.id,rsvp_id:result.id,decision:input.action}});
  current(input);return {eventId:ev.id,rsvpId:result.id,action:input.action,currentStatus:result.status,replayed:false};
 });
 // The local transaction may already have committed if ownership changes while
 // its acknowledgment is delayed. Suppress delivery, never rewrite that history.
 if(input.isCurrent&&!input.isCurrent())throw Error('event_committed_context_changed');
 return result;
}
