import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const temp=await mkdtemp(join(tmpdir(),'hoy-launch-receipts-')),cache=new Map();let quota=false;
globalThis.localStorage={getItem:k=>cache.get(k)??null,setItem:(k,v)=>{if(quota)throw Error('quota');cache.set(k,v);}};
try{
 const file=join(temp,'domain.mjs');await build({stdin:{contents:"export {MockProvider} from './src/data/MockProvider';export {recordPayment} from './src/modules/customer/payments';export {submitTransfer,reviewTransfer} from './src/modules/transfers/receipts';export {settleAtDesk} from './src/modules/transfers/deskSettlement';export * from './src/data/launchReceipts';export {resolveOperationalQuote,freezeSaleQuote} from './src/data/operationalQuotes';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:file,logLevel:'silent'});
 const {MockProvider,recordPayment,reviewTransfer,settleAtDesk,readLaunchReceipt,captureLaunchReceipt,resolveOperationalQuote,freezeSaleQuote}=await import(pathToFileURL(file));
 const data=new MockProvider(),quote=freezeSaleQuote(resolveOperationalQuote(data.peek('plans'),'pack12'));
 const snapshot=()=>JSON.stringify(data.peek('payments'))+JSON.stringify(data.peek('invoices'))+JSON.stringify(data.peek('message_log'))+JSON.stringify(data.peek('audit_log'));
 const invoices=JSON.stringify(data.peek('invoices')),messages=JSON.stringify(data.peek('message_log'));
 const input={userId:'usr_cust',planId:quote.planId,amount:quote.chargedAmount,method:'card',result:{status:'approved',ref:'FICTIONAL'},ivaRate:.19,quote};
 const key='launch_receipt_checkout_fixture';
 const purchase=()=>data.atomic(tx=>recordPayment(tx,input),{idempotencyKey:key});
 const p=await purchase(),r=readLaunchReceipt(p);assert(r);assert.equal(r.kind,'fictional-payment-receipt');assert.equal(r.delivery,'preview-only');assert.deepEqual(r.facts.quote,quote);assert.equal(r.facts.amountReceived,input.amount);
 const committed=snapshot();assert.deepEqual(await purchase(),p);assert.equal(snapshot(),committed,'purchase replay has no second payment, receipt or invoice');
 await data.update('plans',quote.planId,{price:1,name_es:'FICTIONAL NEW NAME',classes:1});assert.deepEqual(readLaunchReceipt(await data.get('payments',p.id)),r,'receipt retains purchased facts after repricing');
 for(const patch of [{frontend_receipt:null},{frontend_receipt:{...r,item:{es:'Changed',en:'Changed'}}}]){const before=snapshot();await assert.rejects(data.update('payments',p.id,patch),/receipt_immutable/);assert.equal(snapshot(),before);}
 await assert.rejects(data.remove('payments',p.id),/receipt_immutable/);await assert.rejects(data.insert('payments',{...p}),/receipt_immutable/);
 await data.atomic(tx=>captureLaunchReceipt(tx,p,{source:'checkout'}));assert.equal(snapshot(),committed,'same captured receipt acknowledgement is read-only');
 await assert.rejects(data.atomic(tx=>captureLaunchReceipt(tx,p,{source:'desk-sale'})),/receipt_conflict/);
 await data.update('payments',p.id,{amount_paid:p.amount_paid-1});assert.equal(readLaunchReceipt(await data.get('payments',p.id)),null,'changed financial facts are not silently acknowledged');const changed=snapshot();await assert.rejects(data.atomic(tx=>captureLaunchReceipt(tx,p,{source:'checkout'})),/receipt_conflict/);assert.equal(snapshot(),changed);await data.update('payments',p.id,{amount_paid:p.amount_paid});
 // Original pending transfer fixtures are reviewed through the actual command, not a receipt helper mock.
 const pending=await data.insert('payments',{user_id:'usr_cust',plan_id:quote.planId,amount:quote.chargedAmount,amount_paid:null,currency:'COP',status:'pending',method:'transfer',provider:'manual',paid_at:null,frontend_quote:quote});
 const upload=await data.insert('transfer_receipts',{payment_id:pending.id,user_id:'usr_cust',product_id:quote.planId,product_name:quote.name,classes:quote.classes,expires_at:quote.entitlementExpiresAt,status:'pending',session_id:null,mat_number:null});
 const review={id:upload.id,actorId:'usr_desk',role:'front_desk',decision:'approved',amount:pending.amount,reason:'FICTIONAL comparison',compared:true};
 assert.equal(readLaunchReceipt(pending),null);await reviewTransfer(data,review);const transferred=await data.get('payments',pending.id);assert.equal(readLaunchReceipt(transferred).source,'transfer-review');const reviewed=snapshot();await reviewTransfer(data,review);assert.equal(snapshot(),reviewed,'transfer replay preserves the exact receipt without invoice/regrant');
 const desk=await data.insert('payments',{user_id:'usr_cust',plan_id:quote.planId,amount:quote.chargedAmount,amount_paid:null,currency:'COP',status:'pending',method:'cash',provider:'manual',paid_at:null,frontend_quote:quote});
 const command={paymentId:desk.id,actorId:'usr_desk',role:'front_desk',method:'cash',amount:desk.amount,note:'FICTIONAL collection'};const paid=await settleAtDesk(data,command);assert.equal(readLaunchReceipt(paid).source,'desk-settlement');const settled=snapshot();await settleAtDesk(data,command);assert.equal(snapshot(),settled);
 for(const status of ['pending','declined']){const row=await data.atomic(tx=>recordPayment(tx,{...input,quote:undefined,method:status==='pending'?'cash':'card',result:{status:'declined',ref:'FICTIONAL'}}));assert.equal(row.frontend_receipt,undefined);assert.equal(readLaunchReceipt(row),null);}
 // Every approved checkout write, including snapshot persistence, must roll back atomically.
 const atomic=data.atomic.bind(data);for(const failAfterWrites of [1,2,3]){const before=snapshot();await assert.rejects(atomic(tx=>recordPayment(tx,{...input,quote:undefined}),{failAfterWrites}),/mock_injected/);assert.equal(snapshot(),before);}
 const beforeQuota=snapshot();quota=true;await assert.rejects(atomic(tx=>recordPayment(tx,{...input,quote:undefined})),/quota/);quota=false;assert.equal(snapshot(),beforeQuota);
 assert.equal(JSON.stringify(data.peek('invoices')),invoices,'all historical invoices preserved, none created');assert.equal(JSON.stringify(data.peek('message_log')),messages,'no queue or delivery side effect');
 // Same-day v10 reload preserves all old rows; legacy documents are not backfilled.
 const stored=JSON.parse(cache.get('hoyos.db.v1'));assert.equal(stored.version,10);const legacy=stored.db.payments.find(row=>!row.frontend_receipt);assert(legacy);const oldPayment=JSON.stringify(legacy),oldInvoices=JSON.stringify(stored.db.invoices),oldAudit=JSON.stringify(stored.db.audit_log);const reloaded=new MockProvider();assert.equal(JSON.stringify(await reloaded.get('payments',legacy.id)),oldPayment);assert.equal(JSON.stringify(reloaded.peek('invoices')),oldInvoices);assert.equal(JSON.stringify(reloaded.peek('audit_log')),oldAudit);assert.equal(readLaunchReceipt(await reloaded.get('payments',legacy.id)),null);assert.deepEqual(readLaunchReceipt(await reloaded.get('payments',p.id)),r);
 // Pre-receipt committed reviews/settlements remain replayable without backfilling history.
 const legacyCache=structuredClone(stored);for(const id of [pending.id,desk.id])delete legacyCache.db.payments.find(row=>row.id===id).frontend_receipt;cache.set('hoyos.db.v1',JSON.stringify(legacyCache));const legacyProvider=new MockProvider(),legacyBefore=cache.get('hoyos.db.v1');await reviewTransfer(legacyProvider,review);await settleAtDesk(legacyProvider,command);assert.equal(cache.get('hoyos.db.v1'),legacyBefore,'legacy committed replay does not backfill receipt/invoice/audit or regrant');assert.equal(readLaunchReceipt(await legacyProvider.get('payments',desk.id)),null);assert.equal(readLaunchReceipt(await legacyProvider.get('payments',pending.id)),null);
 console.log('PASS launch receipts: checkout/transfer/desk settlement snapshot, no invoices/outbox, immutable recorded terms, stale facts fail closed, replay, every checkout write/quota rollback, v10 reload and historical invoice/audit/payment preservation. Actual S04 sale is covered by its production browser suite.');
}finally{await rm(temp,{recursive:true,force:true});}
