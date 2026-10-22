import type {Bi} from '../../specs/types';
export const draftRoles=['super_admin','admin','coordinator','marketing'] as const;
export const brandReferences=[{id:'blue',url:'brand/hoy-blue.png',label:{es:'Logo azul existente',en:'Existing blue logo'}},{id:'cream',url:'brand/hoy-cream.png',label:{es:'Logo crema existente',en:'Existing cream logo'}},{id:'vector',url:'brand/hoy-wordmark.svg',label:{es:'Marca vectorial existente',en:'Existing vector wordmark'}},{id:'yellow',url:'brand/hoy-yellow.png',label:{es:'Logo amarillo existente',en:'Existing yellow logo'}}] as const;
export interface DraftContext {tenantId:string;actorId:string;role:string;adapter:string}
export interface DraftStorage {getItem(key:string):string|null;setItem(key:string,value:string):void}
export interface MarketingDraft {id:string;kind:'campaign'|'content';title:Bi;body:Bi;startOn:string|null;endOn:string|null;plannedOn:string|null;campaignId:string|null;channel:string;assetIds:string[]}
export interface DraftSnapshot {version:1;tenantId:string;actorId:string;role:string;revision:number;rows:MarketingDraft[];requests:Record<string,{fingerprint:string}>}
export type DraftCommand={requestId:string;expectedRevision:number}&({type:'save';row:MarketingDraft;expect:'create'|'edit'}|{type:'discard';id:string;kind:MarketingDraft['kind']});
export const draftKey=(c:DraftContext)=>`hoyos.marketing-drafts.v1.${encodeURIComponent(c.tenantId)}.${encodeURIComponent(c.actorId)}.${encodeURIComponent(c.role)}`;
function scope(c:DraftContext){if(c.adapter!=='mock')throw Error('disconnected');if(!c.tenantId||!c.actorId||!draftRoles.includes(c.role as typeof draftRoles[number]))throw Error('denied');}
/** Calendar keys are labels, never browser-local instants. UTC prevents DST/locale drift. */
export function validDay(day:unknown):day is string {if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||day<'1900-01-01'||day>'2199-12-31')return false;const date=new Date(`${day}T00:00:00Z`);return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day;}
export function monthDays(month:string):(string|null)[]{if(!/^\d{4}-\d{2}$/.test(month)||!validDay(`${month}-01`))throw Error('validation');const first=new Date(`${month}-01T00:00:00Z`),out:(string|null)[]=Array(first.getUTCDay()).fill(null),year=first.getUTCFullYear(),m=first.getUTCMonth(),count=new Date(Date.UTC(year,m+1,0)).getUTCDate();for(let d=1;d<=count;d++)out.push(`${month}-${String(d).padStart(2,'0')}`);while(out.length%7)out.push(null);return out;}
export function shiftMonth(month:string,delta:number){monthDays(month);const date=new Date(`${month}-01T00:00:00Z`);date.setUTCMonth(date.getUTCMonth()+delta);const next=date.toISOString().slice(0,7);return validDay(`${next}-01`)?next:month;}
export function blankDraft(kind:MarketingDraft['kind'],id:string):MarketingDraft{return {id,kind,title:{es:'',en:''},body:{es:'',en:''},startOn:null,endOn:null,plannedOn:null,campaignId:null,channel:'',assetIds:[]};}
export function draftErrors(row:MarketingDraft,rows:MarketingDraft[]):string[]{const errors:string[]=[];const bi=(value:unknown,min:number,max:number)=>!!value&&typeof value==='object'&&['es','en'].every(lang=>{const text=(value as Record<string,unknown>)[lang];return typeof text==='string'&&text.trim().length>=min&&text.length<=max;});
 if(!row||typeof row.id!=='string'||!/^[-\w]{1,100}$/.test(row.id)||!['campaign','content'].includes(row.kind))return ['identity'];
 if(!bi(row.title,3,120))errors.push('title');if(!bi(row.body,0,2000))errors.push('body');
 for(const key of ['startOn','endOn','plannedOn'] as const)if(row[key]!==null&&!validDay(row[key]))errors.push(key);
 if(row.startOn&&row.endOn&&row.endOn<row.startOn)errors.push('range');
 if(row.kind==='campaign'&&(row.plannedOn!==null||row.campaignId!==null||row.channel!==''))errors.push('kind');
 if(row.kind==='content'&&(row.startOn!==null||row.endOn!==null))errors.push('kind');
 if(row.campaignId!==null&&!rows.some(r=>r.id===row.campaignId&&r.kind==='campaign'&&r.id!==row.id))errors.push('campaignId');
 if(typeof row.channel!=='string'||row.channel.length>80)errors.push('channel');
 if(!Array.isArray(row.assetIds)||row.assetIds.length>brandReferences.length||new Set(row.assetIds).size!==row.assetIds.length||row.assetIds.some(id=>!brandReferences.some(asset=>asset.id===id)))errors.push('assetIds');return errors;
}
export function readDrafts(storage:DraftStorage,c:DraftContext):DraftSnapshot{scope(c);const raw=storage.getItem(draftKey(c));if(raw===null)return {version:1,tenantId:c.tenantId,actorId:c.actorId,role:c.role,revision:0,rows:[],requests:{}};const value=JSON.parse(raw) as DraftSnapshot;
 if(!value||value.version!==1||value.tenantId!==c.tenantId||value.actorId!==c.actorId||value.role!==c.role||!Number.isInteger(value.revision)||value.revision<0||!Array.isArray(value.rows)||new Set(value.rows.map(r=>r.id)).size!==value.rows.length||!value.requests||Array.isArray(value.requests)||typeof value.requests!=='object'||Object.values(value.requests).some(r=>!r||typeof r.fingerprint!=='string')||value.rows.some(row=>draftErrors(row,value.rows).length))throw Error('read');return value;
}
/** Compare declared saved fields after the existing whitespace normalization. */
function terms(row:MarketingDraft){return [row.id,row.kind,row.title.es.trim(),row.title.en.trim(),row.body.es.trim(),row.body.en.trim(),row.startOn,row.endOn,row.plannedOn,row.campaignId,row.channel.trim(),row.assetIds];}
function effectPresent(snapshot:DraftSnapshot,command:DraftCommand){const row=snapshot.rows.find(r=>r.id===(command.type==='save'?command.row.id:command.id));return command.type==='discard'?!row:!!row&&JSON.stringify(terms(row))===JSON.stringify(terms(command.row));}
/** One scoped localStorage document/write. No cross-tab transaction or backend guarantee. */
export async function runDraftCommand(storage:DraftStorage,context:DraftContext,input:DraftCommand,cancelled:()=>boolean=()=>false):Promise<DraftSnapshot>{
 // Own every control and nested value before the first async boundary, including scope.
 const c=structuredClone(context),command=structuredClone(input);scope(c);
 if(!command||typeof command.requestId!=='string'||!/^[-\w]{1,100}$/.test(command.requestId)||!Number.isInteger(command.expectedRevision)||command.expectedRevision<0||!['save','discard'].includes(command.type))throw Error('validation');
 if((command.type==='save'&&!['create','edit'].includes(command.expect))||(command.type==='discard'&&(typeof command.id!=='string'||!/^[-\w]{1,100}$/.test(command.id)||!['campaign','content'].includes(command.kind))))throw Error('validation');
 const check=()=>{if(cancelled())throw Error('cancelled');};check();
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(command)));
 const fingerprint=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');check();
 const current=readDrafts(storage,c);check();
 if(command.type==='save'&&draftErrors(command.row,current.rows).length)throw Error('validation');
 const previous=Object.prototype.hasOwnProperty.call(current.requests,command.requestId)?current.requests[command.requestId]:undefined;
 if(previous){if(previous.fingerprint!==fingerprint)throw Error('request_conflict');if(!effectPresent(current,command))throw Error('effect_conflict');return current;}
 if(command.expectedRevision!==current.revision)throw Error('revision_conflict');let rows=structuredClone(current.rows);
 if(command.type==='save'){
  const existing=rows.find(r=>r.id===command.row.id);
  if(command.expect==='edit'&&!existing)throw Error('missing');
  if((command.expect==='create'&&existing)||(existing&&existing.kind!==command.row.kind))throw Error('effect_conflict');
  const row=structuredClone(command.row);row.title={es:row.title.es.trim(),en:row.title.en.trim()};row.body={es:row.body.es.trim(),en:row.body.en.trim()};row.channel=row.channel.trim();rows=rows.filter(r=>r.id!==row.id);rows.push(row);
 }else{
  const row=rows.find(r=>r.id===command.id);if(!row)throw Error('missing');if(row.kind!==command.kind)throw Error('effect_conflict');
  if(rows.some(r=>r.campaignId===command.id))throw Error('linked');rows=rows.filter(r=>r.id!==command.id);
 }
 const next:DraftSnapshot={...current,revision:current.revision+1,rows,requests:{...current.requests,[command.requestId]:{fingerprint}}};check();
 storage.setItem(draftKey(c),JSON.stringify(next));
 // A write/ack/readback failure is uncertain. Retry the same request; never rewrite its effect.
 const confirmed=readDrafts(storage,c);
 if(confirmed.revision<next.revision||confirmed.requests[command.requestId]?.fingerprint!==fingerprint||!effectPresent(confirmed,command))throw Error('ack_unconfirmed');
 return confirmed;
}
