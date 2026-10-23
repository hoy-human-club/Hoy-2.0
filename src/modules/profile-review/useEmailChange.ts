import{useCallback,useEffect,useRef,useState}from'react';
import{useData}from'../../data/DataContext';
import{useSession}from'../../auth/SessionProvider';
import{changeFictionalEmail,fictionalEmail,readEmailPreview}from'./contracts';
import{useReviewLoad}from'./useReviewLoad';
export function useEmailChange(){
 const data=useData(),{user,role}=useSession(),key=user.id+':'+role;
 const read=useCallback(()=>readEmailPreview(data,{id:user.id,role}),[data,user.id,role]);
 const loaded=useReviewLoad(data,key,['users','email_change_previews'],read);
 const[target,setTarget]=useState(''),[mode,setMode]=useState<'edit'|'review'|'saving'|'complete'>('edit'),[confirmed,setConfirmed]=useState(false),[error,setError]=useState<string|null>(null);
 const attempt=useRef<{cancelled:boolean}|null>(null),review=useRef<{previous:string;next:string;requestId:string}|null>(null);
 useEffect(()=>{setTarget('');setMode('edit');setConfirmed(false);setError(null);review.current=null;return()=>{if(attempt.current)attempt.current.cancelled=true;attempt.current=null;};},[data,key]);
 const cancel=()=>{if(attempt.current)attempt.current.cancelled=true;attempt.current=null;review.current=null;setMode('edit');setConfirmed(false);setError('review.cancelled');};
 const start=()=>{if(loaded.status!=='ready'||!loaded.value||attempt.current)return;const next=target.trim().toLowerCase(),previous=loaded.value.email.toLowerCase();if(!fictionalEmail(next)||!fictionalEmail(previous)||next===previous){setError('emailChange.invalid');return;}review.current={previous,next,requestId:crypto.randomUUID()};setError(null);setConfirmed(false);setMode('review');};
 const save=async()=>{
  if(!review.current||!confirmed||attempt.current||loaded.status!=='ready')return;
  const context={cancelled:false};attempt.current=context;setMode('saving');setError(null);
  try{await changeFictionalEmail(data,{actor:{id:user.id,role},...review.current,confirmed:true},()=>context.cancelled);if(!context.cancelled&&attempt.current===context){setMode('complete');setTarget('');setConfirmed(false);review.current=null;}}
  catch(e){if(!context.cancelled&&attempt.current===context){const message=String(e);setError(message.includes('email_duplicate')?'emailChange.duplicate':message.includes('email_stale')?'review.stale':'review.error');setMode('review');}}
  finally{if(attempt.current===context)attempt.current=null;}
 };
 return{status:loaded.status,email:loaded.value?.email??'',preview:loaded.value?.preview??null,target,setTarget,mode,confirmed,setConfirmed,error,previous:review.current?.previous??'',next:review.current?.next??'',retry:loaded.retry,start,save:()=>void save(),cancel};
}
