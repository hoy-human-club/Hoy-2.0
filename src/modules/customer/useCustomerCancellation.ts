import{useEffect,useRef,useState}from'react';
import{useData}from'../../data/DataContext';
import{useSession}from'../../auth/SessionProvider';
import{useI18n}from'../../i18n/I18nProvider';
import{formatDateTime}from'../../i18n/format';
import type{CustomerCancellationPhase,CancellationPresentation}from'../../components/organism/CustomerCancellationReview/CustomerCancellationReview';
import{readCustomerCancellation,cancelOwnBooking,type CancellationCommand,type CancellationReview,type CancellationOutcome}from'./customerCancellation';
/** Own control lifecycle survives the booking's postcommit status changing while the Drawer is open. */
export function useCustomerCancellation(bookingId:string,sessionId:string,enabled:boolean){
 const data=useData(),{user,role}=useSession(),{lang}=useI18n();
 const live=useRef({data,actorId:user.id,role,bookingId,sessionId});live.current={data,actorId:user.id,role,bookingId,sessionId};
 const mounted=useRef(false),serial=useRef(0),inFlight=useRef(false),controller=useRef<AbortController|null>(null);
 const[phase,setPhase]=useState<CustomerCancellationPhase>('loading'),[review,setReview]=useState<CancellationReview|null>(null),[command,setCommand]=useState<CancellationCommand|null>(null),[result,setResult]=useState<CancellationOutcome|null>(null);
 const currentActor=()=>({actorId:live.current.data===data&&live.current.bookingId===bookingId&&live.current.sessionId===sessionId?live.current.actorId:'',role:live.current.role});
 const current=(id:number)=>mounted.current&&serial.current===id;
 const read=async()=>{
  if(inFlight.current)return;inFlight.current=true;const id=++serial.current;controller.current?.abort();const control=new AbortController();controller.current=control;setPhase('loading');setReview(null);setCommand(null);setResult(null);
  try{const next=await readCustomerCancellation(data,{actorId:user.id,role},bookingId,sessionId,{signal:control.signal,currentActor});if(current(id)){setReview(next);setPhase('ready');}}
  catch{if(current(id))setPhase('read_error');}
  finally{if(current(id))inFlight.current=false;}
 };
 useEffect(()=>{mounted.current=true;setCommand(null);setReview(null);setResult(null);if(enabled)void read();return()=>{mounted.current=false;serial.current++;controller.current?.abort();inFlight.current=false;};},[data,user.id,role,bookingId,sessionId,enabled]);
 const execute=async(retry=false):Promise<CancellationOutcome|undefined>=>{
  if(inFlight.current||!enabled)return;
  const intent=retry?command:review&&review.verifiable?{actorId:user.id,role,bookingId,sessionId,requestId:crypto.randomUUID(),expected:review.expected,late:review.late,returnsClass:review.returnsClass,waitlistBookable:review.waitlistBookable}:null;if(!intent)return;
  const id=++serial.current,control=new AbortController();controller.current?.abort();controller.current=control;inFlight.current=true;setCommand(intent);setPhase('busy');setResult(null);
  try{const value=await cancelOwnBooking(data,intent,{signal:control.signal,currentActor});if(current(id)){setResult(value);setPhase('success');return value;}}
  catch(error){if(current(id)){const message=(error as Error).message;setPhase(message==='customer_cancel_stale'?'stale':message==='customer_cancel_unavailable'?'unavailable':'unconfirmed');}}
  finally{if(current(id))inFlight.current=false;}
  return undefined;
 };
 const stop=()=>{serial.current++;controller.current?.abort();inFlight.current=false;setPhase('stopped');};
 const presentation:CancellationPresentation|null=review?{late:review.late,returnsClass:review.returnsClass,verifiable:review.verifiable,deadline:formatDateTime(review.deadline,lang),expiresAt:review.expiresAt,frozen:review.frozen,waitlistBookable:review.waitlistBookable}:null;
 return{phase,review:presentation,result,busy:phase==='busy'||phase==='loading'&&enabled,hasCommand:!!command,confirm:()=>execute(false),retry:()=>execute(true),reload:read,stop};
}
