/** Fictional browser-only account preview/request commands. No deletion, purge or server rights enforcement. */
import type { DataProvider } from '../../data/types';
import type { BaseRow, DeletionRequestRow, ProfileRow, UserRow } from '../../data/schema';
import type { Role } from '../../auth/roles';
import { tenant } from '../../tenant/tenant';

export interface AccountActor { userId:string; tenantId:string; role:Role }
export interface AccountControl { signal?:AbortSignal; currentActor?:()=>AccountActor; failAfterWrites?:number }
const failure=(code:string):never=>{throw Error(`account_${code}`);};
export function checkAccount(data:DataProvider,actor:AccountActor,control:AccountControl={}){
  if(data.name!=='mock'||!data.atomic)failure('disconnected');
  if(actor.tenantId!==tenant.id||!actor.userId||!['customer','teacher','super_admin'].includes(actor.role))failure('forbidden');
  const now=control.currentActor?.()??actor;
  if(now.userId!==actor.userId||now.tenantId!==actor.tenantId||now.role!==actor.role)failure('context');
  if(control.signal?.aborted)failure('cancelled');
}
async function owned(data:DataProvider,actor:AccountActor,table:string,column:string,control:AccountControl={}){
  checkAccount(data,actor,control);
  const rows=await data.list(table,{where:{tenant_id:actor.tenantId,[column]:actor.userId}});
  checkAccount(data,actor,control);
  return rows.filter(r=>r.tenant_id===actor.tenantId&&r[column]===actor.userId);
}
export async function readAccountState(data:DataProvider,actor:AccountActor,control:AccountControl={}){
  const users=await owned(data,actor,'users','id',control),profiles=await owned(data,actor,'profiles','user_id',control);
  if(users.length!==1||profiles.length!==1)failure('missing');
  if(typeof users[0].email!=='string'||typeof users[0].status!=='string'||users[0].phone!==null&&typeof users[0].phone!=='string'||typeof profiles[0].id!=='string'||typeof profiles[0].full_name!=='string')failure('invalid');
  const requests=await owned(data,actor,'deletion_requests','user_id',control);
  return {account:users[0] as UserRow,profile:profiles[0] as ProfileRow,requests:requests as DeletionRequestRow[]};
}
// Conservative preview: scalar fields only. Intentionally excludes unrestricted nested data,
// URLs, provider references/tokens, invite codes/recipients, internal notes and message bodies.
export const ACCOUNT_EXPORT_FIELDS:Readonly<Record<string,{owner:string;fields:readonly string[]}>>={
  users:{owner:'id',fields:['email','phone','status','locale']},
  profiles:{owner:'user_id',fields:['user_id','full_name','initials','birthday','marketing_optin','whatsapp_verified']},
  user_roles:{owner:'user_id',fields:['user_id','role']},
  memberships:{owner:'user_id',fields:['user_id','plan_id','status','starts_at','renews_at','ends_at','paused_until']},
  class_ledger:{owner:'user_id',fields:['user_id','plan_id','payment_id','purchase_ledger_id','delta','reason','expires_at','frozen_from','frozen_until']},
  bookings:{owner:'user_id',fields:['user_id','session_id','status','paid_with','ledger_id','checked_in_at','cancelled_at','rated']},
  waitlist:{owner:'user_id',fields:['user_id','session_id','position','status','offered_at','claim_until']},
  payments:{owner:'user_id',fields:['user_id','plan_id','amount','amount_paid','currency','method','provider','status','paid_at']},
  payment_methods:{owner:'user_id',fields:['user_id','provider','kind','brand','last4','is_default','expires']},
  reviews:{owner:'user_id',fields:['user_id','class_session_id','teacher_id','rating','visibility']},
  invites:{owner:'inviter_user_id',fields:['inviter_user_id','channel','session_id','status','reward_ledger_id']},
  event_rsvps:{owner:'user_id',fields:['user_id','event_id','status','payment_id','guests']},
  notifications:{owner:'user_id',fields:['user_id','kind','read_at','sent_via']},
  notification_prefs:{owner:'user_id',fields:['user_id','channel','category','enabled']},
  consents:{owner:'user_id',fields:['user_id','legal_document_id','accepted_at']},
  legal_acceptances:{owner:'user_id',fields:['user_id','document_id','kind','version','accepted_at','channel']},
  message_log:{owner:'user_id',fields:['user_id','channel','direction','source','status','sent_at','read_at']},
  deletion_requests:{owner:'user_id',fields:['user_id','channel','status','requested_at','resolved_at']},
};
type Scalar=string|number|boolean|null;
function project(row:BaseRow,fields:readonly string[]):Record<string,Scalar>{
  const out:Record<string,Scalar>={};
  for(const field of ['id','tenant_id','created_at','updated_at',...fields]){
    const value=row[field];
    if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))out[field]=value;
  }
  return out;
}
export async function accountDigest(value:unknown):Promise<string>{
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
export interface AccountPreview { kind:'fictional-account-preview'; completeLegalExport:false; preparedAt:string; subject:string; tenant:string; tables:Record<string,Record<string,Scalar>[]> }
const preparedPreviews=new WeakSet<AccountPreview>();
export async function prepareAccountPreview(data:DataProvider,actor:AccountActor,control:AccountControl={}):Promise<AccountPreview>{
  checkAccount(data,actor,control);
  const tables:AccountPreview['tables']={};
  for(const [table,config] of Object.entries(ACCOUNT_EXPORT_FIELDS)){
    let rows=await owned(data,actor,table,config.owner,control);
    if((table==='users'||table==='profiles')&&rows.length!==1)failure('missing');
    if(table==='message_log')rows=rows.filter(r=>r.direction!=='internal'&&r.channel!=='note');
    tables[table]=rows.map(r=>project(r,config.fields)).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  }
  const ids=tables.payments.map(r=>r.id).filter((id):id is string=>typeof id==='string');
  checkAccount(data,actor,control);
  const invoices=ids.length?await data.list('invoices',{where:{tenant_id:actor.tenantId,payment_id:ids}}):[];
  checkAccount(data,actor,control);
  tables.invoices=invoices.filter(r=>r.tenant_id===actor.tenantId&&typeof r.payment_id==='string'&&ids.includes(r.payment_id)).map(r=>project(r,['payment_id','number','subtotal','tax','total','issued_at'])).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  const preview:AccountPreview={kind:'fictional-account-preview',completeLegalExport:false,preparedAt:new Date().toISOString(),subject:actor.userId,tenant:actor.tenantId,tables};
  for(const rows of Object.values(tables)){rows.forEach(Object.freeze);Object.freeze(rows);}Object.freeze(tables);Object.freeze(preview);
  preparedPreviews.add(preview);return preview;
}
export type AccountIntent={kind:'request';reason:string}|{kind:'cancel';requestId:string}|{kind:'export';preview:AccountPreview};
export interface AccountOutcome {actor:AccountActor;fingerprint:string;nonce:string;kind:AccountIntent['kind'];rowId:string|null;status:string;counts?:Record<string,number>;digest?:string;ids?:Record<string,string[]>}
export interface AccountCommand {execute(control?:AccountControl):Promise<AccountOutcome & {replayed:boolean}>;takePreview(control?:AccountControl):Promise<AccountPreview|null>;discard():void}
export async function prepareAccountCommand(data:DataProvider,actor:AccountActor,input:AccountIntent,nonce=crypto.randomUUID()):Promise<AccountCommand>{
  checkAccount(data,actor);
  if(!input||!['request','cancel','export'].includes(input.kind)||input.kind==='request'&&typeof input.reason!=='string'||input.kind==='cancel'&&(!input.requestId||typeof input.requestId!=='string'))failure('invalid');
  const identity={...actor};
  if(!nonce||nonce.length>160||!/^[-a-zA-Z0-9_]+$/.test(nonce))failure('invalid');
  const intent=input.kind==='request'?{kind:'request' as const,reason:input.reason.trim()}:input.kind==='cancel'?{kind:'cancel' as const,requestId:input.requestId}:{kind:'export' as const};
  if(input.kind==='export'&&!preparedPreviews.has(input.preview))failure('invalid');
  let preview=input.kind==='export'?structuredClone(input.preview):null;
  if(preview&&(preview.subject!==actor.userId||preview.tenant!==actor.tenantId||preview.kind!=='fictional-account-preview'||preview.completeLegalExport!==false))failure('invalid');
  const digest=preview?await accountDigest(preview):null;
  const counts=preview?Object.fromEntries(Object.entries(preview.tables).map(([table,rows])=>[table,rows.length])):null;
  const ids=preview?Object.fromEntries(Object.entries(preview.tables).map(([table,rows])=>[table,rows.map(r=>String(r.id))])):null;
  const fingerprint=await accountDigest({actor:identity,intent:intent.kind==='export'?{kind:'export',digest}:intent});
  const scopedNonce=await accountDigest({actor:identity,nonce});
  let discarded=false,acknowledged=false;
  const check=(control:AccountControl)=>{checkAccount(data,identity,control);if(discarded)failure('cancelled');};
  return {
    async execute(control={}){
      check(control);
      const before=await readAccountState(data,identity,control);check(control);
      if(intent.kind==='cancel'&&!before.requests.some(row=>row.id===intent.requestId))failure('missing');
      let executed=false;
      const result=await data.atomic!(async stage=>{
        check(control);checkAccount(stage,identity,control);executed=true;
        const state=await readAccountState(stage,identity,control);
        let rowId:string|null=null,status='prepared';
        const stamp=new Date().toISOString();
        if(intent.kind==='request'){
          if(state.requests.some(r=>r.status==='requested'||r.status==='processing'))failure('open');
          const row=await stage.insert<DeletionRequestRow>('deletion_requests',{user_id:identity.userId,email:state.account.email,phone:state.account.phone,channel:'app',status:'requested',reason:intent.reason||null,requested_at:stamp,resolved_at:null,resolved_by:null,checklist:null,note:null});
          rowId=row.id;status='requested';check(control);
          await stage.insert('audit_log',{actor_id:identity.userId,action:'account.deletion_request',entity:'deletion_requests',entity_id:rowId,ip:null,diff:{role:identity.role,source:'app',after:status,fingerprint}});
        }else if(intent.kind==='cancel'){
          const row=state.requests.find(r=>r.id===intent.requestId)??failure('missing');
          if(row.status!=='requested')failure('status');
          await stage.update('deletion_requests',row.id,{status:'cancelled',resolved_at:stamp,resolved_by:identity.userId});
          rowId=row.id;status='cancelled';check(control);
          await stage.insert('audit_log',{actor_id:identity.userId,action:'account.deletion_cancel',entity:'deletion_requests',entity_id:rowId,ip:null,diff:{role:identity.role,source:'app',before:'requested',after:status,fingerprint}});
        }else{
          await stage.insert('audit_log',{actor_id:identity.userId,action:'account.export.prepared',entity:'users',entity_id:identity.userId,ip:null,diff:{role:identity.role,source:'app',counts,ids,digest,fingerprint}});
        }
        check(control);
        return {actor:identity,fingerprint,nonce,kind:intent.kind,rowId,status,...(intent.kind==='export'?{counts:counts!,ids:ids!,digest:digest!}:{})} satisfies AccountOutcome;
      },{idempotencyKey:`account_${scopedNonce}`,failAfterWrites:control.failAfterWrites});
      check(control);
      if(result.fingerprint!==fingerprint||JSON.stringify(result.actor)!==JSON.stringify(identity)||result.kind!==intent.kind)failure('replay');
      // Generic atomic receipts skip the callback. Revalidate current ownership even on replay.
      // A failure here can follow a committed write; it suppresses acknowledgement, not that commit.
      const after=await readAccountState(data,identity,control);check(control);
      if(intent.kind!=='export'&&(!result.rowId||!after.requests.some(row=>row.id===result.rowId)))failure('missing');
      if(intent.kind==='cancel'&&result.rowId!==intent.requestId)failure('replay');
      const replayed=!executed||acknowledged;acknowledged=true;
      return {...result,replayed};
    },
    async takePreview(control={}){check(control);
      await readAccountState(data,identity,control);check(control);if(!acknowledged)return null;
      const once=preview;preview=null;return once;},
    discard(){discarded=true;preview=null;},
  };
}
/** Offering a browser download cannot establish that the user saved a file. */
export function offerAccountPreview(name:string,value:AccountPreview){
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  try{const a=document.createElement('a');a.href=url;a.download=name;a.click();}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
