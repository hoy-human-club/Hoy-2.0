import { useCallback,useEffect,useRef,useState } from 'react';
import { useData } from '../../data/DataContext';
import { useSession } from '../../auth/SessionProvider';
import { readEvents,type EventSnapshot } from './eventRsvp';
export function useEventSnapshot(){
 const data=useData(),{user,role}=useSession(),[revision,setRevision]=useState(0);
 const key=`${user.id}|${role}|${revision}`;
 const [state,setState]=useState<{key:string;data:typeof data;snapshot:EventSnapshot|null;error:boolean}|null>(null);
 const request=useRef(0);
 const retry=useCallback(()=>setRevision(n=>n+1),[]);
 useEffect(()=>{const off=data.subscribe('*',e=>{if(['users','events','event_rsvps','memberships','teachers'].includes(e.table))retry();});return off;},[data,retry]);
 useEffect(()=>{let alive=true;const seq=++request.current;readEvents(data,user.id).then(snapshot=>{if(alive&&seq===request.current)setState({key,data,snapshot,error:false});}).catch(()=>{if(alive&&seq===request.current)setState({key,data,snapshot:null,error:true});});return()=>{alive=false;};},[data,key,user.id]);
 const ready=state?.key===key&&state.data===data?state:null;
 return {snapshot:ready?.snapshot??null,error:ready?.error??false,loading:!ready,retry};
}
