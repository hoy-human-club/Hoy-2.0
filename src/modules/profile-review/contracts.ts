import type{DataProvider}from'../../data/types';
import type{BaseRow,UserRow,TeacherRow,ModalityRow}from'../../data/schema';
import{tenant}from'../../tenant/tenant';
export interface ReviewActor {id:string;role:string}
export async function hash(value:unknown){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function mockOnly(data:DataProvider){if(data.name!=='mock'||!data.atomic)throw Error('review_disconnected');}
export async function actorAllowed(data:DataProvider,actor:ReviewActor,roles:string[]){
 if(!roles.includes(actor.role))throw Error('review_denied');
 const user=await data.get<UserRow>('users',actor.id),grants=await data.list('user_roles',{where:{tenant_id:tenant.id,user_id:actor.id}});
 if(!user||user.tenant_id!==tenant.id||user.status!=='active'||!grants.some(g=>g.tenant_id===tenant.id&&g.user_id===actor.id&&(g.role===actor.role||g.role==='super_admin')))throw Error('review_denied');
 return user;
}
export const fictionalEmail=(email:string)=>/^[^@\s]+@(?:[a-z0-9-]+\.)+(?:test|invalid)$/i.test(email);
export interface EmailPreview extends BaseRow {user_id:string;previous_email:string;next_email:string;changed_at:string;status:'preview'}
export async function readEmailPreview(data:DataProvider,actor:ReviewActor){
 mockOnly(data);const user=await actorAllowed(data,actor,['customer','teacher','super_admin']);
 const rows=await data.list<EmailPreview>('email_change_previews',{where:{tenant_id:tenant.id,user_id:actor.id},orderBy:{column:'changed_at',dir:'desc'}});
 return{email:user.email,preview:rows.reverse().sort((a,b)=>b.changed_at.localeCompare(a.changed_at)).find(r=>r.tenant_id===tenant.id&&r.user_id===actor.id)??null};
}
export async function changeFictionalEmail(data:DataProvider,input:{actor:ReviewActor;previous:string;next:string;confirmed:boolean;requestId:string},cancelled=()=>false){
 mockOnly(data);const v=structuredClone(input);v.previous=v.previous.trim().toLowerCase();v.next=v.next.trim().toLowerCase();
 if(!v.confirmed||!fictionalEmail(v.previous)||!fictionalEmail(v.next)||v.previous===v.next||!v.requestId)throw Error('email_invalid');
 const fingerprint=await hash(v),id=`email_change_${tenant.id}_${v.actor.id}_${v.requestId}`,check=()=>{if(cancelled())throw Error('review_cancelled');};check();
 return data.atomic!(async tx=>{
  const user=await actorAllowed(tx,v.actor,['customer','teacher','super_admin']);check();
  const receipt=await tx.get('audit_log',id);check();
  if(receipt){if(receipt.tenant_id!==tenant.id||receipt.actor_id!==v.actor.id||(receipt.diff as{fingerprint?:string}).fingerprint!==fingerprint)throw Error('review_conflict');const preview=await tx.get<EmailPreview>('email_change_previews',id);check();if(!preview||preview.tenant_id!==tenant.id||preview.user_id!==v.actor.id||preview.next_email!==user.email)throw Error('review_conflict');return preview;}
  if(user.email.toLowerCase()!==v.previous)throw Error('email_stale');
  const others=await tx.list<UserRow>('users',{where:{tenant_id:tenant.id}});check();if(others.some(u=>u.tenant_id===tenant.id&&u.id!==user.id&&u.email.toLowerCase()===v.next))throw Error('email_duplicate');
  const now=new Date().toISOString();await tx.update('users',user.id,{email:v.next});check();
  const preview=await tx.insert<EmailPreview>('email_change_previews',{id,user_id:user.id,previous_email:v.previous,next_email:v.next,changed_at:now,status:'preview'});check();
  await tx.insert('audit_log',{id,actor_id:user.id,action:'mock.email.changed',entity:'users',entity_id:user.id,ip:null,diff:{fingerprint,source:'fictional-email-change',previewId:preview.id,delivery:'preview-only'}});check();return preview;
 });
}
export interface TeacherDraft {display_name:string;bio:{es:string;en:string};specialties:string[]}
export interface TeacherProposal extends BaseRow {teacher_id:string;submitted_by:string;expected:string;proposed:TeacherDraft;status:'pending'|'approved'|'rejected'|'cancelled';reviewed_by:string|null;reviewed_at:string|null;reason:string|null}
export const reviewer=(role:string)=>['admin','coordinator','super_admin'].includes(role);
export const teacherFields=(row:TeacherRow):TeacherDraft=>({display_name:row.display_name,bio:row.bio,specialties:row.specialties});
export const teacherRevision=(row:TeacherRow)=>hash(teacherFields(row));
export async function readTeacherProposals(data:DataProvider,actor:ReviewActor){
 mockOnly(data);await actorAllowed(data,actor,['teacher','admin','coordinator','super_admin']);
 const teachers=await data.list<TeacherRow>('teachers',{where:{tenant_id:tenant.id,...(actor.role==='teacher'?{user_id:actor.id}:{})}});
 const owned=teachers.filter(t=>t.tenant_id===tenant.id&&(actor.role!=='teacher'||t.user_id===actor.id));
 const raw=await data.list<TeacherProposal>('teacher_profile_proposals',{where:{tenant_id:tenant.id,...(actor.role==='teacher'?{submitted_by:actor.id}:{})},orderBy:{column:'created_at',dir:'desc'}});
 const modalities=await data.list<ModalityRow>('modalities',{where:{tenant_id:tenant.id}});
 return {modalities:modalities.filter(m=>m.tenant_id===tenant.id),teachers:owned,proposals:raw.reverse().sort((a,b)=>b.created_at.localeCompare(a.created_at)).filter(p=>p.tenant_id===tenant.id&&owned.some(t=>t.id===p.teacher_id)&&(actor.role!=='teacher'||p.submitted_by===actor.id))};
}
export async function teacherProfileCommand(data:DataProvider,input:{actor:ReviewActor;requestId:string;kind:'submit'|'approve'|'reject'|'cancel';teacherId?:string;proposalId?:string;expected?:string;draft?:TeacherDraft;reason?:string},cancelled=()=>false){
 mockOnly(data);const v=structuredClone(input);if(!v.requestId)throw Error('review_invalid');
 const fingerprint=await hash(v),id=`teacher_profile_${tenant.id}_${v.actor.id}_${v.requestId}`,check=()=>{if(cancelled())throw Error('review_cancelled');};check();
 return data.atomic!(async tx=>{
  await actorAllowed(tx,v.actor,v.kind==='submit'||v.kind==='cancel'?['teacher']:['admin','coordinator','super_admin']);check();
  const prior=await tx.get('audit_log',id);check();
  if(prior){if(prior.tenant_id!==tenant.id||prior.actor_id!==v.actor.id||(prior.diff as{fingerprint?:string}).fingerprint!==fingerprint)throw Error('review_conflict');const row=await tx.get<TeacherProposal>('teacher_profile_proposals',String(prior.entity_id));check();if(!row||row.tenant_id!==tenant.id||(v.actor.role==='teacher'&&row.submitted_by!==v.actor.id))throw Error('review_conflict');return row;}
  let proposal:TeacherProposal;
  if(v.kind==='submit'){
   const teacher=await tx.get<TeacherRow>('teachers',v.teacherId??'');check();if(!teacher||teacher.tenant_id!==tenant.id||teacher.user_id!==v.actor.id)throw Error('review_denied');
   if(!v.draft||Object.keys(v.draft).some(k=>!['display_name','bio','specialties'].includes(k))||!v.draft.display_name.trim()||!v.draft.bio?.es.trim()||!Array.isArray(v.draft.specialties)||new Set(v.draft.specialties).size!==v.draft.specialties.length)throw Error('review_invalid');
   const mods=await tx.list('modalities',{where:{tenant_id:tenant.id,active:true}});check();if(v.draft.specialties.some(s=>!mods.some(m=>m.id===s&&m.tenant_id===tenant.id)))throw Error('review_invalid');
   const expected=await teacherRevision(teacher);check();if(expected!==v.expected)throw Error('review_stale');
   const pending=await tx.list<TeacherProposal>('teacher_profile_proposals',{where:{tenant_id:tenant.id,teacher_id:teacher.id,status:'pending'}});check();if(pending.some(p=>p.tenant_id===tenant.id&&p.teacher_id===teacher.id&&p.status==='pending'))throw Error('review_pending');
   const proposed={display_name:v.draft.display_name.trim(),bio:{es:v.draft.bio.es.trim(),en:v.draft.bio.en.trim()||v.draft.bio.es.trim()},specialties:v.draft.specialties};
   proposal=await tx.insert<TeacherProposal>('teacher_profile_proposals',{id,teacher_id:teacher.id,submitted_by:v.actor.id,expected,proposed,status:'pending',reviewed_by:null,reviewed_at:null,reason:null});check();
  }else{
   const row=await tx.get<TeacherProposal>('teacher_profile_proposals',v.proposalId??'');check();if(!row||row.tenant_id!==tenant.id)throw Error('review_missing');
   const teacher=await tx.get<TeacherRow>('teachers',row.teacher_id);check();if(!teacher||teacher.tenant_id!==tenant.id||(v.kind==='cancel'&&(row.submitted_by!==v.actor.id||teacher.user_id!==v.actor.id)))throw Error('review_denied');
   if(row.status!=='pending')throw Error('review_closed');
   if(v.kind==='reject'&&!v.reason?.trim())throw Error('review_reason');
   if(v.kind==='approve'){if(!row.proposed||Object.keys(row.proposed).some(k=>!['display_name','bio','specialties'].includes(k))||typeof row.proposed.display_name!=='string'||!row.proposed.display_name.trim()||typeof row.proposed.bio?.es!=='string'||!row.proposed.bio.es.trim()||typeof row.proposed.bio.en!=='string'||!Array.isArray(row.proposed.specialties)||new Set(row.proposed.specialties).size!==row.proposed.specialties.length)throw Error('review_invalid');const mods=await tx.list('modalities',{where:{tenant_id:tenant.id,active:true}});if(row.proposed.specialties.some(s=>!mods.some(m=>m.id===s&&m.tenant_id===tenant.id)))throw Error('review_invalid');if(await teacherRevision(teacher)!==row.expected)throw Error('review_stale');check();await tx.update<TeacherRow>('teachers',teacher.id,{...row.proposed});check();}
   proposal=await tx.update<TeacherProposal>('teacher_profile_proposals',row.id,{status:v.kind==='approve'?'approved':v.kind==='reject'?'rejected':'cancelled',reviewed_by:v.actor.id,reviewed_at:new Date().toISOString(),reason:v.kind==='reject'?v.reason!.trim():null});check();
  }
  await tx.insert('audit_log',{id,actor_id:v.actor.id,action:`teacher.profile.${v.kind}`,entity:'teacher_profile_proposals',entity_id:proposal.id,ip:null,diff:{fingerprint,teacherId:proposal.teacher_id,status:proposal.status,source:'fictional-profile-review'}});check();return proposal;
 });
}
