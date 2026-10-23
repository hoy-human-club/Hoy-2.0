import {ThemeProvider} from '../src/design/ThemeProvider';
// Dev-only actual queue component harness; no application route imports it.
import * as React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {MemoryRouter} from 'react-router-dom';
import {MockProvider} from '../src/data/MockProvider';import {DataProviderRoot} from '../src/data/DataContext';import {SessionProvider,useSession} from '../src/auth/SessionProvider';import {I18nProvider} from '../src/i18n/I18nProvider';import {getStrings} from '../src/app/registry';import {TransferQueuePage} from '../src/modules/transfers/TransferQueuePage';
export function mountDeskReceiptCustomerHarness(){
 const providers=[new MockProvider(),new MockProvider()],state={index:0,role:'',actor:'',paused:false,armed:false,release:()=>{},result:'idle',swap:()=>{},switchUser:(_id:string)=>{},setViewAs:(_role:unknown)=>{},unmount:()=>{},layoutReceipts:[] as string[]};
 (window as unknown as {qaReceiptCustomer:typeof state}).qaReceiptCustomer=state;
 const atomic=providers[0].atomic.bind(providers[0]);providers[0].atomic=(action,options)=>atomic(async tx=>{
  const staged=new Proxy({}, {get(_target,key){if(key==='update')return async(table:string,id:string,patch:never)=>{const row=await tx.update(table,id,patch);if(table==='payments'&&state.armed){state.armed=false;state.paused=true;await new Promise<void>(resolve=>{state.release=()=>{state.paused=false;resolve();};});}return row;};const value=Reflect.get(tx,key);return typeof value==='function'?value.bind(tx):value;}}) as typeof tx;
  try{return await action(staged);}catch(e){state.result=e instanceof Error?e.message:String(e);throw e;}
 },options);
 const node=document.createElement('div');node.id='qa-receipt-customer';document.body.append(node);document.getElementById('root')!.style.display='none';const root=createRoot(node);state.unmount=()=>root.unmount();
 function Controls(){const session=useSession();state.actor=session.user.id;state.role=session.role;state.switchUser=session.switchUser;state.setViewAs=session.setViewAs;return null;}
 function Harness(){const[index,setIndex]=React.useState(0);state.index=index;state.swap=()=>flushSync(()=>setIndex(n=>1-n));React.useLayoutEffect(()=>{state.layoutReceipts.push(node.querySelector('[data-launch-receipt] .receipt-who')?.textContent??'');},[index]);return <DataProviderRoot provider={providers[index]}><SessionProvider><MemoryRouter initialEntries={['/staff/transfers?payment=qa_receipt_customer']}><Controls/><TransferQueuePage/></MemoryRouter></SessionProvider></DataProviderRoot>;}
 root.render(<ThemeProvider><I18nProvider tables={getStrings()}><Harness/></I18nProvider></ThemeProvider>);
}
