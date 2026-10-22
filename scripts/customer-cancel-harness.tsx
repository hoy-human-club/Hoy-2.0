// Development-only actual C08/C08b page + provider lifecycle harness; absent from the production bundle.
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route,useNavigate} from 'react-router-dom';
import {MockProvider} from '../src/data/MockProvider';
import {DataProviderRoot} from '../src/data/DataContext';
import {SessionProvider,useSession} from '../src/auth/SessionProvider';
import {I18nProvider} from '../src/i18n/I18nProvider';
import {ThemeProvider} from '../src/design/ThemeProvider';
import {getStrings} from '../src/app/registry';
import {PolicySync} from '../src/modules/customer/policy';
import {BookedPage} from '../src/modules/customer/pages/BookedPage';

export function mountCustomerCancellationHarness(){
 const qa=window as unknown as {qaCancelMode:string;qaCancelPending:Array<()=>void>;qaCancelCalls:number;qaCancelSettled:number;qaCancelProvider:MockProvider;qaCancelNavigate:(path:string)=>void;qaCancelSwitch:(id:string)=>void;qaCancelReplaceProvider:()=>void;qaCancelActor:string;qaCancelActiveProvider:MockProvider};
 qa.qaCancelMode='normal';qa.qaCancelPending=[];qa.qaCancelCalls=0;qa.qaCancelSettled=0;
 function provider(){const data=new MockProvider(),list=data.list.bind(data),atomic=data.atomic.bind(data);qa.qaCancelProvider=data;
  data.list=async(table,query)=>{const exactActor=table==='users'&&!!query?.where?.tenant_id&&query.where.id==='usr_cust';if(exactActor&&qa.qaCancelMode==='holdread')await new Promise<void>(resolve=>qa.qaCancelPending.push(resolve));if(exactActor&&qa.qaCancelMode==='readfail')throw Error('FICTIONAL own-row read failure');return list(table,query);};
  data.atomic=async(action,options)=>{qa.qaCancelCalls++;try{if(qa.qaCancelMode==='holdtx')await new Promise<void>(resolve=>qa.qaCancelPending.push(resolve));const mode=qa.qaCancelMode,result=await atomic(action,{...options,...(mode==='writefail'?{failAfterWrites:2}:{})});if(mode==='postinactive'){qa.qaCancelMode='normal';await data.update('users','usr_cust',{status:'inactive'});}if(mode==='lostack'){qa.qaCancelMode='normal';throw Error('FICTIONAL acknowledgement lost');}if(mode==='posthold')await new Promise<void>(resolve=>qa.qaCancelPending.push(resolve));return result;}finally{qa.qaCancelSettled++;}};return data;
 }
 function Controls(){const navigate=useNavigate(),session=useSession();qa.qaCancelNavigate=navigate;qa.qaCancelSwitch=session.switchUser;React.useEffect(()=>{qa.qaCancelActor=session.user.id;},[session.user.id,session.role]);return <output hidden data-qa-cancel-session={session.user.id} data-qa-cancel-role={session.role}/>;}
 function Harness(){const[data,setData]=React.useState(provider);React.useEffect(()=>{qa.qaCancelActiveProvider=data;},[data]);qa.qaCancelReplaceProvider=()=>setData(provider());return <DataProviderRoot provider={data}><SessionProvider><PolicySync/><MemoryRouter initialEntries={['/app/booking/qa_customer_cancel_booking/change']}><Controls/><Routes><Route path="/app/booking/:id/change" element={<BookedPage change/>}/><Route path="/app/booking/:id" element={<BookedPage/>}/><Route path="*" element={<p>QA FICTIONAL cancellation harness destination</p>}/></Routes></MemoryRouter></SessionProvider></DataProviderRoot>;}
 const mount=document.getElementById('root')??document.body.appendChild(document.createElement('div'));mount.dataset.qaCustomerCancellationHarness='true';createRoot(mount).render(<ThemeProvider><I18nProvider tables={getStrings()}><Harness/></I18nProvider></ThemeProvider>);
}
