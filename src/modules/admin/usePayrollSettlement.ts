import {useEffect,useRef,useState} from 'react';
import {useData} from '../../data/DataContext';
import {useSession} from '../../auth/SessionProvider';
import type {DataProvider} from '../../data/types';
import {preparePayrollSettlement,recordPayrollSettlement,type SettlementActor,type SettlementSelection,type SettlementInput,type SettlementPlan,type SettlementResult} from './payrollSettlement';
interface Context {key:string;data:DataProvider;actor:SettlementActor;dead:boolean;generation:number;attempt:{cancelled:boolean}|null;input:SettlementInput|null;selection:SettlementSelection|null}
interface State {ctx:Context;generation:number;open:boolean;phase:'loading'|'ready'|'saving'|'error';plan:SettlementPlan|null;error:string|null;retry:boolean;saved:SettlementResult|null}
export function usePayrollSettlement(runId:string|undefined){
 const data=useData(),{user,role}=useSession(),key=`${user.id}|${role}|${runId}`,ref=useRef<Context|null>(null);
 if(!ref.current||ref.current.key!==key||ref.current.data!==data){
  if(ref.current){ref.current.dead=true;if(ref.current.attempt)ref.current.attempt.cancelled=true;}
  ref.current={key,data,actor:{userId:user.id,role},dead:false,generation:0,attempt:null,input:null,selection:null};
 }
 const ctx=ref.current,current=()=>ref.current===ctx&&!ctx.dead;
 const [state,setState]=useState<State>({ctx,generation:0,open:false,phase:'loading',plan:null,error:null,retry:false,saved:null});
 const view=state.ctx===ctx&&state.generation===ctx.generation?state:null;
 useEffect(()=>{ctx.dead=false;return()=>{ctx.dead=true;++ctx.generation;if(ctx.attempt)ctx.attempt.cancelled=true;};},[ctx]);
 const classify=(error:unknown)=>/scope|denied|disconnected/.test(String(error))?'scope':/unresolved|invalid/.test(String(error))?'unresolved':/locked/.test(String(error))?'locked':/stale|conflict|concurrent|unconfirmed/.test(String(error))?'stale':'save';
 const close=()=>{++ctx.generation;if(ctx.attempt)ctx.attempt.cancelled=true;ctx.input=null;ctx.selection=null;if(current())setState(s=>({...s,ctx,generation:ctx.generation,open:false,error:null,retry:false,saved:null}));};
 const begin=async(provided:SettlementSelection)=>{
  if(!current()||ctx.attempt)return;
  const selection={action:provided.action,method:provided.method,teacherId:provided.teacherId,simulate:provided.simulate},generation=++ctx.generation;
  ctx.input=null;ctx.selection=selection;setState({ctx,generation,open:true,phase:'loading',plan:null,error:null,retry:false,saved:null});
  try{
   if(!runId)throw Error('settlement_scope');
   const plan=await preparePayrollSettlement(data,ctx.actor,runId,selection);
   if(current()&&generation===ctx.generation)setState({ctx,generation,open:true,phase:'ready',plan,error:null,retry:false,saved:null});
  }catch(error){if(current()&&generation===ctx.generation)setState({ctx,generation,open:true,phase:'error',plan:null,error:/scope|denied|disconnected|locked|unresolved|invalid/.test(String(error))?classify(error):'read',retry:false,saved:null});}
 };
 const execute=async()=>{
  if(!current()||ctx.attempt||!view?.open)return;
  const input=ctx.input??(view.plan?{runId:view.plan.runId,basis:view.plan.basis,action:view.plan.action,method:view.plan.method,teacherId:view.plan.teacherId,simulate:view.plan.simulate,requestId:crypto.randomUUID()}:null);
  if(!input)return;
  ctx.input=input;const attempt={cancelled:false},generation=ctx.generation;ctx.attempt=attempt;
  setState(s=>({...s,phase:'saving',error:null}));
  const owned=()=>current()&&ctx.generation===generation&&ctx.attempt===attempt&&!attempt.cancelled;
  try{const result=await recordPayrollSettlement(data,ctx.actor,input,owned);if(owned()){++ctx.generation;ctx.input=null;setState(s=>({...s,generation:ctx.generation,open:false,error:null,retry:false,saved:result}));}}
  catch(error){if(owned())setState(s=>({...s,phase:'error',error:classify(error),retry:true}));}
  finally{if(ctx.attempt===attempt){ctx.attempt=null;if(current())setState(s=>s.ctx===ctx?{...s}:s);}}
 };
 return {busy:!!ctx.attempt,open:!!view?.open,phase:view?.phase??'loading',plan:view?.plan??null,error:view?.error??null,canRetry:!!view?.retry,saved:view?.saved??null,begin,reload:()=>ctx.selection?begin(ctx.selection):Promise.resolve(),close,execute};
}
