import { useEffect, useRef, useState } from 'react';
import { useData } from '../../data/DataContext';
import { useSession } from '../../auth/SessionProvider';
import type { DataProvider } from '../../data/types';
import type { NotificationPrefRow } from '../../data/schema';
import { NOTIF_CATEGORIES, preferenceRevision, readOwnPreferences, savePreferences, type PreferenceActor, type PreferenceRequest, type NotifChannel, type NotifCategory } from './notificationPrefs';
interface Attempt { cancelled:boolean; input:PreferenceRequest }
interface Context { data:DataProvider; actor:PreferenceActor; key:string; cancelled:boolean; version:number; attempt:Attempt|null }
type State = {context:Context; status:'loading'|'ready'|'error'; rows:NotificationPrefRow[]; error:string|null};
const errorKey=(error:unknown)=>String(error).includes('ambiguous')?'ambiguous':/stale|concurrent|replay/.test(String(error))?'stale':'save';
export function useAtomicNotificationPrefs() {
  const data=useData(),{user,role}=useSession(),key=`${user.id}:${role}`;
  const context=useRef<Context|null>(null);
  if(!context.current||context.current.data!==data||context.current.key!==key){if(context.current){context.current.cancelled=true;if(context.current.attempt)context.current.attempt.cancelled=true;}context.current={data,actor:{userId:user.id,role},key,cancelled:false,version:0,attempt:null};}
  const ctx=context.current;
  const [state,setState]=useState<State>({context:ctx,status:'loading',rows:[],error:null});
  const [busy,setBusy]=useState<Context|null>(null),[saved,setSaved]=useState<Context|null>(null);
  const failed=useRef<{context:Context;input:PreferenceRequest}|null>(null);
  const current=()=>context.current===ctx&&!ctx.cancelled;
  const refresh=async()=>{
    const version=++ctx.version;
    if(current())setState(previous=>({context:ctx,status:'loading',rows:previous.context===ctx?previous.rows:[],error:null}));
    try{const rows=await readOwnPreferences(data,ctx.actor);if(current()&&version===ctx.version){setState({context:ctx,status:'ready',rows,error:null});return true;}}
    catch(error){if(current()&&version===ctx.version)setState({context:ctx,status:'error',rows:[],error:String(error).includes('ambiguous')?'ambiguous':'read'});}
    return false;
  };
  useEffect(()=>{
    ctx.cancelled=false;void refresh();
    const stops=['users','notification_prefs'].map(table=>data.subscribe(table,()=>{setSaved(null);void refresh();}));
    return()=>{ctx.cancelled=true;++ctx.version;if(ctx.attempt)ctx.attempt.cancelled=true;ctx.attempt=null;stops.forEach(stop=>stop());};
  },[ctx]);
  const view=state.context===ctx?state:{status:'loading' as const,rows:[],error:null};
  const execute=async(input:PreferenceRequest)=>{
    if(!current()||ctx.attempt)throw Error('prefs_not_ready');
    const attempt:Attempt={cancelled:false,input};ctx.attempt=attempt;setBusy(ctx);setSaved(null);
    setState(previous=>({...previous,error:null}));
    try{
      await savePreferences(data,ctx.actor,input,()=>attempt.cancelled||!current());
      if(attempt.cancelled||!current())return;
      failed.current=null;const ready=await refresh();if(ready&&!attempt.cancelled&&current())setSaved(ctx);
    }catch(error){if(!attempt.cancelled&&current()){failed.current={context:ctx,input};setState(previous=>({...previous,error:errorKey(error)}));}throw error;}
    finally{if(ctx.attempt===attempt){ctx.attempt=null;if(current())setBusy(null);}}
  };
  const set=(channel:NotifChannel,category:NotifCategory|null,enabled:boolean)=>{
    if(view.status!=='ready'||ctx.attempt)return Promise.reject(Error('prefs_not_ready'));
    return execute({requestId:crypto.randomUUID(),channel,category,enabled,expected:preferenceRevision(view.rows,{channel,category})});
  };
  const cancel=()=>{if(ctx.attempt)ctx.attempt.cancelled=true;ctx.attempt=null;failed.current=null;setBusy(null);setSaved(null);void refresh();};
  const retry=()=>{const prior=failed.current;if(view.error==='save'&&prior?.context===ctx)return execute(prior.input);failed.current=null;setSaved(null);return refresh();};
  const isEnabled=(channel:NotifChannel,category:NotifCategory)=>view.rows.find(row=>row.channel===channel&&row.category===category)?.enabled??true;
  return {rows:view.rows,status:view.status,error:view.error,busy:busy===ctx,saved:saved===ctx,retry,cancel,isEnabled,channelOn:(channel:NotifChannel)=>NOTIF_CATEGORIES.some(category=>isEnabled(channel,category)),set:(channel:NotifChannel,category:NotifCategory,enabled:boolean)=>set(channel,category,enabled),setChannel:(channel:NotifChannel,enabled:boolean)=>set(channel,null,enabled)};
}
