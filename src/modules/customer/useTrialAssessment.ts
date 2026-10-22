import {useEffect,useState} from 'react';
import {dateKey} from '../../i18n/format';
import {useData} from '../../data/DataContext';
import {readTrialAssessment,type TrialAssessment} from '../../data/trialEligibility';

/** Contained async offer check. Actor/selection changes discard old eligibility synchronously. */
export function useTrialAssessment(userId:string|null){
 const data=useData(),[revision,setRevision]=useState(0);
 const [day,setDay]=useState(dateKey);
 useEffect(()=>{const timer=setInterval(()=>setDay(dateKey()),30000);return()=>clearInterval(timer);},[]);
 const key=`${userId}:${day}:${revision}`;
 const [snapshot,setSnapshot]=useState<{key:string;provider:typeof data;result:TrialAssessment}|null>(null);
 useEffect(()=>{
  if(!userId)return;
  let active=true;
  setSnapshot(null);
  readTrialAssessment(data,userId).then(result=>{if(active)setSnapshot({key,provider:data,result});}).catch(()=>{if(active)setSnapshot({key,provider:data,result:{status:'trial_check_failed',reasons:['read_failure']}});});
  const stop=['payments','class_ledger','bookings','users'].map(table=>data.subscribe(table,()=>setRevision(n=>n+1)));
  return()=>{active=false;stop.forEach(fn=>fn());};
 },[data,userId,key]);
 const result:TrialAssessment=!userId?{status:'eligible',reasons:[]}:snapshot?.key===key&&snapshot.provider===data?snapshot.result:{status:'trial_checking',reasons:[]};
 return {...result,retry:()=>setRevision(n=>n+1)};
}
