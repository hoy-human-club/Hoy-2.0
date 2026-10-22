import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataProvider } from '../../data/types';
import type { ExpenseRow, ExpenseTemplateRow } from '../../data/schema';
import { readExpenseWorkspace, runExpenseCommand, type ExpenseCommand, type ExpenseIdentity, type ExpenseInput, type ExpenseOutcome } from './expenseLedger';

/** Dedicated ledger reader/command lifecycle; shared preferences and generic table hooks are untouched. */
export function useExpenseLedger(data:DataProvider,identity:ExpenseIdentity){
 const live=useRef({data,...identity});live.current={data,...identity};
 const alive=useRef(true),generation=useRef(0),pending=useRef<AbortController|null>(null),intent=useRef<ExpenseCommand|null>(null);
 const [workspace,setWorkspace]=useState<{expenses:ExpenseRow[];templates:ExpenseTemplateRow[]}>({expenses:[],templates:[]}),[loading,setLoading]=useState(true),[readError,setReadError]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState<'saved'|'stopped'|''>(''),[retryable,setRetryable]=useState(false),[outcome,setOutcome]=useState<ExpenseOutcome|null>(null),[createVersion,setCreateVersion]=useState(0),[templateVersion,setTemplateVersion]=useState(0);
 const actorId=identity.actorId,role=identity.role;
 const currentActor=useCallback(()=>({actorId:live.current.data===data?live.current.actorId:'',role:live.current.role}),[data]);
 const refresh=useCallback(async()=>{if(!alive.current)return;const seq=++generation.current;setLoading(true);try{const next=await readExpenseWorkspace(data,{actorId,role},{currentActor});if(alive.current&&seq===generation.current){setWorkspace(next);setReadError(false);}}catch{if(alive.current&&seq===generation.current){setWorkspace({expenses:[],templates:[]});setReadError(true);}}finally{if(alive.current&&seq===generation.current)setLoading(false);}},[data,actorId,role,currentActor]);
 useEffect(()=>{alive.current=true;void refresh();const offs=['expenses','expense_templates','users'].map(table=>data.subscribe(table,()=>{void refresh();}));return()=>{alive.current=false;generation.current++;pending.current?.abort();offs.forEach(off=>off());};},[data,refresh]);
 const execute=useCallback(async(command:ExpenseCommand):Promise<boolean>=>{
  if(pending.current||!alive.current||readError||loading)return false;
  const stop=new AbortController();pending.current=stop;intent.current=structuredClone(command);setBusy(true);setError('');setNotice('');setRetryable(false);setOutcome(null);
  try{const result=await runExpenseCommand(data,intent.current,{signal:stop.signal,currentActor});if(!alive.current||stop.signal.aborted)return false;setOutcome(result);setNotice('saved');if(command.type==='create')setCreateVersion(v=>v+1);if(command.type==='template.create')setTemplateVersion(v=>v+1);intent.current=null;return true;}
  catch(e){if(alive.current){if(stop.signal.aborted){setNotice('stopped');intent.current=null;}else{setError(e instanceof Error?e.message:'expense_failed');setRetryable(true);}}return false;}
  finally{if(pending.current===stop)pending.current=null;if(alive.current){setBusy(false);void refresh();}}
 },[data,currentActor,readError,loading,refresh]);
 const submit=useCallback((input:ExpenseInput)=>execute({...structuredClone(input),actorId,role} as ExpenseCommand),[execute,actorId,role]);
 const retry=useCallback(()=>intent.current?execute(intent.current):Promise.resolve(false),[execute]);
 const cancel=useCallback(()=>{if(pending.current){pending.current.abort();setNotice('stopped');}else{intent.current=null;setRetryable(false);setError('');setNotice('stopped');}},[]);
 return {...workspace,loading,readError,busy,error,notice,retryable,outcome,createVersion,templateVersion,refresh,submit,retry,cancel};
}
