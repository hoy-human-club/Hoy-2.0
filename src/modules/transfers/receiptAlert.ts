import type {BaseRow,PaymentRow,TransferReceiptRow,UserRow} from '../../data/schema';
import type {DataProvider} from '../../data/types';
import {tenant} from '../../tenant/tenant';

const SOURCE='fictional-receipt-alert-intent';
interface Event extends BaseRow {action:string;entity:string;entity_id:string;diff:Record<string,unknown>}
export const alertIntentId=(owner:string,receipt:string)=>`receipt-alert:${encodeURIComponent(tenant.id)}:${encodeURIComponent(owner)}:${encodeURIComponent(receipt)}`;
export async function receiptDigest(value:unknown){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
export function assertAlertEvent(row:Event,owner:string,receipt:TransferReceiptRow,action:string){
 if(typeof row.diff?.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(row.diff.fingerprint)||row.diff.simulation!=='local'||row.diff.status!==(action==='receipt.alert_intent.local'?'pending':'completed')||row.tenant_id!==tenant.id||row.action!==action||row.entity!=='transfer_receipts'||row.entity_id!==receipt.id||row.diff.source!==SOURCE||row.diff.owner_id!==owner||row.diff.payment_id!==receipt.payment_id)throw Error('intent_conflict');
}
export async function assertReceiptOwner(data:DataProvider,owner:string){const account=await data.get<UserRow>('users',owner);if(!account||account.tenant_id!==tenant.id||account.status!=='active')throw Error('account_state');}
export async function ownedReceipt(data:DataProvider,owner:string,id:string){
 await assertReceiptOwner(data,owner);
 const receipt=await data.get<TransferReceiptRow>('transfer_receipts',id);
 if(!receipt||receipt.tenant_id!==tenant.id||receipt.user_id!==owner)throw Error('scope');
 const payment=await data.get<PaymentRow>('payments',receipt.payment_id);
 if(!payment||payment.tenant_id!==tenant.id||payment.user_id!==owner||payment.plan_id!==receipt.product_id||payment.method!=='transfer')throw Error('payment_state');
 await assertReceiptOwner(data,owner);return {receipt,payment};
}
async function immutableReceiptDigest(receipt:TransferReceiptRow,payment:PaymentRow){return receiptDigest([receipt.id,receipt.tenant_id,receipt.user_id,receipt.payment_id,receipt.session_id,receipt.mat_number,receipt.product_id,receipt.product_name,receipt.classes,receipt.expires_at,receipt.image_data_url,receipt.file_name,receipt.mime_type,receipt.byte_size,payment.id,payment.tenant_id,payment.user_id,payment.plan_id,payment.amount,payment.method]);}
async function verifyIntentContents(data:DataProvider,intent:Event,receipt:TransferReceiptRow){const {payment}=await ownedReceipt(data,receipt.user_id,receipt.id);if(intent.diff.receipt_digest!==await immutableReceiptDigest(receipt,payment))throw Error('intent_conflict');}
export async function insertAlertIntent(data:DataProvider,receipt:TransferReceiptRow,fingerprint:string){
 if(data.name!=='mock')throw Error('disconnected');
 const {payment}=await ownedReceipt(data,receipt.user_id,receipt.id),receipt_digest=await immutableReceiptDigest(receipt,payment);
 return data.insert<Event>('audit_log',{id:alertIntentId(receipt.user_id,receipt.id),actor_id:null,action:'receipt.alert_intent.local',entity:'transfer_receipts',entity_id:receipt.id,diff:{source:SOURCE,owner_id:receipt.user_id,payment_id:receipt.payment_id,fingerprint,receipt_digest,intended_roles:['front_desk','admin'],status:'pending',simulation:'local'},ip:null});
}
export async function verifyUploadIntent(data:DataProvider,receipt:TransferReceiptRow,fingerprint:string){
 const row=await data.get<Event>('audit_log',alertIntentId(receipt.user_id,receipt.id));
 if(row){await verifyIntentContents(data,row,receipt);assertAlertEvent(row,receipt.user_id,receipt,'receipt.alert_intent.local');if(row.diff.fingerprint!==fingerprint)throw Error('request_conflict');}
 // Existing receipts deliberately retain no inferred/backfilled alert intent.
}
export interface ReceiptAlertState {receiptId:string;intentId:string|null;revision:string;completed:boolean}
export async function readReceiptAlert(data:DataProvider,owner:string,id:string):Promise<ReceiptAlertState>{
 if(data.name!=='mock')throw Error('disconnected');
 const {receipt,payment}=await ownedReceipt(data,owner,id),intentId=alertIntentId(owner,id);
 const intent=await data.get<Event>('audit_log',intentId);
 const revision=await immutableReceiptDigest(receipt,payment);
 if(!intent){const fresh=await ownedReceipt(data,owner,id);if(await immutableReceiptDigest(fresh.receipt,fresh.payment)!==revision)throw Error('stale');await assertReceiptOwner(data,owner);return {receiptId:id,intentId:null,revision,completed:false};}
 assertAlertEvent(intent,owner,receipt,'receipt.alert_intent.local');await verifyIntentContents(data,intent,receipt);
 const result=await data.get<Event>('audit_log',`${intentId}:simulation`);
 if(result){assertAlertEvent(result,owner,receipt,'receipt.alert_rehearsal.local');if(result.diff.fingerprint!==intent.diff.fingerprint||result.diff.revision!==revision)throw Error('intent_conflict');}
 const fresh=await ownedReceipt(data,owner,id);if(await immutableReceiptDigest(fresh.receipt,fresh.payment)!==revision)throw Error('stale');
 await assertReceiptOwner(data,owner);return {receiptId:id,intentId,revision,completed:!!result};
}
/** A local rehearsal only. It never resolves a recipient or dispatches a message. */
export async function simulateReceiptAlert(data:DataProvider,input:{owner:string;receiptId:string;revision:string},cancelled:()=>boolean=()=>false){
 const command={...input};const check=()=>{if(cancelled())throw Error('cancelled');};
 if(data.name!=='mock'||!data.atomic)throw Error('disconnected');check();
 const result=await data.atomic(async tx=>{
  check();const {receipt,payment}=await ownedReceipt(tx,command.owner,command.receiptId);check();
  const id=alertIntentId(command.owner,receipt.id),intent=await tx.get<Event>('audit_log',id);check();
  if(!intent)throw Error('intent_missing');assertAlertEvent(intent,command.owner,receipt,'receipt.alert_intent.local');await verifyIntentContents(tx,intent,receipt);check();
  const prior=await tx.get<Event>('audit_log',`${id}:simulation`);check();
  if(prior){assertAlertEvent(prior,command.owner,receipt,'receipt.alert_rehearsal.local');if(prior.diff.revision!==command.revision||prior.diff.fingerprint!==intent.diff.fingerprint)throw Error('request_conflict');return prior;}
  const revision=await immutableReceiptDigest(receipt,payment);check();if(command.revision!==revision)throw Error('stale');
  await assertReceiptOwner(tx,command.owner);check();
  return tx.insert<Event>('audit_log',{id:`${id}:simulation`,actor_id:null,action:'receipt.alert_rehearsal.local',entity:'transfer_receipts',entity_id:receipt.id,diff:{source:SOURCE,owner_id:command.owner,payment_id:payment.id,fingerprint:intent.diff.fingerprint,revision,status:'completed',simulation:'local'},ip:null});
 });
 const current=await readReceiptAlert(data,command.owner,command.receiptId);check();
 if(!current.completed||current.revision!==command.revision)throw Error('ack_unconfirmed');return result;
}
