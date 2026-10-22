import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'hoy-register-')),storage=new Map();let failStorage=false;
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(failStorage)throw Error('fictional_quota');storage.set(k,v);}};
globalThis.fetch=()=>{throw Error('unexpected_network');};
try{
 const out=join(dir,'test.mjs');await build({stdin:{contents:"export {MockProvider} from './src/data/MockProvider';export * from './src/modules/customer/auth/mockRegistration';export * from './src/modules/customer/auth/customerReturn';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:out,logLevel:'silent'});
 const {MockProvider,registerMockCustomer,customerReturn,customerAuthLink}=await import(pathToFileURL(out));
 for(const valid of ['/app/checkout/cls_1','/app/checkout/cls_1?mat=12','/app/waitlist/cls-2','/app/plans','/app/plans?plan=plan_12','/app/gift'])assert.equal(customerReturn(valid),valid);
 for(const bad of [null,'','https://evil.invalid','//evil.invalid','/\\evil','/app/checkout/../admin','/admin','/auth/sign-in','/app/checkout/x#evil','/app/checkout/x?next=/admin','/app/checkout/x?mat=0','/app/checkout/x?mat=2&mat=3','/app/checkout/x?mat=%32','/app/checkout/x%2fadmin','/app/checkout/x\n','/app/gift?next=x','/app/plans?plan=x?next=x'])assert.equal(customerReturn(bad),null,String(bad));
 const link=customerAuthLink('/auth/sign-up',new URLSearchParams({next:'/app/checkout/cls_1?mat=2',invite:'fictional&invite'}));const p=new URLSearchParams(link.split('?')[1]);assert.equal(p.get('next'),'/app/checkout/cls_1?mat=2');assert.equal(p.get('invite'),'fictional&invite');assert.equal(customerAuthLink('/auth/sign-in',new URLSearchParams({next:'//evil.invalid'})),'/auth/sign-in');
 const form={first:' Fictional ',last:' Person ',email:'FICTIONAL@example.invalid',whatsapp:'+57 300 000 9933',birthday:'',ecName:'Fictional Contact',ecPhone:'+57 300 000 9934',photo:'data:image/png;base64,RklDVElPTkFM',consent:true,marketing:false,invite:'FictionalInvite'};
 const data=new MockProvider(),atomic=data.atomic.bind(data),snapshot=()=>localStorage.getItem('hoyos.db.v1');
 const before=snapshot();
 for(const field of ['first','last','email','whatsapp','ecName','ecPhone','consent'])await assert.rejects(registerMockCustomer(data,{...form,[field]:field==='consent'?false:''},crypto.randomUUID()),/registration_invalid/);assert.equal(snapshot(),before);
 for(let failAfterWrites=1;failAfterWrites<=6;failAfterWrites++){
  data.atomic=(run)=>atomic(run,{failAfterWrites});await assert.rejects(registerMockCustomer(data,form,crypto.randomUUID()),/mock_injected_write_failure/);assert.equal(snapshot(),before,'all dependent writes roll back');
 }
 data.atomic=run=>atomic(tx=>run(new Proxy(tx,{get(target,key){if(key==='list')return async()=>{throw Error('fictional_read_failure');};const value=target[key];return typeof value==='function'?value.bind(target):value;}})));await assert.rejects(registerMockCustomer(data,form,crypto.randomUUID()),/fictional_read_failure/);assert.equal(snapshot(),before,'duplicate reread failure cannot write a partial account');
 data.atomic=atomic;failStorage=true;const request=crypto.randomUUID();await assert.rejects(registerMockCustomer(data,form,request),/fictional_quota/);failStorage=false;assert.equal(snapshot(),before);
 const [userId,replayed]=await Promise.all([registerMockCustomer(data,form,request),registerMockCustomer(data,form,request)]);assert.equal(userId,replayed);
 assert.equal(data.peek('users').filter(u=>u.id===userId).length,1);assert.equal(data.peek('users').find(u=>u.id===userId).locale,'es');assert.equal(data.peek('profiles').filter(p=>p.user_id===userId).length,1);assert.deepEqual(data.peek('user_roles').filter(r=>r.user_id===userId).map(r=>r.role),['customer']);assert.deepEqual(data.peek('consents').filter(r=>r.user_id===userId).map(r=>r.legal_document_id).sort(),['leg_privacy_es','leg_terms_es']);
 const receipt=data.peek('audit_log').find(a=>a.action==='mock.registration'&&a.entity_id===userId);assert.equal(receipt.diff.source,'fictional-browser-registration');assert.match(receipt.diff.intent,/^[a-f0-9]{64}$/);for(const raw of [form.email.toLowerCase(),form.whatsapp,form.photo,form.ecName])assert(!JSON.stringify(receipt).includes(raw));assert(!JSON.stringify(receipt).includes('password'));
 const racing={...form,email:'fictional-race@example.invalid',whatsapp:'+57 300 000 9977'};const race=await Promise.allSettled([registerMockCustomer(data,racing,crypto.randomUUID()),registerMockCustomer(data,racing,crypto.randomUUID())]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1,'different request nonces cannot race duplicate accounts');assert.equal(race.filter(r=>r.status==='rejected'&&/registration_duplicate/.test(r.reason.message)).length,1);
 const committed=snapshot();await assert.rejects(registerMockCustomer(data,{...form,marketing:true},request),/registration_conflict/);assert.equal(snapshot(),committed);
 for(const duplicate of [{...form,email:form.email.toLowerCase()},{...form,email:'other@example.invalid',whatsapp:'+573000009933'}])await assert.rejects(registerMockCustomer(data,duplicate,crypto.randomUUID()),/registration_duplicate/);assert.equal(snapshot(),committed);
 const next={...form,email:'cancelled@example.invalid',whatsapp:'+57 300 000 9944'};let cancellationChecks=0;await assert.rejects(registerMockCustomer(data,next,crypto.randomUUID(),()=>++cancellationChecks>6),/registration_cancelled/);assert.equal(snapshot(),committed,'cancel after staged writes rolls back');
 for(const disconnected of [{...data,name:'supabase',atomic},{...data,name:'mock',atomic:undefined}])await assert.rejects(registerMockCustomer(disconnected,form,crypto.randomUUID()),/registration_disconnected/);
 console.log('PASS SW-03/CU-01 safe website return/interlinks; required fields; staged write/storage rollback; same-intent concurrent retry once; changed-intent conflict; duplicate contact; fixed customer role/exact consents; cancellation; no password/contact audit or network; real auth disconnected.');
}finally{await rm(dir,{recursive:true,force:true});}
