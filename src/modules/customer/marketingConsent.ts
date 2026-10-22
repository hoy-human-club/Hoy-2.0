/** Fictional browser-only coupled marketing choice. No dispatch or legal-consent processing. */
import type { DataProvider } from '../../data/types';
import type { NotificationPrefRow, ProfileRow, UserRow } from '../../data/schema';
import type { AccountActor, AccountControl } from './accountData';
import { tenant } from '../../tenant/tenant';
export type MarketingChannel='whatsapp'|'email';
const fail=(code:string):never=>{throw Error(`marketing_${code}`);};
function guard(data:DataProvider,actor:AccountActor,control:AccountControl={}){
  if(data.name!=='mock'||!data.atomic)fail('disconnected');
  if(actor.tenantId!==tenant.id||!actor.userId||!['customer','teacher','super_admin'].includes(actor.role))fail('scope');
  const current=control.currentActor?.()??actor;
  if(current.userId!==actor.userId||current.tenantId!==actor.tenantId||current.role!==actor.role)fail('context');
  if(control.signal?.aborted)fail('cancelled');
}
export async function readMarketingState(data:DataProvider,actor:AccountActor,control:AccountControl={}){
  guard(data,actor,control);
  const users=await data.list<UserRow>('users',{where:{tenant_id:actor.tenantId,id:actor.userId}});guard(data,actor,control);
  const profiles=await data.list<ProfileRow>('profiles',{where:{tenant_id:actor.tenantId,user_id:actor.userId}});guard(data,actor,control);
  if(users.some(r=>r.tenant_id!==actor.tenantId||r.id!==actor.userId)||profiles.some(r=>r.tenant_id!==actor.tenantId||r.user_id!==actor.userId))fail('scope');
  if(users.length!==1||profiles.length!==1)fail('missing');
  if(typeof users[0].email!=='string'||typeof users[0].status!=='string'||typeof profiles[0].id!=='string'||typeof profiles[0].full_name!=='string'||typeof profiles[0].marketing_optin!=='boolean')fail('invalid');
  const rows=await data.list<NotificationPrefRow>('notification_prefs',{where:{tenant_id:actor.tenantId,user_id:actor.userId,category:'marketing',channel:['whatsapp','email']}});guard(data,actor,control);
  const seen=new Set<string>();
  for(const r of rows){if(r.tenant_id!==actor.tenantId||r.user_id!==actor.userId||r.category!=='marketing'||!['whatsapp','email'].includes(r.channel)||typeof r.id!=='string'||typeof r.enabled!=='boolean')fail('invalid');if(seen.has(r.channel))fail('ambiguous');seen.add(r.channel);}
  const enabled=(channel:MarketingChannel)=>rows.find(r=>r.channel===channel)?.enabled??true;
  return {profile:profiles[0],rows,enabled};
}
async function digest(value:unknown){const result=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return [...new Uint8Array(result)].map(b=>b.toString(16).padStart(2,'0')).join('');}
const revision=(state:Awaited<ReturnType<typeof readMarketingState>>,channel:MarketingChannel)=>{const r=state.rows.find(r=>r.channel===channel);return JSON.stringify([r?.id??null,r?.enabled??true]);};
interface Receipt {version:1;actor:AccountActor;fingerprint:string;channel:MarketingChannel;enabled:boolean;rowId:string;profileId:string}
export interface MarketingCommand {execute(control?:AccountControl):Promise<{replayed:boolean}>;discard():void}
export async function prepareMarketingCommand(data:DataProvider,actor:AccountActor,channel:MarketingChannel,enabled:boolean,nonce:string=crypto.randomUUID(),control:AccountControl={}):Promise<MarketingCommand>{
  guard(data,actor,control);
  if(!['whatsapp','email'].includes(channel)||typeof enabled!=='boolean'||typeof nonce!=='string'||!/^[-a-zA-Z0-9_]{1,160}$/.test(nonce))fail('invalid');
  const identity={userId:actor.userId,tenantId:actor.tenantId,role:actor.role},state=await readMarketingState(data,identity,control),expected=revision(state,channel);
  const fingerprint=await digest({actor:identity,channel,enabled,expected}),key=await digest({actor:identity,nonce});guard(data,identity,control);
  let discarded=false,acknowledged=false;
  const check=(c:AccountControl)=>{guard(data,identity,c);if(discarded)fail('cancelled');};
  return {discard(){discarded=true;},async execute(c={}){
    check(c);await readMarketingState(data,identity,c);check(c);let executed=false;
    const result=await data.atomic!(async tx=>{
      check(c);executed=true;const fresh=await readMarketingState(tx,identity,c);check(c);
      if(revision(fresh,channel)!==expected)fail('stale');
      const current=fresh.rows.find(r=>r.channel===channel),other=channel==='email'?'whatsapp':'email',any=enabled||fresh.enabled(other);
      const row=current?await tx.update<NotificationPrefRow>('notification_prefs',current.id,{enabled}):await tx.insert<NotificationPrefRow>('notification_prefs',{tenant_id:identity.tenantId,user_id:identity.userId,channel,category:'marketing',enabled});check(c);
      await tx.update('profiles',fresh.profile.id,{marketing_optin:any});check(c);
      await tx.insert('audit_log',{actor_id:identity.userId,action:'consent.marketing',entity:'notification_prefs',entity_id:null,ip:null,diff:{role:identity.role,source:'app',channel,after:enabled}});check(c);
      return {version:1,actor:identity,fingerprint,channel,enabled,rowId:row.id,profileId:fresh.profile.id} satisfies Receipt;
    },{idempotencyKey:`account_marketing_${key}`,failAfterWrites:c.failAfterWrites});check(c);
    if(!result||result.version!==1||result.fingerprint!==fingerprint||JSON.stringify(result.actor)!==JSON.stringify(identity)||result.channel!==channel||result.enabled!==enabled)fail('replay');
    // Atomic replay bypasses its callback. Postcommit failures withhold acknowledgement, not the committed writes.
    const after=await readMarketingState(data,identity,c);check(c);const row=after.rows.find(r=>r.channel===channel);
    if(!row||row.id!==result.rowId||row.enabled!==enabled||after.profile.id!==result.profileId||after.profile.marketing_optin!==(after.enabled('whatsapp')||after.enabled('email')))fail('stale');
    const replayed=!executed||acknowledged;acknowledged=true;return {replayed};
  }};
}
