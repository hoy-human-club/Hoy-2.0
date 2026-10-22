// Dev-only actual M18 component/context/storage fault harness. Never imported by production.
import * as React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import {MemoryRouter,Routes,Route,useNavigate,useLocation} from 'react-router-dom';
import {MockProvider} from '../src/data/MockProvider';import {DataProviderRoot} from '../src/data/DataContext';import {SessionProvider,useSession} from '../src/auth/SessionProvider';import {I18nProvider} from '../src/i18n/I18nProvider';import {ThemeProvider} from '../src/design/ThemeProvider';import {getStrings} from '../src/app/registry';
import {MarketingDraftBoard} from '../src/components/organism/MarketingDraftBoard/MarketingDraftBoard';import {blankDraft,draftKey} from '../src/modules/marketing/drafts';
export function mountMarketingDraftFences(){
 const providers=[new MockProvider(),new MockProvider()],h=React.createElement,c={tenantId:'ten_hoy',actorId:'usr_mkt',role:'marketing',adapter:'mock'},key=draftKey(c);
 const rows=['one','two'].map(id=>({...blankDraft('campaign','fictional_'+id),title:{es:'Campaña FICTICIA '+id,en:'FICTIONAL campaign '+id}}));
 localStorage.setItem(key,JSON.stringify({version:1,tenantId:c.tenantId,actorId:c.actorId,role:c.role,revision:0,rows,requests:{}}));
 window.qaDraftMode='normal';window.qaDraftPending=[];window.qaDraftDigestCalls=0;window.qaDraftWrites=0;window.qaDraftReadCalls=0;window.qaDraftKey=key;
 const digest=crypto.subtle.digest.bind(crypto.subtle),get=Storage.prototype.getItem,set=Storage.prototype.setItem;let failRead=false;window.qaDraftRawSet=(value:string)=>set.call(localStorage,key,value);
 crypto.subtle.digest=async(...args)=>{window.qaDraftDigestCalls++;if(window.qaDraftMode==='digest')await new Promise(resolve=>window.qaDraftPending.push(resolve));return digest(...args);};
 Storage.prototype.getItem=function(k){if(k.startsWith('hoyos.marketing-drafts.v1.'))window.qaDraftReadCalls++;if(k.startsWith('hoyos.marketing-drafts.v1.')&&failRead){failRead=false;throw Error('FICTIONAL readback');}return get.call(this,k);};
 Storage.prototype.setItem=function(k,v){if(!k.startsWith('hoyos.marketing-drafts.v1.'))return set.call(this,k,v);const mode=window.qaDraftMode;if(mode==='quota')throw Error('FICTIONAL quota');set.call(this,k,v);window.qaDraftWrites++;
  if(mode==='lostack'){window.qaDraftMode='normal';throw Error('FICTIONAL lost acknowledgement');}
  if(mode==='readback'){window.qaDraftMode='normal';failRead=true;}
  if(mode==='postcommit-route'){window.qaDraftMode='normal';flushSync(()=>window.qaDraftNavigate('/away'));}
  if(mode==='postcommit-actor'){window.qaDraftMode='normal';flushSync(()=>window.qaDraftSwitch('usr_admin'));}
 };
 function Controls(){const nav=useNavigate(),session=useSession(),location=useLocation();window.qaDraftLocation=location.pathname+location.search;window.qaDraftActor=session.user.id;window.qaDraftRole=session.role;window.qaDraftNavigate=nav;window.qaDraftSwitch=session.switchUser;window.qaDraftViewAs=session.setViewAs;return null;}
 function Harness(){const[index,setIndex]=React.useState(0);window.qaDraftProviderSwap=()=>setIndex(n=>1-n);return h(DataProviderRoot,{provider:providers[index]},h(SessionProvider,null,h(MemoryRouter,{initialEntries:['/admin/marketing']},h(Controls),h(Routes,null,h(Route,{path:'/admin/marketing',element:h(MarketingDraftBoard)}),h(Route,{path:'*',element:h('p',null,'FICTIONAL MARKETING HARNESS DESTINATION')})))));}
 document.getElementById('root').style.display='none';const mount=document.createElement('div');document.body.append(mount);createRoot(mount).render(h(ThemeProvider,null,h(I18nProvider,{tables:getStrings()},h(Harness))));
}
