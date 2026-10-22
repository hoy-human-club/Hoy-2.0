import {useEffect,useRef,useState} from 'react';
import {useData} from '../../data/DataContext';
import {useSession} from '../../auth/SessionProvider';
import {tenant} from '../../tenant/tenant';
import type {AccountActor} from './accountData';
import {prepareMarketingCommand,readMarketingState,type MarketingChannel,type MarketingCommand} from './marketingConsent';
type Attempt={channel:MarketingChannel;enabled:boolean;nonce:string;controller:AbortController;command?:MarketingCommand;running:boolean};
export function useMarketingConsent(){
  const data=useData(),{user,role}=useSession();
  const context=useRef<{data:typeof data;actor:AccountActor;closed:boolean;sequence:number;attempt:Attempt|null}|null>(null);
  if(!context.current||context.current.data!==data||context.current.actor.userId!==user.id||context.current.actor.role!==role){if(context.current){context.current.closed=true;context.current.attempt?.controller.abort();context.current.attempt?.command?.discard();}context.current={data,actor:{userId:user.id,tenantId:tenant.id,role},closed:false,sequence:0,attempt:null};}
  const ctx=context.current,current=()=>context.current===ctx&&!ctx.closed;
  type View={context:typeof ctx;status:'loading'|'ready'|'error';state:Awaited<ReturnType<typeof readMarketingState>>|null};
  const [view,setView]=useState<View>({context:ctx,status:'loading',state:null}),[busy,setBusy]=useState<typeof ctx|null>(null),[message,setMessage]=useState<{context:typeof ctx;key:string}|null>(null);
  const refresh=async()=>{const sequence=++ctx.sequence;if(current())setView(v=>({context:ctx,status:'loading',state:v.context===ctx?v.state:null}));try{const state=await readMarketingState(data,ctx.actor,{currentActor:()=>context.current?.actor??ctx.actor});if(current()&&sequence===ctx.sequence)setView({context:ctx,status:'ready',state});}catch{if(current()&&sequence===ctx.sequence)setView({context:ctx,status:'error',state:null});}};
  useEffect(()=>{ctx.closed=false;setMessage(null);void refresh();const stops=['users','profiles','notification_prefs'].map(t=>data.subscribe(t,()=>{if(!ctx.attempt?.running)void refresh();}));return()=>{ctx.closed=true;++ctx.sequence;ctx.attempt?.controller.abort();ctx.attempt?.command?.discard();stops.forEach(stop=>stop());};},[ctx]);
  const visible=view.context===ctx?view:{status:'loading' as const,state:null};
  const execute=async(attempt:Attempt)=>{
    if(!current()||attempt.running)return;attempt.running=true;setBusy(ctx);setMessage(null);
    const control={signal:attempt.controller.signal,currentActor:()=>context.current===ctx&&!ctx.closed?ctx.actor:{...ctx.actor,tenantId:'__changed__'}};
    try{attempt.command??=await prepareMarketingCommand(data,ctx.actor,attempt.channel,attempt.enabled,attempt.nonce,control);if(!current()||ctx.attempt!==attempt||attempt.controller.signal.aborted){attempt.command.discard();return;}const result=await attempt.command.execute(control);if(current()&&ctx.attempt===attempt&&!attempt.controller.signal.aborted){ctx.attempt=null;setMessage({context:ctx,key:result.replayed?'replayed':'saved'});}}
    catch(error){if(current()&&ctx.attempt===attempt&&!attempt.controller.signal.aborted){const code=error instanceof Error?error.message:'';setMessage({context:ctx,key:/ambiguous|invalid/.test(code)?'ambiguous':/stale|replay|concurrent/.test(code)?'stale':'failed'});}}
    finally{attempt.running=false;if(current()&&(ctx.attempt===attempt||!ctx.attempt)){setBusy(null);void refresh();}}
  };
  return {status:visible.status,busy:busy===ctx,message:message?.context===ctx?message.key:null,canRetry:!!ctx.attempt&&!ctx.attempt.running,
    enabled:(channel:MarketingChannel)=>visible.state?.enabled(channel)??true,
    set:(channel:MarketingChannel,enabled:boolean)=>{if(!current()||visible.status!=='ready'||ctx.attempt?.running)return;ctx.attempt?.controller.abort();ctx.attempt?.command?.discard();const attempt:Attempt={channel,enabled,nonce:crypto.randomUUID(),controller:new AbortController(),running:false};ctx.attempt=attempt;void execute(attempt);},
    retry:()=>{if(ctx.attempt)void execute(ctx.attempt);else void refresh();},
    cancel:()=>{ctx.attempt?.controller.abort();ctx.attempt?.command?.discard();ctx.attempt=null;setBusy(null);setMessage({context:ctx,key:'cancelled'});void refresh();},
  };
}
