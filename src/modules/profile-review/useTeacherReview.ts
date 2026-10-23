import{useCallback,useEffect,useRef,useState}from'react';
import{useData}from'../../data/DataContext';import{useSession}from'../../auth/SessionProvider';
import{readTeacherProposals,teacherProfileCommand,type TeacherDraft}from'./contracts';
import{useReviewLoad}from'./useReviewLoad';
export function useTeacherReview(){
 const data=useData(),{user,role}=useSession(),key=user.id+':'+role;
 const read=useCallback(()=>readTeacherProposals(data,{id:user.id,role}),[data,user.id,role]);
 const loaded=useReviewLoad(data,key,['teachers','teacher_profile_proposals','modalities'],read);
 const[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[saved,setSaved]=useState(false);
 const attempt=useRef<{cancelled:boolean}|null>(null),request=useRef<{intent:string;id:string}|null>(null);
 useEffect(()=>{setBusy(false);setError(null);setSaved(false);request.current=null;return()=>{if(attempt.current)attempt.current.cancelled=true;attempt.current=null;};},[data,key]);
 const command=async(input:{kind:'submit'|'approve'|'reject'|'cancel';teacherId?:string;proposalId?:string;expected?:string;draft?:TeacherDraft;reason?:string})=>{
  if(attempt.current||loaded.status!=='ready')return;
  const intent=JSON.stringify(input);if(request.current?.intent!==intent)request.current={intent,id:crypto.randomUUID()};
  const context={cancelled:false};attempt.current=context;setBusy(true);setError(null);setSaved(false);
  try{await teacherProfileCommand(data,{...input,actor:{id:user.id,role},requestId:request.current.id},()=>context.cancelled);if(!context.cancelled&&attempt.current===context){setSaved(true);request.current=null;}}
  catch(e){if(!context.cancelled&&attempt.current===context){const message=String(e);setError(message.includes('review_stale')?'review.stale':message.includes('review_closed')||message.includes('review_pending')?'teacherReview.closed':message.includes('review_reason')?'teacherReview.reasonRequired':'review.error');}}
  finally{if(attempt.current===context){attempt.current=null;setBusy(false);}}
 };
 const submit=async(teacherId:string,draft:TeacherDraft,expected:string)=>{await command({kind:'submit',teacherId,expected,draft});};
 const cancelRequest=()=>{if(attempt.current)attempt.current.cancelled=true;attempt.current=null;setBusy(false);setError('review.cancelled');};
 return{...loaded,busy,error,saved,submit,command,cancelRequest};
}
