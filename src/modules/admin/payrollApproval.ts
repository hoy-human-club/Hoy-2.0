/** Approval-only fictional transition. No payout, settlement or draft recalculation. */
import type {DataProvider} from '../../data/types';
import type {PayrollRunRow,PayrollLineRow,UserRow} from '../../data/schema';
import type {Role} from '../../auth/roles';
import {roleCan} from '../../auth/permissions';
import {tenant} from '../../tenant/tenant';
import {runTotal} from '../../data/payrollCalc';
export interface ApprovalActor {userId:string;role:Role}
export interface ApprovalPlan {runId:string;basis:string;total:number;lineCount:number;teacherCount:number;periodStart:string;periodEnd:string}
export interface ApprovalInput {runId:string;basis:string;requestId:string}
export interface ApprovalResult {runId:string;approvedAt:string;total:number}
const digest=async(value:unknown)=>{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');};
function guard(data:DataProvider,actor:ApprovalActor){if(data.name!=='mock'||!data.atomic)throw Error('approval_disconnected');if(!roleCan(actor.role,'payroll.write'))throw Error('approval_denied');if(typeof actor.userId!=='string'||!actor.userId)throw Error('approval_scope');}
async function ownedActor(data:DataProvider,actor:ApprovalActor){
 guard(data,actor);
 const people=await data.list<UserRow>('users',{where:{tenant_id:tenant.id,id:actor.userId}});
 if(people.length!==1||people[0].id!==actor.userId||people[0].tenant_id!==tenant.id||people[0].status!=='active')throw Error('approval_scope');
}
async function read(data:DataProvider,actor:ApprovalActor,runId:string){
 await ownedActor(data,actor);
 const [runs,rawLines]=await Promise.all([data.list<PayrollRunRow>('payroll_runs',{where:{tenant_id:tenant.id,id:runId}}),data.list<PayrollLineRow>('payroll_lines',{where:{tenant_id:tenant.id,run_id:runId}})]);
 // A scoped required read must not silently omit unexpected rows from its basis.
 if(runs.length!==1||runs[0].id!==runId||runs[0].tenant_id!==tenant.id||rawLines.some(l=>l.tenant_id!==tenant.id||l.run_id!==runId))throw Error('approval_scope');
 const lines=[...rawLines].sort((a,b)=>a.id.localeCompare(b.id));
 if(new Set(lines.map(l=>l.id)).size!==lines.length)throw Error('approval_ambiguous');
 await ownedActor(data,actor);
 return {run:runs[0],lines};
}
function unstamped(value:Awaited<ReturnType<typeof read>>){const{run,lines}=value;if(run.paid_at!=null||run.provider_ref!=null||lines.some(l=>l.paid_at!=null||l.paid_method!=null))throw Error('approval_locked');}
function draft(value:Awaited<ReturnType<typeof read>>){const{run,lines}=value;unstamped(value);if(run.status!=='draft'||run.approved_at!=null||run.approved_by!=null)throw Error('approval_locked');if(!Number.isFinite(run.total)||lines.some(l=>!Number.isFinite(l.amount)||!Number.isFinite(l.rate))||runTotal(lines)!==run.total)throw Error('approval_ambiguous');}
/** Existing arithmetic is preserved: empty, zero and signed amounts gain no new policy. */
export async function preparePayrollApproval(data:DataProvider,provided:ApprovalActor,runId:string):Promise<ApprovalPlan>{
 const actor={userId:provided.userId,role:provided.role};if(typeof runId!=='string'||!runId)throw Error('approval_scope');
 const value=await read(data,actor,runId);draft(value);const basis=await digest(value);await ownedActor(data,actor);
 return {runId,basis,total:value.run.total,lineCount:value.lines.length,teacherCount:new Set(value.lines.map(l=>l.teacher_id)).size,periodStart:value.run.period_start,periodEnd:value.run.period_end};
}
export async function approvePayroll(data:DataProvider,provided:ApprovalActor,command:ApprovalInput,isCurrent:()=>boolean=()=>true,options:{failAfterWrites?:number}={}):Promise<ApprovalResult>{
 // Capture all caller-owned primitives and the original live lifecycle function before yielding.
 const actor={userId:provided.userId,role:provided.role},input={runId:command.runId,basis:command.basis,requestId:command.requestId},current=isCurrent,failAfterWrites=options.failAfterWrites;
 const check=()=>{if(!current())throw Error('approval_cancelled');};guard(data,actor);check();
 if(typeof input.runId!=='string'||!input.runId||typeof input.basis!=='string'||!input.basis||typeof input.requestId!=='string'||!input.requestId||input.requestId.length>200)throw Error('approval_invalid');
 const fingerprint=await digest([tenant.id,actor.userId,actor.role,input.runId,input.basis,input.requestId]);check();
 const requestHash=await digest([tenant.id,actor.userId,actor.role,input.requestId]);check();
 const receipt=await data.atomic!(async tx=>{
  check();const value=await read(tx,actor,input.runId);check();draft(value);
  if(await digest(value)!==input.basis)throw Error('approval_stale');check();
  const approvedAt=new Date().toISOString();
  await tx.update('payroll_runs',input.runId,{status:'approved',approved_by:actor.userId,approved_at:approvedAt});check();
  await tx.insert('audit_log',{actor_id:actor.userId,action:'payroll.approve',entity:'payroll_runs',entity_id:input.runId,ip:null,diff:{role:actor.role,source:'admin',before:value.run.status,after:'approved',total:value.run.total,teachers:new Set(value.lines.map(l=>l.teacher_id)).size}});check();
  const saved=await read(tx,actor,input.runId);check();const revision=await digest(saved);check();await ownedActor(tx,actor);check();
  return {version:1,tenantId:tenant.id,actorId:actor.userId,role:actor.role,runId:input.runId,fingerprint,approvedAt,revision};
 },{idempotencyKey:`payroll-approval_${requestHash}`,failAfterWrites});
 // A closed context may have committed already. Never roll history back to acknowledge it.
 check();
 if(!receipt||receipt.version!==1||receipt.tenantId!==tenant.id||receipt.actorId!==actor.userId||receipt.role!==actor.role||receipt.runId!==input.runId||receipt.fingerprint!==fingerprint||typeof receipt.approvedAt!=='string'||!Number.isFinite(Date.parse(receipt.approvedAt))||typeof receipt.revision!=='string')throw Error('approval_conflict');
 const saved=await read(data,actor,input.runId);check();unstamped(saved);
 if(saved.run.status!=='approved'||saved.run.approved_by!==actor.userId||saved.run.approved_at!==receipt.approvedAt||await digest(saved)!==receipt.revision)throw Error('approval_unconfirmed');check();await ownedActor(data,actor);check();
 return {runId:input.runId,approvedAt:receipt.approvedAt,total:saved.run.total};
}
