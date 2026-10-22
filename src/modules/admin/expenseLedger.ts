/** FI04 fictional browser ledger only. Production authorization/ledger RPCs remain disconnected. */
import type { DataProvider } from '../../data/types';
import { EXPENSE_CATEGORIES, type BaseRow, type ExpenseRow, type ExpenseTemplateRow, type UserRow } from '../../data/schema';
import type { Role } from '../../auth/roles';
import { roleCan } from '../../auth/permissions';
import { tenant } from '../../tenant/tenant';
import { fixedExpensesFor, type Period } from '../../data/expenseCalc';

export type ExpenseDraft = Pick<ExpenseRow,'kind'|'category'|'concept'|'amount'|'incurred_on'|'paid_on'|'method'|'vendor'|'note'>;
export type TemplateDraft = Pick<ExpenseTemplateRow,'concept'|'category'|'amount'|'cadence'|'anchor_day'|'vendor'>;
export type ExpenseIdentity = {actorId:string;role:Role};
export type ExpenseInput = {requestId:string} & (
 {type:'create';id:string;draft:ExpenseDraft} |
 {type:'template.create';id:string;draft:TemplateDraft} |
 {type:'template.toggle';id:string;before:ExpenseTemplateRow} |
 {type:'pay';id:string;before:ExpenseRow;paidOn:string} |
 {type:'delete';id:string;before:ExpenseRow} |
 {type:'generate';period:Period;templates:ExpenseTemplateRow[]}
);
export type ExpenseCommand = ExpenseIdentity & ExpenseInput;
export interface ExpenseControl {signal?:AbortSignal;currentActor?:()=>ExpenseIdentity;failAfterWrites?:number}
type Item = {table:'expenses'|'expense_templates';id:string;digest:string|null};
export interface ExpenseOutcome {items:Item[];created:number;skipped:number;total:number}
interface Receipt extends BaseRow {actor_id:string;action:string;entity:string;diff:{version:1;role:Role;source:'admin';fingerprint:string;result:ExpenseOutcome}}
const ownControl=(c:ExpenseControl):ExpenseControl=>({signal:c.signal,currentActor:c.currentActor,failAfterWrites:c.failAfterWrites});
const day=(s:unknown):s is string=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const fail=(code:string):never=>{throw Error('expense_'+code);};
function check(data:DataProvider,c:ExpenseIdentity,control:ExpenseControl,write=false){
 if(data.name!=='mock'||!data.atomic)fail('disconnected');
 if(!roleCan(c.role,write?'expenses.write':'expenses.read'))fail('denied');
 const current=control.currentActor?.()??c;
 if(current.actorId!==c.actorId||current.role!==c.role)fail('context');
 if(control.signal?.aborted)fail('cancelled');
}
async function actor(data:DataProvider,c:ExpenseIdentity,control:ExpenseControl,write=false){
 check(data,c,control,write);const rows=await data.list<UserRow>('users',{where:{tenant_id:tenant.id,id:c.actorId}});check(data,c,control,write);
 if(rows.length!==1||rows[0].id!==c.actorId||rows[0].tenant_id!==tenant.id||rows[0].status!=='active')fail('scope');
}
async function scoped<T extends BaseRow>(data:DataProvider,table:string,c:ExpenseIdentity,control:ExpenseControl):Promise<T[]>{
 check(data,c,control);const rows=await data.list<T>(table,{where:{tenant_id:tenant.id}});check(data,c,control);
 if(rows.some(r=>r.tenant_id!==tenant.id||typeof r.id!=='string'||!r.id)||new Set(rows.map(r=>r.id)).size!==rows.length)fail('scope');return rows;
}
function common(row:Pick<ExpenseRow,'concept'|'category'|'amount'|'vendor'>){
 if(typeof row.concept!=='string'||!row.concept.trim()||!EXPENSE_CATEGORIES.includes(row.category)||!Number.isFinite(row.amount)||row.amount<0||row.vendor!==null&&typeof row.vendor!=='string')fail('validation');
}
function expenseShape(r:ExpenseRow){common(r);if(!['fixed','variable'].includes(r.kind)||!day(r.incurred_on)||r.paid_on!==null&&!day(r.paid_on)||!['cash','transfer','card'].includes(r.method)||r.note!==null&&typeof r.note!=='string'||r.template_id!==null&&typeof r.template_id!=='string'||r.created_by!==null&&typeof r.created_by!=='string')fail('scope');}
function templateShape(r:ExpenseTemplateRow){common(r);if(!['monthly','biweekly'].includes(r.cadence)||!Number.isInteger(r.anchor_day)||r.anchor_day<1||r.anchor_day>31||typeof r.active!=='boolean'||r.note!==null&&typeof r.note!=='string')fail('scope');}
const expenseValue=(r:ExpenseRow)=>({kind:r.kind,category:r.category,concept:r.concept,amount:r.amount,incurred_on:r.incurred_on,paid_on:r.paid_on,method:r.method,vendor:r.vendor,note:r.note,template_id:r.template_id,created_by:r.created_by});
const templateValue=(r:ExpenseTemplateRow)=>({concept:r.concept,category:r.category,amount:r.amount,cadence:r.cadence,anchor_day:r.anchor_day,vendor:r.vendor,active:r.active,note:r.note});
const semantic=(table:Item['table'],row:BaseRow)=>table==='expenses'?expenseValue(row as ExpenseRow):templateValue(row as ExpenseTemplateRow);
const hash=async(v:unknown)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))].map(n=>n.toString(16).padStart(2,'0')).join('');
async function target(data:DataProvider,table:Item['table'],id:string,c:ExpenseIdentity,control:ExpenseControl,required=true){
 const raw=await data.get(table,id);check(data,c,control);if(raw&&(raw.tenant_id!==tenant.id||raw.id!==id))fail('scope');
 const rows=await scoped(data,table,c,control),matches=rows.filter(r=>r.id===id);
 if(!matches.length){if(required||raw)fail('scope');return null;}
 const row=matches[0];if(!raw)fail('scope');if(table==='expenses')expenseShape(row as ExpenseRow);else templateShape(row as ExpenseTemplateRow);return row;
}
export async function readExpenseWorkspace(data:DataProvider,identity:ExpenseIdentity,supplied:ExpenseControl={}){
 const c={...identity},control=ownControl(supplied);await actor(data,c,control);
 const expenses=await scoped<ExpenseRow>(data,'expenses',c,control),templates=await scoped<ExpenseTemplateRow>(data,'expense_templates',c,control);expenses.forEach(expenseShape);templates.forEach(templateShape);await actor(data,c,control);return {expenses:expenses.sort((a,b)=>b.incurred_on.localeCompare(a.incurred_on)),templates:templates.sort((a,b)=>a.anchor_day-b.anchor_day)};
}
const actions={'create':'expense.create','template.create':'expense.template.create','template.toggle':'expense.template.toggle','pay':'expense.pay','delete':'expense.delete','generate':'expense.generate'} as const;
async function acknowledge(data:DataProvider,result:ExpenseOutcome,c:ExpenseCommand,control:ExpenseControl){
 await actor(data,c,control,true);
 if(!result||!Array.isArray(result.items)||!Number.isInteger(result.created)||result.created<0||!Number.isInteger(result.skipped)||result.skipped<0||(!Number.isFinite(result.total)||result.total<0)||new Set(result.items.map(x=>x.table+'|'+x.id)).size!==result.items.length)fail('request_conflict');
 const table=c.type.startsWith('template.')?'expense_templates':'expenses';
 if(c.type==='generate'?result.items.length!==result.created||result.items.some(i=>i.table!=='expenses'||i.digest===null):result.items.length!==1||result.items[0].table!==table||result.items[0].id!==c.id||(result.items[0].digest===null)!==(c.type==='delete')||result.created!==(['create','template.create'].includes(c.type)?1:0))fail('request_conflict');
 let total=0;
 for(const item of result.items){if(!['expenses','expense_templates'].includes(item.table)||typeof item.id!=='string'||!item.id||item.digest!==null&&!/^[a-f0-9]{64}$/.test(item.digest))fail('request_conflict');const row=await target(data,item.table,item.id,c,control,item.digest!==null);if(item.digest===null?row!==null:!row||await hash(semantic(item.table,row))!==item.digest)fail('stale');if(row&&(c.type==='create'||c.type==='template.create'||c.type==='generate'))total+=Number(row.amount);}
 if(result.total!==total)fail('request_conflict');
 if(c.type==='generate')for(const template of c.templates)await target(data,'expense_templates',template.id,c,control);
 await actor(data,c,control,true);return result;
}
/** Command, controls and result are private to one immutable intent; receipts contain no entered bodies. */
export async function runExpenseCommand(data:DataProvider,command:ExpenseCommand,supplied:ExpenseControl={}):Promise<ExpenseOutcome>{
 const c=structuredClone(command),control=ownControl(supplied);check(data,c,control,true);
 if(typeof c.requestId!=='string'||!c.requestId||c.requestId.length>160||!['create','template.create','template.toggle','pay','delete','generate'].includes(c.type))fail('validation');
 if(c.type!=='generate'&&(typeof c.id!=='string'||!c.id||c.id.length>160))fail('validation');
 if(c.type==='create'){const r={...c.draft,template_id:null,created_by:c.actorId} as ExpenseRow;expenseShape(r);if(!Number.isInteger(r.amount)||r.amount<=0)fail('validation');}
 if(c.type==='template.create'){const r={...c.draft,active:true,note:null} as ExpenseTemplateRow;templateShape(r);if(!Number.isInteger(r.amount)||r.amount<=0||r.anchor_day>28)fail('validation');}
 if(c.type==='pay'&&!day(c.paidOn))fail('validation');
 if(c.type==='generate'&&(!c.period||!day(c.period.start)||!day(c.period.end)||c.period.end<c.period.start||!Array.isArray(c.templates)))fail('validation');
 await actor(data,c,control,true);const fingerprint=await hash(c),nonce=await hash({tenant:tenant.id,actor:c.actorId,role:c.role,requestId:c.requestId}),receiptId='expense_request_v1_'+nonce;check(data,c,control,true);
 const result=await data.atomic!(async tx=>{
  await actor(tx,c,control,true);const receipt=await tx.get<Receipt>('audit_log',receiptId);check(tx,c,control,true);
  if(receipt){if(receipt.id!==receiptId||receipt.action!==actions[c.type]||receipt.entity!==(c.type.startsWith('template.')?'expense_templates':'expenses')||receipt.entity_id!==(c.type==='generate'?null:c.id)||receipt.tenant_id!==tenant.id||receipt.actor_id!==c.actorId||receipt.diff?.version!==1||receipt.diff.source!=='admin'||receipt.diff.role!==c.role||receipt.diff.fingerprint!==fingerprint)fail('request_conflict');return acknowledge(tx,receipt.diff.result,c,control);}
  const rows: {table:Item['table'];row:BaseRow}[]=[],result:ExpenseOutcome={items:[],created:0,skipped:0,total:0};let action:string,entity:Item['table']='expenses';
  if(c.type==='create'||c.type==='template.create'){
   entity=c.type==='create'?'expenses':'expense_templates';if(await target(tx,entity,c.id,c,control,false))fail('stale');
   const draft=c.type==='create'?expenseValue({...c.draft,template_id:null,created_by:c.actorId} as ExpenseRow):templateValue({...c.draft,active:true,note:null} as ExpenseTemplateRow);check(tx,c,control,true);rows.push({table:entity,row:await tx.insert(entity,{...draft,id:c.id,tenant_id:tenant.id})});result.created=1;result.total=c.draft.amount;action=c.type==='create'?'expense.create':'expense.template.create';
  }else if(c.type==='pay'||c.type==='delete'){
   const row=await target(tx,'expenses',c.id,c,control) as ExpenseRow;
   if(c.type==='delete'&&row.paid_on)fail('paid_delete');
   if(JSON.stringify(expenseValue(row))!==JSON.stringify(expenseValue(c.before)))fail('stale');
   if(c.type==='pay'&&row.paid_on)fail('stale');check(tx,c,control,true);
   if(c.type==='delete'){await tx.remove('expenses',c.id);result.items.push({table:'expenses',id:c.id,digest:null});action='expense.delete';}
   else{rows.push({table:'expenses',row:await tx.update('expenses',c.id,{paid_on:c.paidOn})});action='expense.pay';}
  }else if(c.type==='template.toggle'){
   entity='expense_templates';const row=await target(tx,entity,c.id,c,control) as ExpenseTemplateRow;
   if(JSON.stringify(templateValue(row))!==JSON.stringify(templateValue(c.before)))fail('stale');check(tx,c,control,true);rows.push({table:entity,row:await tx.update(entity,c.id,{active:!row.active})});action='expense.template.toggle';
  }else{
   const workspace=await readExpenseWorkspace(tx,c,control);const values=(xs:ExpenseTemplateRow[])=>xs.map(r=>({id:r.id,value:templateValue(r)})).sort((a,b)=>a.id.localeCompare(b.id));
   if(new Set(c.templates.map(r=>r.id)).size!==c.templates.length||c.templates.some(r=>r.tenant_id!==tenant.id)||JSON.stringify(values(workspace.templates))!==JSON.stringify(values(c.templates)))fail('stale');
   const keys=workspace.expenses.filter(r=>r.template_id).map(r=>r.template_id+'|'+r.incurred_on);if(new Set(keys).size!==keys.length)fail('scope');
   const {drafts,skipped}=fixedExpensesFor(c.period,workspace.templates,workspace.expenses);result.skipped=skipped;
   for(const draft of drafts){check(tx,c,control,true);rows.push({table:'expenses',row:await tx.insert('expenses',{...draft,paid_on:null,method:'transfer',note:null,created_by:c.actorId})});}result.created=rows.length;result.total=rows.reduce((a,r)=>a+Number(r.row.amount),0);action='expense.generate';
  }
  for(const {table,row} of rows){result.items.push({table,id:row.id,digest:await hash(semantic(table,row))});check(tx,c,control,true);}
  check(tx,c,control,true);await tx.insert('audit_log',{id:receiptId,tenant_id:tenant.id,actor_id:c.actorId,action,entity,entity_id:c.type==='generate'?null:c.id,ip:null,diff:{version:1,role:c.role,source:'admin',fingerprint,result}});await actor(tx,c,control,true);return acknowledge(tx,result,c,control);
 },{failAfterWrites:control.failAfterWrites});
 return acknowledge(data,result,c,control);
}
