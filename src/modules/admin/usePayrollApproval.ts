import {useEffect,useRef,useState} from 'react';
import {useData} from '../../data/DataContext';
import {useSession} from '../../auth/SessionProvider';
import type {DataProvider} from '../../data/types';
import {preparePayrollApproval,approvePayroll,type ApprovalActor,type ApprovalInput,type ApprovalPlan} from './payrollApproval';
interface Context {key:string;data:DataProvider;actor:ApprovalActor;dead:boolean;generation:number;attempt:{cancelled:boolean}|null;input:ApprovalInput|null}
export function usePayrollApproval(runId:string|undefined){
 const data=useData(),{user,role}=useSession(),key=`${user.id}|${role}|${runId}`,ref=useRef<Context|null>(null);
 if(!ref.current||ref.current.key!==key||ref.current.data!==data){if(ref.current){ref.current.dead=true;if(ref.current.attempt)ref.current.attempt.cancelled=true;}ref.current={key,data,actor:{userId:user.id,role},dead:false,generation:0,attempt:null,input:null};}
 const ctx=ref.current,current=()=>ref.current===ctx&&!ctx.dead;
 const [state,setState]=useState<{ctx:Context;generation:number;open:boolean;phase:'loading'|'ready'|'saving'|'error';plan:ApprovalPlan|null;error:string|null;retry:boolean;saved:boolean}>({ctx,generation:0,open:false,phase:'loading',plan:null,error:null,retry:false,saved:false});
 const view=state.ctx===ctx&&state.generation===ctx.generation?state:null;
 useEffect(()=>{ctx.dead=false;return()=>{ctx.dead=true;++ctx.generation;if(ctx.attempt)ctx.attempt.cancelled=true;};},[ctx]);
 const classify=(e:unknown)=>/locked/.test(String(e))?'locked':/scope|denied|disconnected/.test(String(e))?'scope':/ambiguous/.test(String(e))?'ambiguous':/stale|concurrent|conflict|unconfirmed/.test(String(e))?'stale':'save';
 const close=()=>{++ctx.generation;if(ctx.attempt)ctx.attempt.cancelled=true;ctx.input=null;if(current())setState(s=>({...s,ctx,generation:ctx.generation,open:false,error:null,retry:false,saved:false}));};
 const open=async()=>{if(!current()||ctx.attempt)return;const generation=++ctx.generation;ctx.input=null;setState({ctx,generation,open:true,phase:'loading',plan:null,error:null,retry:false,saved:false});try{if(!runId)throw Error('approval_scope');const plan=await preparePayrollApproval(data,ctx.actor,runId);if(current()&&generation===ctx.generation)setState({ctx,generation,open:true,phase:'ready',plan,error:null,retry:false,saved:false});}catch(e){if(current()&&generation===ctx.generation)setState({ctx,generation,open:true,phase:'error',plan:null,error:/locked|scope|denied|disconnected|ambiguous/.test(String(e))?classify(e):'read',retry:false,saved:false});}};
 const execute=async()=>{
  if(!current()||ctx.attempt||!view?.open)return;
  const input=ctx.input??(view.plan?{runId:view.plan.runId,basis:view.plan.basis,requestId:crypto.randomUUID()}:null);if(!input)return;
  ctx.input=input;const attempt={cancelled:false},generation=ctx.generation;ctx.attempt=attempt;setState(s=>({...s,phase:'saving',error:null}));
  const owned=()=>current()&&generation===ctx.generation&&!attempt.cancelled&&ctx.attempt===attempt;
  try{await approvePayroll(data,ctx.actor,input,owned);if(owned()){++ctx.generation;ctx.input=null;setState(s=>({...s,generation:ctx.generation,open:false,error:null,retry:false,saved:true}));}}
  catch(e){if(owned())setState(s=>({...s,phase:'error',error:classify(e),retry:true}));}
  finally{if(ctx.attempt===attempt){ctx.attempt=null;if(current())setState(s=>s.ctx===ctx?{...s}:s);}}
 };
 return {busy:!!ctx.attempt,saved:!!view?.saved,open:!!view?.open,phase:view?.phase??'loading',plan:view?.plan??null,error:view?.error??null,canRetry:!!view?.retry,begin:open,close,execute};
}
