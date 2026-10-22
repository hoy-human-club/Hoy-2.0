import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'hoy-recovery-'));
try{
 const file=join(dir,'test.mjs');await build({entryPoints:['src/modules/customer/auth/mockRecovery.ts'],bundle:true,platform:'node',format:'esm',outfile:file});
 const {MockRecovery}=await import(pathToFileURL(file));
 const now=1_000_000,code='123456',next='654321';
 const ready=()=>{const m=new MockRecovery();const token=m.beginSend(now);assert.equal(m.finishSend(token,code,now,10,45),true);return m;};
 const m=ready();assert.equal(m.state.expiresAt,now+600_000);assert.equal(m.state.resendAt,now+45_000);
 assert.equal(m.beginSend(now+44_999),null);assert.equal(m.verify(code,now+599_999),'verified');assert.equal(m.state.code,null,'verification consumes challenge');assert.equal(m.verify(code,now+599_999),'unavailable');
 let token=m.beginSave();assert.notEqual(token,null);assert.equal(m.beginSave(),null);assert.equal(m.finishSave(token),true);assert.equal(m.finishSave(token),false,'completion cannot replay');assert.equal(m.state.status,'complete');
 const expiry=ready();assert.equal(expiry.verify(code,now+600_000),'expired','exact10minute boundary');assert.equal(expiry.state.code,null);assert.equal(expiry.beginSave(),null);
 const stale=ready();const resend=stale.beginSend(now+45_000);assert.equal(stale.state.code,null,'resend immediately revokes prior code');assert.equal(stale.verify(code,now+45_000),'unavailable');assert.equal(stale.beginSend(now+45_000),null,'immediate busy guard');assert.equal(stale.finishSend(resend,next,now+46_000,10,45),true);assert.equal(stale.verify(code,now+46_000),'wrong');assert.equal(stale.verify(next,now+46_000),'verified');
 const wrong=ready();for(let n=1;n<=3;n++){assert.equal(wrong.verify(next,now),n===3?'invalidated':'wrong');assert.equal(wrong.state.wrong,n);}assert.equal(wrong.state.code,null);assert.equal(wrong.verify(code,now),'invalidated');assert.equal(wrong.beginSend(now+44_999),null);token=wrong.beginSend(now+45_000);assert.equal(wrong.finishSend(token,next,now+45_000,10,45),true);assert.equal(wrong.state.wrong,0);assert.equal(wrong.verify(next,now+45_000),'verified');
 const cancel=new MockRecovery();token=cancel.beginSend(now);cancel.cancel();assert.equal(cancel.finishSend(token,code,now,10,45),false,'cancel/unmount blocks late send');assert.equal(cancel.state.status,'idle');const retry=cancel.beginSend(now);assert.equal(cancel.finishSend(token,code,now,10,45),false,'older callback cannot settle newer request');assert.equal(cancel.finishSend(retry,next,now,10,45),true);assert.equal(cancel.verify(next,now),'verified');token=cancel.beginSave();cancel.cancel();assert.equal(cancel.finishSave(token),false,'cancel/unmount blocks late completion');assert.equal(cancel.state.code,null);assert.equal(cancel.state.resendAt,now+45_000,'cancel preserves cooldown only');
 const snapshot=cancel.state;snapshot.status='complete';assert.equal(cancel.state.status,'idle','snapshots cannot mutate state');assert.equal(new MockRecovery(NaN).state.resendAt,0);
 console.log('PASS recovery: configured lifetime/exact expiry,45s cooldown,3wrong invalidation, single use, resend revocation, busy, cancel/unmount/stale callbacks, clean retry; memory only, no provider/password/session effects');
}finally{await rm(dir,{recursive:true,force:true});}
