import type {DataProvider} from '../../data/types';
import type {PaymentRow,UserRow} from '../../data/schema';
import {tenant} from '../../tenant/tenant';
import {dateKey} from '../../i18n/format';

export const cashCountRoles=['super_admin','admin','front_desk'] as const;
export interface CountContext {tenantId:string;actorId:string;role:string;adapter:string;day:string}
export interface CountStorage {getItem(key:string):string|null;setItem(key:string,value:string):void}
export type Counts={cash:number|null;cardManual:number|null;transferManual:number|null};
export const emptyCounts=():Counts=>({cash:null,cardManual:null,transferManual:null});
export interface CountDocument {version:1;tenantId:string;actorId:string;role:string;day:string;revision:number;counts:Counts|null;references:string|null;requests:Record<string,{fingerprint:string;effect:string;revision:number}>}
export type CountCommand={requestId:string;expectedRevision:number;references:string}&({type:'save';counts:Counts}|{type:'discard'});
export interface ReferenceGroup {currency:string;method:string;provider:string;status:string;rows:number;amount:number|null;amountPaid:number|null;missingAmount:number;missingPaid:number}
export interface ReferenceDay {groups:ReferenceGroup[];missingDate:number;invalidDate:number}
export interface CountReferences {fingerprint:string;recorded:ReferenceDay;confirmed:ReferenceDay}
export const countKey=(c:CountContext)=>`hoyos.cash-count-draft.v1.${encodeURIComponent(c.tenantId)}.${encodeURIComponent(c.actorId)}.${encodeURIComponent(c.role)}.${c.day}`;
export function validCountDay(day:unknown):day is string {if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;const d=new Date(`${day}T00:00:00Z`);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===day;}
function scope(c:CountContext,data?:DataProvider){if(c.adapter!=='mock'||data&&data.name!=='mock')throw Error('disconnected');if(c.tenantId!==tenant.id||!c.actorId||!cashCountRoles.includes(c.role as typeof cashCountRoles[number]))throw Error('forbidden');if(!validCountDay(c.day))throw Error('day');}
const hash=async(v:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v)))),b=>b.toString(16).padStart(2,'0')).join('');
const digest=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
function validCounts(v:unknown):v is Counts {return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')==='cardManual,cash,transferManual'&&Object.values(v).every(n=>n===null||Number.isSafeInteger(n)&&n>=0);}
async function account(data:DataProvider,c:CountContext){const row=await data.get<UserRow>('users',c.actorId);if(!row||row.id!==c.actorId||row.tenant_id!==c.tenantId||row.status!=='active')throw Error('account');}
function money(n:unknown):n is number{return Number.isSafeInteger(n)&&Number(n)>=0;}
type ReferencePayment=Pick<PaymentRow,'created_at'|'paid_at'|'currency'|'method'|'provider'|'status'|'amount'|'amount_paid'>;
function referenceDay(rows:ReferencePayment[],day:string,column:'created_at'|'paid_at'):ReferenceDay {
 const groups=new Map<string,ReferenceGroup>();let missingDate=0,invalidDate=0;
 for(const row of rows){const stamp=row[column];if(stamp===null||stamp===undefined||stamp===''){missingDate++;continue;}if(typeof stamp!=='string'||!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(stamp)||!validCountDay(stamp.slice(0,10))||!Number.isFinite(new Date(stamp).getTime())){invalidDate++;continue;}if(dateKey(new Date(stamp))!==day)continue;
  const currency=typeof row.currency==='string'?row.currency:'',method=typeof row.method==='string'?row.method:'',provider=typeof row.provider==='string'?row.provider:'',status=typeof row.status==='string'?row.status:'',key=JSON.stringify([currency,method,provider,status]);
  const group=groups.get(key)??{currency,method,provider,status,rows:0,amount:0,amountPaid:0,missingAmount:0,missingPaid:0};group.rows++;
  if(!/^[A-Z]{3}$/.test(currency)){group.amount=null;group.amountPaid=null;}
  if(!money(row.amount)){group.missingAmount++;group.amount=null;}else if(group.amount!==null){group.amount+=row.amount;if(!Number.isSafeInteger(group.amount))group.amount=null;}
  if(!money(row.amount_paid)){group.missingPaid++;group.amountPaid=null;}else if(group.amountPaid!==null){group.amountPaid+=row.amount_paid;if(!Number.isSafeInteger(group.amountPaid))group.amountPaid=null;}
  groups.set(key,group);
 }
 return {groups:[...groups.values()].sort((a,b)=>JSON.stringify([a.currency,a.method,a.provider,a.status]).localeCompare(JSON.stringify([b.currency,b.method,b.provider,b.status]))),missingDate,invalidDate};
}
async function attributedRows(data:DataProvider,c:CountContext){
 const rows=await data.list<PaymentRow>('payments',{where:{tenant_id:c.tenantId,taken_by:c.actorId}});
 if(!Array.isArray(rows)||rows.some(r=>!r||typeof r.id!=='string'||!r.id||r.tenant_id!==c.tenantId||r.taken_by!==c.actorId)||new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('reference_scope');
 return rows.map(r=>({id:r.id,tenant_id:r.tenant_id,taken_by:r.taken_by,amount:r.amount,amount_paid:r.amount_paid,currency:r.currency,method:r.method,provider:r.provider,status:r.status,created_at:r.created_at,paid_at:r.paid_at})).sort((a,b)=>a.id.localeCompare(b.id));
}
/** No joins or settlement inference: exact fields attributed to this current staff account only. */
export async function readCountReferences(data:DataProvider,context:CountContext):Promise<CountReferences>{
 const c={...context};scope(c,data);await account(data,c);
 const rows=await attributedRows(data,c);
 const fingerprint=await hash({context:c,rows});await account(data,c);const endRows=await attributedRows(data,c);if(await hash({context:c,rows:endRows})!==fingerprint)throw Error('references_changed');await account(data,c);return {fingerprint,recorded:referenceDay(rows,c.day,'created_at'),confirmed:referenceDay(rows,c.day,'paid_at')};
}
export function readCountDocument(storage:CountStorage,context:CountContext):CountDocument {
 const c={...context};scope(c);const raw=storage.getItem(countKey(c));if(raw===null)return {version:1,tenantId:c.tenantId,actorId:c.actorId,role:c.role,day:c.day,revision:0,counts:null,references:null,requests:{}};
 const d=JSON.parse(raw) as CountDocument;if(!d||d.version!==1||d.tenantId!==c.tenantId||d.actorId!==c.actorId||d.role!==c.role||d.day!==c.day||!Number.isSafeInteger(d.revision)||d.revision<0||d.counts!==null&&!validCounts(d.counts)||d.references!==null&&!digest(d.references)||(d.counts===null)!==(d.references===null)||!d.requests||typeof d.requests!=='object'||Array.isArray(d.requests)||Object.entries(d.requests).some(([id,r])=>!/^[-\w]{1,100}$/.test(id)||!r||!digest(r.fingerprint)||!digest(r.effect)||!Number.isSafeInteger(r.revision)||r.revision<1||r.revision>d.revision))throw Error('document');return d;
}
/** One browser document, not a close/adjustment or cross-tab/backend transaction. */
export async function runCountCommand(data:DataProvider,storage:CountStorage,context:CountContext,input:CountCommand,cancelled:()=>boolean=()=>false):Promise<CountDocument>{
 const c=structuredClone(context),command=structuredClone(input),check=()=>{if(cancelled())throw Error('cancelled');};scope(c,data);check();
 if(!command||Object.keys(command).sort().join(',')!==(command.type==='save'?'counts,expectedRevision,references,requestId,type':'expectedRevision,references,requestId,type')||!/^[-\w]{1,100}$/.test(command.requestId)||!Number.isSafeInteger(command.expectedRevision)||command.expectedRevision<0||!digest(command.references)||!['save','discard'].includes(command.type)||command.type==='save'&&!validCounts(command.counts))throw Error('validation');
 const fingerprint=await hash({context:c,command});check();const fresh=await readCountReferences(data,c);check();if(fresh.fingerprint!==command.references)throw Error('references_changed');
 const current=readCountDocument(storage,c),raw=JSON.stringify(current),prior=Object.prototype.hasOwnProperty.call(current.requests,command.requestId)?current.requests[command.requestId]:undefined;
 if(prior){if(prior.fingerprint!==fingerprint)throw Error('request_conflict');const effect=await hash({revision:current.revision,counts:current.counts,references:current.references});check();if(prior.revision!==current.revision||prior.effect!==effect)throw Error('replay_effect_changed');const replayReferences=await readCountReferences(data,c);check();if(replayReferences.fingerprint!==command.references)throw Error('references_changed');if(JSON.stringify(readCountDocument(storage,c))!==raw)throw Error('revision_conflict');return current;}
 if(current.revision!==command.expectedRevision)throw Error('revision_conflict');if(current.revision>=Number.MAX_SAFE_INTEGER)throw Error('revision_exhausted');if(command.type==='discard'&&current.counts===null)throw Error('missing');
 const next:CountDocument={...current,revision:current.revision+1,counts:command.type==='save'?command.counts:null,references:command.type==='save'?command.references:null,requests:{...current.requests}};const effect=await hash({revision:next.revision,counts:next.counts,references:next.references});check();await account(data,c);check();const latest=await readCountReferences(data,c);check();if(latest.fingerprint!==command.references)throw Error('references_changed');if(JSON.stringify(readCountDocument(storage,c))!==raw)throw Error('revision_conflict');next.requests={...next.requests,[command.requestId]:{fingerprint,effect,revision:next.revision}};storage.setItem(countKey(c),JSON.stringify(next));
 const acknowledgedReferences=await readCountReferences(data,c);check();if(acknowledgedReferences.fingerprint!==command.references)throw Error('ack_unconfirmed');const confirmed=readCountDocument(storage,c);if(JSON.stringify(confirmed)!==JSON.stringify(next))throw Error('ack_unconfirmed');check();return confirmed;
}
