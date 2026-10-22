import type {DataProvider} from '../../data/types';
import type {BaseRow,MessageLogRow,UserRow} from '../../data/schema';
import type {Bi} from '../../specs/types';
import {tenant} from '../../tenant/tenant';
import {emailEntry,sampleFor,type EmailAudience,type EmailPriority} from '../../data/emailCatalog';
export interface EmailRow extends BaseRow {key:string;name:string;audience?:EmailAudience;trigger:string;priority?:EmailPriority|null;subject:Bi;body_mjml:string;version:number;active:boolean}
export interface ParsedBody {es:string;en:string;cta?:{label:Bi;href:string}}
/** Shared saved-template fallback contract, including legacy catalog bodies. */
export function parseEmailBody(row:EmailRow):ParsedBody {
 try{const j=JSON.parse(row.body_mjml);if(j&&typeof j.es==='string')return j;}catch{/* legacy plain/MJML body */}
 const std=emailEntry(row.key);if(std)return{es:std.body.es,en:std.body.en,cta:std.cta};
 return{es:row.body_mjml.startsWith('<')?'':row.body_mjml,en:''};
}
export const emailTestRoles=['admin','coordinator','marketing','super_admin'];
export async function emailDigest(value:unknown){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
const templateTerms=(r:EmailRow)=>[r.id,r.tenant_id,r.key,r.name,r.audience??null,r.trigger,r.priority??null,r.subject,r.body_mjml,r.version,r.active];
const render=(text:string,vars:Record<string,string>)=>text.replace(/\{\{\s*([\w.]+)\s*\}\}/g,(token,key:string)=>vars[key]??token);
export interface EmailTestActor {id:string;role:string}
export interface FrozenEmailTest {templateId:string;key:string;version:number;locale:'es'|'en';recipient:string;subject:string;body:string;cta?:{label:string;href:string};templateRevision:string;accountRevision:string}
async function readRows(data:DataProvider,actor:EmailTestActor,templateId:string){
 if(!emailTestRoles.includes(actor.role))throw Error('email_test_denied');
 const [accounts,templates]=await Promise.all([data.list<UserRow>('users',{where:{tenant_id:tenant.id,id:actor.id}}),data.list<EmailRow>('email_templates',{where:{tenant_id:tenant.id,id:templateId}})]);
 const us=accounts.filter(u=>u.tenant_id===tenant.id&&u.id===actor.id),ts=templates.filter(r=>r.tenant_id===tenant.id&&r.id===templateId);
 if(us.length!==1||ts.length!==1||typeof us[0].email!=='string'||!us[0].email||!Number.isInteger(ts[0].version)||ts[0].version<1)throw Error('email_test_missing');
 return{account:us[0],row:ts[0]};
}
async function freeze(account:UserRow,row:EmailRow,locale:'es'|'en'):Promise<FrozenEmailTest>{
 const b=parseEmailBody(row),vars=sampleFor(row.audience??emailEntry(row.key)?.audience??'customer',row.key);
 const subject=locale==='en'?row.subject.en||row.subject.es:row.subject.es,body=locale==='en'?b.en||b.es:b.es;
 if(typeof subject!=='string'||typeof body!=='string'||b.cta&&(typeof b.cta.href!=='string'||typeof b.cta.label?.es!=='string'))throw Error('email_test_invalid');
 const cta=b.cta?{label:render(locale==='en'?b.cta.label.en||b.cta.label.es:b.cta.label.es,vars),href:render(b.cta.href,vars)}:undefined;
 return{templateId:row.id,key:row.key,version:row.version,locale,recipient:account.email,subject:render(subject,vars),body:render(body,vars),cta,templateRevision:await emailDigest(templateTerms(row)),accountRevision:await emailDigest([account.id,account.tenant_id,account.email])};
}
export async function readEmailTest(data:DataProvider,actor:EmailTestActor,templateId:string,locale:'es'|'en',expectedVersion?:number){
 if(locale!=='es'&&locale!=='en')throw Error('email_test_invalid');const {account,row}=await readRows(data,actor,templateId);
 if(expectedVersion!==undefined&&row.version!==expectedVersion)throw Error('email_test_stale');return freeze(account,row,locale);
}
export interface EmailTestInput {actor:EmailTestActor;templateId:string;locale:'es'|'en';templateRevision:string;accountRevision:string;requestId:string}
/** Browser-only simulation. Legacy sent/sent_at are local simulation state, never delivery evidence. */
export async function simulateEmailTest(data:DataProvider,input:EmailTestInput,cancelled:()=>boolean=()=>false){
 if(data.name!=='mock'||!data.atomic)throw Error('email_test_disconnected');if(!emailTestRoles.includes(input.actor.role))throw Error('email_test_denied');
 if(!input.requestId||!input.templateRevision||!input.accountRevision||!['es','en'].includes(input.locale))throw Error('email_test_invalid');
 const fingerprint=await emailDigest([input.actor.id,input.actor.role,input.templateId,input.locale,input.templateRevision,input.accountRevision]);
 const auditId=`email-test:${encodeURIComponent(tenant.id)}:${encodeURIComponent(input.actor.id)}:${encodeURIComponent(input.requestId)}`,messageId=auditId+':message';
 const check=()=>{if(cancelled())throw Error('email_test_cancelled');};check();
 return data.atomic(async tx=>{
  check();const frozen=await readEmailTest(tx,input.actor,input.templateId,input.locale);check();
  if(frozen.accountRevision!==input.accountRevision)throw Error('email_test_stale');
  const [prior,message]=await Promise.all([tx.get('audit_log',auditId),tx.get<MessageLogRow>('message_log',messageId)]);check();
  if(prior){const diff=prior.diff as {fingerprint?:string}|null;if(prior.tenant_id!==tenant.id||prior.actor_id!==input.actor.id||prior.action!=='email_template.test'||prior.entity_id!==input.templateId||diff?.fingerprint!==fingerprint)throw Error('email_test_request_conflict');
   if(!message||message.tenant_id!==tenant.id||message.user_id!==input.actor.id||message.payload?.test!==true||message.payload?.simulation!=='local'||message.payload?.to!==frozen.recipient)throw Error('email_test_incomplete');return{auditId,messageId,status:'sent' as const,simulation:'local' as const};}
  if(message)throw Error('email_test_incomplete');if(frozen.templateRevision!==input.templateRevision)throw Error('email_test_stale');
  const stamp=new Date().toISOString();
  await tx.insert<MessageLogRow>('message_log',{id:messageId,tenant_id:tenant.id,user_id:input.actor.id,channel:'email',direction:'outbound',source:'manual',template_key:frozen.key,automation_id:null,subject:frozen.subject,body:frozen.body,status:'sent',sent_at:stamp,sent_by:input.actor.id,read_at:null,read_by:null,external_id:null,payload:{test:true,to:frozen.recipient,locale:frozen.locale,version:frozen.version,simulation:'local',preview_cta:frozen.cta??null}});check();
  await tx.insert('audit_log',{id:auditId,tenant_id:tenant.id,actor_id:input.actor.id,action:'email_template.test',entity:'email_templates',entity_id:input.templateId,ip:null,diff:{message_id:messageId,locale:frozen.locale,version:frozen.version,status:'sent',simulation:'local',fingerprint,source:'admin',role:input.actor.role}});check();
  return{auditId,messageId,status:'sent' as const,simulation:'local' as const};
 });
}
