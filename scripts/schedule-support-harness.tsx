// Dev-only actual-page harness. All records are fictional; no application import.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { MockProvider } from '../src/data/MockProvider';
import { DataProviderRoot } from '../src/data/DataContext';
import { SessionProvider } from '../src/auth/SessionProvider';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { useTheme, ThemeProvider } from '../src/design/ThemeProvider';
import { getStrings } from '../src/app/registry';
import { SchedulePage } from '../src/modules/customer/pages/SchedulePage';
import { BookedPage } from '../src/modules/customer/pages/BookedPage';
import { RulesPage } from '../src/modules/customer/pages/RulesPage';
import { FaqPage } from '../src/modules/customer/pages/FaqPage';
import { TeachersPage, TeacherProfilePage } from '../src/modules/customer/pages/TeachersPage';
import '../src/modules/customer/customer.css';
import { AppShell } from '../src/components/template/AppShell/AppShell';
import { routes } from '../src/modules/customer';
let activeRoot: ReturnType<typeof createRoot> | null = null;
let activeMount: HTMLElement | null = null;
export async function mountScheduleSupportHarness(route = '/app/schedule', mode = '') {
 activeRoot?.unmount(); activeMount?.remove();
 localStorage.removeItem('hoyos.db.v1');
 const provider = new MockProvider();
 const sessions = await provider.list('class_sessions'), modalities = await provider.list('modalities'), teachers = await provider.list('teachers'), rooms = await provider.list('rooms');
 const first = sessions[0], modality = modalities.find(m => m.active), teacher = teachers.find(t => t.active);
 for (const s of sessions) await provider.remove('class_sessions', s.id);
 const base = {...first, template_id:null, modality_id:modality.id, teacher_id:teacher.id, room_id:rooms[0].id, status:'scheduled', capacity:8, booked_count:2};
 for (const [id, hour, extra] of [['qa-open',18,{}],['qa-full',19,{booked_count:8}],['qa-started',14,{}],['qa-inactive',20,{template_id:'qa-off'}],['qa-midnight',24,{}]]) {
  const start = Date.UTC(2026,9,23,hour,30);
  await provider.insert('class_sessions',{...base,...extra,id,title:`FICTIONAL ${id}`,starts_at:new Date(start).toISOString(),ends_at:new Date(start+50*60000).toISOString()});
 }
 await provider.insert('class_templates',{id:'qa-off',active:false});
 await provider.insert('teachers',{...teacher,id:'qa-inactive-teacher',display_name:'FICTIONAL HIDDEN TEACHER',active:false});
 await provider.insert('payments',{id:'qa-payment',user_id:'usr_cust',plan_id:null,status:'approved',amount:100,currency:'COP',method:'cash',provider:'manual'});
 await provider.insert('class_ledger',{id:'qa-debit',user_id:'usr_cust',payment_id:'qa-payment',delta:-1,reason:'booking'});
 await provider.insert('bookings',{id:'qa-booking',user_id:'usr_cust',session_id:'qa-open',status:'booked',paid_with:'package',ledger_id:'qa-debit',rated:false});
 const list=provider.list.bind(provider);
 window.qaSupportMode=mode; window.qaSupportProvider=provider;
 provider.list=async(table,q)=>{if(window.qaSupportMode===`error:${table}`)throw Error('fictional_read_failure');if(window.qaSupportMode===`empty:${table}`)return [];return list(table,q);};
 function Controls(){window.qaSupportNavigate=useNavigate();window.qaSupportTheme=useTheme().setTheme;return null;}
 document.getElementById('root').style.display='none';
 const mount=document.createElement('div');document.body.append(mount);
 activeMount=mount;
 activeRoot=createRoot(mount);
 activeRoot.render(<ThemeProvider><I18nProvider tables={getStrings()}><DataProviderRoot provider={provider}><SessionProvider><MemoryRouter initialEntries={[route]}><Controls/><AppShell surface="customer" routes={routes} homeTo="/app"><Routes>
  <Route path="/app/schedule" element={<SchedulePage/>}/><Route path="/app/schedule/week" element={<SchedulePage view="week"/>}/><Route path="/app/booking/:id" element={<BookedPage/>}/><Route path="/app/rules" element={<RulesPage/>}/><Route path="/app/faq" element={<FaqPage page={1}/>}/><Route path="/app/faq/2" element={<FaqPage page={2}/>}/><Route path="/app/teachers" element={<TeachersPage/>}/><Route path="/app/teachers/:id" element={<TeacherProfilePage/>}/><Route path="*" element={<p>FICTIONAL DESTINATION</p>}/>
 </Routes></AppShell></MemoryRouter></SessionProvider></DataProviderRoot></I18nProvider></ThemeProvider>);
}
