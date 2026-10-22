import { useEffect, useState } from 'react';
import type { DataProvider } from '../../data/types';
import { readOwnProfile, type OwnRows } from './profileSave';

/** Own rows only, with contained failures and generation fencing on account/provider changes. */
export function useOwnProfile(data: DataProvider, actorId: string) {
  const [retry,setRetry]=useState(0);
  const [state,setState]=useState<{provider:DataProvider;key:string;rows:OwnRows|null;status:'loading'|'ready'|'error'}>({provider:data,key:'',rows:null,status:'loading'});
  useEffect(()=>{
    let active=true,version=0;
    const load=async()=>{const v=++version;setState({provider:data,key:actorId,rows:null,status:'loading'});try{const rows=await readOwnProfile(data,actorId);if(active&&v===version)setState({provider:data,key:actorId,rows,status:'ready'});}catch{if(active&&v===version)setState({provider:data,key:actorId,rows:null,status:'error'});}};
    void load();const stops=['profiles','users'].map(table=>data.subscribe(table,()=>void load()));
    return()=>{active=false;stops.forEach(stop=>stop());};
  },[data,actorId,retry]);
  const current=state.key===actorId&&state.provider===data?state:{rows:null,status:'loading' as const};
  return {profile:current.rows?.profile??null,account:current.rows?.account??null,status:current.status,retry:()=>setRetry(n=>n+1)};
}
