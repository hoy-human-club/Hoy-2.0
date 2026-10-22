import {ReceiptAlertView,type ReceiptAlertViewMode} from './ReceiptAlertView';
import {useEffect,useRef,useState} from 'react';
import {useData} from '../../../data/DataContext';
import {useSession} from '../../../auth/SessionProvider';
import {readReceiptAlert,simulateReceiptAlert,type ReceiptAlertState} from '../../../modules/transfers/receiptAlert';

/** Own committed receipt only; no staff directory, recipient or dispatch capability. */
export function ReceiptAlertResult({receiptId}:{receiptId:string}){
 const data=useData(),{user,role}=useSession();
 const context=`${user.id}:${role}:${receiptId}`,live=useRef({data,context});live.current={data,context};
 const loaded=useRef<{data:typeof data;context:string}|null>(null);
 const epoch=useRef(0),busyRef=useRef(false),mounted=useRef(false);
 const [state,setState]=useState<ReceiptAlertState|null>(null),[readError,setReadError]=useState(false),[attemptError,setAttemptError]=useState(false),[busy,setBusy]=useState(false),[preview,setPreview]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  mounted.current=true;const generation=++epoch.current;busyRef.current=false;setBusy(false);loaded.current=null;setState(null);setReadError(false);setAttemptError(false);setPreview(false);
  readReceiptAlert(data,user.id,receiptId).then(value=>{if(mounted.current&&generation===epoch.current){loaded.current={data,context};setState(value);}},()=>{if(mounted.current&&generation===epoch.current){loaded.current={data,context};setReadError(true);}});
  return()=>{mounted.current=false;++epoch.current;busyRef.current=false;};
 },[data,context,retry,user.id,receiptId]);
 const cancel=()=>{++epoch.current;busyRef.current=false;setBusy(false);setPreview(false);setAttemptError(false);};
 const run=async()=>{
  if(busyRef.current||!state?.intentId||state.completed)return;
  const generation=++epoch.current,provider=data,actor=user.id,key=context,snapshot=state;
  const valid=()=>mounted.current&&generation===epoch.current&&live.current.data===provider&&live.current.context===key;
  busyRef.current=true;setBusy(true);setAttemptError(false);
  try{await simulateReceiptAlert(provider,{owner:actor,receiptId,revision:snapshot.revision},()=>!valid());if(valid()){setState({...snapshot,completed:true});setPreview(false);}}
  catch{if(valid())setAttemptError(true);}
  finally{if(valid()){busyRef.current=false;setBusy(false);}}
 };
 const current=loaded.current?.data===data&&loaded.current?.context===context;
 const mode:ReceiptAlertViewMode=!current?'loading':readError?'readError':!state?'loading':!state.intentId?'legacy':state.completed?'completed':!preview?'pending':busy?'busy':attemptError?'attemptError':'preview';
 return <ReceiptAlertView receiptId={receiptId} mode={mode} onRetry={()=>setRetry(n=>n+1)} onPreview={()=>setPreview(true)} onRun={run} onCancel={cancel}/>;
}
