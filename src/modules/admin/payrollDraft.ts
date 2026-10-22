/** Fictional draft preparation only. Never approves, settles or calls a payout provider. */
import type { DataProvider } from '../../data/types';
import type { PayrollRunRow, PayrollLineRow, UserRow } from '../../data/schema';
import { draftLinesFor, periodsOverlap, runTotal, type DraftInputs, type Period } from '../../data/payrollCalc';
import { DEFAULT_SETTINGS, type TenantRow } from './settings';
import { tenant } from '../../tenant/tenant';
import { roleCan } from '../../auth/permissions';
import type { Role } from '../../auth/roles';
export interface DraftActor { userId:string; role:Role }
export type DraftMethod=PayrollRunRow['method'];
export interface DraftPlan { periods:Period[]; method:DraftMethod; expected:string }
export interface DraftSummary { id:string; total:number; created:number; replaced:boolean; replacedOverlap:boolean }
const tables=['class_sessions','bookings','teachers','special_charges','space_bookings','payroll_runs','payroll_lines'] as const;
async function digest(value:unknown){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');}
function guard(data:DataProvider,actor:DraftActor){if(data.name!=='mock'||!data.atomic)throw Error('draft_disconnected');if(!roleCan(actor.role,'payroll.write'))throw Error('draft_denied');}
async function account(data:DataProvider,actor:DraftActor){guard(data,actor);const user=await data.get<UserRow>('users',actor.userId);if(!user||user.id!==actor.userId||user.tenant_id!==tenant.id)throw Error('draft_scope');}
function validPeriods(periods:Period[]){if(periods.length<1||periods.length>2)throw Error('draft_invalid');for(const p of periods)if(!/^\d{4}-\d{2}-\d{2}$/.test(p.start)||!/^\d{4}-\d{2}-\d{2}$/.test(p.end)||!Number.isFinite(Date.parse(p.start))||new Date(p.start).toISOString().slice(0,10)!==p.start||!Number.isFinite(Date.parse(p.end))||new Date(p.end).toISOString().slice(0,10)!==p.end||p.start>p.end)throw Error('draft_invalid');if(periods.length===2&&periodsOverlap(periods[0],periods[1]))throw Error('draft_invalid');}
async function read(data:DataProvider,actor:DraftActor){
 await account(data,actor);const config=await data.get<TenantRow>('tenants',tenant.id);if(!config||config.id!==tenant.id||config.tenant_id!==tenant.id)throw Error('draft_scope');
 const arrays=await Promise.all(tables.map(t=>data.list(t,{where:{tenant_id:tenant.id}})));for(const rows of arrays){if(rows.some(r=>r.tenant_id!==tenant.id)||new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('draft_scope');rows.sort((a,b)=>a.id.localeCompare(b.id));}
 const [sessions,bookings,teachers,specials,spaceBookings,runs,lines]=arrays;
 const raw=config.settings?.payroll;const payroll={...DEFAULT_SETTINGS.payroll,...raw,rateCard:{byModality:{...raw?.rateCard?.byModality},byTeacher:{...raw?.rateCard?.byTeacher}}};
 return {inputs:{sessions,bookings,teachers,specials,spaceBookings,rateCard:payroll.rateCard} as DraftInputs,runs:runs as PayrollRunRow[],lines:lines as PayrollLineRow[],payroll};
}
function affected(rows:Awaited<ReturnType<typeof read>>,periods:Period[]){return rows.runs.filter(r=>periods.some(p=>periodsOverlap({start:r.period_start,end:r.period_end},p)));}
function checkRuns(rows:Awaited<ReturnType<typeof read>>,periods:Period[]){const runs=affected(rows,periods);if(runs.some(r=>r.status!=='draft'||!!r.approved_at||!!r.paid_at)||rows.lines.some(l=>runs.some(r=>r.id===l.run_id)&&!!l.paid_at))throw Error('draft_locked');const keys=runs.map(r=>`${r.period_start}:${r.period_end}`);if(new Set(keys).size!==keys.length)throw Error('draft_ambiguous');return runs;}
async function revision(rows:Awaited<ReturnType<typeof read>>){return digest(rows);}
export async function preparePayrollDraft(data:DataProvider,actor:DraftActor,periods:Period[],method:DraftMethod):Promise<DraftPlan>{periods=structuredClone(periods);actor={...actor};validPeriods(periods);if(!['wompi','transfer','cash'].includes(method))throw Error('draft_invalid');const rows=await read(data,actor);checkRuns(rows,periods);return {periods:structuredClone(periods),method,expected:await revision(rows)};}
export async function generatePayrollDraft(data:DataProvider,actor:DraftActor,input:DraftPlan&{requestId:string},cancelled:()=>boolean=()=>false,options:{failAfterWrites?:number}={}){
 actor={...actor};input=structuredClone(input);guard(data,actor);validPeriods(input.periods);if(!input.requestId||input.requestId.length>128||!['wompi','transfer','cash'].includes(input.method)||!input.expected)throw Error('draft_invalid');const check=()=>{if(cancelled())throw Error('draft_cancelled');};check();await account(data,actor);check();
 const fingerprint=await digest({actor,input});check();
 const receipt=await data.atomic!(async tx=>{
  check();const rows=await read(tx,actor);check();const overlaps=checkRuns(rows,input.periods);if(await revision(rows)!==input.expected)throw Error('draft_stale');check();
  const kept=new Set(input.periods.map(p=>rows.runs.find(r=>r.period_start===p.start&&r.period_end===p.end)?.id).filter(Boolean));
  for(const run of overlaps){for(const line of rows.lines.filter(l=>l.run_id===run.id)){await tx.remove('payroll_lines',line.id);check();}if(!kept.has(run.id)){await tx.remove('payroll_runs',run.id);check();}}
  const ids:string[]=[];
  for(const period of input.periods){
   const old=overlaps.find(r=>r.period_start===period.start&&r.period_end===period.end),draft=draftLinesFor(period,rows.inputs),total=runTotal(draft);
   const run=old?await tx.update<PayrollRunRow>('payroll_runs',old.id,{total,method:input.method}):await tx.insert<PayrollRunRow>('payroll_runs',{period_start:period.start,period_end:period.end,status:'draft',total,method:input.method,approved_by:null,approved_at:null,paid_at:null,provider_ref:null,notes:null});check();ids.push(run.id);
   for(const line of draft){await tx.insert('payroll_lines',{...line,run_id:run.id});check();}
   await tx.insert('audit_log',{actor_id:actor.userId,action:old?'payroll.draft.regenerate':'payroll.draft.create',entity:'payroll_runs',entity_id:run.id,diff:{role:actor.role,source:'admin',after:{period:`${period.start}…${period.end}`,cadence:rows.payroll.cadence,lines:draft.length,total}},ip:null});check();
  }
  const current=await read(tx,actor);check();const resultRevision=await digest({runs:current.runs.filter(r=>ids.includes(r.id)),lines:current.lines.filter(l=>ids.includes(l.run_id))});check();return {version:1,fingerprint,actorId:actor.userId,role:actor.role,tenantId:tenant.id,ids,replaced:input.periods.map(p=>overlaps.some(r=>r.period_start===p.start&&r.period_end===p.end)),replacedOverlap:overlaps.some(r=>!kept.has(r.id)),resultRevision};
 },{idempotencyKey:`payroll-draft_${actor.userId}_${input.requestId}`,...options});check();
 if(!receipt||receipt.version!==1||receipt.fingerprint!==fingerprint||receipt.actorId!==actor.userId||receipt.role!==actor.role||receipt.tenantId!==tenant.id||!Array.isArray(receipt.ids)||receipt.ids.length!==input.periods.length||receipt.ids.some(id=>typeof id!=='string'||!id)||new Set(receipt.ids).size!==receipt.ids.length||!Array.isArray(receipt.replaced)||receipt.replaced.length!==input.periods.length||receipt.replaced.some(v=>typeof v!=='boolean')||typeof receipt.replacedOverlap!=='boolean'||typeof receipt.resultRevision!=='string')throw Error('draft_conflict');
 const current=await read(data,actor);check();const overlaps=affected(current,input.periods);if(overlaps.length!==receipt.ids.length||overlaps.some(r=>!receipt.ids.includes(r.id)))throw Error('draft_unconfirmed');const runs=current.runs.filter(r=>receipt.ids.includes(r.id)),lines=current.lines.filter(l=>receipt.ids.includes(l.run_id));if(runs.length!==receipt.ids.length||runs.some(r=>r.status!=='draft'||!!r.approved_at||!!r.paid_at)||await digest({runs,lines})!==receipt.resultRevision)throw Error('draft_unconfirmed');check();
 return receipt.ids.map((id,index)=>{const run=runs.find(r=>r.id===id)!;return {id,total:run.total,created:lines.filter(l=>l.run_id===id).length,replaced:receipt.replaced[index],replacedOverlap:receipt.replacedOverlap} satisfies DraftSummary;});
}
