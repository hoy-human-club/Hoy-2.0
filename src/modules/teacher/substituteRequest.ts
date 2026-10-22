import type {DataProvider} from '../../data/types';
import type {ClassSessionRow,TeacherRow,UserRow,MessageLogRow} from '../../data/schema';
import {tenant} from '../../tenant/tenant';
import {addDays} from '../../i18n/format';
import {readTeacherClassAccess,type TeacherActor} from './classOwnership';

export interface SubstituteInput {actor:TeacherActor;teacherId:string;sessionId:string;reason:string;requestId:string}
const allowed=(role:string)=>['teacher','coordinator','admin','super_admin'].includes(role);
const eligible=(s:ClassSessionRow,now:number)=>s.status==='scheduled'&&new Date(s.ends_at).getTime()>=now&&new Date(s.starts_at).getTime()<=addDays(new Date(now),7).getTime();
async function identity(data:DataProvider,actor:TeacherActor,teacherId:string){
 if(!allowed(actor.role))throw Error('substitute_denied');
 const [users,teachers]=await Promise.all([
  data.list<UserRow>('users',{where:{tenant_id:tenant.id,id:actor.userId}}),
  data.list<TeacherRow>('teachers',{where:{tenant_id:tenant.id,id:teacherId,...(actor.role==='teacher'?{user_id:actor.userId}:{})}}),
 ]);
 const user=users.filter(u=>u.tenant_id===tenant.id&&u.id===actor.userId),own=teachers.filter(t=>t.tenant_id===tenant.id&&t.id===teacherId&&(actor.role!=='teacher'||t.user_id===actor.userId));
 if(user.length!==1||own.length!==1)throw Error('substitute_unavailable');return own[0];
}
/** The request drawer reads no roster, customer profile or colleague details. */
export async function readSubstituteChoices(data:DataProvider,actor:TeacherActor,teacherId:string,now=Date.now()){
 const teacher=await identity(data,actor,teacherId);
 const sessions=await data.list<ClassSessionRow>('class_sessions',{where:{tenant_id:tenant.id,teacher_id:teacher.id},orderBy:{column:'starts_at'}});
 return sessions.filter(s=>s.tenant_id===tenant.id&&s.teacher_id===teacher.id&&eligible(s,now));
}
async function hash(value:unknown){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
/** Fictional browser transaction, not delivery, substitution approval or server authorization. */
export async function queueSubstituteRequest(data:DataProvider,input:SubstituteInput,cancelled:()=>boolean=()=>false,now?:number){
 if(data.name!=='mock'||!data.atomic)throw Error('substitute_disconnected');
 if(!allowed(input.actor.role))throw Error('substitute_denied');
 if(!input.reason.trim()||!input.requestId||!input.sessionId)throw Error('substitute_validation');
 const fingerprint=await hash([input.actor.userId,input.actor.role,input.teacherId,input.sessionId,input.reason.trim()]);
 const receiptId=`substitute:${encodeURIComponent(tenant.id)}:${encodeURIComponent(input.actor.userId)}:${encodeURIComponent(input.requestId)}`,messageId=receiptId+':message';
 const check=()=>{if(cancelled())throw Error('substitute_cancelled');};check();
 return data.atomic(async tx=>{
  check();const teacher=await identity(tx,input.actor,input.teacherId);
  const {session}=await readTeacherClassAccess(tx,input.actor,input.sessionId);check();
  if(session.teacher_id!==teacher.id)throw Error('substitute_unavailable');
  const prior=await tx.get('audit_log',receiptId),message=await tx.get<MessageLogRow>('message_log',messageId);check();
  if(prior){
   const diff=prior.diff as {fingerprint?:string}|null;
   if(prior.tenant_id!==tenant.id||prior.actor_id!==input.actor.userId||prior.action!=='substitution.request'||diff?.fingerprint!==fingerprint)throw Error('substitute_request_conflict');
   if(!message||message.tenant_id!==tenant.id||message.user_id!==null||message.template_key!=='substitution_request'||message.payload?.session_id!==session.id||message.payload?.teacher_id!==teacher.id)throw Error('substitute_incomplete');
   return {status:'queued' as const,messageId,receiptId};
  }
  if(message)throw Error('substitute_incomplete');
  if(!eligible(session,now??Date.now()))throw Error('substitute_unavailable');
  await tx.insert('audit_log',{id:receiptId,tenant_id:tenant.id,actor_id:input.actor.userId,action:'substitution.request',entity:'class_sessions',entity_id:session.id,ip:null,diff:{role:input.actor.role,source:'teacher_app',mock:true,teacher_id:teacher.id,message_id:messageId,fingerprint,status:'queued'}});check();
  await tx.insert<MessageLogRow>('message_log',{id:messageId,tenant_id:tenant.id,user_id:null,channel:'whatsapp',direction:'inbound',source:'system',template_key:'substitution_request',automation_id:null,subject:null,body:`${teacher.display_name} · ${session.title} · ${input.reason.trim()}`,status:'queued',sent_at:null,sent_by:null,read_at:null,read_by:null,external_id:null,payload:{to:'coordinator',teacher:teacher.display_name,teacher_id:teacher.id,class:session.title,session_id:session.id,starts_at:session.starts_at,reason:input.reason.trim(),mock:true}});check();
  return {status:'queued' as const,messageId,receiptId};
 });
}
