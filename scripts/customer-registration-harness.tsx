// Development-only test harness; never imported by the application or production bundle.
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route,useNavigate,useLocation} from 'react-router-dom';
import {MockProvider} from '../src/data/MockProvider';
import {DataProviderRoot} from '../src/data/DataContext';
import {SessionProvider,useSession} from '../src/auth/SessionProvider';
import {I18nProvider} from '../src/i18n/I18nProvider';
import {ThemeProvider} from '../src/design/ThemeProvider';
import {getStrings} from '../src/app/registry';
import {SignUpPage} from '../src/modules/customer/auth/SignUpPage';
export function mountCustomerRegistrationHarness(){
 const provider=new MockProvider(),atomic=provider.atomic.bind(provider);window.qaRegistrationMode='delay';window.qaRegistrationCalls=0;window.qaRegistrationPending=[];window.qaRegistrationProvider=provider;
 provider.atomic=async action=>{window.qaRegistrationCalls++;if(window.qaRegistrationMode==='delay')await new Promise(resolve=>window.qaRegistrationPending.push(resolve));if(window.qaRegistrationMode==='failure')return atomic(action,{failAfterWrites:3});const result=await atomic(action);if(window.qaRegistrationMode==='aftercommit')await new Promise(resolve=>window.qaRegistrationPending.push(resolve));return result;};
 function Controls(){const nav=useNavigate(),location=useLocation(),session=useSession();window.qaRegistrationNavigate=nav;window.qaRegistrationSwitch=session.switchUser;window.qaRegistrationSession=session.user.id;window.qaRegistrationRoute=location.pathname;return null;}
 document.getElementById('root').style.display='none';const mount=document.createElement('div');document.body.append(mount);const h=React.createElement;createRoot(mount).render(h(ThemeProvider,null,h(I18nProvider,{tables:getStrings()},h(DataProviderRoot,{provider},h(SessionProvider,null,h(MemoryRouter,{initialEntries:['/auth/sign-up?next=%2Fapp%2Fcheckout%2Fqa_mock_return%3Fmat%3D2']},h(Controls),h(Routes,null,h(Route,{path:'/auth/sign-up',element:h(SignUpPage)}),h(Route,{path:'*',element:h('p',null,'FICTIONAL HARNESS DESTINATION')}))))))));
}
