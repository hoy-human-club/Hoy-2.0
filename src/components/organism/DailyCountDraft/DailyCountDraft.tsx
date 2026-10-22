import {useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useData} from '../../../data/DataContext';
import {useSession} from '../../../auth/SessionProvider';
import {dateKey} from '../../../i18n/format';
import {tenant} from '../../../tenant/tenant';
import {countKey,emptyCounts,readCountDocument,readCountReferences,runCountCommand,validCountDay,type Counts,type CountCommand,type CountContext,type CountDocument,type CountReferences} from '../../../modules/staff/cashCountDraft';
import {DailyCountView,type CountViewMode} from './DailyCountView';
const rawCounts=(value:Counts|null)=>Object.fromEntries(Object.entries(value??emptyCounts()).map(([k,n])=>[k,n===null?'':String(n)])) as Record<keyof Counts,string>;
function parseCounts(raw:Record<keyof Counts,string>):Counts|null {const counts=emptyCounts();for(const k of Object.keys(counts) as (keyof Counts)[]){if(raw[k]===''){counts[k]=null;continue;}if(!/^\d+$/.test(raw[k])||!Number.isSafeInteger(Number(raw[k])))return null;counts[k]=Number(raw[k]);}return counts;}
export function DailyCountDraft(){
 const data=useData(),{user,role}=useSession(),[params]=useSearchParams();
 const [open,setOpen]=useState(params.get('panel')==='count-draft'),[day,setDay]=useState(()=>validCountDay(params.get('day'))?params.get('day')!:dateKey());
 const c:CountContext={tenantId:tenant.id,actorId:user.id,role,adapter:data.name,day},key=countKey(c),live=useRef({data,key});live.current={data,key};
 const epoch=useRef(0),mounted=useRef(false),busy=useRef(false),loaded=useRef<{data:typeof data;key:string}|null>(null),request=useRef<CountCommand|null>(null);
 const [mode,setMode]=useState<CountViewMode>('loading'),[references,setReferences]=useState<CountReferences|null>(null),[document,setDocument]=useState<CountDocument|null>(null),[raw,setRaw]=useState(()=>rawCounts(null)),[retry,setRetry]=useState(0),[discarding,setDiscarding]=useState(false);
 useEffect(()=>{
  mounted.current=true;const generation=++epoch.current;loaded.current=null;busy.current=false;request.current=null;setMode('loading');setDiscarding(false);
  if(!open)return()=>{mounted.current=false;++epoch.current;};
  (async()=>{try{const refs=await readCountReferences(data,c),doc=readCountDocument(localStorage,c);if(mounted.current&&generation===epoch.current&&live.current.data===data&&live.current.key===key){loaded.current={data,key};setReferences(refs);setDocument(doc);setRaw(rawCounts(doc.counts));setMode('ready');}}catch{if(mounted.current&&generation===epoch.current&&live.current.data===data&&live.current.key===key){loaded.current={data,key};setReferences(null);setDocument(null);setMode('readError');}}})();
  const refresh=()=>{++epoch.current;setRetry(n=>n+1);},unsub=[data.subscribe('payments',refresh),data.subscribe('users',refresh)];const storage=(event:StorageEvent)=>{if(event.key===key)refresh();};window.addEventListener('storage',storage);
  return()=>{mounted.current=false;++epoch.current;unsub.forEach(fn=>fn());window.removeEventListener('storage',storage);};
 },[data,key,open,retry]);
 const current=loaded.current?.data===data&&loaded.current.key===key,counts=parseCounts(raw);
 const cancel=()=>{++epoch.current;busy.current=false;request.current=null;setMode('ready');setDiscarding(false);};
 const close=()=>{cancel();setOpen(false);};
 const preview=(type:'save'|'discard')=>{if(!current||!document||!references||busy.current||type==='save'&&!counts)return;request.current=type==='save'?{type,requestId:crypto.randomUUID(),expectedRevision:document.revision,references:references.fingerprint,counts:structuredClone(counts!)}:{type,requestId:crypto.randomUUID(),expectedRevision:document.revision,references:references.fingerprint};setDiscarding(type==='discard');setMode(type==='discard'?'discard':'preview');};
 const save=async()=>{
  if(busy.current||!current||!request.current)return;busy.current=true;const generation=++epoch.current,provider=data,context={...c},command=structuredClone(request.current);
  const valid=()=>mounted.current&&generation===epoch.current&&live.current.data===provider&&live.current.key===key;setMode('busy');
  try{const result=await runCountCommand(provider,localStorage,context,command,()=>!valid());if(valid()){setDocument(result);setRaw(rawCounts(result.counts));request.current=null;setDiscarding(false);setMode('saved');}}
  catch{if(valid())setMode('saveError');}
  finally{if(valid())busy.current=false;}
 };
 return <DailyCountView intent={discarding?'discard':'save'} mode={!open?'closed':!current?'loading':mode} day={day} raw={current?raw:rawCounts(null)} references={current?references:null} document={current?document:null} invalid={current&&counts===null} onOpen={()=>setOpen(true)} onClose={close} onDay={value=>{++epoch.current;setDay(value);}} onInput={(k,value)=>{setRaw(old=>({...old,[k]:value}));setMode('ready');request.current=null;}} onRetry={()=>setRetry(n=>n+1)} onPreview={()=>preview('save')} onSave={save} onCancel={cancel} onDiscard={()=>preview('discard')} onConfirmDiscard={discarding?save:undefined}/>;
}
