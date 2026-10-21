// Isolated fictional MockProvider; no network, payments or real files.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'hoy-transfer-'));let storageFailure=false;const values=new Map();
globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(storageFailure)throw Error('quota');values.set(k,v);}};
try{
 const out=join(dir,'test.mjs');await build({stdin:{contents:"export {MockProvider} from './src/data/MockProvider';export * from './src/modules/transfers/receipts';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:out,logLevel:'silent'});
 const {MockProvider,submitTransfer,reviewTransfer,validateReceiptBytes,RECEIPT_MAX_BYTES}=await import(pathToFileURL(out));
 const png=new Uint8Array([137,80,78,71,13,10,26,10,0]);validateReceiptBytes('fixture.png','image/png',png);validateReceiptBytes('fixture.JPG','image/jpeg',new Uint8Array([255,216,255,1]));
 for(const [name,type,bytes,code] of [['x.pdf','application/pdf',png,'format'],['x.png','image/jpeg',png,'format'],['x.png','image/png',new Uint8Array([1,2,3]),'format'],['x.png','image/png',new Uint8Array(),'size'],['x.png','image/png',new Uint8Array(RECEIPT_MAX_BYTES+1),'size']])assert.throws(()=>validateReceiptBytes(name,type,bytes),new RegExp(code));
 const data=new MockProvider(),userId='qa_receipt',session=await data.insert('class_sessions',{id:'qa_transfer_session',title:'FICTIONAL transfer class',modality_id:'qa',room_id:'qa',starts_at:new Date(Date.now()+86400000).toISOString(),ends_at:new Date(Date.now()+90000000).toISOString(),status:'scheduled',capacity:6,booked_count:0});
 const input={key:'qa_receipt_1',userId,sessionId:session.id,matNumber:null,productId:'plan_pack12',productName:{es:'Paquete FICTICIO',en:'FICTIONAL package'},amount:12345,classes:12,expiresAt:'2099-01-01',image:{dataUrl:'data:image/png;base64,iVBORw0KGgo=',fileName:'fictional.png',mimeType:'image/png',bytes:9}};
 const snap=()=>JSON.stringify(['payments','transfer_receipts','class_ledger','bookings','invoices','audit_log','class_sessions'].map(t=>data.peek(t)));
 const normalAtomic=data.atomic.bind(data);
 for(const failAfterWrites of [1,2]){const before=snap();data.atomic=(action,options)=>normalAtomic(action,{...options,failAfterWrites});await assert.rejects(submitTransfer(data,input),/mock_injected/);assert.equal(snap(),before);}data.atomic=normalAtomic;
 const before=snap();storageFailure=true;await assert.rejects(submitTransfer(data,input),/quota/);storageFailure=false;assert.equal(snap(),before);
 const [one,two]=await Promise.all([submitTransfer(data,input),submitTransfer(data,input)]);assert.equal(one.id,two.id);assert.equal(data.peek('payments').filter(r=>r.user_id===userId).length,1);assert.equal(data.peek('class_ledger').filter(r=>r.user_id===userId).length,0);assert.equal(data.peek('bookings').filter(r=>r.user_id===userId).length,0);
 await assert.rejects(submitTransfer(data,{...input,userId:'qa_other'}),/scope/);
 const decision={id:one.id,actorId:'qa_desk',role:'front_desk',decision:'approved',amount:12345,reason:'Compared fictional notification',compared:true};
 for(const patch of [{role:'customer'},{role:'coordinator'},{amount:12344},{compared:false},{reason:''}]){const prev=snap();await assert.rejects(reviewTransfer(data,{...decision,...patch}));assert.equal(snap(),prev);}
 await data.update('class_sessions',session.id,{capacity:0});const full=snap();await assert.rejects(reviewTransfer(data,decision),/session_full/);assert.equal(snap(),full,'capacity failure rolls back approval and grant');await data.update('class_sessions',session.id,{capacity:6});
 for(const failAfterWrites of [1,2,3,4,5,6,7]){const before=snap();data.atomic=(action,options)=>normalAtomic(action,{...options,failAfterWrites});await assert.rejects(reviewTransfer(data,decision),/mock_injected/);assert.equal(snap(),before,'each staged review write rolls back');}data.atomic=normalAtomic;
 const prior=snap();storageFailure=true;await assert.rejects(reviewTransfer(data,decision),/quota/);storageFailure=false;assert.equal(snap(),prior,'storage failure rolls back entire review');
 const approved=await reviewTransfer(data,decision);assert.equal(approved.status,'approved');assert(approved.booking_id);assert.equal(data.peek('class_ledger').filter(r=>r.user_id===userId).reduce((s,r)=>s+r.delta,0),11);assert.equal(data.peek('bookings').filter(r=>r.user_id===userId).length,1);assert.equal(data.peek('class_sessions').find(s=>s.id===session.id).booked_count,1);
 const audit=data.peek('audit_log').find(a=>a.entity_id===one.id);assert.equal(audit.diff.role,'front_desk');assert.equal(audit.diff.source,'fictional-transfer-review');
 const after=snap();await reviewTransfer(data,decision);assert.equal(snap(),after,'same-decision replay has no duplicate effect');await assert.rejects(reviewTransfer(data,{...decision,decision:'rejected'}),/already_reviewed/);assert.equal(snap(),after);
 const rejected=await submitTransfer(data,{...input,key:'qa_receipt_2',sessionId:null});await reviewTransfer(data,{...decision,id:rejected.id,decision:'rejected',amount:0,reason:'Fictional mismatch'});assert.equal(data.peek('payments').find(p=>p.id===rejected.payment_id).status,'declined');assert.equal(data.peek('class_ledger').filter(r=>r.user_id===userId).length,2,'rejection adds no entitlement');
 const trialUser='qa_trial_receipts';
 const trial1=await submitTransfer(data,{...input,key:'qa_trial_1',userId:trialUser,productId:'plan_trial',classes:1,sessionId:null});
 const trial2=await submitTransfer(data,{...input,key:'qa_trial_2',userId:trialUser,productId:'plan_trial',classes:1,sessionId:null});
 await reviewTransfer(data,{...decision,id:trial1.id});const trialBefore=snap();
 await assert.rejects(reviewTransfer(data,{...decision,id:trial2.id}),/trial_used/);assert.equal(snap(),trialBefore,'second pending trial approval rejected without changing payment/request/grants');assert.equal(data.peek('transfer_receipts').find(r=>r.id===trial2.id).status,'pending');
 console.log('PASS PG-02/04/05: signature/type/size validation, pending without entitlement/hold, concurrent submission replay, unauthorized/invalid review, full/storage atomic rollback, retry, exact approval once, rejection without grant, second pending trial blocked on approval. Browser decoding/cancel/roles verified separately.');
}finally{await rm(dir,{recursive:true,force:true});}
