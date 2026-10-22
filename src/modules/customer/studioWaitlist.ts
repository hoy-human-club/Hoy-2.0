/** Cancelled-class fencing only; preserves the existing waitlist order and claim window. */
import type {DataProvider} from '../../data/types';
import type {ClassSessionRow} from '../../data/schema';
import type {WaitlistRow} from './hooks';
import {tenant} from '../../tenant/tenant';
import {MS} from '../../i18n/format';
import {policy} from './policy';
export async function guardStudioWaitlist(data:DataProvider,sessionId:string){
 const rows=await data.list<ClassSessionRow>('class_sessions',{where:{id:sessionId,tenant_id:tenant.id}});
 if(rows.length!==1||rows[0].id!==sessionId||rows[0].tenant_id!==tenant.id||rows[0].status==='cancelled')throw Error('studio_cancel_waitlist_unavailable');
}
export async function promoteStudioWaitlist(data:DataProvider,sessionId:string){
 const run=async(tx:DataProvider)=>{
  await guardStudioWaitlist(tx,sessionId);
  const waiting=await tx.list<WaitlistRow>('waitlist',{where:{tenant_id:tenant.id,session_id:sessionId,status:'waiting'},orderBy:{column:'position'}});
  if(waiting.some(w=>w.tenant_id!==tenant.id||w.session_id!==sessionId||w.status!=='waiting'))throw Error('studio_cancel_waitlist_unavailable');
  const first=waiting[0];if(!first)return;
  await guardStudioWaitlist(tx,sessionId);const now=Date.now();
  await tx.update('waitlist',first.id,{status:'offered',offered_at:new Date(now).toISOString(),claim_until:new Date(now+policy.claimWindowMinutes*MS.min).toISOString()});
 };
 return data.atomic?data.atomic(run):run(data);
}
