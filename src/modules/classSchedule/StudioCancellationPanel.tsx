import {useEffect,useRef,useState} from 'react';
import {useData} from '../../data/DataContext';
import {useSession} from '../../auth/SessionProvider';
import {useI18n} from '../../i18n/I18nProvider';
import type {ClassSessionRow} from '../../data/schema';
import {Card} from '../../components/molecule/Card/Card';
import {Notice} from '../../components/molecule/Notice/Notice';
import {Button} from '../../components/atom/Button/Button';
import {Input} from '../../components/atom/Input/Input';
import {Field} from '../../components/molecule/Field/Field';
import {StudioCancellationReview} from '../../components/organism/StudioCancellationReview/StudioCancellationReview';
import {cancelStudioClass,readStudioImpact,readStudioOccurrence,type StudioActor,type StudioImpact,type StudioIntent} from './studioCancellation';
import {studioStrings as copy} from './studioStrings';

export function StudioCancellationPanel({sessionId,disabled,onBusy,onOccurrence}:{sessionId:string;disabled:boolean;onBusy:(b:boolean)=>void;onOccurrence:(s:ClassSessionRow)=>void}){
 const data=useData(),{user,role}=useSession(),{bi}=useI18n();
 const current=useRef({data,actorId:user.id,role,sessionId});current.current={data,actorId:user.id,role,sessionId};
 const [occurrence,setOccurrence]=useState<ClassSessionRow|null>(null),[review,setReview]=useState<StudioImpact|null>(null),[reason,setReason]=useState(''),[command,setCommand]=useState<StudioIntent|null>(null),[phase,setPhase]=useState('loading'),[busy,setBusy]=useState(false);
 const sequence=useRef(0),running=useRef(false),abort=useRef<AbortController|null>(null),mounted=useRef(false),callbacks=useRef({onBusy,onOccurrence});callbacks.current={onBusy,onOccurrence};
 const allowed=['admin','super_admin'].includes(role);
 const fence=(id:number)=>mounted.current&&id===sequence.current;
 const identity=():StudioActor=>({actorId:current.current.data===data&&current.current.sessionId===sessionId?current.current.actorId:'',role:current.current.role});
 const load=async()=>{
  if(running.current)return;const id=++sequence.current;abort.current?.abort();const controller=new AbortController();abort.current=controller;setPhase('loading');setReview(null);setCommand(null);
  try{const row=await readStudioOccurrence(data,{actorId:user.id,role},sessionId,{signal:controller.signal,currentActor:identity});if(fence(id)){setOccurrence(row);callbacks.current.onOccurrence(row);setPhase('ready');}}
  catch{if(fence(id))setPhase('readError');}
 };
 useEffect(()=>{mounted.current=true;setOccurrence(null);setReason('');void load();return()=>{mounted.current=false;sequence.current++;abort.current?.abort();running.current=false;callbacks.current.onBusy(false);};},[data,user.id,role,sessionId]);
 const start=async(retry=false)=>{
  if(running.current||disabled||!allowed)return;
  const id=++sequence.current,controller=new AbortController();abort.current?.abort();abort.current=controller;running.current=true;setBusy(true);callbacks.current.onBusy(true);setPhase('working');
  try{
   if(!retry){const next=await readStudioImpact(data,{actorId:user.id,role},sessionId,{signal:controller.signal,currentActor:identity});if(fence(id)){setReview(next);setCommand(null);setPhase('review');}}
   else if(command){await cancelStudioClass(data,command,{signal:controller.signal,currentActor:identity});if(fence(id)){const row=await readStudioOccurrence(data,{actorId:user.id,role},sessionId,{signal:controller.signal,currentActor:identity});if(fence(id)){setOccurrence(row);callbacks.current.onOccurrence(row);setPhase('success');}}}
  }catch{if(fence(id))setPhase('error');}
  finally{if(fence(id)){running.current=false;setBusy(false);callbacks.current.onBusy(false);}}
 };
 const confirm=async()=>{
  if(running.current||disabled||!review||review.issues.length||!allowed)return;
  const intent:StudioIntent={actorId:user.id,role,sessionId,requestId:crypto.randomUUID(),expected:review.expected,bookingIds:review.attendees.map(a=>a.booking.id),reason:reason.trim()||null};
  const id=++sequence.current,controller=new AbortController();abort.current?.abort();abort.current=controller;setCommand(intent);running.current=true;setBusy(true);callbacks.current.onBusy(true);setPhase('working');
  try{await cancelStudioClass(data,intent,{signal:controller.signal,currentActor:identity});if(fence(id)){const row=await readStudioOccurrence(data,{actorId:user.id,role},sessionId,{signal:controller.signal,currentActor:identity});if(fence(id)){setOccurrence(row);callbacks.current.onOccurrence(row);setPhase('success');}}}
  catch{if(fence(id))setPhase('error');}
  finally{if(fence(id)){running.current=false;setBusy(false);callbacks.current.onBusy(false);}}
 };
 const stop=()=>{sequence.current++;abort.current?.abort();running.current=false;setBusy(false);callbacks.current.onBusy(false);setPhase('stopped');};
 const eligible=occurrence?.status==='scheduled'&&Date.parse(occurrence.starts_at)>Date.now();
 if(!allowed)return <Notice>{bi(copy.denied)}</Notice>;
 return <Card title={bi(copy.title)}><div className="stack" data-studio-cancellation data-phase={phase} aria-busy={busy}><p>{bi(copy.boundary)}</p>{phase==='loading'&&<p role="status">{bi(copy.load)}</p>}{phase==='readError'&&<Notice tone="danger" action={<Button onClick={load}>{bi(copy.reload)}</Button>}>{bi(copy.readError)}</Notice>}{phase==='working'&&<Notice action={<Button variant="secondary" onClick={stop}>{bi(copy.stop)}</Button>}>{bi(copy.working)}</Notice>}{phase==='success'&&<Notice tone="success">{bi(copy.success)}</Notice>}{['error','stopped'].includes(phase)&&<Notice tone="warn">{bi(phase==='error'?copy.error:copy.stopped)}</Notice>}{phase!=='loading'&&phase!=='readError'&&occurrence&&!eligible&&<Notice>{bi(copy.history)}</Notice>}{review&&<StudioCancellationReview review={{activeCount:review.activeCount,verifiedCount:review.attendees.length,voucherSeats:review.voucherSeats,waitlistCount:review.waitlistCount,cannotVerify:review.issues.length>0,emails:review.emails}}/>}<Field label={bi(copy.reason)}>{id=><Input id={id} value={reason} disabled={busy||!!command||!eligible||disabled} onChange={e=>{setReason(e.target.value);}}/>}</Field><div className="row wrap">{eligible&&!busy&&phase!=='success'&&phase!=='loading'&&phase!=='readError'&&<Button variant="secondary" disabled={disabled} onClick={()=>start()}>{bi(copy.prepare)}</Button>}{phase==='review'&&review&&!review.issues.length&&<Button variant="danger" disabled={disabled||busy} onClick={confirm}>{bi(copy.confirm)}</Button>}{command&&['error','stopped'].includes(phase)&&<Button disabled={disabled||busy} onClick={()=>start(true)}>{bi(copy.retry)}</Button>}{!busy&&['review','error','stopped','success'].includes(phase)&&<Button variant="ghost" disabled={disabled} onClick={load}>{bi(copy.reload)}</Button>}</div></div></Card>;
}
