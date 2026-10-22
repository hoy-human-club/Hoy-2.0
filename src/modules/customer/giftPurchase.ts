import type {DataProvider} from '../../data/types';
import type {FrozenSaleQuote} from '../../data/operationalQuotes';
import {checkSaleQuote} from '../../data/operationalQuotes';
import {validProductDate} from '../../data/productCatalog';
import {recordPayment,type WompiResult} from './payments';
import {tenant} from '../../tenant/tenant';
import {atStudioTime,fromDateKey} from '../../i18n/format';
/** Monetary draft gifts only: no claim, entitlement activation or delivery is introduced. */
export async function purchaseQuotedGift(data:DataProvider,input:{key:string;userId:string;quote:FrozenSaleQuote;recipientName:string;recipientContact:string;deliveryDate:string;result:WompiResult;ivaRate:number}){
 if(data.name!=='mock'||!data.atomic)throw Error('quote_disconnected');
 if(input.quote.kind!=='gift'||!input.recipientName.trim()||!input.recipientContact.trim()||!validProductDate(input.deliveryDate))throw Error('gift_invalid');
 return data.atomic(async tx=>{
  await checkSaleQuote(tx,input.quote);
  const payment=await recordPayment(tx,{userId:input.userId,planId:input.quote.planId,amount:input.quote.chargedAmount,method:'card',result:input.result,ivaRate:input.ivaRate,quote:input.quote});
  if(payment.status!=='approved')return {code:null,payment};
  const code=`${tenant.invoicePrefix}-REGALO-DEMO-${payment.id}`;
  await tx.insert('gift_cards',{code,buyer_user_id:input.userId,recipient_name:input.recipientName.trim(),recipient_contact:input.recipientContact.trim(),amount:input.quote.chargedAmount,balance:input.quote.chargedAmount,deliver_at:atStudioTime(fromDateKey(input.deliveryDate),8).toISOString(),redeemed_by:null,status:'draft',frontend_quote:structuredClone(input.quote)});
  return {code,payment};
 },{idempotencyKey:`quoted-gift:${input.userId}:${input.key}`});
}
