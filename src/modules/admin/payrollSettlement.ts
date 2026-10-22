/** Fictional browser-only settlement. Never calls a real provider or changes approved arithmetic. */
import type {DataProvider} from '../../data/types';
import type {PayrollRunRow,PayrollLineRow,UserRow} from '../../data/schema';
import type {Role} from '../../auth/roles';
import {roleCan} from '../../auth/permissions';
import {tenant} from '../../tenant/tenant';
import {byTeacher,runTotal} from '../../data/payrollCalc';
import {wompiPayout} from './payouts';
export type SettlementAction='run-manual'|'teacher-mark'|'wompi-rehearsal';
export type SettlementMethod=PayrollRunRow['method'];
export interface SettlementActor {userId:string;role:Role}
export interface SettlementSelection {action:SettlementAction;method:SettlementMethod;teacherId?:string;simulate?:'accepted'|'rejected'}
export interface SettlementInput extends SettlementSelection {runId:string;basis:string;requestId:string}
export interface SettlementPlan extends SettlementSelection {runId:string;basis:string;total:number;runTotal:number;lines:number;teachers:number;periodStart:string;periodEnd:string}
export interface SettlementResult {kind:'recorded'|'rejected';action:SettlementAction;method:SettlementMethod;runId:string;teacherId:string|null;closed:boolean;providerRef:string|null}
interface Value {run:PayrollRunRow;lines:PayrollLineRow[]}
interface Receipt {version:1;tenantId:string;actorId:string;role:Role;runId:string;teacherId:string|null;action:SettlementAction;method:SettlementMethod;fingerprint:string;kind:'recorded'|'rejected';closed:boolean;paidAt:string|null;providerRef:string|null;revision:string}
const methods:SettlementMethod[]=['cash','transfer','wompi'];
const digest=async(value:unknown)=>{const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');};
const validDate=(value:unknown):value is string=>typeof value==='string'&&Number.isFinite(Date.parse(value));
function guard(data:DataProvider,actor:SettlementActor){
 if(data.name!=='mock'||!data.atomic)throw Error('settlement_disconnected');
 if(!roleCan(actor.role,'payroll.write'))throw Error('settlement_denied');
 if(typeof actor.userId!=='string'||!actor.userId)throw Error('settlement_scope');
}
async function account(data:DataProvider,actor:SettlementActor){
 guard(data,actor);const rows=await data.list<UserRow>('users',{where:{tenant_id:tenant.id,id:actor.userId}});
 if(rows.length!==1||rows[0].id!==actor.userId||rows[0].tenant_id!==tenant.id||rows[0].status!=='active')throw Error('settlement_scope');
}
async function read(data:DataProvider,actor:SettlementActor,runId:string):Promise<Value>{
 await account(data,actor);
 const [runs,lines]=await Promise.all([
  data.list<PayrollRunRow>('payroll_runs',{where:{tenant_id:tenant.id,id:runId}}),
  data.list<PayrollLineRow>('payroll_lines',{where:{tenant_id:tenant.id,run_id:runId}}),
 ]);
 if(runs.length!==1||runs[0].id!==runId||runs[0].tenant_id!==tenant.id||lines.some(l=>l.run_id!==runId||l.tenant_id!==tenant.id))throw Error('settlement_scope');
 if(new Set(lines.map(l=>l.id)).size!==lines.length)throw Error('settlement_unresolved');
 await account(data,actor);return {run:runs[0],lines:[...lines].sort((a,b)=>a.id.localeCompare(b.id))};
}
function selection(input:SettlementSelection):SettlementSelection{
 const value={action:input.action,method:input.method,teacherId:input.teacherId,simulate:input.simulate};
 if(!['run-manual','teacher-mark','wompi-rehearsal'].includes(value.action)||!methods.includes(value.method))throw Error('settlement_invalid');
 if(value.action==='run-manual'&&(value.method==='wompi'||value.teacherId!=null||value.simulate!=null))throw Error('settlement_invalid');
 if(value.action==='teacher-mark'&&(typeof value.teacherId!=='string'||!value.teacherId||value.simulate!=null))throw Error('settlement_invalid');
 if(value.action==='wompi-rehearsal'&&(value.method!=='wompi'||value.teacherId!=null||!['accepted','rejected'].includes(value.simulate??'')))throw Error('settlement_invalid');
 return value;
}
function state(line:PayrollLineRow):'paid'|'unpaid'{
 if(line.paid_at==null&&line.paid_method==null)return 'unpaid';
 if(validDate(line.paid_at)&&methods.includes(line.paid_method as SettlementMethod))return 'paid';
 throw Error('settlement_unresolved');
}
/** Prototype qualification only. These pauses do not decide zero/negative/mixed payment policy. */
function qualify(value:Value,input:SettlementSelection){
 const {run,lines}=value;
 if(run.status!=='approved')throw Error('settlement_locked');
 if(typeof run.approved_by!=='string'||!run.approved_by||!validDate(run.approved_at)||run.paid_at!=null||run.provider_ref!=null||!methods.includes(run.method))throw Error('settlement_unresolved');
 if(!lines.length||!Number.isFinite(run.total)||run.total<=0||lines.some(l=>!l.teacher_id||!Number.isFinite(l.amount)||!Number.isFinite(l.rate))||runTotal(lines)!==run.total)throw Error('settlement_unresolved');
 const groups=byTeacher(lines);
 for(const group of groups){
  if(!Number.isFinite(group.subtotal)||group.subtotal<=0)throw Error('settlement_unresolved');
  const paid=group.lines.filter(l=>state(l)==='paid');
  if(paid.length&&paid.length!==group.lines.length)throw Error('settlement_unresolved');
  if(paid.length&&(new Set(paid.map(l=>l.paid_at)).size!==1||paid.some(l=>l.paid_method!==run.method)))throw Error('settlement_unresolved');
 }
 if(groups.every(g=>g.lines.every(l=>state(l)==='paid')))throw Error('settlement_unresolved');
 if(input.action==='teacher-mark'){
  if(input.method!==run.method)throw Error('settlement_stale');
  const group=groups.find(g=>g.teacherId===input.teacherId);
  if(!group)throw Error('settlement_scope');
  if(group.lines.every(l=>state(l)==='paid'))throw Error('settlement_locked');
  return {targets:group.lines,total:group.subtotal,groups};
 }
 // No invented remaining-provider-amount or mixed-method reconciliation.
 if(lines.some(l=>state(l)==='paid'))throw Error('settlement_unresolved');
 return {targets:lines,total:run.total,groups};
}
export async function preparePayrollSettlement(data:DataProvider,provided:SettlementActor,runId:string,providedSelection:SettlementSelection):Promise<SettlementPlan>{
 const actor={userId:provided.userId,role:provided.role},input=selection(providedSelection);
 if(typeof runId!=='string'||!runId)throw Error('settlement_scope');
 const value=await read(data,actor,runId),plan=qualify(value,input),basis=await digest(value);await account(data,actor);
 return {...input,runId,basis,total:plan.total,runTotal:value.run.total,lines:plan.targets.length,teachers:input.action==='teacher-mark'?1:plan.groups.length,periodStart:value.run.period_start,periodEnd:value.run.period_end};
}
const withoutUpdated=(row:PayrollRunRow|PayrollLineRow)=>{const {updated_at,...rest}=row;void updated_at;return rest;};
async function assertEffect(saved:Value,before:Value,input:SettlementSelection,targets:PayrollLineRow[],at:string|null,ref:string|null,closed:boolean){
 const ids=new Set(targets.map(l=>l.id));
 const expectedLines=before.lines.map(l=>at&&ids.has(l.id)?{...l,paid_at:at,paid_method:input.method}:l);
 const expectedRun=closed?{...before.run,status:'paid',method:input.method,paid_at:at,provider_ref:input.action==='wompi-rehearsal'?ref:before.run.provider_ref}:before.run;
 const project=(value:Value)=>({run:closed?withoutUpdated(value.run):value.run,lines:value.lines.map(l=>at&&ids.has(l.id)?withoutUpdated(l):l)});
 if(await digest(project(saved))!==await digest(project({run:expectedRun as PayrollRunRow,lines:expectedLines})))throw Error('settlement_unconfirmed');
}
export async function recordPayrollSettlement(data:DataProvider,provided:SettlementActor,command:SettlementInput,isCurrent:()=>boolean=()=>true,options:{failAfterWrites?:number}={}):Promise<SettlementResult>{
 // Snapshot primitives and preserve the original live lifecycle function before the first await.
 const actor={userId:provided.userId,role:provided.role},input={...selection(command),runId:command.runId,basis:command.basis,requestId:command.requestId},current=isCurrent,failAfterWrites=options.failAfterWrites;
 const check=()=>{if(!current())throw Error('settlement_cancelled');};guard(data,actor);check();
 if(typeof input.runId!=='string'||!input.runId||typeof input.basis!=='string'||!input.basis||typeof input.requestId!=='string'||!input.requestId||input.requestId.length>200)throw Error('settlement_invalid');
 const fingerprint=await digest([tenant.id,actor.userId,actor.role,input]);check();
 const request=await digest([tenant.id,actor.userId,actor.role,input.requestId]);check();
 const receipt=await data.atomic!<Receipt>(async tx=>{
  check();const before=await read(tx,actor,input.runId);check();const plan=qualify(before,input);
  if(await digest(before)!==input.basis)throw Error('settlement_stale');check();
  let ref:string|null=null,rejected=false;
  if(input.action==='wompi-rehearsal'){
   // Existing pure local timer only. A future real provider must use an authorized backend/outbox.
   const simulated=await wompiPayout({amount:plan.total,recipients:plan.groups.length,simulate:input.simulate});check();
   if(!simulated||!['accepted','rejected'].includes(simulated.status)||typeof simulated.ref!=='string'||!simulated.ref)throw Error('settlement_unconfirmed');
   ref=simulated.ref;rejected=simulated.status==='rejected';
   const fresh=await read(tx,actor,input.runId);check();qualify(fresh,input);
   if(await digest(fresh)!==input.basis)throw Error('settlement_stale');check();
   if(rejected)await tx.insert('audit_log',{actor_id:actor.userId,action:'payroll.payout.rejected',entity:'payroll_runs',entity_id:input.runId,ip:null,diff:{role:actor.role,source:'admin',after:{ref,reason:simulated.reason?.es}}});
   check();
  }
  let at:string|null=null,closed=false;
  if(!rejected){
   at=new Date().toISOString();
   for(const line of plan.targets){check();await tx.update('payroll_lines',line.id,{paid_at:at,paid_method:input.method});check();}
   const afterLines=await read(tx,actor,input.runId);check();
   closed=input.action!=='teacher-mark'||afterLines.lines.every(l=>state(l)==='paid');
   if(input.action==='teacher-mark')await tx.insert('audit_log',{actor_id:actor.userId,action:'payroll.pay.teacher',entity:'payroll_lines',entity_id:input.teacherId,ip:null,diff:{role:actor.role,source:'admin',after:{method:input.method,amount:plan.total,classes:plan.targets.filter(l=>l.kind==='class').length,run:input.runId,paid_at:at}}});
   check();
   if(closed){
    await tx.update('payroll_runs',input.runId,{status:'paid',method:input.method,paid_at:at,...(input.action==='wompi-rehearsal'?{provider_ref:ref}:{})});check();
    const action=input.action==='wompi-rehearsal'?'payroll.payout.wompi':'payroll.pay';
    await tx.insert('audit_log',{actor_id:actor.userId,action,entity:'payroll_runs',entity_id:input.runId,ip:null,diff:{role:actor.role,source:'admin',before:before.run.status,after:'paid',...(input.action==='wompi-rehearsal'?{total:before.run.total,teachers:plan.groups.length,ref,simulated:true}:input.action==='teacher-mark'?{method:input.method,total:before.run.total,viaTeachers:true}:{method:input.method,total:before.run.total,teachers:plan.groups.length})}});check();
   }
  }
  const saved=await read(tx,actor,input.runId);check();await assertEffect(saved,before,input,rejected?[]:plan.targets,at,ref,closed);check();
  const revision=await digest(saved);check();await account(tx,actor);check();
  return {version:1,tenantId:tenant.id,actorId:actor.userId,role:actor.role,runId:input.runId,teacherId:input.teacherId??null,action:input.action,method:input.method,fingerprint,kind:rejected?'rejected':'recorded',closed,paidAt:at,providerRef:ref,revision};
 },{idempotencyKey:`payroll-settlement_${request}`,failAfterWrites});
 check();
 if(!receipt||receipt.version!==1||receipt.tenantId!==tenant.id||receipt.actorId!==actor.userId||receipt.role!==actor.role||receipt.runId!==input.runId||receipt.teacherId!==(input.teacherId??null)||receipt.action!==input.action||receipt.method!==input.method||receipt.fingerprint!==fingerprint||!['recorded','rejected'].includes(receipt.kind)||(receipt.kind==='recorded'&&!validDate(receipt.paidAt))||typeof receipt.revision!=='string')throw Error('settlement_conflict');
 const saved=await read(data,actor,input.runId);check();
 if(typeof receipt.closed!=='boolean'||(receipt.kind==='rejected'&&(receipt.action!=='wompi-rehearsal'||receipt.closed||receipt.paidAt!==null))||(receipt.action==='wompi-rehearsal'?(typeof receipt.providerRef!=='string'||!receipt.providerRef):receipt.providerRef!==null))throw Error('settlement_conflict');
 if(receipt.closed?(saved.run.status!=='paid'||saved.run.paid_at!==receipt.paidAt||saved.run.method!==receipt.method||saved.run.provider_ref!==(receipt.action==='wompi-rehearsal'?receipt.providerRef:null)):(saved.run.status!=='approved'||saved.run.paid_at!=null||saved.run.provider_ref!=null))throw Error('settlement_unconfirmed');
 if(receipt.kind==='recorded'){
  const target=receipt.action==='teacher-mark'?saved.lines.filter(l=>l.teacher_id===receipt.teacherId):saved.lines;
  if(!target.length||target.some(l=>l.paid_at!==receipt.paidAt||l.paid_method!==receipt.method))throw Error('settlement_unconfirmed');
 }
 if(await digest(saved)!==receipt.revision)throw Error('settlement_unconfirmed');check();await account(data,actor);check();
 return {kind:receipt.kind,action:receipt.action,method:receipt.method,runId:receipt.runId,teacherId:receipt.teacherId,closed:saved.run.status==='paid',providerRef:receipt.providerRef};
}
