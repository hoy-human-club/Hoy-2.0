// Synthetic regression fixtures for published immutability and resolved consent evidence.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'hoy-consent-recovery-')),storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
try {
 await build({stdin:{contents:"export {MockProvider} from './src/data/MockProvider';export * from './src/modules/customer/auth/signupLegal';export {registerMockCustomer} from './src/modules/customer/auth/mockRegistration';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:join(dir,'test.mjs'),logLevel:'silent'});
 const {MockProvider,readSignupLegal:read,signupLegalKey,registerMockCustomer:register}=await import(pathToFileURL(join(dir,'test.mjs')));
 const d=new MockProvider(),before=localStorage.getItem('hoyos.db.v1'),published=await d.get('legal_documents','leg_terms_20');
 for(const patch of [{status:'draft'},{body_md:{es:'Cambio',en:'Rewrite'}},{id:'renamed'},{tenant_id:'another'}])await assert.rejects(d.update('legal_documents',published.id,patch),/legal_document_immutable/);
 await assert.rejects(d.remove('legal_documents',published.id),/legal_document_immutable/);
 await assert.rejects(d.insert('legal_documents',{...published}),/legal_document_duplicate/);
 await assert.rejects(d.atomic(tx=>tx.update('legal_documents',published.id,{status:'draft'})),/legal_document_immutable/);
 assert.equal(localStorage.getItem('hoyos.db.v1'),before);
 const draft=await d.insert('legal_documents',{...published,id:'fictional_draft',version:'98',status:'draft'});
 await assert.rejects(d.update('legal_documents',draft.id,{id:published.id}),/identity_immutable/);
 await d.update('legal_documents',draft.id,{version:'99'});await d.update('legal_documents',draft.id,{status:'published'});
 await assert.rejects(d.update('legal_documents',draft.id,{version:'100'}),/immutable/);
 const disposable=await d.insert('legal_documents',{...published,id:'fictional_disposable',status:'draft'});await d.remove('legal_documents',disposable.id);
 const legal=await read(d),tenantRow=d.peek('tenants')[0],form={first:'Fictional',last:'Recovery',email:'recovery@example.invalid',whatsapp:'+573000008811',birthday:'',ecName:'Fictional Contact',ecPhone:'+573000008812',photo:null,consent:true,legal,marketing:false,invite:null};
 {const initial=signupLegalKey(await read(d));await d.update('tenants',tenantRow.id,{settings:{...tenantRow.settings,quietHours:{from:'20:00',to:'06:00'}}});assert.equal(signupLegalKey(await read(d)),initial);}
 const nonce=crypto.randomUUID(),user=await register(d,form,nonce),receipt=d.peek('audit_log').find(r=>r.entity_id===user&&r.action==='mock.registration'),retained=JSON.stringify(receipt);
 assert(receipt.diff.legal.every(r=>r.copy?.es?.body&&r.copy?.en?.body&&!r.copy.es.body.includes('{{')));
 for(const change of [{policies:{...tenantRow.settings?.policies,cancellationHours:37}},{profile:{...tenantRow.settings?.profile,email:'fictional-legal@example.invalid',address:'Synthetic address',confirmed:true}},{branding:{displayName:'Fictional Recovery Studio'}}]) {
  const baseline=await read(d),row=await d.get('tenants',tenantRow.id);await d.update('tenants',row.id,{settings:{...row.settings,...change}});
  assert.notEqual(signupLegalKey(await read(d)),signupLegalKey(baseline),'resolved policy/contact/tenant changes invalidate consent');
  const state=localStorage.getItem('hoyos.db.v1');await assert.rejects(register(d,{...form,email:'stale@example.invalid',whatsapp:'+573000008813'},crypto.randomUUID()),/legal_stale/);assert.equal(localStorage.getItem('hoyos.db.v1'),state);
 }
 assert.equal(await register(d,form,nonce),user);assert.equal(JSON.stringify(d.peek('audit_log').find(r=>r.id===receipt.id)),retained,'replay preserves exact bilingual accepted copy');
 console.log('PASS recovery: published update/delete/duplicate/atomic writes rejected; drafts editable/publishable; policy/contact/branding invalidate review; stale transaction no writes; immutable bilingual receipt survives replay.');
} finally {await rm(dir,{recursive:true,force:true});}
