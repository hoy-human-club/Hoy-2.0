import {useEffect,useRef,useState} from 'react';
import {useData} from '../../data/DataContext';
import {useSession} from '../../auth/SessionProvider';
import {preparePayrollDraft,generatePayrollDraft,type DraftPlan,type DraftActor,type DraftMethod,type DraftSummary} from './payrollDraft';
import type {Period} from '../../data/payrollCalc';
import type {DataProvider} from '../../data/types';
interface Context{data:DataProvider;actor:DraftActor;key:string;dead:boolean;attempt:{cancelled:boolean}|null;version:number}
export function usePayrollDraftAction(periods:Period[],method:DraftMethod){
 const data=useData(),{user,role}=useSession(),intent=JSON.stringify({periods,method}),key=`${user.id}:${role}:${intent}`,ref=useRef<Context|null>(null);
 if(!ref.current||ref.current.data!==data||ref.current.key!==key){if(ref.current){ref.current.dead=true;if(ref.current.attempt)ref.current.attempt.cancelled=true;}ref.current={data,actor:{userId:user.id,role},key,dead:false,attempt:null,version:0};}
 const ctx=ref.current,current=()=>ref.current===ctx&&!ctx.dead;
 const [state,setState]=useState<{ctx:Context;status:'loading'|'ready'|'error';error:string|null;plan:DraftPlan|null}>({ctx,status:'loading',error:null,plan:null});
 const [busy,setBusy]=useState<Context|null>(null),[saved,setSaved]=useState<Context|null>(null);
 const failed=useRef<{ctx:Context;input:DraftPlan&{requestId:string}}|null>(null);
 const classify=(error:unknown)=>/locked/.test(String(error))?'locked':/ambiguous/.test(String(error))?'ambiguous':/stale|concurrent|conflict|unconfirmed/.test(String(error))?'stale':'save';
 const refresh=async()=>{const version=++ctx.version;if(current())setState({ctx,status:'loading',error:null,plan:null});try{const plan=await preparePayrollDraft(data,ctx.actor,periods,method);if(current()&&version===ctx.version){setState({ctx,status:'ready',plan,error:null});return true;}}catch(error){if(current()&&version===ctx.version)setState({ctx,status:'error',plan:null,error:/locked|ambiguous/.test(String(error))?classify(error):'read'});}return false;};
 useEffect(()=>{ctx.dead=false;if(periods.length)void refresh();return()=>{ctx.dead=true;++ctx.version;if(ctx.attempt)ctx.attempt.cancelled=true;};},[ctx]);
 const view=state.ctx===ctx?state:{status:'loading' as const,error:null,plan:null};
 const execute=async(retry=false):Promise<DraftSummary[]>=>{
  if(!current()||ctx.attempt)throw Error('draft_not_ready');const prior=failed.current,input=retry&&prior?.ctx===ctx?prior.input:view.plan?{...view.plan,requestId:crypto.randomUUID()}:null;if(!input)throw Error('draft_not_ready');
  const attempt={cancelled:false};ctx.attempt=attempt;setBusy(ctx);setSaved(null);setState(s=>({...s,error:null}));
  try{const result=await generatePayrollDraft(data,ctx.actor,input,()=>attempt.cancelled||!current());if(attempt.cancelled||!current())throw Error('draft_cancelled');const ready=await refresh();if(attempt.cancelled||!current())throw Error('draft_cancelled');if(!ready)throw Error('draft_unconfirmed');failed.current=null;setSaved(ctx);return result;}
  catch(error){if(!attempt.cancelled&&current()){failed.current={ctx,input};setState(s=>({...s,error:classify(error)}));}throw error;}
  finally{if(ctx.attempt===attempt){ctx.attempt=null;if(current())setBusy(null);}}
 };
 return {status:view.status,error:view.error,busy:busy===ctx,saved:saved===ctx,execute,reload:()=>{failed.current=null;setSaved(null);return refresh();},cancel:()=>{if(ctx.attempt)ctx.attempt.cancelled=true;ctx.attempt=null;setBusy(null);setSaved(null);failed.current=null;void refresh();}};
}
