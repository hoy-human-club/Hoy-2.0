import {useEffect,useRef,useState} from 'react';
import type {DataProvider,Query} from '../../data/types';
import type {BaseRow} from '../../data/schema';
import {readEmailTest,simulateEmailTest,type EmailTestActor,type FrozenEmailTest} from './emailTest';
/** Contained tenant query with stale-generation fencing; background refresh preserves the editor. */
export function useEmailRows<T extends BaseRow>(data:DataProvider,table:string,query:Query,context:string){
 const key=JSON.stringify([context,table,query]),[retry,setRetry]=useState(0);
 const [state,setState]=useState<{key:string;provider:DataProvider;rows:T[];status:'loading'|'ready'|'error'}>({key:'',provider:data,rows:[],status:'loading'});
 useEffect(()=>{let active=true,generation=0;const load=async()=>{const n=++generation;setState(s=>s.key===key&&s.provider===data&&s.status==='error'?{...s,status:'loading'}:s);try{const raw=await data.list<T>(table,query),rows=raw.filter(row=>Object.entries(query.where??{}).every(([k,v])=>Array.isArray(v)?v.includes(row[k]):row[k]===v));if(active&&n===generation)setState(s=>s.key===key&&s.provider===data&&s.status==='ready'&&JSON.stringify(s.rows)===JSON.stringify(rows)?s:{key,provider:data,rows,status:'ready'});}catch{if(active&&n===generation)setState({key,provider:data,rows:[],status:'error'});}};void load();const stop=data.subscribe(table,()=>void load());return()=>{active=false;stop();};},[data,table,key,retry]); // key contains the exact query, including tenant and actor context.
 const current=state.key===key&&state.provider===data?state:{rows:[] as T[],status:'loading' as const};return {...current,retry:()=>setRetry(n=>n+1)};
}
const empty=()=>({open:false,status:'loading' as 'loading'|'ready'|'error',snapshot:null as FrozenEmailTest|null,busy:false,error:false,done:false});
export function useEmailTest(data:DataProvider,actor:EmailTestActor,templateId:string|undefined,version:number|undefined,locale:'es'|'en'){
 const [state,setState]=useState(empty),key=JSON.stringify([actor.id,actor.role,templateId,locale]),context=useRef(key),provider=useRef(data);context.current=key;provider.current=data;
 const attempt=useRef<{key:string;provider:DataProvider;cancelled:boolean;saving:boolean;generation:number;requestId:string}|null>(null);
 const valid=(a:NonNullable<typeof attempt.current>)=>attempt.current===a&&!a.cancelled&&context.current===a.key&&provider.current===a.provider;
 const close=()=>{if(attempt.current)attempt.current.cancelled=true;attempt.current=null;setState(empty());};
 useEffect(()=>{setState(empty());return()=>{if(attempt.current)attempt.current.cancelled=true;attempt.current=null;};},[data,key]);
 const load=async(a:NonNullable<typeof attempt.current>)=>{if(!templateId)return;const generation=++a.generation;setState(s=>({...s,status:'loading',snapshot:null,error:false}));try{const snapshot=await readEmailTest(data,actor,templateId,locale,version);if(valid(a)&&generation===a.generation){a.requestId=crypto.randomUUID();setState(s=>({...s,status:'ready',snapshot}));}}catch{if(valid(a)&&generation===a.generation)setState(s=>({...s,status:'error',snapshot:null}));}};
 const open=()=>{if(!templateId)return;if(attempt.current)attempt.current.cancelled=true;const a={key,provider:data,cancelled:false,saving:false,generation:0,requestId:crypto.randomUUID()};attempt.current=a;setState({...empty(),open:true});void load(a);};
 const send=async()=>{const a=attempt.current,snapshot=state.snapshot;if(!a||!valid(a)||a.saving||!snapshot||state.status!=='ready'||state.done)return;a.saving=true;setState(s=>({...s,busy:true,error:false}));try{await simulateEmailTest(data,{actor,templateId:snapshot.templateId,locale:snapshot.locale,templateRevision:snapshot.templateRevision,accountRevision:snapshot.accountRevision,requestId:a.requestId},()=>!valid(a));if(valid(a))setState(s=>({...s,done:true}));}catch{if(valid(a))setState(s=>({...s,error:true}));}finally{a.saving=false;if(valid(a))setState(s=>({...s,busy:false}));}};
 const visible=state.open&&(!attempt.current||!valid(attempt.current))?empty():state;
 return{...visible,openPreview:open,close,send,retry:()=>{if(attempt.current)void load(attempt.current);}};
}
