// Development-only controlled actual M03 drawer. Never imported by production.
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {MockProvider} from '../src/data/MockProvider';
import {DataProviderRoot} from '../src/data/DataContext';
import {SessionProvider,useSession} from '../src/auth/SessionProvider';
import {I18nProvider} from '../src/i18n/I18nProvider';
import {ThemeProvider} from '../src/design/ThemeProvider';
import {getStrings} from '../src/app/registry';
import {tableRegistry,type BaseRow} from '../src/data/schema';
import {tenant} from '../src/tenant/tenant';
import type {Query} from '../src/data/types';
import {RowDrawer} from '../src/modules/admin/tables/RowDrawer';
import '../src/modules/admin/tables.css';

type Mode='normal'|'read-hold'|'read-error'|'precommit'|'aftercommit'|'lostack'|'field-aftercommit'|'field-read-error';
interface Harness {
 mode:Mode; pending:Array<()=>void>; atomicCalls:number; inFlight:number; updateCalls:number; events:number; writes:number; closes:number;
 provider:MockProvider; original:BaseRow|null;
 setMode:(mode:Mode)=>void; release:()=>void; prepare:(name:string)=>Promise<void>; switchUser:(id:string)=>void;
 unmount:()=>void; recreate:()=>Promise<void>; snapshot:()=>string;
}
declare global {interface Window {qaExpenseTable:Harness}}

export async function mountExpenseTableHarness():Promise<void>{
 if(!import.meta.env.DEV)throw Error('Development-only drawer harness');
 const provider=new MockProvider();
 // Fixture scope intentionally includes an unrelated tenant canary; no real customer data.
 await provider.insert('expenses',{id:'qa_foreign_expense',tenant_id:'qa_foreign_tenant',concept:'FICTIONAL_FOREIGN_EXPENSE_CANARY',amount:999,paid_on:null});
 const nativeAtomic=provider.atomic.bind(provider),nativeUpdate=provider.update.bind(provider),nativeGet=provider.get.bind(provider);
 let show:(row:BaseRow|null)=>void=()=>{throw Error('Harness not mounted');};
 let sessionSwitch:(id:string)=>void=()=>{throw Error('Session not mounted');};
 let hide:()=>void=()=>{throw Error('Harness not mounted');};
 const hold=()=>new Promise<void>(resolve=>control.pending.push(resolve));
 const control:Harness={mode:'normal',pending:[],atomicCalls:0,inFlight:0,updateCalls:0,events:0,writes:0,closes:0,provider,original:null,
  setMode:mode=>{control.mode=mode;},release:()=>{control.mode='normal';control.pending.splice(0).forEach(resolve=>resolve());},
  prepare:async name=>{if(control.pending.length)throw Error('Release prior held operation first');control.mode='normal';const row=await provider.insert('expenses',{id:`qa_drawer_${name}`,kind:'variable',category:'supplies',concept:'FICTIONAL DRAWER '+name,amount:100,incurred_on:'2026-10-22',paid_on:null,method:'transfer',vendor:null,note:null,template_id:null,created_by:'usr_super'});control.original=structuredClone(row);control.atomicCalls=0;control.updateCalls=0;control.events=0;control.writes=0;control.closes=0;show(structuredClone(row));},
  switchUser:id=>sessionSwitch(id),unmount:()=>hide(),recreate:async()=>{if(!control.original)throw Error('Missing fixture');await provider.insert('expenses',structuredClone(control.original));},
  snapshot:()=>JSON.stringify({db:localStorage.getItem('hoyos.db.v1'),expenses:provider.peek('expenses'),audit:provider.peek('audit_log')})};
 window.qaExpenseTable=control;
 const nativeSet=Storage.prototype.setItem;
 Storage.prototype.setItem=function(key:string,value:string){if(key==='hoyos.db.v1')control.writes++;return nativeSet.call(this,key,value);};
 provider.subscribe('expenses',()=>control.events++);provider.subscribe('audit_log',()=>control.events++);
 provider.atomic=async(action,options)=>{const mode=control.mode;control.atomicCalls++;control.inFlight++;try{
  if(mode==='precommit')await hold();
  const result=await nativeAtomic(async tx=>{const list=tx.list.bind(tx);tx.list=async<T extends BaseRow>(table:string,query?:Query):Promise<T[]>=>{if(table==='expenses'&&query?.where?.id===control.original?.id){if(mode==='read-hold')await hold();if(mode==='read-error')throw Error('FICTIONAL exact expense read failure');}return list<T>(table,query);};return action(tx);},options);
  if(mode==='aftercommit')await hold();
  if(mode==='lostack')throw Error('FICTIONAL committed acknowledgement lost');
  return result;
 }finally{control.inFlight--;}
 };
 provider.update=async<T extends BaseRow>(table:string,id:string,patch:Partial<T>):Promise<T>=>{control.inFlight++;try{if(table==='expenses')control.updateCalls++;const result=await nativeUpdate<T>(table,id,patch);if(table==='expenses'&&control.mode==='field-aftercommit')await hold();return result;}finally{control.inFlight--;}};
 provider.get=async<T extends BaseRow>(table:string,id:string):Promise<T|null>=>{if(table==='expenses'&&control.mode==='field-read-error')throw Error('FICTIONAL field acknowledgement read failure');return nativeGet<T>(table,id);};
 function ActualDrawer(){const session=useSession(),[row,setRow]=React.useState<BaseRow|null>(null),[mounted,setMounted]=React.useState(true);show=value=>{setMounted(true);setRow(value);};hide=()=>setMounted(false);sessionSwitch=session.switchUser;
  const ownRows=(table:string)=>provider.peek(table).filter(item=>item.tenant_id===tenant.id);
  return <><output data-qa-actor={session.user.id} data-qa-role={session.role} data-qa-mounted={String(mounted)}>{session.user.id} / {session.role}</output><p>FICTIONAL DEV DRAWER ONLY / SOLO PANEL FICTICIO. No server protection.</p>{mounted&&<RowDrawer def={tableRegistry.expenses} row={row} canWrite={session.can('tables.write')} technical={false} resolve={(table,id)=>ownRows(table).find(item=>item.id===id)??null} rowsOf={ownRows} onClose={()=>{control.closes++;setRow(null);}} onGraph={()=>{}} relatedHref={(table,column,id)=>`/admin/tables/${table}?filter=${column}:${id}`}/>}</>;
 }
 const oldRoot=document.getElementById('root');if(!oldRoot)throw Error('Missing native app root');oldRoot.style.display='none';const mount=document.createElement('div');mount.dataset.qaExpenseHarness='true';document.body.append(mount);
 createRoot(mount).render(<ThemeProvider><I18nProvider tables={getStrings()}><DataProviderRoot provider={provider}><SessionProvider><MemoryRouter><ActualDrawer/></MemoryRouter></SessionProvider></DataProviderRoot></I18nProvider></ThemeProvider>);
}
