import {useEffect,useRef,useState} from 'react';import {useData} from '../../data/DataContext';import {useSession} from '../../auth/SessionProvider';
import {readEmailEdit,writeEmailVersion,type EmailEditIntent} from './emailEdit';import type {EmailRow} from './emailTest';
export function useEmailEdit(templateId:string|undefined){
 const data=useData(),{user,role}=useSession(),key=JSON.stringify([user.id,role,templateId]),ref=useRef<{key:string;provider:typeof data;dead:boolean;attempt:{cancelled:boolean;intent:EmailEditIntent;requestId:string}|null}|null>(null);
 if(!ref.current||ref.current.key!==key||ref.current.provider!==data){if(ref.current){ref.current.dead=true;if(ref.current.attempt)ref.current.attempt.cancelled=true;}ref.current={key,provider:data,dead:false,attempt:null};}const ctx=ref.current,current=()=>ref.current===ctx&&!ctx.dead;
 const [state,setState]=useState<{ctx:typeof ctx;busy:boolean;error:string|null;saved:EmailRow|null;canRetry:boolean}>({ctx,busy:false,error:null,saved:null,canRetry:false});const failed=useRef<{ctx:typeof ctx;intent:EmailEditIntent;requestId:string}|null>(null);
 useEffect(()=>{ctx.dead=false;return()=>{ctx.dead=true;if(ctx.attempt)ctx.attempt.cancelled=true;};},[ctx]);
 const view=state.ctx===ctx?state:{busy:false,error:null,saved:null,canRetry:false};
 const classify=(e:unknown)=>/stale|concurrent|conflict|unconfirmed/.test(String(e))?'stale':/missing/.test(String(e))?'missing':/unsupported|invalid/.test(String(e))?'unsupported':'save';
 const run=async(intent:EmailEditIntent,retry=false)=>{if(!current()||ctx.attempt)throw Error('email_edit_busy');const prior=failed.current,attempt={cancelled:false,intent:structuredClone(retry&&prior?.ctx===ctx?prior.intent:intent),requestId:retry&&prior?.ctx===ctx?prior.requestId:crypto.randomUUID()};ctx.attempt=attempt;setState({ctx,busy:true,error:null,saved:null,canRetry:false});
  try{const row=await writeEmailVersion(data,{id:user.id,role},attempt.intent,attempt.requestId,()=>attempt.cancelled||!current());if(attempt.cancelled||!current())throw Error('email_edit_cancelled');failed.current=null;setState({ctx,busy:false,error:null,saved:row,canRetry:false});return row;}
  catch(error){if(!attempt.cancelled&&current()){failed.current={ctx,intent:attempt.intent,requestId:attempt.requestId};setState({ctx,busy:false,error:classify(error),saved:null,canRetry:classify(error)==='save'});}throw error;}
  finally{if(ctx.attempt===attempt)ctx.attempt=null;}
 };
 const cancel=()=>{if(ctx.attempt)ctx.attempt.cancelled=true;ctx.attempt=null;failed.current=null;setState({ctx,busy:false,error:null,saved:null,canRetry:false});};
 const reload=async()=>{cancel();if(!templateId||!current())return;const attempt={cancelled:false,intent:null as unknown as EmailEditIntent,requestId:''};ctx.attempt=attempt;setState({ctx,busy:true,error:null,saved:null,canRetry:false});try{const row=await readEmailEdit(data,{id:user.id,role},templateId);if(attempt.cancelled||!current())return;setState({ctx,busy:false,error:null,saved:row,canRetry:false});}catch{if(!attempt.cancelled&&current())setState({ctx,busy:false,error:'read',saved:null,canRetry:false});}finally{if(ctx.attempt===attempt)ctx.attempt=null;}};
 return {...view,run,cancel,reload,retry:()=>{const f=failed.current;return f?.ctx===ctx?run(f.intent,true):Promise.reject(Error('email_edit_missing'));},changed:()=>{if(!ctx.attempt){failed.current=null;setState(s=>s.ctx===ctx?{...s,canRetry:false}:s);}}};
}
