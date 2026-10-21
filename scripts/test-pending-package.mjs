import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(join(tmpdir(), 'hoy-pending-package-'));
try {
 const file = join(dir, 'test.mjs');
 await build({stdin:{contents:`export {activatePaidPackage} from './src/modules/customer/payments'; export {approvedPackageRows,packageState} from './src/data/packages';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:file});
 const {activatePaidPackage,approvedPackageRows,packageState} = await import(pathToFileURL(file));
 const payment={id:'qa_payment',user_id:'qa_customer',plan_id:'qa_plan',status:'pending'};
 const rows=[];
 const data={get:async()=>payment,list:async()=>rows,insert:async(_table,row)=>{const stored={id:'qa_purchase',created_at:'2026-10-21',...row};rows.push(stored);return stored;}};
 const input={paymentId:payment.id,userId:payment.user_id,planId:payment.plan_id,classes:12,expiresAt:'2027-04-21'};
 for(const status of ['pending','declined','refunded','voided']) {
  payment.status=status;
  assert.equal(await activatePaidPackage(data,input),null);
  assert.equal(rows.length,0,`${status} never activates package`);
 }
 payment.status='approved';
 const purchase=await activatePaidPackage(data,input);
 assert.equal(rows.length,1);assert.equal(purchase.delta,12);assert.equal(purchase.expires_at,'2027-04-21');
 assert.equal(await activatePaidPackage(data,{...input,classes:99,expiresAt:'2099-01-01'}),purchase);
 assert.equal(rows.length,1);assert.equal(purchase.delta,12);assert.equal(purchase.expires_at,'2027-04-21','replay preserves historical purchased terms');
 const linked={id:'qa_bad',reason:'purchase',delta:12,payment_id:'qa_missing',expires_at:'2027-04-21',created_at:'2026-10-21'};
 const historical={...linked,id:'qa_historical',payment_id:null,delta:2};
 assert.equal(packageState(approvedPackageRows([purchase,linked,historical],[payment]),'2026-10-21').balance,14);
 payment.status='pending';
 assert.equal(packageState(approvedPackageRows([purchase,linked,historical],[payment]),'2026-10-21').balance,2,'legacy pending-linked purchases cannot be spent; unlinked historical grants retained');
 await assert.rejects(activatePaidPackage(data,{...input,userId:'qa_other'}),/scope/);
 console.log('PASS PR-06: non-approved never activates, approved activates once, replay retains purchased terms, pending/missing-payment rows excluded, historical grants preserved, scope rejected');
} finally {await rm(dir,{recursive:true,force:true});}
