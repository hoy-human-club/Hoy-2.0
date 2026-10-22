import {corruptAuditFixture} from './qa-corrupt-audit-fixture.mjs';
// Fictional local-only intent; no network/provider/customer directory access.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'hoy-alert-')),values=new Map();let quota=false;
globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(quota)throw Error('quota');values.set(k,v);}};
try{
 const out=join(dir,'test.mjs');await build({stdin:{contents:"export {MockProvider} from './src/data/MockProvider';export * from './src/modules/transfers/receipts';export * from './src/modules/transfers/receiptAlert';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:out,logLevel:'silent'});
 const {MockProvider,submitTransfer,readReceiptAlert,simulateReceiptAlert,alertIntentId,insertAlertIntent}=await import(pathToFileURL(out));
 const data=new MockProvider(),owner='fictional-alert-owner',input={key:'fictional-alert-receipt',userId:owner,sessionId:null,matNumber:null,productId:'plan_pack12',productName:{es:'FICTICIO',en:'FICTIONAL'},amount:12345,classes:12,expiresAt:'2099-01-01',image:{dataUrl:'data:image/png;base64,iVBORw0KGgo=',fileName:'fictional-only.png',mimeType:'image/png',bytes:9}};
 await data.insert('users',{id:owner,email:'fictional-alert@example.invalid',status:'active'});
 const snap=()=>JSON.stringify(['payments','transfer_receipts','audit_log','class_ledger','bookings','message_log'].map(t=>data.peek(t)));
 const atomic=data.atomic.bind(data);
 for(const failAfterWrites of [1,2,3]){const before=snap();data.atomic=(action,options)=>atomic(action,{...options,failAfterWrites});await assert.rejects(submitTransfer(data,input),/mock_injected/);assert.equal(snap(),before);}data.atomic=atomic;
 const digest=crypto.subtle.digest.bind(crypto.subtle);let release;crypto.subtle.digest=async(...args)=>{await new Promise(r=>release=r);return digest(...args);};
 const mutable=structuredClone(input),pending=submitTransfer(data,mutable);mutable.productName.en='CHANGED';mutable.image.dataUrl='data:image/png;base64,changed';release();crypto.subtle.digest=digest;
 const receipt=await pending;assert.equal(receipt.product_name.en,'FICTIONAL');assert.equal(receipt.image_data_url,input.image.dataUrl);
 await assert.rejects(insertAlertIntent({...data,name:'real'},receipt,'not-used'),/disconnected/);
 const intent=data.peek('audit_log').find(r=>r.id===alertIntentId(owner,receipt.id));assert.equal(intent.actor_id,null);assert.deepEqual(intent.diff.intended_roles,['front_desk','admin']);assert(!JSON.stringify(intent).includes(input.image.dataUrl));assert(!JSON.stringify(intent).includes(input.image.fileName));
 let before=snap();await submitTransfer(data,input);assert.equal(snap(),before);await assert.rejects(submitTransfer(data,{...input,amount:1}),/request_conflict/);await assert.rejects(submitTransfer(data,{...input,userId:'other'}),/scope|account_state/);assert.equal(snap(),before);
 const state=await readReceiptAlert(data,owner,receipt.id),command={owner,receiptId:receipt.id,revision:state.revision};assert(!state.completed);assert(state.intentId);
 await assert.rejects(readReceiptAlert(data,'other',receipt.id),/scope|account_state/);await assert.rejects(simulateReceiptAlert({...data,name:'real'},command),/disconnected/);
 before=snap();await assert.rejects(simulateReceiptAlert(data,command,()=>true),/cancelled/);assert.equal(snap(),before);
 data.atomic=(action,options)=>atomic(action,{...options,failAfterWrites:1});await assert.rejects(simulateReceiptAlert(data,command),/mock_injected/);data.atomic=atomic;assert.equal(snap(),before);
 quota=true;await assert.rejects(simulateReceiptAlert(data,command),/quota/);quota=false;assert.equal(snap(),before);assert(!(await readReceiptAlert(data,owner,receipt.id)).completed);
 const normalGet=data.get.bind(data);data.get=async()=>{throw Error('read_failed');};await assert.rejects(readReceiptAlert(data,owner,receipt.id),/read_failed/);data.get=normalGet;
 await data.update('transfer_receipts',receipt.id,{review_reason:'FICTIONAL concurrent review'}); // Review state does not change the historical uploaded-event intent.
 await assert.rejects(simulateReceiptAlert(data,{...command,revision:'stale'}),/stale/);
 const fresh=await readReceiptAlert(data,owner,receipt.id),retry={...command,revision:fresh.revision};
 const financial=JSON.stringify(['payments','transfer_receipts','class_ledger','bookings','message_log'].map(t=>data.peek(t)));
 const [one,two]=await Promise.all([simulateReceiptAlert(data,retry),simulateReceiptAlert(data,retry)]);assert.equal(one.id,two.id);assert.equal(JSON.stringify(['payments','transfer_receipts','class_ledger','bookings','message_log'].map(t=>data.peek(t))),financial);
 before=snap();await simulateReceiptAlert(data,retry);assert.equal(snap(),before);await assert.rejects(simulateReceiptAlert(data,{...command,revision:'stale'}),/request_conflict/);assert((await readReceiptAlert(data,owner,receipt.id)).completed);
 await data.update('transfer_receipts',receipt.id,{image_data_url:'data:image/png;base64,corrupt'});await assert.rejects(readReceiptAlert(data,owner,receipt.id),/intent_conflict/);await assert.rejects(simulateReceiptAlert(data,retry),/intent_conflict/);await data.update('transfer_receipts',receipt.id,{image_data_url:input.image.dataUrl});
 // A matching legacy receipt remains untouched and has no inferred alert intent.
 const legacy=await submitTransfer(data,{...input,key:'fictional-legacy'});await corruptAuditFixture(data,'remove',alertIntentId(owner,legacy.id));before=snap();await submitTransfer(data,{...input,key:legacy.id});assert.equal(snap(),before);assert.equal((await readReceiptAlert(data,owner,legacy.id)).intentId,null);await assert.rejects(simulateReceiptAlert(data,{owner,receiptId:legacy.id,revision:'none'}),/intent_missing/);

 const ackReceipt=await submitTransfer(data,{...input,key:'fictional-ack'}),ackState=await readReceiptAlert(data,owner,ackReceipt.id),ackCommand={owner,receiptId:ackReceipt.id,revision:ackState.revision};
 for(const table of ['users','payments','transfer_receipts','audit_log']){const get=data.get.bind(data);data.get=async(t,id)=>{if(t===table)throw Error('required_read');return get(t,id);};await assert.rejects(readReceiptAlert(data,owner,ackReceipt.id),/required_read/);data.get=get;}
 let cancelled=false;const pausedDigest=crypto.subtle.digest.bind(crypto.subtle);let unblock;crypto.subtle.digest=async(...args)=>{await new Promise(r=>unblock=r);return pausedDigest(...args);};
 before=snap();const cancelledAttempt=simulateReceiptAlert(data,ackCommand,()=>cancelled);while(!unblock)await new Promise(r=>setTimeout(r,0));cancelled=true;crypto.subtle.digest=pausedDigest;unblock();await assert.rejects(cancelledAttempt,/cancelled/);assert.equal(snap(),before);
 // Storage has committed but acknowledgement fails: error, then same command verifies existing effect.
 data.atomic=async action=>{const result=await atomic(action);data.get=async()=>{throw Error('ack_read');};return result;};await assert.rejects(simulateReceiptAlert(data,ackCommand),/ack_read/);data.get=normalGet;data.atomic=atomic;assert((await readReceiptAlert(data,owner,ackReceipt.id)).completed);before=snap();await simulateReceiptAlert(data,ackCommand);assert.equal(snap(),before);
 const cancelReceipt=await submitTransfer(data,{...input,key:'fictional-postcommit-cancel'}),cancelState=await readReceiptAlert(data,owner,cancelReceipt.id);cancelled=false;data.atomic=async action=>{const result=await atomic(action);cancelled=true;return result;};await assert.rejects(simulateReceiptAlert(data,{owner,receiptId:cancelReceipt.id,revision:cancelState.revision},()=>cancelled),/cancelled/);data.atomic=atomic;assert((await readReceiptAlert(data,owner,cancelReceipt.id)).completed,'postcommit cancellation keeps factual local effect but rejects acknowledgement');
 await data.update('users',owner,{status:'inactive'});await assert.rejects(readReceiptAlert(data,owner,ackReceipt.id),/account_state/);await assert.rejects(submitTransfer(data,input),/account_state/);await data.update('users',owner,{status:'active'});
 await data.remove('payments',receipt.payment_id);await assert.rejects(readReceiptAlert(data,owner,receipt.id),/payment_state/);await assert.rejects(submitTransfer(data,input),/payment_state/);
 console.log('PASS NT03 local intent: 3 upload stages, caller snapshot, safe metadata, scope, disconnected, cancel, read/quota/staged rollback, pending after failure, stale/current-integrity, concurrent replay, no financial/message effects, legacy no backfill, missing payment.');
}finally{await rm(dir,{recursive:true,force:true});}
