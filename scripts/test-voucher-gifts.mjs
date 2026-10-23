import assert from 'node:assert/strict';
import {createGiftDraft,advanceGift,giftStatus,demoEmail} from '../src/modules/voucher-gifts/model.ts';
import {voucherAvailability,voucherErrorKey} from '../src/modules/vouchers/availability.ts';
const draft=createGiftDraft({id:'DEMO-fixture',email:' Recipient@Demo.test ',classes:12,amount:600000});
assert.equal(draft.email,'recipient@demo.test');assert.equal(giftStatus(draft),'pending');
for(const email of ['a@real.com','a@@demo.test','a b@demo.test','a@.test','a@test',''])assert.equal(demoEmail(email),false,email);
for(const classes of [0,-1,1.5,Infinity,1001])assert.throws(()=>createGiftDraft({...draft,classes}));
assert.throws(()=>advanceGift(draft,'redeem',draft.email),/pending/);
const ready=advanceGift(draft,'confirm');assert.equal(draft.status,'pending');assert.deepEqual(ready.previews,['ready']);
assert.throws(()=>advanceGift(ready,'confirm'),/ready/);
assert.throws(()=>advanceGift(ready,'redeem','someone@demo.test'),/recipient/);assert.equal(ready.balance,0);
const redeemed=advanceGift(ready,'redeem','RECIPIENT@demo.test');assert.equal(redeemed.balance,12);assert.deepEqual(redeemed.previews,['ready','used']);
assert.throws(()=>advanceGift(redeemed,'redeem',draft.email),/redeemed/);assert.equal(redeemed.balance,12);
const expiresAt='2026-10-23T12:00:00Z',at=Date.parse(expiresAt);
assert.equal(giftStatus({...ready,expiresAt},at-1),'ready');assert.equal(giftStatus({...ready,expiresAt},at),'expired');
assert.throws(()=>advanceGift({...ready,expiresAt},'redeem',draft.email,at),/expired/);
assert.equal(giftStatus({...ready,expiresAt:'invalid'},at),'expired');
for(const balance of [1,0]){
 const v={status:'issued',expiresAt,balance};
 assert.equal(voucherAvailability(v,at),'expired');
 assert.equal(voucherAvailability({...v,expiresAt:null},at),balance?'available':'exhausted');
 assert.equal(voucherAvailability({...v,expiresAt:'invalid'},at),'expired');
 assert.equal(voucherAvailability({...v,status:'revoked'},at),'revoked');
}
assert.equal(voucherErrorKey(Error('voucher_expiration_invalid')),'vouchers.expiryError');
assert.equal(voucherErrorKey(Error('unknown')),'vouchers.error');
console.log('PASS voucher gifts: validation, immutable transitions, recipient mismatch, single redemption, previews, exact expiry and invitation availability/error mapping');
