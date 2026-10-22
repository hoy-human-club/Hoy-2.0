/** Browser-only edit/rollback of existing templates. No catalog creation or delivery. */
import type {DataProvider} from '../../data/types';
import type {BaseRow,UserRow} from '../../data/schema';
import type {Role} from '../../auth/roles';
import {roleCan} from '../../auth/permissions';
import {tenant} from '../../tenant/tenant';
import {EMAIL_AUDIENCES,EMAIL_PRIORITIES} from '../../data/emailCatalog';
import {emailDigest,type EmailRow} from './emailTest';
export interface EmailEditActor{id:string;role:Role}
export const EMAIL_EDIT_FIELDS=['name','audience','priority','trigger','subject','body_mjml','active'] as const;
export type EmailPatch=Pick<EmailRow,(typeof EMAIL_EDIT_FIELDS)[number]>;
export interface EmailVersionAudit extends BaseRow{actor_id:string|null;action:string;entity:string;entity_id:string|null;diff:Record<string,unknown>|null}
export type EmailEditIntent={kind:'edit';basis:EmailRow;patch:EmailPatch}|{kind:'rollback';basis:EmailRow;target:EmailVersionAudit};
const pick=(r:EmailRow)=>Object.fromEntries(EMAIL_EDIT_FIELDS.map(k=>[k,r[k]]));
const terms=(r:EmailRow)=>[r.id,r.tenant_id,r.key,r.version,pick(r)];
const auditTerms=(r:EmailVersionAudit)=>[r.id,r.tenant_id,r.actor_id,r.action,r.entity,r.entity_id,r.diff];
function guard(data:DataProvider,actor:EmailEditActor){if(data.name!=='mock'||!data.atomic)throw Error('email_edit_disconnected');if(!actor.id||!roleCan(actor.role,'content.write'))throw Error('email_edit_denied');}
async function owned(data:DataProvider,actor:EmailEditActor){guard(data,actor);const users=await data.list<UserRow>('users',{where:{tenant_id:tenant.id,id:actor.id}});if(users.length!==1||users[0].tenant_id!==tenant.id||users[0].id!==actor.id)throw Error('email_edit_missing');}
export async function readEmailEdit(data:DataProvider,actor:EmailEditActor,id:string){actor={...actor};await owned(data,actor);const rows=await data.list<EmailRow>('email_templates',{where:{tenant_id:tenant.id,id}});if(rows.length!==1||rows[0].tenant_id!==tenant.id||rows[0].id!==id)throw Error('email_edit_missing');const row=rows[0];if(!Number.isSafeInteger(row.version)||row.version<1||row.version>=Number.MAX_SAFE_INTEGER||typeof row.key!=='string'||typeof row.name!=='string'||typeof row.trigger!=='string'||typeof row.subject?.es!=='string'||typeof row.body_mjml!=='string'||typeof row.active!=='boolean')throw Error('email_edit_invalid');await owned(data,actor);return row;}
function validatePatch(value:unknown,edit:boolean):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('email_edit_unsupported');const patch=structuredClone(value) as Record<string,unknown>,keys=Object.keys(patch);
 if(!keys.length||keys.some(k=>!EMAIL_EDIT_FIELDS.includes(k as typeof EMAIL_EDIT_FIELDS[number]))||edit&&EMAIL_EDIT_FIELDS.some(k=>!keys.includes(k)))throw Error('email_edit_unsupported');
 for(const key of keys){const v=patch[key];if(['name','trigger','body_mjml'].includes(key)&&typeof v!=='string'||key==='active'&&typeof v!=='boolean'||key==='audience'&&v!==undefined&&!EMAIL_AUDIENCES.includes(v as never)||key==='priority'&&v!==undefined&&v!==null&&!EMAIL_PRIORITIES.includes(v as never)||key==='subject'&&(!v||typeof v!=='object'||Array.isArray(v)||typeof (v as {es?:unknown}).es!=='string'||(v as {en?:unknown}).en!==undefined&&typeof (v as {en?:unknown}).en!=='string'))throw Error('email_edit_unsupported');}
 if(edit){let body:{es?:unknown;en?:unknown};try{body=JSON.parse(patch.body_mjml as string);}catch{throw Error('email_edit_invalid');}const subject=patch.subject as {es:string;en?:string};if(typeof body?.es!=='string'||!body.es.trim()||!subject.es.trim()||body.en!==undefined&&typeof body.en!=='string')throw Error('email_edit_invalid');patch.active=patch.active===true&&!!subject.en?.trim()&&typeof body.en==='string'&&!!body.en.trim();}
 return patch;
}
async function rollbackTarget(data:DataProvider,id:string,templateId:string){const row=await data.get<EmailVersionAudit>('audit_log',id);if(!row||row.tenant_id!==tenant.id||row.entity!=='email_templates'||row.entity_id!==templateId||row.action!=='email_template.update'||!row.diff?.before)throw Error('email_edit_missing');validatePatch(row.diff.before,false);return row;}
export async function writeEmailVersion(data:DataProvider,actor:EmailEditActor,intent:EmailEditIntent,requestId:string,cancelled:()=>boolean=()=>false,options:{failAfterWrites?:number}={}){
 actor={...actor};intent=structuredClone(intent);guard(data,actor);if(!requestId||requestId.length>128||!['edit','rollback'].includes(intent.kind)||intent.basis.tenant_id!==tenant.id||!intent.basis.id)throw Error('email_edit_invalid');
 const check=()=>{if(cancelled())throw Error('email_edit_cancelled');};check();await owned(data,actor);check();const expected=await emailDigest(terms(intent.basis));check();
 const patch=intent.kind==='edit'?validatePatch(intent.patch,true):validatePatch(intent.target.diff?.before,false),targetExpected=intent.kind==='rollback'?await emailDigest(auditTerms(intent.target)):null;check();
 if(intent.kind==='rollback'&&(intent.target.tenant_id!==tenant.id||intent.target.entity!=='email_templates'||intent.target.entity_id!==intent.basis.id||intent.target.action!=='email_template.update'))throw Error('email_edit_missing');
 const fingerprint=await emailDigest({actor,kind:intent.kind,id:intent.basis.id,expected,patch,target:intent.kind==='rollback'?intent.target.id:null,targetExpected});check();
 const auditId=`email-version:${encodeURIComponent(tenant.id)}:${encodeURIComponent(actor.id)}:${encodeURIComponent(requestId)}`;
 const receipt=await data.atomic!(async tx=>{
  check();const row=await readEmailEdit(tx,actor,intent.basis.id);check();if(await emailDigest(terms(row))!==expected)throw Error('email_edit_stale');check();
  if(intent.kind==='rollback'){const target=await rollbackTarget(tx,intent.target.id,row.id);check();if(await emailDigest(auditTerms(target))!==targetExpected)throw Error('email_edit_stale');check();}
  const version=row.version+1;await tx.update('email_templates',row.id,{...patch,version});check();
  const audit=await tx.insert<EmailVersionAudit>('audit_log',{id:auditId,tenant_id:tenant.id,actor_id:actor.id,action:intent.kind==='edit'?'email_template.update':'email_template.rollback',entity:'email_templates',entity_id:row.id,ip:null,diff:{role:actor.role,source:'admin',...(intent.kind==='edit'?{before:pick(row),after:patch,version}:{to:intent.target.id,version})}});check();
  const current=await readEmailEdit(tx,actor,row.id);check();const resultRevision=await emailDigest(terms(current)),auditRevision=await emailDigest(auditTerms(audit));check();return {protocol:1,fingerprint,actorId:actor.id,role:actor.role,tenantId:tenant.id,templateId:row.id,resultVersion:version,resultRevision,auditId,auditRevision};
 },{idempotencyKey:`email-version_${actor.id}_${requestId}`,...options});check();
 if(!receipt||receipt.protocol!==1||receipt.fingerprint!==fingerprint||receipt.actorId!==actor.id||receipt.role!==actor.role||receipt.tenantId!==tenant.id||receipt.templateId!==intent.basis.id||receipt.auditId!==auditId||!Number.isSafeInteger(receipt.resultVersion)||receipt.resultVersion!==intent.basis.version+1||typeof receipt.resultRevision!=='string'||typeof receipt.auditRevision!=='string')throw Error('email_edit_conflict');
 if(intent.kind==='rollback'){const target=await rollbackTarget(data,intent.target.id,intent.basis.id);check();if(await emailDigest(auditTerms(target))!==targetExpected)throw Error('email_edit_unconfirmed');check();}
 const current=await readEmailEdit(data,actor,receipt.templateId),audit=await data.get<EmailVersionAudit>('audit_log',auditId);check();if(current.version!==receipt.resultVersion||await emailDigest(terms(current))!==receipt.resultRevision||!audit||audit.tenant_id!==tenant.id||audit.actor_id!==actor.id||audit.entity_id!==current.id||await emailDigest(auditTerms(audit))!==receipt.auditRevision)throw Error('email_edit_unconfirmed');check();await owned(data,actor);check();
 return current;
}
