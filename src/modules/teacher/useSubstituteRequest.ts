import {useEffect,useRef,useState} from 'react';
import type {DataProvider} from '../../data/types';
import type {ClassSessionRow} from '../../data/schema';
import type {TeacherActor} from './classOwnership';
import {queueSubstituteRequest,readSubstituteChoices} from './substituteRequest';
const empty=()=>({open:false,session:'',reason:'',sent:false,busy:false,load:'loading' as 'loading'|'ready'|'error',error:false,choices:[] as ClassSessionRow[]});
/** An open drawer owns one cancellable intent. Changed input starts a new replay identity. */
export function useSubstituteRequest(data:DataProvider,actor:TeacherActor,teacherId:string|undefined){
 const [state,setState]=useState(empty);
 const key=`${actor.userId}|${actor.role}|${teacherId??''}`,context=useRef(key);context.current=key;const provider=useRef(data);provider.current=data;
 const attempt=useRef<{cancelled:boolean;saving:boolean;requestId:string;key:string;generation:number;provider:DataProvider}|null>(null);
 const cancel=()=>{if(attempt.current)attempt.current.cancelled=true;attempt.current=null;setState(empty());};
 useEffect(()=>{setState(empty());return()=>{if(attempt.current)attempt.current.cancelled=true;attempt.current=null;};},[data,key]);
 const valid=(a:NonNullable<typeof attempt.current>)=>attempt.current===a&&!a.cancelled&&context.current===a.key&&provider.current===a.provider;
 const load=async(a:NonNullable<typeof attempt.current>)=>{
  if(!teacherId)return;const generation=++a.generation;setState(s=>({...s,load:'loading',choices:[]}));
  try{const choices=await readSubstituteChoices(data,actor,teacherId);if(valid(a)&&a.generation===generation)setState(s=>({...s,load:'ready',choices,session:choices.some(c=>c.id===s.session)?s.session:choices[0]?.id??''}));}
  catch{if(valid(a)&&a.generation===generation)setState(s=>({...s,load:'error',choices:[]}));}
 };
 const open=()=>{if(attempt.current)attempt.current.cancelled=true;const a={cancelled:false,saving:false,requestId:crypto.randomUUID(),key,generation:0,provider:data};attempt.current=a;setState({...empty(),open:true});void load(a);};
 const change=(patch:{session?:string;reason?:string})=>{const a=attempt.current;if(!a||a.saving||!valid(a))return;a.requestId=crypto.randomUUID();setState(s=>({...s,...patch,error:false}));};
 const send=async()=>{
  const a=attempt.current;if(!teacherId||!a||!valid(a)||a.saving||state.load!=='ready'||!state.session||!state.reason.trim())return;
  a.saving=true;setState(s=>({...s,busy:true,error:false}));
  try{await queueSubstituteRequest(data,{actor,teacherId,sessionId:state.session,reason:state.reason,requestId:a.requestId},()=>!valid(a));if(valid(a))setState(s=>({...s,sent:true}));}
  catch{if(valid(a))setState(s=>({...s,error:true}));}
  finally{a.saving=false;if(valid(a))setState(s=>({...s,busy:false}));}
 };
 return {...state,openDrawer:open,close:cancel,change,send,retry:()=>{if(attempt.current)void load(attempt.current);}};
}
