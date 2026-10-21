import type { DataProvider } from '../../data/types';
import type { BookingRow, PaymentRow, TransferReceiptRow } from '../../data/schema';
import type { Bi } from '../../specs/types';
import { recordPayment, activatePaidPackage } from '../customer/payments';
import { bookWithPackage } from '../../data/deskBooking';
import { tenant } from '../../tenant/tenant';
import { policy } from '../customer/policy';
import { splitIva } from '../../data/tax';

export const RECEIPT_MAX_BYTES = 2 * 1024 * 1024;
export interface ReceiptImage { dataUrl: string; fileName: string; mimeType: 'image/png' | 'image/jpeg'; bytes: number }
export function validateReceiptBytes(name: string, type: string, bytes: Uint8Array) {
  if (!bytes.length || bytes.length > RECEIPT_MAX_BYTES) throw Error('size');
  const png = bytes.length > 8 && [137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b);
  const jpg = bytes.length > 3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
  if (!(type==='image/png' && /\.png$/i.test(name) && png || type==='image/jpeg' && /\.jpe?g$/i.test(name) && jpg)) throw Error('format');
}
export async function readReceipt(file: File): Promise<ReceiptImage> {
  if (!file.size || file.size > RECEIPT_MAX_BYTES) throw Error('size');
  const bytes = new Uint8Array(await file.arrayBuffer());
  validateReceiptBytes(file.name,file.type,bytes);
  const dataUrl = await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(Error('read'));r.readAsDataURL(file);});
  const image = new Image(); image.src=dataUrl;
  try { await image.decode(); if(!image.naturalWidth || !image.naturalHeight || image.naturalWidth*image.naturalHeight>20_000_000)throw Error(); } catch {throw Error('decode');}
  return {dataUrl,fileName:file.name,mimeType:file.type as ReceiptImage['mimeType'],bytes:file.size};
}
/** Deliberately fictional image, generated locally; never a real bank QR or receipt. */
export async function fictionalReceipt(): Promise<ReceiptImage> {
  const canvas=document.createElement('canvas');canvas.width=720;canvas.height=420;
  const c=canvas.getContext('2d')!;c.fillStyle='#fff';c.fillRect(0,0,720,420);c.fillStyle='#222';c.font='bold 38px sans-serif';c.fillText('FICTIONAL / FICTICIO',40,85);c.font='26px sans-serif';c.fillText('DEMO ONLY · NO BANK TRANSFER',40,150);c.fillText('SIN TRANSFERENCIA BANCARIA',40,195);c.fillText('TEST-0000 · NOT VALID / SIN VALIDEZ',40,280);
  const blob=await new Promise<Blob>(r=>canvas.toBlob(b=>r(b!),'image/png'));
  return readReceipt(new File([blob],'fictional-demo-receipt.png',{type:'image/png'}));
}
export interface TransferRequest { key:string; userId:string; sessionId:string|null; matNumber:number|null; productId:string; productName:Bi; amount:number; classes:number; expiresAt:string; image:ReceiptImage }
/** Fictional browser-only staged request. No booking/hold/grant before explicit review. */
export async function submitTransfer(data:DataProvider,input:TransferRequest):Promise<TransferReceiptRow> {
  if(data.name!=='mock' || !data.atomic)throw Error('disconnected');
  return data.atomic(async tx=>{
    const existing=await tx.get<TransferReceiptRow>('transfer_receipts',input.key);
    if(existing){if(existing.user_id!==input.userId||existing.tenant_id!==tenant.id)throw Error('scope');return existing;}
    if(!Number.isInteger(input.amount)||input.amount<1||!Number.isInteger(input.classes)||input.classes<1||!input.image.dataUrl.startsWith(`data:${input.image.mimeType};base64,`)||!Number.isInteger(input.image.bytes)||input.image.bytes<1||input.image.bytes>RECEIPT_MAX_BYTES)throw Error('invalid');
    const payment=await recordPayment(tx,{userId:input.userId,planId:input.productId,amount:input.amount,method:'transfer',ivaRate:policy.ivaRate});
    return tx.insert<TransferReceiptRow>('transfer_receipts',{id:input.key,user_id:input.userId,payment_id:payment.id,session_id:input.sessionId,mat_number:input.matNumber,product_id:input.productId,product_name:input.productName,classes:input.classes,expires_at:input.expiresAt,image_data_url:input.image.dataUrl,file_name:input.image.fileName,mime_type:input.image.mimeType,byte_size:input.image.bytes,status:'pending',amount_received:null,review_reason:null,reviewed_by:null,reviewed_at:null,booking_id:null});
  },{idempotencyKey:`transfer-submit:${input.userId}:${input.key}`});
}
export async function reviewTransfer(data:DataProvider,input:{id:string;actorId:string;role:string;decision:'approved'|'rejected';amount:number;reason:string;compared:boolean}):Promise<TransferReceiptRow>{
  if(data.name!=='mock'||!data.atomic)throw Error('disconnected');
  // Demo guard only; production requires authenticated authorization and authoritative bank evidence.
  if(!['super_admin','admin','front_desk'].includes(input.role))throw Error('forbidden');
  return data.atomic(async tx=>{
    const receipt=await tx.get<TransferReceiptRow>('transfer_receipts',input.id);
    if(!receipt||receipt.tenant_id!==tenant.id)throw Error('missing');
    if(receipt.status!=='pending'){if(receipt.status===input.decision)return receipt;throw Error('already_reviewed');}
    const payment=await tx.get<PaymentRow>('payments',receipt.payment_id);
    if(!payment||payment.tenant_id!==tenant.id||payment.status!=='pending'||payment.user_id!==receipt.user_id||payment.plan_id!==receipt.product_id)throw Error('payment_state');
    if(!Number.isInteger(input.amount)||input.amount<0||!input.compared||!input.reason.trim())throw Error('review_required');
    // Under/overpayments are retained for explicit rejection; no invented partial-settlement rule.
    if(input.decision==='approved'&&input.amount!==payment.amount)throw Error('amount_mismatch');
    if(input.decision==='approved'&&receipt.product_id==='plan_trial'){
      const priorPayments=await tx.list<PaymentRow>('payments',{where:{user_id:receipt.user_id}});
      const priorBookings=await tx.list<BookingRow>('bookings',{where:{user_id:receipt.user_id}});
      if(priorPayments.some(p=>p.tenant_id===tenant.id&&p.id!==payment.id&&p.plan_id==='plan_trial'&&p.status==='approved')||priorBookings.some(b=>b.tenant_id===tenant.id&&b.paid_with==='trial'))throw Error('trial_used');
    }
    const now=new Date().toISOString();let booking:BookingRow|null=null;
    await tx.update('payments',payment.id,{status:input.decision==='approved'?'approved':'declined',amount_paid:input.amount,note:input.reason.trim(),taken_by:input.actorId,paid_at:input.decision==='approved'?now:null});
    if(input.decision==='approved'){
      await activatePaidPackage(tx,{paymentId:payment.id,userId:receipt.user_id,planId:receipt.product_id,classes:receipt.classes,expiresAt:receipt.expires_at});
      if(receipt.session_id)booking=await bookWithPackage(tx,{userId:receipt.user_id,sessionId:receipt.session_id,status:'booked',paymentId:payment.id,paidWith:receipt.product_id==='plan_trial'?'trial':receipt.classes>1?'package':'single'});
      if(booking&&receipt.mat_number!=null)await tx.update('bookings',booking.id,{mat_number:receipt.mat_number});
      const {subtotal,tax}=splitIva(payment.amount,policy.ivaRate);
      await tx.insert('invoices',{payment_id:payment.id,number:`DEMO-TRANSFER-${receipt.id}`,subtotal,tax,total:payment.amount,issued_at:now,pdf_url:null,dian_cufe:null});
    }
    await tx.insert('audit_log',{actor_id:input.actorId,action:`payment.transfer.${input.decision}`,entity:'transfer_receipts',entity_id:receipt.id,diff:{role:input.role,source:'fictional-transfer-review',payment_id:payment.id},ip:null});
    return tx.update<TransferReceiptRow>('transfer_receipts',receipt.id,{status:input.decision,amount_received:input.amount,review_reason:input.reason.trim(),reviewed_by:input.actorId,reviewed_at:now,booking_id:booking?.id??null});
  });
}
