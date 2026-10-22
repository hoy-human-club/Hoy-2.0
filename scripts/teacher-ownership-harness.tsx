import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route,useNavigate} from 'react-router-dom';
import {MockProvider} from '../src/data/MockProvider';
import {DataProviderRoot} from '../src/data/DataContext';
import {SessionProvider,useSession} from '../src/auth/SessionProvider';
import {I18nProvider} from '../src/i18n/I18nProvider';
import {ThemeProvider} from '../src/design/ThemeProvider';
import {getStrings} from '../src/app/registry';
import {TeacherClassPage} from '../src/modules/teacher/ClassPage';
// Dev-only test harness. Never imported by the application or included in production.
export async function mountTeacherOwnershipHarness(){

  const provider=new MockProvider(),stamp=new Date().toISOString(),me=provider.peek('teachers').find(t=>t.user_id==='usr_teach'),other=provider.peek('teachers').find(t=>t.id!==me.id),base=provider.peek('class_sessions')[0];
  await provider.insert('users',{id:'qa_other_teacher',email:'qa-teacher@example.invalid',status:'active'});await provider.insert('profiles',{user_id:'qa_other_teacher',full_name:'FICTIONAL second teacher'});await provider.insert('user_roles',{user_id:'qa_other_teacher',role:'teacher'});await provider.update('teachers',other.id,{user_id:'qa_other_teacher'});
  for(const [id,teacher_id] of [['qa_state_own',me.id],['qa_state_foreign',other.id]])await provider.insert('class_sessions',{...base,id,teacher_id,title:id,starts_at:new Date(Date.now()+3600000).toISOString(),ends_at:new Date(Date.now()+7200000).toISOString(),status:'scheduled',booked_count:0,capacity:8});
  await provider.insert('users',{id:'qa_state_person',email:'qa-person@example.invalid',status:'active'});await provider.insert('profiles',{user_id:'qa_state_person',full_name:'FICTIONAL PROTECTED ROSTER'});await provider.insert('bookings',{user_id:'qa_state_person',session_id:'qa_state_own',status:'booked',paid_with:'package',ledger_id:null});
  const original=provider.list.bind(provider);window.qaTeacherMode='loading';window.qaTeacherPending=[];window.qaTeacherReads=[];
  provider.list=(table,query)=>{const inOwner=new Error().stack.includes('/src/modules/teacher/classOwnership.ts');if(inOwner)window.qaTeacherReads.push({table,query});if(inOwner&&table==='class_sessions'&&query?.where?.id?.startsWith('qa_state_')){if(window.qaTeacherMode==='loading')return new Promise(resolve=>window.qaTeacherPending.push(async()=>resolve(await original(table,query))));if(window.qaTeacherMode==='error')return Promise.reject(Error('Fictional ownership read failure'));}if(inOwner&&table==='bookings'&&window.qaTeacherMode==='details_error')return Promise.reject(Error('Fictional detail read failure'));return original(table,query);};
  window.qaTeacherProvider=provider;window.qaTeacherOwn=me.id;window.qaTeacherOther=other.id;
  function Controls(){const session=useSession(),navigate=useNavigate();window.qaTeacherSwitch=session.switchUser;window.qaTeacherNavigate=id=>navigate('/teach/class/'+id);return null;}
  document.getElementById('root').style.display='none';const mount=document.createElement('div');document.body.append(mount);const h=React.createElement;createRoot(mount).render(h(ThemeProvider,null,h(I18nProvider,{tables:getStrings()},h(DataProviderRoot,{provider},h(SessionProvider,null,h(MemoryRouter,{initialEntries:['/teach/class/qa_state_own']},h(Controls),h(Routes,null,h(Route,{path:'/teach/class/:id',element:h(TeacherClassPage)}))))))));
}
